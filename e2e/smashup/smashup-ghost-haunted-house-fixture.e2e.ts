/**
 * SmashUp E2E：幽灵 + 鬼屋连续弃牌（三板斧）
 */

import { test, expect } from '../framework';

test.describe('SmashUp: 幽灵 + 鬼屋弃牌修复（三板斧）', () => {
  test('打出幽灵到鬼屋后，两次弃牌不能选择同一张牌', async ({ game, page }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        factions: ['ghosts', 'aliens'],
        hand: [
          { uid: 'ghost1', defId: 'ghost_ghost', type: 'minion', owner: '0' },
          { uid: 'h1', defId: 'alien_probe', type: 'action', owner: '0' },
          { uid: 'h2', defId: 'alien_terraform', type: 'action', owner: '0' },
          { uid: 'h3', defId: 'alien_crop_circles', type: 'action', owner: '0' },
        ],
        discard: [],
        deck: [],
        minionLimit: 1,
        minionsPlayed: 0,
      },
      player1: {
        factions: ['ninjas', 'robots'],
        hand: [],
        deck: [],
        discard: [],
      },
      bases: [{ defId: 'base_haunted_house_al9000', minions: [], ongoingActions: [] }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await page.click('[data-card-uid="ghost1"]');
    await page.click('[data-base-index="0"]');

    const firstPrompt = page.getByText(/选择要弃掉的手牌/i).first();
    await expect(firstPrompt).toBeVisible({ timeout: 8000 });
    await game.screenshot('ghost-haunted-house-first-discard-options', testInfo);

    const firstOptionUids = await page.locator('[data-card-uid="h1"], [data-card-uid="h2"], [data-card-uid="h3"]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).getAttribute('data-card-uid')));
    expect(firstOptionUids).toContain('h1');
    expect(firstOptionUids).toContain('h2');
    expect(firstOptionUids).toContain('h3');

    await page.click('[data-card-uid="h1"]');

    const secondPrompt = page.getByText(/鬼屋|选择要弃掉的牌/i).first();
    await expect(secondPrompt).toBeVisible({ timeout: 8000 });
    await game.screenshot('ghost-haunted-house-second-discard-options', testInfo);

    const secondOptionUids = await page.locator('[data-card-uid="h1"], [data-card-uid="h2"], [data-card-uid="h3"]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).getAttribute('data-card-uid')));
    expect(secondOptionUids).not.toContain('h1');
    expect(secondOptionUids).toContain('h2');
    expect(secondOptionUids).toContain('h3');

    await page.click('[data-card-uid="h2"]');
    await game.waitForNoInteraction(5000);
    await game.screenshot('ghost-haunted-house-resolved', testInfo);

    const finalState = await game.getState();
    const p0Hand = finalState?.core?.players?.['0']?.hand ?? [];
    const p0Discard = finalState?.core?.players?.['0']?.discard ?? [];
    expect(p0Hand.some((card: { uid?: string }) => card.uid === 'h3')).toBe(true);
    expect(p0Discard.some((card: { uid?: string }) => card.uid === 'h1')).toBe(true);
    expect(p0Discard.some((card: { uid?: string }) => card.uid === 'h2')).toBe(true);
  });
});
