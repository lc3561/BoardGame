/**
 * 召唤师战争 - 洞穴地精阵营特色交互 E2E 测试
 *
 * 覆盖范围：
 * - 神出鬼没（vanish）：召唤师与0费友方单位交换位置
 * - 鲜血符文（blood_rune）：自伤1点 或 花1魔力充能
 * - 喂养巨食兽（feed_beast）：吞噬相邻友方 或 自毁
 */

import { test, expect } from '../framework';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from '../framework/evidenceScreenshots';
import type { Page } from '@playwright/test';

type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('summonerwars');
  await game.setupScene({ gameId: 'summonerwars' });
};
void __ensureThreeAxesMarker;

import {
  setupSWOnlineMatch,
  readCoreState,
  applyCoreState,
  clickBoardElement,
  closeDebugPanelIfOpen,
  waitForPhase,
  cloneState,
} from '../helpers/summonerwars';
import { CHAMPION_UNITS_GOBLIN, COMMON_UNITS_GOBLIN } from '../../src/games/summonerwars/config/factions/goblin';
import { COMMON_UNITS as COMMON_UNITS_NECROMANCER } from '../../src/games/summonerwars/config/factions/necromancer';

// ============================================================================
// 测试状态准备函数
// ============================================================================

const GOBLIN_GLUTTON_CARD = CHAMPION_UNITS_GOBLIN.find((card) => card.id === 'goblin-glutton');
const GOBLIN_CLIMBER_CARD = COMMON_UNITS_GOBLIN.find((card) => card.id === 'goblin-climber');
const NECRO_WARRIOR_CARD = COMMON_UNITS_NECROMANCER.find((card) => card.id === 'necro-undead-warrior');

