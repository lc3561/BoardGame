/**
 * SmashUp 开发测试模式检查（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 开发测试模式（三板斧）', () => {
  test('TestHarness 状态工具应已注册', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: { hand: ['alien_probe'], deck: [], discard: [], factions: ['aliens', 'robots'] },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
      currentPlayer: '0',
      phase: 'playCards',
    });

    const status = await page.evaluate(() => {
      const harness = (window as { __BG_TEST_HARNESS__?: { getStatus?: () => unknown } }).__BG_TEST_HARNESS__;
      return harness?.getStatus?.() as { state?: { registered?: boolean }; command?: { registered?: boolean } } | undefined;
    });

    expect(status?.state?.registered).toBe(true);
    expect(status?.command?.registered).toBe(true);

    await game.screenshot('check-dev-mode-harness-ready', testInfo);
  });
});
