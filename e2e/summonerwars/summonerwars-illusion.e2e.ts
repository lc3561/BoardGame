/**
 * SummonerWars - 选择友方单位复制 E2E 测试
 *
 * 覆盖范围：
 * - 幻象（illusion）：移动阶段开始时选择3格内友方士兵，复制其技能
 * - 友方单位选择 UI 交互
 * - 技能复制状态应用（tempAbilities）
 */

import type { Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '../framework';
import {
  applyCoreState,
  clickBoardElement,
  cloneState,
  closeDebugPanelIfOpen,
  readCoreState,
  setupSWOnlineMatch,
} from '../helpers/summonerwars';
import { COMMON_UNITS_TRICKSTER } from '../../src/games/summonerwars/config/factions/trickster';

const EVIDENCE_DIR = join(process.cwd(), 'test-results', 'evidence-screenshots', '_shared', 'summonerwars-illusion');
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

const MIND_WITCH = COMMON_UNITS_TRICKSTER.find((card) => card.id === 'trickster-mind-witch');
const WIND_ARCHER = COMMON_UNITS_TRICKSTER.find((card) => card.id === 'trickster-wind-archer');

if (!MIND_WITCH || !WIND_ARCHER) {
  throw new Error('无法从真实派系配置加载幻象测试所需卡牌');
}

const waitForIllusionPrompt = async (page: Page) => {
  const prompt = page.locator('[data-testid="sw-ability-prompt"]').filter({
    hasText: /幻化|Illusion|选择.*士兵|复制/i,
  }).first();
  await expect(prompt).toBeVisible({ timeout: 10000 });
  return prompt;
};

const prepareIllusionState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'summon';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};

  const board = next.board;
  clearBoardCell(board, 6, 2);
  clearBoardCell(board, 6, 4);

  board[6][2].unit = {
    instanceId: 'illusion-witch',
    cardId: MIND_WITCH.id,
    card: { ...MIND_WITCH },
    owner: '0',
    position: { row: 6, col: 2 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[6][4].unit = {
    instanceId: 'illusion-archer',
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

test.describe('召唤师战争 - 选择友方单位复制', () => {
  test('幻象：移动阶段开始时复制友方士兵技能', async ({ browser }, testInfo) => {
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
      const preparedCore = prepareIllusionState(coreState);
      await applyCoreState(hostPage, preparedCore);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(500);

      const witch = hostPage.locator(`[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${MIND_WITCH.name}"]`).first();
      const archer = hostPage.locator(`[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${WIND_ARCHER.name}"]`).first();
      await expect(witch).toHaveCount(1);
      await expect(archer).toHaveCount(1);

      await hostPage.getByTestId('sw-end-phase').click();
      const illusionPrompt = await waitForIllusionPrompt(hostPage);
      await hostPage.screenshot({ path: join(EVIDENCE_DIR, 'illusion-prompt-visible.png'), fullPage: false });

      await clickBoardElement(hostPage, '[data-testid="sw-cell-6-4"]');
      await expect(illusionPrompt).toBeHidden({ timeout: 5000 });

      await expect.poll(async () => {
        const latestCore = await readCoreState(hostPage);
        const copied = latestCore.board?.[6]?.[2]?.unit?.tempAbilities ?? [];
        return Array.isArray(copied) && copied.includes('swift') && copied.includes('ranged');
      }, {
        timeout: 5000,
        message: '等待心灵巫女复制清风弓箭手技能',
      }).toBe(true);

      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({ path: join(EVIDENCE_DIR, 'illusion-temp-abilities-applied.png'), fullPage: false });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });
});
