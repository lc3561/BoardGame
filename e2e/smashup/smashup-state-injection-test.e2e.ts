/**
 * SmashUp 状态注入功能验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('状态注入功能验证（三板斧）', () => {
  test('setupScene 应注入手牌与牌库', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['wizard_portal', 'wizard_familiar'],
        deck: ['wizard_archmage', 'wizard_chronomage'],
        discard: [],
        factions: ['wizards', 'aliens'],
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
    const player0 = state?.core?.players?.['0'];
    expect(player0?.hand?.map((card: { defId?: string }) => card.defId)).toEqual(['wizard_portal', 'wizard_familiar']);
    expect(player0?.deck?.map((card: { defId?: string }) => card.defId)).toEqual(['wizard_archmage', 'wizard_chronomage']);

    await game.screenshot('state-injection-test-hand-deck', testInfo);
  });

  test('setupScene randomQueue 应注入成功', async ({ page, game }) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      randomQueue: [0.1, 0.5, 0.9],
      player0: { hand: [], deck: [], discard: [], factions: ['aliens', 'robots'] },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
      currentPlayer: '0',
      phase: 'playCards',
    });

    const queueLength = await page.evaluate(() => {
      const harness = (window as { __BG_TEST_HARNESS__?: { random?: { queueLength?: () => number } } }).__BG_TEST_HARNESS__;
      return harness?.random?.queueLength?.() ?? 0;
    });

    expect(queueLength).toBe(3);
  });
});
