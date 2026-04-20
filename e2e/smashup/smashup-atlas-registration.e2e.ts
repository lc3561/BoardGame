import { test, expect } from '../framework';

const ATLAS_IDS = [
  'smashup:cards1',
  'smashup:cards2',
  'smashup:cards3',
  'smashup:cards4',
] as const;

test('大杀四方卡牌图集应完成注册（三板斧）', async ({ page, game }, testInfo) => {
  test.setTimeout(60000);

  await game.openTestGame('smashup', { skipInitialization: true }, 20000);
  await game.setupScene({
    gameId: 'smashup',
    player0: { hand: [], deck: [], discard: [], factions: ['aliens', 'robots'] },
    player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
    currentPlayer: '0',
    phase: 'playCards',
  });

  const registrationStatus = await page.evaluate(async (atlasIds) => {
    const { getCardAtlasSource, getLazyRegistration } = await import('/src/components/common/media/cardAtlasRegistry.ts');
    const { SMASHUP_ATLAS_DEFINITIONS } = await import('/src/games/smashup/domain/atlasCatalog.ts');

    return atlasIds.map((atlasId) => {
      const expected = SMASHUP_ATLAS_DEFINITIONS.find((entry) => entry.id === atlasId);
      const resolved = getCardAtlasSource(atlasId, 'zh-CN');
      const lazy = getLazyRegistration(atlasId);

      return {
        atlasId,
        mode: resolved ? 'resolved' : lazy ? 'lazy' : 'missing',
        registeredImage: resolved?.image ?? lazy?.image ?? null,
        expectedImage: expected?.image ?? null,
      };
    });
  }, [...ATLAS_IDS]);

  expect(registrationStatus).toHaveLength(ATLAS_IDS.length);
  for (const status of registrationStatus) {
    expect(status.expectedImage, `${status.atlasId} 缺少 atlasCatalog 定义`).toBeTruthy();
    expect(status.mode, `${status.atlasId} 未注册`).not.toBe('missing');
    expect(status.registeredImage, `${status.atlasId} 注册图片路径不匹配`).toBe(status.expectedImage);
  }

  await game.screenshot('atlas-registration-all-registered', testInfo);
});
