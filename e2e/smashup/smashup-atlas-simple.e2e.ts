/**
 * SmashUp Card Atlas 简单验证（三板斧）
 */
import { test, expect } from '../framework';

const ATLAS_IDS = ['smashup:cards1', 'smashup:cards2', 'smashup:cards3', 'smashup:cards4'] as const;

test('SmashUp card atlas 简单注册检查（三板斧）', async ({ page, game }, testInfo) => {
  await game.openTestGame('smashup');
  await game.setupScene({
    gameId: 'smashup',
    player0: { hand: [], deck: [], discard: [], factions: ['aliens', 'robots'] },
    player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
    currentPlayer: '0',
    phase: 'playCards',
  });

  const atlasState = await page.evaluate(async (atlasIds) => {
    const { getCardAtlasSource, getLazyRegistration } = await import('/src/components/common/media/cardAtlasRegistry.ts');
    return atlasIds.map((id) => {
      const source = getCardAtlasSource(id, 'zh-CN');
      const lazy = getLazyRegistration(id);
      return {
        id,
        registered: Boolean(source || lazy),
      };
    });
  }, [...ATLAS_IDS]);

  expect(atlasState.every((entry) => entry.registered)).toBe(true);
  await game.screenshot('atlas-simple-registered', testInfo);
});
