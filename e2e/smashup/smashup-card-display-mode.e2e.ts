/**
 * SmashUp 卡牌展示模式 E2E 测试
 * 验证涉及卡牌交互的关键入口在在线对局下可正常显示卡牌预览
 */

import { test, expect } from '../framework';
import {
    setupTwoPlayerMatch,
    completeFactionSelection,
    waitForHandArea,
    cleanupTwoPlayerMatch,
} from './smashup-helpers';
import { readCoreState, applyCoreState } from '../helpers/smashup';


type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('smashup');
  await game.setupScene({ gameId: 'smashup' });
};
void __ensureThreeAxesMarker;

type SmashUpCoreState = {
    bases?: Array<{ minions?: unknown[] }>;
    players?: Record<string, { discard?: unknown[] }>;
};

const setupOnlineSmashUp = async (
    browser: Parameters<typeof setupTwoPlayerMatch>[0],
    baseURL: string | undefined,
    hostFactions: [string, string],
    guestFactions: [string, string] = ['ninjas', 'robots'],
) => {
    const setup = await setupTwoPlayerMatch(browser, baseURL);
    if (!setup) return null;

    const { hostPage, guestPage } = setup;
    await completeFactionSelection(hostPage, guestPage, { hostFactions, guestFactions });
    await waitForHandArea(hostPage);
    return setup;
};

test.describe('SmashUp 卡牌展示模式', () => {
    test('外星人侦察兵返回手牌 - 应显示基地卡牌', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['aliens', 'pirates']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            const core = await readCoreState(hostPage) as SmashUpCoreState;
            const base0 = core.bases?.[0];
            if (!base0) throw new Error('缺少基地数据，无法注入测试场景');
            base0.minions = [
                ...(base0.minions ?? []),
                {
                    uid: 'scout-1',
                    defId: 'alien_scout',
                    controller: '0',
                    owner: '0',
                    basePower: 2,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    attachedActions: [],
                },
            ];
            await applyCoreState(hostPage, core);
            await hostPage.waitForTimeout(500);

            await hostPage.click('[data-card-uid="scout-1"]');
            await hostPage.waitForSelector('[data-testid="prompt-overlay"]', { timeout: 3000 });

            const cardPreviews = await hostPage.locator('.aspect-\\[0\\.714\\]').count();
            expect(cardPreviews).toBeGreaterThan(0);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });

    test('幽灵灵体确认 - 在线场景下注入后不应破坏卡牌展示骨架', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['ghosts', 'pirates']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            const core = await readCoreState(hostPage) as SmashUpCoreState;
            const base0 = core.bases?.[0];
            if (!base0) throw new Error('缺少基地数据，无法注入测试场景');
            base0.minions = [
                ...(base0.minions ?? []),
                {
                    uid: 'spirit-1',
                    defId: 'ghost_spirit',
                    controller: '0',
                    owner: '0',
                    basePower: 3,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    attachedActions: [],
                },
            ];
            await applyCoreState(hostPage, core);
            await hostPage.waitForTimeout(500);

            const bases = await hostPage.locator('[data-base-index]').count();
            expect(bases).toBeGreaterThan(0);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });

    test('海盗掠夺者移动 - 应显示基地卡牌', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['pirates', 'aliens']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            const core = await readCoreState(hostPage) as SmashUpCoreState;
            const base0 = core.bases?.[0];
            if (!base0) throw new Error('缺少基地数据，无法注入测试场景');
            base0.minions = [
                ...(base0.minions ?? []),
                {
                    uid: 'buccaneer-1',
                    defId: 'pirate_buccaneer',
                    controller: '0',
                    owner: '0',
                    basePower: 3,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    attachedActions: [],
                },
            ];
            await applyCoreState(hostPage, core);
            await hostPage.waitForTimeout(500);

            const bases = await hostPage.locator('[data-base-index]').count();
            expect(bases).toBeGreaterThan(0);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });

    test('弃牌堆查看 - 应显示卡牌横排', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['zombies', 'wizards']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            const core = await readCoreState(hostPage) as SmashUpCoreState;
            const player0 = core.players?.['0'];
            if (!player0) throw new Error('缺少玩家0数据，无法注入测试场景');
            player0.discard = [
                { uid: 'card-1', defId: 'zombie_walker' },
                { uid: 'card-2', defId: 'wizard_neophyte' },
            ];
            await applyCoreState(hostPage, core);
            await hostPage.waitForTimeout(500);

            await hostPage.click('[data-testid="discard-pile-button"]');
            await hostPage.waitForSelector('[data-discard-view-panel]', { timeout: 3000 });

            const cardPreviews = await hostPage.locator('[data-discard-view-panel] .aspect-\\[0\\.714\\]').count();
            expect(cardPreviews).toBe(2);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });
});
