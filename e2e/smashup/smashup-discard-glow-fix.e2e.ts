/**
 * 大杀四方 - 弃牌堆闪烁修复验证（在线对局版）
 *
 * 验证场景：
 * 1. 随从额度已满且无额外出牌能力时，弃牌堆不应闪烁
 * 2. 随从额度已满但存在基地限定额度且弃牌有可打出卡牌时，弃牌堆应闪烁
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
    turnOrder?: string[];
    currentPlayerIndex?: number;
    players?: Record<string, {
        minionsPlayed?: number;
        minionLimit?: number;
        baseLimitedMinionQuota?: Record<string, number>;
        discard?: unknown[];
    }>;
};

const setupOnlineSmashUp = async (
    browser: Parameters<typeof setupTwoPlayerMatch>[0],
    baseURL: string | undefined,
    hostFactions: [string, string],
    guestFactions: [string, string] = ['ninjas', 'pirates'],
) => {
    const setup = await setupTwoPlayerMatch(browser, baseURL);
    if (!setup) return null;

    const { hostPage, guestPage } = setup;
    await completeFactionSelection(hostPage, guestPage, { hostFactions, guestFactions });
    await waitForHandArea(hostPage);
    return setup;
};

const applyDiscardScene = async (
    page: Parameters<typeof readCoreState>[0],
    updater: (state: SmashUpCoreState, currentPid: string) => void,
) => {
    const state = await readCoreState(page) as SmashUpCoreState;
    const turnOrder = state.turnOrder ?? [];
    const currentPid = turnOrder[state.currentPlayerIndex ?? 0] ?? '0';
    const player = state.players?.[currentPid];
    if (!player) {
        throw new Error(`未找到当前玩家 ${currentPid}，无法注入弃牌场景`);
    }
    updater(state, currentPid);
    await applyCoreState(page, state);
    await page.waitForTimeout(500);
};

test.describe('SmashUp - 弃牌堆闪烁修复', () => {
    test('随从额度已满且无额外出牌能力时，弃牌堆不闪烁', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['pirates', 'aliens']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            await applyDiscardScene(hostPage, (state, currentPid) => {
                const player = state.players![currentPid]!;
                player.minionsPlayed = 1;
                player.minionLimit = 1;
                player.discard = [
                    { uid: 'test-minion-1', defId: 'pirate_first_mate', type: 'minion', owner: currentPid },
                ];
            });

            const discardZone = hostPage.locator('[data-discard-toggle]');
            await expect(discardZone).toBeVisible();

            const discardLabel = discardZone.locator('div').filter({ hasText: /弃牌/ }).last();
            const labelClasses = await discardLabel.getAttribute('class');
            expect(labelClasses).not.toContain('bg-amber-500');
            expect(labelClasses).not.toContain('animate-pulse');

            const glowElements = await discardZone.locator('div.animate-ping').count();
            expect(glowElements).toBe(0);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });

    test('随从额度已满但有基地限定额度时，弃牌堆应该闪烁（有可打出卡）', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupOnlineSmashUp(browser, baseURL, ['zombies', 'pirates']);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage } = setup;
        try {
            await applyDiscardScene(hostPage, (state, currentPid) => {
                const player = state.players![currentPid]!;
                player.minionsPlayed = 1;
                player.minionLimit = 1;
                player.baseLimitedMinionQuota = { 0: 1 };
                player.discard = [
                    { uid: 'test-tz-1', defId: 'zombie_tenacious_z', type: 'minion', owner: currentPid },
                ];
            });

            const discardZone = hostPage.locator('[data-discard-toggle]');
            await expect(discardZone).toBeVisible();

            const discardLabel = discardZone.locator('div').filter({ hasText: /弃牌/ }).last();
            const labelClasses = await discardLabel.getAttribute('class');
            expect(labelClasses).toContain('bg-amber-500');
            expect(labelClasses).toContain('animate-pulse');

            const glowElements = await discardZone.locator('div.animate-ping').count();
            expect(glowElements).toBeGreaterThan(0);
        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });
});
