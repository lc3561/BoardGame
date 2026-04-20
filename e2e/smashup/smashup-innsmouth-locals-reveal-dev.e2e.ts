/**
 * 大杀四方 - 印斯茅斯“本地人”展示测试（开发服三板斧版）
 */

import { test, expect } from '../framework';

test.describe('印斯茅斯“本地人”展示功能（开发服务器）', () => {
  test('打出“本地人”后应该显示展示 UI', async ({ game, page }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        factions: ['innsmouth', 'aliens'],
        hand: [{ uid: 'h1', defId: 'innsmouth_the_locals', type: 'minion', owner: '0' }],
        deck: [
          { uid: 'd1', defId: 'innsmouth_the_locals', type: 'minion', owner: '0' },
          { uid: 'd2', defId: 'alien_invader', type: 'minion', owner: '0' },
          { uid: 'd3', defId: 'innsmouth_the_locals', type: 'minion', owner: '0' },
        ],
        discard: [],
        minionsPlayed: 0,
        minionLimit: 1,
      },
      player1: {
        factions: ['ninjas', 'robots'],
        hand: [],
        deck: [],
        discard: [],
      },
      currentPlayer: '0',
      phase: 'playCards',
    });

    await game.screenshot('innsmouth-locals-dev-01-initial', testInfo);

    await page.click('[data-card-uid="h1"]');
    await page.click('[data-base-index="0"]');

    const closeHint = page.getByText(/点击任意位置关闭|Click anywhere to close/i).first();
    await expect(closeHint).toBeVisible({ timeout: 8000 });

    const localsCount = await page.locator('text=本地人').count();
    expect(localsCount).toBeGreaterThanOrEqual(2);
    await expect(page.getByText(/入侵者|Invader/i).first()).toBeVisible({ timeout: 5000 });
    await game.screenshot('innsmouth-locals-dev-02-reveal-ui', testInfo);

    await page.mouse.click(16, 16);
    await expect(closeHint).toBeHidden({ timeout: 5000 });
    await game.screenshot('innsmouth-locals-dev-03-after-close', testInfo);

    await expect.poll(async () => {
      const finalState = await game.getState();
      const hand = finalState?.core?.players?.['0']?.hand ?? [];
      return hand.filter((card: { defId?: string }) => card.defId === 'innsmouth_the_locals').length;
    }, { timeout: 5000 }).toBe(2);
  });
});
