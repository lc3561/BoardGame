/**
 * SmashUp 外星人调试链路（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 外星人调试链路（三板斧）', () => {
  test('外星人三张关键行动牌应可稳定渲染', async ({ game }, testInfo) => {
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

    const state = await game.getState();
    const handDefIds = (state?.core?.players?.['0']?.hand ?? []).map((card: { defId?: string }) => card.defId ?? '');
    expect(handDefIds).toEqual(expect.arrayContaining(['alien_probe', 'alien_terraform', 'alien_crop_circles']));

    await game.screenshot('alien-debug-simple-hand-cards', testInfo);
  });
});
