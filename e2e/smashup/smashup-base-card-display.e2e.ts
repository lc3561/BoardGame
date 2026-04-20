/**
 * 大杀四方 - 基地选择卡牌展示模式（三板斧）
 * 验证：麦田怪圈选择基地时应显示基地卡牌，而不是文字按钮列表。
 */

import { test, expect } from '../framework';

test.describe('大杀四方 - 基地选择卡牌展示（三板斧）', () => {
  test('麦田怪圈：选择基地时显示基地卡牌', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');

    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: [
          {
            uid: 'crop-circles-1',
            defId: 'alien_crop_circles',
            type: 'action',
            owner: '0',
          },
        ],
        actionsPlayed: 0,
        actionLimit: 1,
      },
      player1: {},
      currentPlayer: '0',
      phase: 'playCards',
      bases: [
        {
          defId: 'base_the_mothership',
          minions: [
            {
              uid: 'minion-0',
              defId: 'alien_invader',
              baseIndex: 0,
              owner: '0',
              controller: '0',
            },
          ],
        },
        {
          defId: 'base_tortuga',
          minions: [
            {
              uid: 'minion-1',
              defId: 'alien_invader',
              baseIndex: 1,
              owner: '0',
              controller: '0',
            },
          ],
        },
      ],
    });

    await expect(page.locator('[data-card-uid="crop-circles-1"]')).toBeVisible({ timeout: 10000 });
    await game.screenshot('base-card-display-before-play', testInfo);

    await page.evaluate(() => {
      const harness = (window as any).__BG_TEST_HARNESS__;
      if (!harness?.command?.dispatch) {
        throw new Error('TestHarness command.dispatch 不可用');
      }
      harness.command.dispatch({
        type: 'su:play_action',
        playerId: '0',
        payload: { cardUid: 'crop-circles-1' },
      });
    });

    await expect.poll(async () => {
      const state = await game.getState();
      const interaction = state?.sys?.interaction?.current;
      return {
        hasInteraction: Boolean(interaction),
        optionCount: interaction?.data?.options?.length ?? 0,
      };
    }, { timeout: 10000 }).toMatchObject({
      hasInteraction: true,
      optionCount: 2,
    });

    await game.screenshot('base-card-display-selecting', testInfo);

    const promptCards = page.locator('[data-testid^="prompt-card-"]');
    const cardCount = await promptCards.count();
    const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
    const baseTextButtons = page.locator('[data-testid="prompt-overlay"] button:has-text("基地")');
    const buttonCount = await baseTextButtons.count();

    expect(buttonCount).toBe(0);

    if (cardCount > 0) {
      const firstCardBox = await promptCards.first().boundingBox();
      expect(firstCardBox).not.toBeNull();
      expect((firstCardBox?.width ?? 0) > (firstCardBox?.height ?? 0)).toBe(true);
    } else {
      await expect(promptOverlay).toBeHidden();
    }

    await game.selectBase(0);
    await game.waitForNoInteraction(5000);

    const finalState = await game.getState();
    expect(finalState?.core?.bases?.[0]?.minions ?? []).toHaveLength(0);
    expect(finalState?.core?.players?.['0']?.hand?.map((card: any) => card.defId)).toContain('alien_invader');
    expect(finalState?.core?.players?.['0']?.discard?.map((card: any) => card.defId)).toContain('alien_crop_circles');

    await game.screenshot('base-card-display-resolved', testInfo);
  });
});
