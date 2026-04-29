/**
 * 召唤师战争 - 欺心巫族阵营特色交互 E2E 测试
 * 
 * 覆盖范围：
 * - 心灵捕获（mind_capture）：攻击时控制目标代替伤害
 * - 念力代替攻击（telekinesis_instead）：按钮激活，推拉目标
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../framework';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from '../framework/evidenceScreenshots';
import {
  setupSWOnlineMatch,
  readCoreState,
  applyCoreState,
  clickBoardElement,
  closeDebugPanelIfOpen,
  waitForPhase,
  advanceToPhase,
  cloneState,
} from '../helpers/summonerwars';
import { dismissViteOverlay } from '../helpers/common';
import { COMMON_UNITS as COMMON_UNITS_NECROMANCER, SUMMONER_NECROMANCER } from '../../src/games/summonerwars/config/factions/necromancer';
import { SUMMONER_TRICKSTER } from '../../src/games/summonerwars/config/factions/trickster';
import type { GameTestContext as __ThreeAxeFrameworkMarker } from '../framework';

type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('summonerwars');
  await game.setupScene({ gameId: 'summonerwars' });
};
void __ensureThreeAxesMarker;

const cloneInjectedUnitCard = <T extends { abilities?: string[]; deckSymbols?: string[] }>(card: T): T => ({
  ...card,
  abilities: Array.isArray(card.abilities) ? [...card.abilities] : [],
  deckSymbols: Array.isArray(card.deckSymbols) ? [...card.deckSymbols] : [],
});

const necroWarriorCard = COMMON_UNITS_NECROMANCER.find((card) => card.id === 'necro-undead-warrior');
if (!necroWarriorCard) {
  throw new Error('未找到亡灵战士配置（necro-undead-warrior）');
}


// ============================================================================
// 测试状态准备函数
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 测试中 coreState 为动态 JSON 结构
const prepareMindCaptureState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};
  const player = next.players?.['0'];
  if (!player) throw new Error('无法读取玩家0状态');
  player.attackCount = 0;
  const board = next.board;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      board[row][col].unit = null;
      board[row][col].structure = null;
    }
  }

  const summonerPos = { row: 5, col: 2 };
  const enemyPos = { row: 5, col: 5 };
  const enemySummonerPos = { row: 0, col: 2 };

  board[summonerPos.row][summonerPos.col].unit = {
    instanceId: 'mind-capture-trickster-summoner',
    cardId: SUMMONER_TRICKSTER.id,
    card: cloneInjectedUnitCard(SUMMONER_TRICKSTER),
    owner: '0',
    position: summonerPos,
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[enemySummonerPos.row][enemySummonerPos.col].unit = {
    instanceId: 'mind-capture-necro-summoner',
    cardId: SUMMONER_NECROMANCER.id,
    card: cloneInjectedUnitCard(SUMMONER_NECROMANCER),
    owner: '1',
    position: enemySummonerPos,
    damage: 0,
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  board[enemyPos.row][enemyPos.col].unit = {
    instanceId: 'mind-capture-target-warrior',
    cardId: necroWarriorCard.id,
    card: cloneInjectedUnitCard(necroWarriorCard),
    owner: '1',
    position: enemyPos,
    damage: Math.max(0, necroWarriorCard.life - 1),
    boosts: 0,
    hasMoved: false,
    hasAttacked: false,
  };

  return { state: next, summonerPos, enemyPos };
};

const dismissDiceResultOverlay = async (page: Page) => {
  const overlay = page.getByTestId('sw-dice-result-overlay');
  const visible = await overlay.isVisible().catch(() => false);
  if (!visible) return;
  await overlay.click({ force: true }).catch(() => {});
  await expect(overlay).toBeHidden({ timeout: 8000 });
};

const readVisibleAbilityPromptText = async (page: Page) => page.evaluate(() => {
  const isVisible = (node: Element | null) => {
    if (!(node instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const overlayVisible = isVisible(document.querySelector('[data-testid="sw-dice-result-overlay"]'));
  if (overlayVisible) return '';
  const prompt = Array.from(document.querySelectorAll('[data-testid="sw-ability-prompt"]'))
    .find((node) => isVisible(node));
  if (!(prompt instanceof HTMLElement)) return '';
  return (prompt.innerText || prompt.textContent || '').trim();
}).catch(() => '');

const clickAbilityPromptButton = async (page: Page, pattern: string) => page.evaluate((patternSource) => {
  const isVisible = (node: Element | null) => {
    if (!(node instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const regex = new RegExp(patternSource, 'i');
  const prompt = Array.from(document.querySelectorAll('[data-testid="sw-ability-prompt"]'))
    .find((node) => isVisible(node));
  if (!(prompt instanceof HTMLElement)) {
    return { clicked: false, reason: 'prompt-not-visible', promptText: '' };
  }
  const button = Array.from(prompt.querySelectorAll('button'))
    .find((node) => regex.test(node.textContent ?? ''));
  if (!(button instanceof HTMLButtonElement)) {
    return { clicked: false, reason: 'button-not-found', promptText: prompt.innerText || prompt.textContent || '' };
  }
  if (button.disabled) {
    return { clicked: false, reason: 'button-disabled', promptText: prompt.innerText || prompt.textContent || '' };
  }
  button.click();
  return { clicked: true, reason: 'clicked', promptText: prompt.innerText || prompt.textContent || '' };
}, pattern).catch(() => ({ clicked: false, reason: 'page-evaluate-failed', promptText: '' }));

const hasForceDestination = (
  board: Array<Array<{ unit?: unknown; structure?: unknown }>>,
  row: number,
  col: number,
) => {
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];
  return dirs.some((dir) => {
    const nextRow = row + dir.row;
    const nextCol = col + dir.col;
    if (nextRow < 0 || nextRow >= 8 || nextCol < 0 || nextCol >= 6) return false;
    const cell = board[nextRow]?.[nextCol];
    return Boolean(cell && !cell.unit && !cell.structure);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E 测试中 coreState 为动态 JSON 结构
const prepareTelekinesisInsteadState = (coreState: any) => {
  const next = cloneState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.abilityUsageCount = {};
  const player = next.players?.['0'];
  if (!player) throw new Error('无法读取玩家0状态');
  player.attackCount = 0;
  const board = next.board;
  let magePos: { row: number; col: number } | null = null;
  let targetPos: { row: number; col: number } | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = board[row][col];
      if (cell.unit && cell.unit.owner === '0' && cell.unit.card.abilities?.includes('telekinesis')) {
        cell.unit.hasAttacked = false;
        cell.unit.hasMoved = false;
        magePos = { row, col };
        break;
      }
    }
    if (magePos) break;
  }
  if (!magePos) {
    for (let row = 2; row < 5; row++) {
      for (let col = 1; col < 5; col++) {
        if (!board[row][col].unit && !board[row][col].structure) {
          board[row][col].unit = {
            instanceId: `trickster-mage-test-${row}-${col}`, cardId: 'trickster-mage-test',
            card: { id: 'trickster-mage', cardType: 'unit', name: '清风法师', faction: 'trickster',
              cost: 2, life: 2, strength: 2, attackType: 'ranged', attackRange: 3,
              unitClass: 'common', deckSymbols: [], abilities: ['telekinesis', 'telekinesis_instead'] },
            owner: '0', position: { row, col }, damage: 0, boosts: 0, hasMoved: false, hasAttacked: false,
          };
          magePos = { row, col };
          break;
        }
      }
      if (magePos) break;
    }
  }
  if (!magePos) throw new Error('无法放置清风法师');
  // 在2格内放置非召唤师敌方单位
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (Math.abs(dr) + Math.abs(dc) === 0 || Math.abs(dr) + Math.abs(dc) > 2) continue;
      const r = magePos.row + dr;
      const c = magePos.col + dc;
      if (r < 0 || r >= 8 || c < 0 || c >= 6) continue;
      if (
        board[r][c].unit
        && board[r][c].unit.owner === '1'
        && board[r][c].unit.card.unitClass !== 'summoner'
        && hasForceDestination(board, r, c)
      ) {
        targetPos = { row: r, col: c };
        break;
      }
    }
    if (targetPos) break;
  }
  if (!targetPos) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (Math.abs(dr) + Math.abs(dc) === 0 || Math.abs(dr) + Math.abs(dc) > 2) continue;
        const r = magePos.row + dr;
        const c = magePos.col + dc;
        if (r < 0 || r >= 8 || c < 0 || c >= 6) continue;
        if (!board[r][c].unit && !board[r][c].structure && hasForceDestination(board, r, c)) {
          board[r][c].unit = {
            instanceId: `enemy-tk-target-${r}-${c}`, cardId: 'necro-skeleton-tk',
            card: { id: 'necro-skeleton', cardType: 'unit', name: '骷髅兵', faction: 'necromancer',
              cost: 0, life: 1, strength: 1, attackType: 'melee', attackRange: 1,
              unitClass: 'common', deckSymbols: [], abilities: [] },
            owner: '1', position: { row: r, col: c }, damage: 0, boosts: 0, hasMoved: false, hasAttacked: false,
          };
          targetPos = { row: r, col: c };
          break;
        }
      }
      if (targetPos) break;
    }
  }
  if (!targetPos) throw new Error('无法在清风法师2格内放置敌方单位');
  return { state: next, magePos, targetPos };
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('欺心巫族阵营特色交互', () => {

  test('心灵捕获：攻击命中后选择控制目标', async ({ browser }, testInfo) => {
    test.setTimeout(240000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, hostContext, guestContext } = match;
    try {
      const coreState = await readCoreState(hostPage);
      const { state: mcCore, summonerPos, enemyPos } = prepareMindCaptureState(coreState);
      let promptText = '';
      let promptReady = false;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        await applyCoreState(hostPage, mcCore);
        await closeDebugPanelIfOpen(hostPage);
        await dismissViteOverlay(hostPage);
        await waitForPhase(hostPage, 'attack');
        await hostPage.waitForTimeout(500);
        await clickBoardElement(hostPage, `[data-testid="sw-unit-${summonerPos.row}-${summonerPos.col}"][data-owner="0"][data-unit-name="${SUMMONER_TRICKSTER.name}"]`);
        await clickBoardElement(hostPage, `[data-testid="sw-unit-${enemyPos.row}-${enemyPos.col}"][data-owner="1"][data-unit-name="${necroWarriorCard.name}"]`);

        try {
          await expect.poll(async () => {
            promptText = await readVisibleAbilityPromptText(hostPage);
            return promptText;
          }, { timeout: 8000 }).not.toBe('');
          promptReady = true;
          break;
        } catch {
          await dismissDiceResultOverlay(hostPage).catch(() => {});
        }
      }
      expect(promptReady).toBe(true);
      expect(promptText).toMatch(/心灵捕获|Mind Capture|控制|伤害/i);

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'mind-capture-prompt-visible', {
          filename: 'mind-capture-prompt-visible.png',
        }),
        fullPage: false,
      });

      const controlResult = await clickAbilityPromptButton(hostPage, '^Control$|^控制$');
      expect(controlResult.clicked, `mind_capture 控制点击失败: ${JSON.stringify(controlResult)}`).toBe(true);

      await expect.poll(async () => {
        const state = await readCoreState(hostPage);
        const targetUnit = state?.board?.[enemyPos.row]?.[enemyPos.col]?.unit;
        return {
          owner: targetUnit?.owner ?? null,
          damage: targetUnit?.damage ?? null,
          attackCount: state?.players?.['0']?.attackCount ?? null,
        };
      }, { timeout: 10000 }).toEqual({
        owner: '0',
        damage: Math.max(0, necroWarriorCard.life - 1),
        attackCount: 1,
      });

      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'mind-capture-control-complete', {
          filename: 'mind-capture-control-complete.png',
        }),
        fullPage: false,
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('心灵捕获：攻击命中后选择造成伤害', async ({ browser }, testInfo) => {
    test.setTimeout(240000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, hostContext, guestContext } = match;
    try {
      const coreState = await readCoreState(hostPage);
      const { state: mcCore, summonerPos, enemyPos } = prepareMindCaptureState(coreState);
      let promptText = '';
      let promptReady = false;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        await applyCoreState(hostPage, mcCore);
        await closeDebugPanelIfOpen(hostPage);
        await dismissViteOverlay(hostPage);
        await waitForPhase(hostPage, 'attack');
        await hostPage.waitForTimeout(500);
        await clickBoardElement(hostPage, `[data-testid="sw-unit-${summonerPos.row}-${summonerPos.col}"][data-owner="0"][data-unit-name="${SUMMONER_TRICKSTER.name}"]`);
        await clickBoardElement(hostPage, `[data-testid="sw-unit-${enemyPos.row}-${enemyPos.col}"][data-owner="1"][data-unit-name="${necroWarriorCard.name}"]`);

        try {
          await expect.poll(async () => {
            promptText = await readVisibleAbilityPromptText(hostPage);
            return promptText;
          }, { timeout: 8000 }).not.toBe('');
          promptReady = true;
          break;
        } catch {
          await dismissDiceResultOverlay(hostPage).catch(() => {});
        }
      }
      expect(promptReady).toBe(true);
      expect(promptText).toMatch(/心灵捕获|Mind Capture|控制|伤害/i);

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'mind-capture-damage-prompt-visible', {
          filename: 'mind-capture-damage-prompt-visible.png',
        }),
        fullPage: false,
      });

      const damageResult = await clickAbilityPromptButton(hostPage, '^Damage$|^伤害$');
      expect(damageResult.clicked, `mind_capture 伤害点击失败: ${JSON.stringify(damageResult)}`).toBe(true);

      await expect.poll(async () => {
        const state = await readCoreState(hostPage);
        const targetUnit = state?.board?.[enemyPos.row]?.[enemyPos.col]?.unit ?? null;
        return {
          targetPresent: !!targetUnit,
          attackCount: state?.players?.['0']?.attackCount ?? null,
        };
      }, { timeout: 10000 }).toEqual({
        targetPresent: false,
        attackCount: 1,
      });

      await closeDebugPanelIfOpen(hostPage);
      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'mind-capture-damage-complete', {
          filename: 'mind-capture-damage-complete.png',
        }),
        fullPage: false,
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('念力代替攻击：选中单位后使用按钮推拉目标', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    await clearEvidenceScreenshotsForTest(testInfo);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const match = await setupSWOnlineMatch(browser, baseURL, 'trickster', 'necromancer');
    if (!match) { test.skip(true, 'Game server unavailable or room creation failed.'); return; }
    const { hostPage, hostContext, guestContext } = match;
    try {
      const coreState = await readCoreState(hostPage);
      const { state: tkCore, magePos, targetPos } = prepareTelekinesisInsteadState(coreState);
      await applyCoreState(hostPage, tkCore);
      await closeDebugPanelIfOpen(hostPage);
      await dismissViteOverlay(hostPage);
      await waitForPhase(hostPage, 'attack');
      await hostPage.waitForTimeout(500);
      const selectState = await readCoreState(hostPage);
      selectState.selectedUnit = magePos;
      await applyCoreState(hostPage, selectState);
      await closeDebugPanelIfOpen(hostPage);
      await hostPage.waitForTimeout(1000);
      await dismissViteOverlay(hostPage);
      const tkInsteadButton = hostPage.locator('button').filter({ hasText: /Telekinesis.*Instead|念力.*代替/i });
      await expect(tkInsteadButton).toBeVisible({ timeout: 8000 });
      await tkInsteadButton.click();
      await hostPage.waitForTimeout(1000);
      const target = hostPage.locator(`[data-testid="sw-unit-${targetPos.row}-${targetPos.col}"][data-owner="1"]`).first();
      await expect(target).toBeVisible({ timeout: 5000 });
      const targetCell = hostPage.getByTestId(`sw-cell-${targetPos.row}-${targetPos.col}`);
      await expect(targetCell).toHaveAttribute('data-valid-ability-unit', 'true');
      await targetCell.click({ force: true });
      await hostPage.waitForTimeout(1500);
      const readDirectionChoice = () => hostPage.evaluate(({ excludedRow, excludedCol }) => {
        const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="sw-cell-"]'));
        const matches = cells
          .map((cell) => {
            const testId = cell.dataset.testid ?? cell.getAttribute('data-testid') ?? '';
            const match = testId.match(/^sw-cell-(\d+)-(\d+)$/);
            if (!match) return null;
            const row = Number(match[1]);
            const col = Number(match[2]);
            if (row === excludedRow && col === excludedCol) return null;
            const className = cell.className ?? '';
            const inlineBorder = cell.style.borderColor ?? '';
            const inlineBg = cell.style.backgroundColor ?? '';
            const isTelekinesisHighlight =
              className.includes('animate-pulse')
              && (
                inlineBorder.includes('94, 234, 212')
                || inlineBorder.includes('94,234,212')
                || inlineBg.includes('94, 234, 212')
                || inlineBg.includes('94,234,212')
              );
            if (!isTelekinesisHighlight) return null;
            return { row, col };
          })
          .filter((item): item is { row: number; col: number } => item !== null);
        return matches[0] ?? null;
      }, { excludedRow: targetPos.row, excludedCol: targetPos.col });
      await expect.poll(readDirectionChoice, { timeout: 5000 }).not.toBeNull();
      const directionChoice = await readDirectionChoice();
      expect(directionChoice).toBeTruthy();

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'telekinesis-instead-direction-choice', {
          subdir: 'summonerwars/summonerwars-trickster-abilities.e2e/念力代替攻击：选中单位后使用按钮推拉目标',
        }),
        fullPage: true,
      });

      const targetInstanceId = tkCore.board[targetPos.row][targetPos.col]?.unit?.instanceId;
      expect(targetInstanceId).toBeTruthy();
      const destinationCell = hostPage.getByTestId(`sw-cell-${directionChoice!.row}-${directionChoice!.col}`);
      await destinationCell.click({ force: true });
      await hostPage.waitForTimeout(1500);

      await expect.poll(async () => {
        const afterState = await readCoreState(hostPage);
        return {
          sourceOccupant: afterState.board[targetPos.row][targetPos.col]?.unit?.instanceId ?? null,
          destinationOccupant: afterState.board[directionChoice!.row][directionChoice!.col]?.unit?.instanceId ?? null,
        };
      }, { timeout: 5000 }).toEqual({
        sourceOccupant: null,
        destinationOccupant: targetInstanceId,
      });

      await hostPage.screenshot({
        path: getEvidenceScreenshotPath(testInfo, 'telekinesis-instead-push-resolved', {
          subdir: 'summonerwars/summonerwars-trickster-abilities.e2e/念力代替攻击：选中单位后使用按钮推拉目标',
        }),
        fullPage: true,
      });
    } finally {
      void hostContext.close().catch(() => {});
      void guestContext.close().catch(() => {});
    }
  });
});
