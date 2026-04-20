/**
 * 晕眩额外攻击机制 E2E 测试（三板斧）
 *
 * 覆盖：
 * 1. 防御方带晕眩时，攻击结算后触发额外攻击
 * 2. 额外攻击结束后恢复原回合（进入 main2）
 * 3. 多层晕眩仍只触发一次额外攻击（并被消费）
 * 4. 净化移除晕眩后不再触发额外攻击
 */

import { test, expect } from '../framework';

const DAZE_STATUS_ID = 'daze';

async function dispatchCommand(
    page: import('@playwright/test').Page,
    type: string,
    playerId: string,
    payload: Record<string, unknown> = {},
): Promise<void> {
    await page.evaluate(({ cmdType, cmdPlayerId, cmdPayload }) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        if (!harness?.command?.dispatch) {
            throw new Error('TestHarness command dispatcher 不可用');
        }
        harness.command.dispatch({
            type: cmdType,
            playerId: cmdPlayerId,
            payload: cmdPayload,
        });
    }, {
        cmdType: type,
        cmdPlayerId: playerId,
        cmdPayload: payload,
    });
}

async function readDazeStacks(page: import('@playwright/test').Page, playerId: '0' | '1'): Promise<number> {
    return page.evaluate(({ targetPlayerId, statusId }) => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
        const player = state?.core?.players?.[targetPlayerId];
        return Number(player?.statusEffects?.[statusId] ?? 0);
    }, {
        targetPlayerId: playerId,
        statusId: DAZE_STATUS_ID,
    });
}

async function setupDazeExtraAttackScene(
    page: import('@playwright/test').Page,
    game: import('../framework').GameTestContext,
    dazeStacks = 1,
): Promise<void> {
    await game.openTestGame('dicethrone');

    await game.setupScene({
        gameId: 'dicethrone',
        player0: {
            resources: { HP: 50, CP: 2 },
        },
        player1: {
            resources: { HP: 50, CP: 2 },
        },
        currentPlayer: '0',
        phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'barbarian' },
                hostStarted: true,
                rollConfirmed: true,
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: false,
                sourceAbilityId: 'fist-technique-5',
                isUltimate: false,
                damage: 0,
                bonusDamage: 0,
                preDefenseResolved: false,
                damageResolved: false,
                attackFaceCounts: {},
            },
        },
    });

    await dispatchCommand(page, 'SYS_CHEAT_SET_STATUS', '0', {
        playerId: '1',
        statusId: DAZE_STATUS_ID,
        amount: dazeStacks,
    });

    await expect.poll(async () => {
        const stacks = await readDazeStacks(page, '1');
        const state = await game.getState();
        return {
            phase: state?.sys?.phase,
            activePlayerId: state?.core?.activePlayerId,
            dazeStacks: stacks,
        };
    }, { timeout: 10000 }).toMatchObject({
        phase: 'offensiveRoll',
        activePlayerId: '0',
        dazeStacks: dazeStacks,
    });
}

test.describe('晕眩额外攻击机制（三板斧）', () => {
    test('晕眩应该在攻击结束后触发额外攻击', async ({ page, game }, testInfo) => {
        await setupDazeExtraAttackScene(page, game, 1);

        await dispatchCommand(page, 'ADVANCE_PHASE', '0', {});

        await expect.poll(async () => {
            const state = await game.getState();
            const dazeStacks = await readDazeStacks(page, '1');
            return {
                phase: state?.sys?.phase,
                activePlayerId: state?.core?.activePlayerId,
                dazeStacks,
                extraAttackAttackerId: state?.core?.extraAttackInProgress?.attackerId ?? null,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'offensiveRoll',
            activePlayerId: '0',
            dazeStacks: 0,
            extraAttackAttackerId: '0',
        });

        await game.screenshot('daze-extra-attack-triggered', testInfo);
    });

    test('额外攻击结束后应恢复原回合', async ({ page, game }) => {
        await setupDazeExtraAttackScene(page, game, 1);

        await dispatchCommand(page, 'ADVANCE_PHASE', '0', {});
        await dispatchCommand(page, 'ADVANCE_PHASE', '0', {});

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase,
                activePlayerId: state?.core?.activePlayerId,
                hasExtraAttack: Boolean(state?.core?.extraAttackInProgress),
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'main2',
            activePlayerId: '0',
            hasExtraAttack: false,
        });
    });

    test('多层晕眩应该只触发一次额外攻击', async ({ page, game }) => {
        await setupDazeExtraAttackScene(page, game, 2);

        await dispatchCommand(page, 'ADVANCE_PHASE', '0', {});

        await expect.poll(async () => {
            const state = await game.getState();
            const dazeStacks = await readDazeStacks(page, '1');
            return {
                phase: state?.sys?.phase,
                dazeStacks,
                extraAttackAttackerId: state?.core?.extraAttackInProgress?.attackerId ?? null,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'offensiveRoll',
            dazeStacks: 0,
            extraAttackAttackerId: '0',
        });
    });

    test('晕眩应可被净化移除且不会触发额外攻击', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone');
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { HP: 50, CP: 2 },
            },
            player1: {
                resources: { HP: 50, CP: 2 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                hostStarted: true,
            },
        });

        await dispatchCommand(page, 'SYS_CHEAT_SET_STATUS', '0', {
            playerId: '0',
            statusId: DAZE_STATUS_ID,
            amount: 1,
        });
        await dispatchCommand(page, 'SYS_CHEAT_SET_TOKEN', '0', {
            playerId: '0',
            tokenId: 'purify',
            amount: 1,
        });

        await expect.poll(async () => readDazeStacks(page, '0'), { timeout: 5000 }).toBe(1);

        await dispatchCommand(page, 'USE_PURIFY', '0', {
            statusId: DAZE_STATUS_ID,
        });

        await expect.poll(async () => {
            const dazeStacks = await readDazeStacks(page, '0');
            const state = await game.getState();
            return {
                dazeStacks,
                phase: state?.sys?.phase,
                activePlayerId: state?.core?.activePlayerId,
                hasExtraAttack: Boolean(state?.core?.extraAttackInProgress),
            };
        }, { timeout: 10000 }).toMatchObject({
            dazeStacks: 0,
            phase: 'main1',
            activePlayerId: '0',
            hasExtraAttack: false,
        });

        await game.screenshot('daze-purify-cleared', testInfo);
    });
});
