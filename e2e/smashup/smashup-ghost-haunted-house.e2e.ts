/**
 * SmashUp 幽灵基地（鬼屋）基础验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 鬼屋基地（三板斧）', () => {
  test('注入鬼屋基地后应正常渲染且可读状态', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: { hand: ['ghost_spook'], deck: [], discard: ['ghost_shade'], factions: ['ghosts', 'aliens'] },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'robots'] },
      bases: [{ defId: 'base_haunted_house_al9000' }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    const state = await game.getState();
    expect(state?.core?.bases?.[0]?.defId).toBe('base_haunted_house_al9000');
    expect(state?.core?.players?.['0']?.discard?.some((card: { defId?: string }) => card.defId === 'ghost_shade')).toBe(true);

    await game.screenshot('ghost-haunted-house-base-render', testInfo);
  });
});
