/**
 * 大杀四方选择音效链路（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 选择音效链路（三板斧）', () => {
  test('基础交互点击后页面保持稳定（音效链路不阻塞）', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: { hand: ['alien_probe'], deck: [], discard: [], factions: ['aliens', 'robots'], actionsPlayed: 0, actionLimit: 1 },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
      currentPlayer: '0',
      phase: 'playCards',
      bases: [{ defId: 'base_the_mothership' }],
    });

    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="su-hand-area"] [data-card-uid]').first().click();
    await page.waitForTimeout(200);

    // 目标是验证点击交互不会导致页面崩溃或状态读取失败
    const state = await game.getState();
    expect(state?.core?.players?.['0']).toBeTruthy();

    await game.screenshot('faction-selection-sound-ui-stable', testInfo);
  });
});
