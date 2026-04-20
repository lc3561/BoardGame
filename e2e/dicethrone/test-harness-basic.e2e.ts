/**
 * DiceThrone TestHarness 基础能力验证（三板斧）
 *
 * 覆盖：
 * 1) openTestGame + setupScene 场景可用
 * 2) 骰子注入接口可用
 * 3) 状态 patch 可生效
 */

import { test, expect } from '../framework';

async function openBasicScene(game: import('../framework').GameTestContext) {
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
}

test.describe('DiceThrone TestHarness 基础能力验证（三板斧）', () => {
  test.describe.configure({ timeout: 60_000 });

  test('状态工具应完成注册并可读取当前状态', async ({ page, game }, testInfo) => {
    await openBasicScene(game);

    const status = await page.evaluate(() => (window as any).__BG_TEST_HARNESS__?.getStatus?.());
    expect(status?.state?.registered).toBe(true);
    expect(status?.command?.registered).toBe(true);

    const state = await game.getState();
    expect(state?.core?.players?.['0']?.resources?.hp).toBe(50);
    expect(state?.core?.players?.['1']?.resources?.hp).toBe(50);

    await game.screenshot('test-harness-status-ready', testInfo);
  });

  test('应支持骰子注入并可读取队列', async ({ page, game }, testInfo) => {
    await openBasicScene(game);

    await page.evaluate(() => {
      (window as any).__BG_TEST_HARNESS__?.dice?.setValues?.([6, 6, 6, 6, 6]);
    });

    const diceStatus = await page.evaluate(() => ({
      remaining: (window as any).__BG_TEST_HARNESS__?.dice?.remaining?.(),
      values: (window as any).__BG_TEST_HARNESS__?.dice?.getValues?.(),
    }));

    expect(diceStatus.remaining).toBeGreaterThan(0);
    expect(Array.isArray(diceStatus.values)).toBe(true);
    expect(diceStatus.values.slice(0, 5)).toEqual([6, 6, 6, 6, 6]);

    await game.screenshot('test-harness-dice-queue', testInfo);
  });

  test('应支持状态 patch 并更新玩家生命值', async ({ page, game }, testInfo) => {
    await openBasicScene(game);

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

    await game.screenshot('test-harness-state-patch-hp10', testInfo);
  });
});
