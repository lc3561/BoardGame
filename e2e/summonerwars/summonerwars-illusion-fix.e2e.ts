/**
 * 召唤师战争 - 幻化能力修复验证测试
 *
 * 迁移目标：
 * - 统一使用 ../framework + setupSWOnlineMatch
 * - 通过当前调试 helper 注入状态，不再依赖旧 fixture 口径
 * - 保持真实 UI 触发链：阶段推进 -> 出现提示 -> 选择/取消
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../framework';
import { waitForTestHarness } from '../helpers/common';
import {
  applyCoreState,
  clickBoardElement,
  cloneState,
  closeDebugPanelIfOpen,
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

type CellCoord = { row: number; col: number };
type UnitExtras = {
  card?: Record<string, unknown>;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 注入状态为动态 JSON
type SWCoreState = any;

const createUnit = (
  owner: '0' | '1',
  instanceId: string,
  cardId: string,
  name: string,
  abilities: string[],
  position: CellCoord,
  extras: UnitExtras = {},
) => ({
  instanceId,
  cardId,
  card: {
    id: cardId,
    cardType: 'unit',
    name,
    faction: owner === '0' ? 'trickster' : 'necromancer',
    cost: 1,
    life: 3,
    strength: 2,
    attackType: 'ranged',
    attackRange: 3,
    unitClass: 'common',
    abilities,
    deckSymbols: [],
    ...extras.card,
  },
  owner,
  position,
  damage: 0,
  boosts: 0,
  hasMoved: false,
  hasAttacked: false,
  ...extras,
});

const prepareIllusionScene = (coreState: SWCoreState) => {
  const next = cloneState(coreState);
  const rows = next.board.length;
  const cols = next.board[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      next.board[row][col] = {
        ...next.board[row][col],
        unit: undefined,
        structure: undefined,
      };
    }
  }

  const witchPosition = { row: Math.min(5, rows - 2), col: Math.min(2, cols - 3) };
  const targetPosition = { row: witchPosition.row, col: Math.min(witchPosition.col + 2, cols - 1) };
  const enemyPosition = { row: Math.max(1, witchPosition.row - 3), col: witchPosition.col };

  next.phase = 'summon';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};

  if (next.players?.['0']) {
    next.players['0'].moveCount = 0;
    next.players['0'].attackCount = 0;
    next.players['0'].hasAttackedEnemy = false;
  }

  next.board[witchPosition.row][witchPosition.col].unit = createUnit(
    '0',
    'witch-1',
    'trickster-mind-witch-test',
    '心灵巫女',
    ['illusion'],
    witchPosition,
  );
  next.board[targetPosition.row][targetPosition.col].unit = createUnit(
    '0',
    'soldier-1',
    'trickster-test-soldier',
    '测试士兵',
    ['charge', 'ferocity'],
    targetPosition,
    {
      card: {
        strength: 1,
        life: 2,
        attackType: 'melee',
        attackRange: 1,
      },
    },
  );
  next.board[enemyPosition.row][enemyPosition.col].unit = createUnit(
    '1',
    'enemy-1',
    'enemy-blocker-test',
    '敌方士兵',
    [],
    enemyPosition,
    {
      card: {
        faction: 'necromancer',
        attackType: 'melee',
        attackRange: 1,
      },
    },
  );

  return {
    core: next,
    witchPosition,
    targetPosition,
  };
};

const getIllusionPrompt = (page: Page) =>
  page.locator('text=/幻化|选择.*士兵|Illusion|Select.*common/i').first();

test.describe('召唤师战争 - 幻化能力修复', () => {
  test('幻化能力正常工作，不会卡死', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');

    if (!match) {
      test.skip(true, 'Game server unavailable or room creation failed');
      return;
    }

    const { hostPage, hostContext, guestContext } = match;

    try {
      await waitForTestHarness(hostPage);

      const baseCore = await readCoreState(hostPage);
      const { core, witchPosition, targetPosition } = prepareIllusionScene(baseCore);
      await applyCoreState(hostPage, core);
      await closeDebugPanelIfOpen(hostPage);
      await waitForPhase(hostPage, 'summon');

      const endPhaseButton = hostPage.getByTestId('sw-end-phase');
      await expect(endPhaseButton).toBeEnabled({ timeout: 5000 });
      await endPhaseButton.click({ force: true });

      const illusionPrompt = getIllusionPrompt(hostPage);
      await expect(illusionPrompt).toBeVisible({ timeout: 8000 });
      await waitForPhase(hostPage, 'move');

      await clickBoardElement(hostPage, `[data-cell-coord="${targetPosition.row}-${targetPosition.col}"]`);

      await expect(illusionPrompt).toBeHidden({ timeout: 5000 });

      const stateAfterCopy = await readCoreState(hostPage);
      const witch = stateAfterCopy.board[witchPosition.row]?.[witchPosition.col]?.unit;

      expect(witch?.tempAbilities ?? []).toEqual(
        expect.arrayContaining(['charge', 'ferocity']),
      );
      await expect(endPhaseButton).toBeEnabled({ timeout: 2000 });
    } finally {
      await hostContext.close().catch(() => {});
      await guestContext.close().catch(() => {});
    }
  });

  test('幻化能力可以取消', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');

    if (!match) {
      test.skip(true, 'Game server unavailable or room creation failed');
      return;
    }

    const { hostPage, hostContext, guestContext } = match;

    try {
      await waitForTestHarness(hostPage);

      const baseCore = await readCoreState(hostPage);
      const { core, witchPosition } = prepareIllusionScene(baseCore);
      await applyCoreState(hostPage, core);
      await closeDebugPanelIfOpen(hostPage);
      await waitForPhase(hostPage, 'summon');

      const endPhaseButton = hostPage.getByTestId('sw-end-phase');
      await endPhaseButton.click({ force: true });

      const illusionPrompt = getIllusionPrompt(hostPage);
      await expect(illusionPrompt).toBeVisible({ timeout: 8000 });

      const cancelButton = hostPage.getByRole('button', { name: /取消|Cancel/i }).first();
      await expect(cancelButton).toBeVisible({ timeout: 3000 });
      await cancelButton.click();

      await expect(illusionPrompt).toBeHidden({ timeout: 5000 });

      const stateAfterCancel = await readCoreState(hostPage);
      const witch = stateAfterCancel.board[witchPosition.row]?.[witchPosition.col]?.unit;

      expect(witch?.tempAbilities ?? []).not.toContain('charge');
      expect(witch?.tempAbilities ?? []).not.toContain('ferocity');
      await expect(endPhaseButton).toBeEnabled({ timeout: 2000 });
    } finally {
      await hostContext.close().catch(() => {});
      await guestContext.close().catch(() => {});
    }
  });
});