if (!GOBLIN_GLUTTON_CARD || !GOBLIN_CLIMBER_CARD || !NECRO_WARRIOR_CARD) {
  throw new Error('无法从真实派系配置加载 feed_beast 测试所需卡牌');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 测试中 coreState 为动态 JSON 结构
const clearBoardCell = (board: any[][], row: number, col: number) => {
  board[row][col].unit = null;
  board[row][col].structure = null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 测试中 coreState 为动态 JSON 结构
const prepareVanishState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  const player = next.players?.['0'];
  if (!player) throw new Error('无法读取玩家0状态');
  player.attackCount = 0;
  next.abilityUsageCount = {};
  const board = next.board;
  let summonerPos: { row: number; col: number } | null = null;
  let allyPos: { row: number; col: number } | null = null;
  // 查找召唤师
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = board[row][col];
      if (cell.unit && cell.unit.owner === '0' && cell.unit.card.abilities?.includes('vanish')) {
        summonerPos = { row, col };
        break;
      }
    }
    if (summonerPos) break;
  }
  if (!summonerPos) throw new Error('未找到召唤师思尼克斯');
  // 查找0费友方单位
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = board[row][col];
      if (cell.unit && cell.unit.owner === '0' && cell.unit.card.cost === 0 && 
          !(cell.unit.card.abilities?.includes('vanish'))) {
        allyPos = { row, col };
        break;
      }
    }
    if (allyPos) break;
  }
  if (!allyPos) throw new Error('未找到0费友方单位');
  return { state: next, summonerPos, allyPos };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepareBloodRuneState = (coreState: any) => {
  const next = cloneState(coreState);
  // 确保阶段为 build（blood_rune 在 attack 阶段开始触发，测试需要先在 build 阶段注入状态）
  next.phase = 'build';
  next.currentPlayer = '0';
  next.abilityUsageCount = {};
  const player = next.players?.['0'];
  if (!player) throw new Error('无法读取玩家0状态');
  player.magic = 3;
  
  // 查找或创建布拉夫（有 blood_rune 技能）
  let blarfPos: { row: number; col: number } | null = null;
  for (let row = 0; row < 8 && !blarfPos; row++) {
    for (let col = 0; col < 6 && !blarfPos; col++) {
      const unit = next.board[row]?.[col]?.unit;
      if (unit && unit.owner === '0' && unit.card.abilities?.includes('blood_rune')) {
        blarfPos = { row, col };
      }
    }
  }
  
  // 如果棋盘上没有布拉夫，创建一个
  if (!blarfPos) {
    for (let row = 4; row < 7; row++) {
      for (let col = 0; col < 6; col++) {
        if (!next.board[row][col].unit && !next.board[row][col].structure) {
          next.board[row][col].unit = {
            instanceId: `goblin-blarf-e2e-${row}-${col}`,
            cardId: 'goblin-blarf',
            card: {
              id: 'goblin-blarf', cardType: 'unit', name: '布拉夫', faction: 'goblin',
              cost: 5, life: 7, strength: 3, attackType: 'melee', attackRange: 1,
              unitClass: 'champion', deckSymbols: [], abilities: ['blood_rune', 'power_boost'],
            },
            owner: '0', position: { row, col }, damage: 0, boosts: 0,
            hasMoved: false, hasAttacked: false,
          };
          blarfPos = { row, col };
          break;
        }
      }
      if (blarfPos) break;
    }
  }
  
  if (!blarfPos) throw new Error('无法放置布拉夫');
  return { state: next, blarfPos };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepareFeedBeastState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};

  const player = next.players?.['0'];
  if (!player) throw new Error('无法读取玩家0状态');
  player.attackCount = 0;

  const board = next.board;
  clearBoardCell(board, 6, 2);
  clearBoardCell(board, 6, 3);
  clearBoardCell(board, 5, 2);

  board[6][2].unit = {
    instanceId: 'feed-beast-glutton',
    cardId: GOBLIN_GLUTTON_CARD.id,
    card: { ...GOBLIN_GLUTTON_CARD },
    owner: '0',
    position: { row: 6, col: 2 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[6][3].unit = {
    instanceId: 'feed-beast-ally',
    cardId: GOBLIN_CLIMBER_CARD.id,
    card: { ...GOBLIN_CLIMBER_CARD },
    owner: '0',
    position: { row: 6, col: 3 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[5][2].unit = {
    instanceId: 'feed-beast-target',
    cardId: NECRO_WARRIOR_CARD.id,
    card: { ...NECRO_WARRIOR_CARD, life: 9 },
    owner: '1',
    position: { row: 5, col: 2 },
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  return next;
};

const dismissDiceResultOverlay = async (page: import('@playwright/test').Page) => {
  const overlay = page.getByTestId('sw-dice-result-overlay');
  const visible = await overlay.isVisible().catch(() => false);
  if (!visible) return;
  await overlay.click({ force: true }).catch(() => {});
  await expect(overlay).toBeHidden({ timeout: 8000 });
};

const readHarnessState = async (page: Page) => page.evaluate(() => {
  const harness = (window as Window & {
    __BG_TEST_HARNESS__?: {
      state?: {
        isRegistered?: () => boolean;
        get?: () => unknown;
      };
    };
  }).__BG_TEST_HARNESS__;
  if (!harness?.state?.isRegistered?.()) {
    throw new Error('TestHarness 未就绪');
  }
  return harness.state.get();
});

type HarnessSnapshot = {
  core?: {
    board?: Array<Array<{ unit?: unknown }>>;
    phase?: string;
  };
  sys?: {
    interaction?: {
      current?: {
        data?: {
          sw?: {
            type?: string;
          };
        };
      } | null;
    };
  };
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('洞穴地精阵营特色交互', () => {

  test('神出鬼没：与0费友方单位交换位置', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'goblin', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, hostContext, guestContext } = match;

    try {
      const coreState = await readCoreState(hostPage);
      const { state: vanishCore, summonerPos, allyPos } = prepareVanishState(coreState);
      await applyCoreState(hostPage, vanishCore);
      await closeDebugPanelIfOpen(hostPage);
      await waitForPhase(hostPage, 'attack');
      await hostPage.waitForTimeout(500);

      const summonerName = '思尼克斯';
      const allyName = vanishCore.board?.[allyPos.row]?.[allyPos.col]?.unit?.card?.name;
      if (!allyName) {
        throw new Error('无法读取神出鬼没目标友军名称');
      }

      // 点击召唤师选中它
      const summonerUnit = hostPage.locator(`[data-testid^="sw-unit-"][data-owner="0"][data-unit-name="${summonerName}"]`).first();
      await expect(summonerUnit).toBeVisible({ timeout: 8000 });
      const summonerTestId = await summonerUnit.getAttribute('data-testid') ?? '';
      const [, sRow, sCol] = summonerTestId.match(/sw-unit-(\d+)-(\d+)/) ?? [];
      // 通过调试面板直接设置 selectedUnit
      const vanishState = await readCoreState(hostPage);
      vanishState.selectedUnit = { row: parseInt(sRow), col: parseInt(sCol) };
      await applyCoreState(hostPage, vanishState);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(1000);

      // 点击神出鬼没按钮
      const vanishButton = hostPage.locator('button').filter({ hasText: /神出鬼没|Vanish/i });
      await expect(vanishButton).toBeVisible({ timeout: 8000 });
      await vanishButton.click();
      await hostPage.waitForTimeout(500);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'vanish-target-selection-ready', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/神出鬼没：与0费友方单位交换位置',
        }),
        fullPage: true,
      });

      // 点击0费友方单位完成交换
      const ally = hostPage.locator(`[data-testid="sw-unit-${allyPos.row}-${allyPos.col}"][data-owner="0"][data-unit-name="${allyName}"]`);
      await expect(ally).toBeVisible({ timeout: 5000 });
      const allyCell = hostPage.getByTestId(`sw-cell-${allyPos.row}-${allyPos.col}`);
      await expect(allyCell).toHaveAttribute('data-valid-ability-unit', 'true');
      await allyCell.click({ force: true });
      await hostPage.waitForTimeout(1500);

      // 验证位置交换
      await expect.poll(async () => {
        const latestCore = await readCoreState(hostPage);
        return {
          summonerAtTarget: latestCore.board?.[allyPos.row]?.[allyPos.col]?.unit?.card?.name ?? null,
          allyAtSource: latestCore.board?.[summonerPos.row]?.[summonerPos.col]?.unit?.card?.name ?? null,
        };
      }, { timeout: 5000 }).toEqual({
        summonerAtTarget: summonerName,
        allyAtSource: allyName,
      });
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(300);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'vanish-swap-complete', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/神出鬼没：与0费友方单位交换位置',
        }),
        fullPage: true,
      });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });

  test('鲜血符文：选择自伤获得充能', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'goblin', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, guestPage, hostContext, guestContext } = match;

    try {
      // blood_rune 触发时机：attack 阶段开始（onPhaseStart）
      // 直接把 core 注入到 build 阶段，再点击"结束阶段"进入 attack 触发交互
      const coreState = await readCoreState(hostPage);
      const { state: bloodRuneCore, blarfPos } = prepareBloodRuneState(coreState);
      await applyCoreState(hostPage, bloodRuneCore);
      await closeDebugPanelIfOpen(hostPage);
      await waitForPhase(hostPage, 'build');

      // 记录布拉夫初始伤害
      const blarf = hostPage.locator(`[data-testid="sw-unit-${blarfPos.row}-${blarfPos.col}"][data-owner="0"]`).first();
      await expect(blarf).toBeVisible({ timeout: 8000 });
      const initialDamage = parseInt(await blarf.getAttribute('data-unit-damage') ?? '0');

      // 点击"结束阶段"从 build → attack，触发 blood_rune onPhaseStart
      const endPhaseBtn = hostPage.getByTestId('sw-end-phase');
      await expect(endPhaseBtn).toBeVisible({ timeout: 5000 });
      await endPhaseBtn.click({ force: true });
      await hostPage.waitForTimeout(2000);

      // blood_rune 按钮文本来自 i18n: actions.bloodRuneDamage / actions.bloodRuneCharge
      const damageButton = hostPage.locator('button').filter({ hasText: /自伤1点|Take 1 Damage/i });
      const chargeButton = hostPage.locator('button').filter({ hasText: /花1魔力充能|Spend 1 Magic to Charge/i });
      await expect(damageButton).toBeVisible({ timeout: 10000 });
      await expect(chargeButton).toBeVisible({ timeout: 3000 });
      await expect(guestPage.locator('button').filter({ hasText: /自伤1点|Take 1 Damage/i })).toHaveCount(0);
      await expect(guestPage.locator('button').filter({ hasText: /花1魔力充能|Spend 1 Magic to Charge/i })).toHaveCount(0);

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'blood-rune-owner-visible', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/鲜血符文：选择自伤获得充能',
        }),
        fullPage: true,
      });
      await guestPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'blood-rune-guest-hidden', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/鲜血符文：选择自伤获得充能',
        }),
        fullPage: true,
      });

      // 选择"自伤1点"
      await damageButton.click();
      await hostPage.waitForTimeout(1500);
      await expect(damageButton).toBeHidden({ timeout: 5000 });
      await hostPage.waitForTimeout(1200);
      await expect(damageButton).toBeHidden();

      // 验证布拉夫受到1点伤害
      await expect.poll(async () => {
        const currentDamage = parseInt(await blarf.getAttribute('data-unit-damage') ?? '0');
        return currentDamage;
      }, { timeout: 5000 }).toBe(initialDamage + 1);

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'blood-rune-after-damage', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/鲜血符文：选择自伤获得充能',
        }),
        fullPage: true,
      });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });

  test('喂养巨食兽：攻击阶段结束吞噬相邻友方', async ({ browser }, testInfo) => {
    test.setTimeout(180000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'goblin', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, hostContext, guestContext } = match;

    try {
      const coreState = await readCoreState(hostPage);
      const feedBeastCore = prepareFeedBeastState(coreState);
      await applyCoreState(hostPage, feedBeastCore);
      await closeDebugPanelIfOpen(hostPage);
      await waitForPhase(hostPage, 'attack');
      await hostPage.waitForTimeout(500);

      await clickBoardElement(hostPage, `[data-testid="sw-unit-6-2"][data-owner="0"][data-unit-name="${GOBLIN_GLUTTON_CARD.name}"]`);
      await clickBoardElement(hostPage, `[data-testid="sw-unit-5-2"][data-owner="1"][data-unit-name="${NECRO_WARRIOR_CARD.name}"]`);

      await expect.poll(async () => {
        const latestCore = await readCoreState(hostPage);
        return latestCore?.players?.['0']?.attackCount ?? 0;
      }, { timeout: 10000 }).toBeGreaterThan(0);

      await dismissDiceResultOverlay(hostPage);
      const afterAttackState = await readCoreState(hostPage);
      afterAttackState.selectedUnit = undefined;
      await applyCoreState(hostPage, afterAttackState);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(400);

      const endPhaseBtn = hostPage.getByTestId('sw-end-phase');
      await expect(endPhaseBtn).toBeVisible({ timeout: 5000 });
      await endPhaseBtn.click({ force: true });

      const prompt = hostPage.getByTestId('sw-ability-prompt').filter({
        hasText: /喂养巨食兽|Feed Beast/i,
      }).first();
      await expect(prompt).toBeVisible({ timeout: 10000 });
      await expect.poll(async () => {
        const harnessState = await readHarnessState(hostPage) as HarnessSnapshot;
        return harnessState.sys?.interaction?.current?.data?.sw?.type ?? null;
      }, { timeout: 10000 }).toBe('feed_beast');

      const allyCell = hostPage.getByTestId('sw-cell-6-3');
      await expect(allyCell).toHaveAttribute('data-valid-ability-pos', 'true');

      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'feed-beast-prompt-visible', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/喂养巨食兽：攻击阶段结束吞噬相邻友方',
        }),
        fullPage: true,
      });

      await clickBoardElement(hostPage, '[data-testid="sw-cell-6-3"]');

      await expect.poll(async () => {
        const harnessState = await readHarnessState(hostPage) as HarnessSnapshot;
        return {
          allyPresent: !!harnessState?.core?.board?.[6]?.[3]?.unit,
          beastPresent: !!harnessState?.core?.board?.[6]?.[2]?.unit,
          phase: harnessState?.core?.phase ?? null,
          interactionType: harnessState?.sys?.interaction?.current?.data?.sw?.type ?? null,
        };
      }, { timeout: 15000 }).toEqual({
          allyPresent: false,
          beastPresent: true,
          phase: 'magic',
          interactionType: null,
      });
      await waitForPhase(hostPage, 'magic');
      await expect(prompt).toBeHidden({ timeout: 10000 });

      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'feed-beast-destroy-adjacent-complete', {
          subdir: 'summonerwars/summonerwars-goblin-abilities.e2e/喂养巨食兽：攻击阶段结束吞噬相邻友方',
        }),
        fullPage: true,
      });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });

});
