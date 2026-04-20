/**
 * 端口隔离验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('端口隔离验证（三板斧）', () => {
  test('openTestGame 使用单 worker 前端端口并可正常加载 SmashUp', async ({ page, game }) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: { hand: [], deck: [], discard: [], factions: ['aliens', 'robots'] },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
      currentPlayer: '0',
      phase: 'playCards',
    });

    const currentUrl = new URL(page.url());
    const numericPort = Number.parseInt(currentUrl.port || '0', 10);

    expect(Number.isFinite(numericPort)).toBeTruthy();
    expect(numericPort).toBeGreaterThanOrEqual(6000);
    expect(numericPort).toBeLessThan(7000);

    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
  });
});
