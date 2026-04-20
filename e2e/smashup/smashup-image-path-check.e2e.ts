/**
 * SmashUp 图片路径检查（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 图片路径检查（三板斧）', () => {
  test('AssetLoader 生成的本地化路径应包含 i18n/zh-CN/smashup', async ({ page, game }, testInfo) => {
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

    const urls = await page.evaluate(async () => {
      const { getLocalizedImageUrls } = await import('/src/core/AssetLoader.ts');
      return getLocalizedImageUrls('smashup/cards/cards1', 'zh-CN');
    });

    expect(urls?.primary?.webp ?? '').toContain('/i18n/zh-CN/smashup/');
    expect(urls?.fallback?.webp ?? '').toContain('/i18n/en/smashup/');

    await game.screenshot('image-path-check-localized-urls', testInfo);
  });
});
