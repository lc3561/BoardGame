/**
 * SmashUp 状态注入稳定性对比（三板斧）
 */
import type { Page } from '@playwright/test';
import { test, expect } from '../framework';

async function expectNoFriendlyError(page: Page) {
  const hasFriendlyError = await page.getByText(/Something went wrong/i).isVisible().catch(() => false);
  expect(hasFriendlyError).toBe(false);
}

test.describe('SmashUp 状态注入稳定性（三板斧）', () => {
  test('僵尸场景注入后页面不崩溃', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['zombie_outbreak'],
        deck: [],
        discard: [],
        factions: ['zombies', 'pirates'],
        actionsPlayed: 0,
        actionLimit: 1,
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['ninjas', 'aliens'],
      },
      bases: [{ defId: 'base_the_mothership', minions: [] }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
    await expectNoFriendlyError(page);
    await game.screenshot('state-injection-debug-zombie-stable', testInfo);
  });

  test('海盗场景注入后页面不崩溃', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['pirate_cannon'],
        deck: [],
        discard: [],
        factions: ['pirates', 'ninjas'],
        actionsPlayed: 0,
        actionLimit: 1,
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['robots', 'aliens'],
      },
      bases: [{
        defId: 'base_the_mothership',
        minions: [{ uid: 'enemy-minion-1', defId: 'zombie_walker', owner: '1', controller: '1', basePower: 2 }],
      }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
    await expectNoFriendlyError(page);
    await game.screenshot('state-injection-debug-pirate-stable', testInfo);
  });
});
