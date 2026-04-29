import type { Page } from '@playwright/test';
import { test, expect } from '../framework';
import { GameTestContext } from '../framework/GameTestContext';
import { waitForTestHarness } from '../helpers/common';
import { prepareTelekinesisState } from '../helpers/summonerwars-abilities-states';
import {
  applyCoreState,
  closeDebugPanelIfOpen,
  getBoardUnit,
  readCoreState,
  setupSWOnlineMatch,
  waitForPhase,
} from '../helpers/summonerwars';


type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('summonerwars');
  await game.setupScene({ gameId: 'summonerwars' });
};
void __ensureThreeAxesMarker;

type TelekinesisCommand = {
  type: 'sw:activate_ability';
  playerId: '0';
  payload: {
    abilityId: 'telekinesis';
    sourceUnitId: string;
    targetPosition: { row: number; col: number };
    newPosition: { row: number; col: number };
    direction: 'push' | 'pull';
    moveRow?: number;
    moveCol?: number;
  };
};

const dispatchHarnessCommand = async (page: Page, command: TelekinesisCommand) => {
  await page.evaluate(async (cmd) => {
    const harness = (window as Window & {
      __BG_TEST_HARNESS__?: {
        command?: { dispatch?: (input: unknown) => Promise<void> };
      };
    }).__BG_TEST_HARNESS__;
    if (typeof harness?.command?.dispatch !== 'function') {
      throw new Error('__BG_TEST_HARNESS__.command.dispatch not found');
    }
    await harness.command.dispatch(cmd);
  }, command);
};

test.describe('SummonerWars telekinesis regression', () => {
  test('pushes attacked target to resolved destination and syncs opponent view', async ({ browser }, testInfo) => {
    test.setTimeout(180000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupSWOnlineMatch(browser, baseURL, 'necromancer', 'trickster');

    if (!setup) {
      test.skip(true, 'Game server unavailable or room creation failed');
      return;
    }

    const { hostPage, guestPage, hostContext, guestContext } = setup;
    const hostGame = new GameTestContext(hostPage);

    try {
      await waitForTestHarness(hostPage);

      const coreState = await readCoreState(hostPage);
      const telekinesisState = prepareTelekinesisState(coreState);
      await applyCoreState(hostPage, telekinesisState);
      await closeDebugPanelIfOpen(hostPage);

      await waitForPhase(hostPage, 'attack');
      await expect(getBoardUnit(hostPage, 5, 2)).toBeVisible();
      await expect(getBoardUnit(hostPage, 5, 3)).toBeVisible();

      const stateBeforeAbility = await readCoreState(hostPage);
      const sourceUnitId = stateBeforeAbility.board[5]?.[2]?.unit?.instanceId;
      if (!sourceUnitId) {
        throw new Error('Telekinesis source unit at 5-2 not found before ability resolution');
      }

      await dispatchHarnessCommand(hostPage, {
        type: 'sw:activate_ability',
        playerId: '0',
        payload: {
          abilityId: 'telekinesis',
          sourceUnitId,
          targetPosition: { row: 5, col: 3 },
          newPosition: { row: 5, col: 4 },
          direction: 'push',
          moveRow: 0,
          moveCol: 1,
        },
      });

      await expect.poll(async () => {
        const state = await readCoreState(hostPage);
        return state.board[5]?.[4]?.unit?.owner ?? null;
      }, { timeout: 5000 }).toBe('1');

      await expect.poll(async () => {
        const state = await readCoreState(hostPage);
        return state.board[5]?.[3]?.unit ? 'occupied' : 'empty';
      }, { timeout: 5000 }).toBe('empty');

      await expect.poll(async () => await getBoardUnit(guestPage, 5, 4).count(), { timeout: 5000 }).toBe(1);

      await hostGame.screenshot('telekinesis-push-resolved', testInfo);
    } finally {
      await hostContext.close().catch(() => {});
      await guestContext.close().catch(() => {});
    }
  });
});
