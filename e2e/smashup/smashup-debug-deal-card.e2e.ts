/**
 * SmashUp 调试发牌能力验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 调试发牌能力（三板斧）', () => {
  test('通过 TestHarness patch 追加手牌后数量应增加', async ({ page, game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['alien_probe'],
        deck: ['robot_zapbot', 'robot_microbot_alpha'],
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

    const beforeState = await game.getState();
    const beforeCount = beforeState?.core?.players?.['0']?.hand?.length ?? 0;

    await page.evaluate(() => {
      const harness = (window as {
        __BG_TEST_HARNESS__?: {
          state?: { patch?: (patch: unknown) => void; get?: () => unknown };
        };
      }).__BG_TEST_HARNESS__;
      const current = harness?.state?.get?.() as { core?: { players?: { '0'?: { hand?: unknown[] } } } } | undefined;
      const currentHand = current?.core?.players?.['0']?.hand ?? [];
      const appended = [
        ...currentHand,
        { uid: 'debug-added-card', defId: 'alien_crop_circles', type: 'action', owner: '0' },
      ];
      harness?.state?.patch?.({
        core: {
          players: {
            '0': {
              hand: appended,
            },
          },
        },
      });
    });

    await expect.poll(async () => {
      const state = await game.getState();
      return state?.core?.players?.['0']?.hand?.length ?? 0;
    }, { timeout: 5000 }).toBe(beforeCount + 1);

    await game.screenshot('debug-deal-card-hand-increased', testInfo);
  });
});
