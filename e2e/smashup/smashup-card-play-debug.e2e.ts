/**
 * SmashUp 出牌链路验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 出牌链路（三板斧）', () => {
  test('从手牌打出随从后应出现在目标基地', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['alien_invader'],
        deck: [],
        discard: [],
        factions: ['aliens', 'robots'],
        minionsPlayed: 0,
        minionLimit: 1,
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['ninjas', 'pirates'],
      },
      bases: [{ defId: 'base_the_mothership' }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await game.playCard('alien_invader', { targetBaseIndex: 0 });

    await expect.poll(async () => {
      const state = await game.getState();
      const base0 = state?.core?.bases?.[0]?.minions ?? [];
      return base0.some((minion: { defId?: string }) => minion.defId === 'alien_invader');
    }, { timeout: 5000 }).toBe(true);

    await game.screenshot('card-play-debug-alien-invader-on-base', testInfo);
  });
});
