/**
 * SmashUp 卡牌展示模式（三板斧）
 * 验证交互与查看面板均使用卡牌展示，而非旧文本按钮列表。
 */

import { test, expect } from '../framework';

test.describe('SmashUp 卡牌展示模式（三板斧）', () => {
  test('麦田怪圈触发选基地时，不应出现“基地”文本按钮列表', async ({ page, game }, testInfo) => {
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
              uid: 'm0',
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
              uid: 'm1',
              defId: 'pirate_first_mate',
              baseIndex: 1,
              owner: '0',
              controller: '0',
            },
          ],
        },
      ],
    });

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
      return state?.sys?.interaction?.current?.data?.options?.length ?? 0;
    }, { timeout: 10000 }).toBe(2);

    const baseTextButtons = page.locator('[data-testid="prompt-overlay"] button:has-text("基地")');
    await expect(baseTextButtons).toHaveCount(0);

    await game.screenshot('card-display-mode-crop-circles-selecting', testInfo);
  });

  test('弃牌堆查看应显示卡牌横排面板', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');

    await game.setupScene({
      gameId: 'smashup',
      player0: {
        discard: [
          { uid: 'discard-1', defId: 'zombie_walker', type: 'minion', owner: '0' },
          { uid: 'discard-2', defId: 'wizard_neophyte', type: 'minion', owner: '0' },
        ],
      },
      player1: {},
      currentPlayer: '0',
      phase: 'playCards',
    });

    await page.getByTestId('su-discard-toggle').click();

    const discardPanel = page.locator('[data-discard-view-panel]');
    await expect(discardPanel).toBeVisible({ timeout: 5000 });

    const visibleCards = discardPanel.locator('[data-card-uid]');
    await expect(visibleCards).toHaveCount(2);

    await game.screenshot('card-display-mode-discard-panel', testInfo);
  });
});
