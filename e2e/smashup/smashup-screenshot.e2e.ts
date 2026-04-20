/**
 * SmashUp 手牌截图（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 手牌截图（三板斧）', () => {
  test('进入场景后输出手牌区截图与整页截图', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['alien_probe', 'alien_terraform', 'alien_crop_circles', 'robot_zapbot'],
        deck: [],
        discard: [],
        factions: ['aliens', 'robots'],
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['ninjas', 'pirates'],
      },
      currentPlayer: '0',
      phase: 'playCards',
    });

    const handArea = page.getByTestId('su-hand-area');
    await expect(handArea).toBeVisible({ timeout: 10000 });

    await handArea.screenshot({ path: testInfo.outputPath('smashup-hand-area.png') });
    await game.screenshot('smashup-hand-full', testInfo);
  });
});
