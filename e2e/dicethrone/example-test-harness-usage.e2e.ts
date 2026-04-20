/**
 * TestHarness 使用示例（三板斧）
 *
 * 演示：
 * 1) 骰子队列注入
 * 2) 状态注入（patch）
 * 3) 命令分发
 */

import { test, expect } from '../framework';

async function dispatchCommand(
  page: import('@playwright/test').Page,
  type: string,
  playerId: string,
  payload: Record<string, unknown> = {},
) {
  await page.evaluate(({ cmdType, cmdPlayerId, cmdPayload }) => {
    const harness = (window as any).__BG_TEST_HARNESS__;
    if (!harness?.command?.dispatch) {
      throw new Error('TestHarness command.dispatch 不可用');
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

async function openScene(game: import('../framework').GameTestContext, phase = 'main1') {
  await game.openTestGame('dicethrone');
  await game.setupScene({
    gameId: 'dicethrone',
    player0: { resources: { HP: 50, CP: 2 } },
    player1: { resources: { HP: 50, CP: 2 } },
    currentPlayer: '0',
    phase,
    extra: {
      selectedCharacters: { '0': 'monk', '1': 'barbarian' },
      hostStarted: true,
    },
  });
}

test.describe('TestHarness 使用示例（三板斧）', () => {
  test.describe.configure({ timeout: 60_000 });

  test('骰子注入示例', async ({ page, game }, testInfo) => {
    await openScene(game, 'offensiveRoll');

    await page.evaluate(() => {
      (window as any).__BG_TEST_HARNESS__?.dice?.setValues?.([6, 6, 6, 6, 6]);
    });

    const diceStatus = await page.evaluate(() => ({
      remaining: (window as any).__BG_TEST_HARNESS__?.dice?.remaining?.(),
      values: (window as any).__BG_TEST_HARNESS__?.dice?.getValues?.(),
    }));

    expect(diceStatus.remaining).toBeGreaterThan(0);
    expect(diceStatus.values.slice(0, 5)).toEqual([6, 6, 6, 6, 6]);

    await game.screenshot('example-dice-injected', testInfo);
  });

  test('状态注入示例', async ({ page, game }, testInfo) => {
    await openScene(game);

    await page.evaluate(() => {
      (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
        core: {
          players: {
            '0': {
              resources: { hp: 10 },
            },
          },
        },
      });
    });

    await expect.poll(async () => {
      const state = await game.getState();
      return state?.core?.players?.['0']?.resources?.hp;
    }, { timeout: 10000 }).toBe(10);

    await game.screenshot('example-state-patch-hp10', testInfo);
  });

  test('命令分发示例', async ({ page, game }, testInfo) => {
    await openScene(game, 'main1');

    await dispatchCommand(page, 'ADVANCE_PHASE', '0', {});

    await expect.poll(async () => {
      const state = await game.getState();
      return state?.sys?.phase;
    }, { timeout: 10000 }).toBe('offensiveRoll');

    await game.screenshot('example-advance-phase-to-offensive-roll', testInfo);
  });
});
