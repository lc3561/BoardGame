/**
 * SmashUp 外星人卡牌视觉验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 外星人卡牌视觉验证（三板斧）', () => {
  test('手牌区域应可见并包含三张外星人行动牌', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['alien_probe', 'alien_terraform', 'alien_crop_circles'],
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

    const player0 = await game.getPlayerState('0');
    const handDefIds = (player0?.hand ?? []).map((card: { defId?: string }) => card.defId ?? '');
    expect(handDefIds).toEqual(expect.arrayContaining(['alien_probe', 'alien_terraform', 'alien_crop_circles']));

    await handArea.screenshot({ path: testInfo.outputPath('alien-hand-area.png'), animations: 'disabled' });
    await game.screenshot('alien-cards-visual-full', testInfo);
  });
});
