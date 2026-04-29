/**
 * SummonerWars - 攻击后选择友方单位 E2E 测试
 *
 * 覆盖范围：
 * - 心灵传念（mind_transmission）：攻击后给友方单位额外攻击
 * - 友方单位选择 UI 交互
 * - 额外攻击状态应用
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../framework';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyCoreState,
  clickBoardElement,
  cloneState,
  closeDebugPanelIfOpen,
  readCoreState,
  setupSWOnlineMatch,
  waitForPhase,
} from '../helpers/summonerwars';
import { CHAMPION_UNITS_TRICKSTER, COMMON_UNITS_TRICKSTER } from '../../src/games/summonerwars/config/factions/trickster';
import { COMMON_UNITS as COMMON_UNITS_NECROMANCER } from '../../src/games/summonerwars/config/factions/necromancer';

const EVIDENCE_DIR = join(process.cwd(), 'test-results', 'evidence-screenshots', '_shared', 'summonerwars-ally-selection');
mkdirSync(EVIDENCE_DIR, { recursive: true });

type ThreeAxeGame = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const _ensureThreeAxesMarker = async (game: ThreeAxeGame) => {
  await game.openTestGame('summonerwars');
  await game.setupScene({ gameId: 'summonerwars' });
};
void _ensureThreeAxesMarker;

const clearBoardCell = (board: any[][], row: number, col: number) => {
  board[row][col].unit = null;
  board[row][col].structure = null;
};

const GULZHUANG = CHAMPION_UNITS_TRICKSTER.find((card) => card.id === 'trickster-gulzhuang');
const WIND_ARCHER = COMMON_UNITS_TRICKSTER.find((card) => card.id === 'trickster-wind-archer');
const ENEMY_TARGET = COMMON_UNITS_NECROMANCER.find((card) => card.id === 'necro-undead-warrior');

if (!GULZHUANG || !WIND_ARCHER || !ENEMY_TARGET) {
  throw new Error('无法从真实派系配置加载心灵传念测试所需卡牌');
}

const waitForMindTransmissionPrompt = async (page: Page) => {
  const overlay = page.getByTestId('sw-dice-result-overlay');
  const prompt = page.locator('[data-testid="sw-ability-prompt"]').filter({
    hasText: /读心传念|Mind Transmission|选择目标|Select target/i,
  }).first();

  await expect.poll(async () => {
    const overlayVisible = await overlay.isVisible().catch(() => false);
    if (overlayVisible) {
      await page.screenshot({ path: join(EVIDENCE_DIR, 'mind-transmission-dice-overlay.png'), fullPage: false });
      await overlay.click({ force: true }).catch(() => {});
    }
    const promptVisible = await prompt.isVisible().catch(() => false);
    const overlayStillVisible = await overlay.isVisible().catch(() => false);
    return promptVisible && !overlayStillVisible;
  }, {
    timeout: 15000,
    message: '等待读心传念提示出现并关闭攻击骰子特写',
  }).toBe(true);

  return prompt;
};

const readHarnessState = async (page: Page) => page.evaluate(() => {
  const harness = (window as any).__BG_TEST_HARNESS__;
  if (!harness?.state?.isRegistered?.()) {
    throw new Error('TestHarness 未就绪');
  }
  return harness.state.get();
});

const dismissDiceResultOverlay = async (page: Page) => {
  const closed = await page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>('[data-testid="sw-dice-result-overlay"]');
    if (!overlay) return false;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  });
  if (!closed) return;
  await expect(page.getByTestId('sw-dice-result-overlay')).toBeHidden({ timeout: 8000 });
};

const prepareMindTransmissionState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};

  const player = next.players?.['0'];
  if (!player) throw new Error('玩家 0 状态不存在');
  player.attackCount = 0;

  const board = next.board;
  clearBoardCell(board, 6, 2);
  clearBoardCell(board, 5, 2);
  clearBoardCell(board, 6, 4);

  board[6][2].unit = {
    instanceId: 'mind-champion',
    cardId: GULZHUANG.id,
    card: { ...GULZHUANG },
    owner: '0',
    position: { row: 6, col: 2 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[5][2].unit = {
    instanceId: 'mind-target',
    cardId: ENEMY_TARGET.id,
    card: { ...ENEMY_TARGET, life: 8 },
    owner: '1',
    position: { row: 5, col: 2 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[6][4].unit = {
    instanceId: 'mind-soldier',
    cardId: WIND_ARCHER.id,
    card: { ...WIND_ARCHER },
    owner: '0',
    position: { row: 6, col: 4 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  return next;
};

test.describe('召唤师战争 - 攻击后选择友方单位', () => {
  test('心灵传念：攻击后给友方单位额外攻击', async ({ browser }, testInfo) => {
    test.setTimeout(180000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');
    if (!match) {
      test.skip(true, 'Game server unavailable for online tests.');
      return;
    }

    const { hostPage, hostContext, guestContext } = match;

    try {
      const coreState = await readCoreState(hostPage);
      const preparedCore = prepareMindTransmissionState(coreState);
      await applyCoreState(hostPage, preparedCore);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(500);

      await waitForPhase(hostPage, 'attack');

      const champion = hostPage.locator(`[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${GULZHUANG.name}"]`).first();
      const allySoldier = hostPage.locator(`[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${WIND_ARCHER.name}"]`).first();
      await expect(champion).toHaveCount(1);
      await expect(allySoldier).toHaveCount(1);

      await clickBoardElement(hostPage, `[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${GULZHUANG.name}"]`);
      await clickBoardElement(hostPage, `[data-testid^="sw-unit-"][data-owner="1"][data-unit-name="${ENEMY_TARGET.name}"]`);

      const allySelectionPrompt = await waitForMindTransmissionPrompt(hostPage);

      await clickBoardElement(hostPage, '[data-testid="sw-cell-6-4"]');

      await expect.poll(async () => {
        const latestState = await readHarnessState(hostPage);
        return {
          extraAttacks: latestState?.core?.board?.[6]?.[4]?.unit?.extraAttacks ?? 0,
          interactionType: latestState?.sys?.interaction?.current?.data?.sw?.type ?? null,
        };
      }, { timeout: 5000 }).toEqual({
        extraAttacks: 1,
        interactionType: null,
      });

      await expect(allySelectionPrompt).toBeHidden({ timeout: 5000 });
      await dismissDiceResultOverlay(hostPage);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({ path: join(EVIDENCE_DIR, 'mind-transmission-extra-attack-granted.png'), fullPage: false });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });
});
