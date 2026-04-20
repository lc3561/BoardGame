import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../framework';
import { GameTestContext } from '../framework/GameTestContext';
import {
  createSWRoomViaAPI,
  GAME_NAME,
  clickFactionReady,
  clickFactionStart,
  getFactionCard,
  getFactionStartButton,
  getPlayerStatusCard,
  initSWContext,
  selectFactionById,
  waitForFactionSelectionReady,
  waitForSummonerWarsUI,
} from '../helpers/summonerwars';
import {
  ensureGameServerAvailable,
  joinMatchViaAPI,
  seedMatchCredentials,
} from '../helpers/common';
import {
  DESKTOP_REFERENCE_VIEWPORT,
  MOBILE_LANDSCAPE_CAPPED_REFERENCE_VIEWPORT,
  MOBILE_LANDSCAPE_REFERENCE_VIEWPORT,
} from '../../src/shared/referenceViewports';

async function joinGuestToSelectionMatch(page: Page, matchId: string) {
  const credentials = await joinMatchViaAPI(page, GAME_NAME, matchId, '1', 'Guest-SW-Selection');
  if (!credentials) {
    throw new Error(`Failed to join SummonerWars match: ${matchId}`);
  }

  await seedMatchCredentials(page, GAME_NAME, matchId, '1', credentials);
  await page.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=1`, { waitUntil: 'domcontentloaded' });
}

async function waitForSelectionLayoutStable(page: Page) {
  await expect(page.getByTestId('sw-faction-selection')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sw-faction-stage')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sw-faction-grid')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sw-faction-preview-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sw-faction-player-rail')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(250);
}

async function createStartedSelectionMatch(browser: Browser, baseURL: string | undefined) {
  const hostContext = await browser.newContext({ baseURL });
  await initSWContext(hostContext, '__sw_selection_turn_lock_host');
  const hostPage = await hostContext.newPage();

  await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
  if (!(await ensureGameServerAvailable(hostPage))) {
    await hostContext.close().catch(() => {});
    return null;
  }

  const matchId = await createSWRoomViaAPI(hostPage);
  if (!matchId) {
    await hostContext.close().catch(() => {});
    return null;
  }

  await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
  await waitForFactionSelectionReady(hostPage);

  const guestContext = await browser.newContext({ baseURL });
  await initSWContext(guestContext, '__sw_selection_turn_lock_guest');
  const guestPage = await guestContext.newPage();

  try {
    await guestPage.goto('/', { waitUntil: 'domcontentloaded' });
    await joinGuestToSelectionMatch(guestPage, matchId);
    await waitForFactionSelectionReady(guestPage);

    await selectFactionById(hostPage, 'necromancer');
    await selectFactionById(guestPage, 'trickster');
    await clickFactionReady(guestPage);
    await expect(getFactionStartButton(hostPage)).toBeEnabled();
    await clickFactionStart(hostPage);
    await waitForSummonerWarsUI(hostPage, 30000);
    await waitForSummonerWarsUI(guestPage, 30000);

    return { hostPage, guestPage, hostContext, guestContext, matchId };
  } catch (error) {
    await hostContext.close().catch(() => {});
    await guestContext.close().catch(() => {});
    throw error;
  }
}

test.describe('SummonerWars selection and turn-lock flows', () => {
  const MOBILE_LANDSCAPE_TIGHT_VIEWPORT = { width: 812, height: 375 } as const;

  test('mobile landscape capped viewport keeps faction selection in strict 16:9 proportional scale', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const hostContext = await browser.newContext({
      baseURL,
      viewport: MOBILE_LANDSCAPE_CAPPED_REFERENCE_VIEWPORT,
      isMobile: true,
      hasTouch: true,
    });
    await initSWContext(hostContext, '__sw_selection_mobile_capped_host');
    const hostPage = await hostContext.newPage();
    const hostGame = new GameTestContext(hostPage);

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await ensureGameServerAvailable(hostPage))) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSWRoomViaAPI(hostPage);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    await waitForFactionSelectionReady(hostPage);
    await waitForSelectionLayoutStable(hostPage);

    const cappedLayout = await hostPage.evaluate(() => {
      const stage = document.querySelector('[data-testid="sw-faction-stage"]') as HTMLElement | null;
      if (!stage) {
        return null;
      }
      const rect = stage.getBoundingClientRect();
      const stageStyleWidthPx = Number.parseFloat(stage.style.width || '0');
      const stageStyleHeightPx = Number.parseFloat(stage.style.height || '0');
      const inlineUnitPx = Number.parseFloat(stage.style.getPropertyValue('--sw-selection-inline-unit') || '0');
      const blockUnitPx = Number.parseFloat(stage.style.getPropertyValue('--sw-selection-block-unit') || '0');
      const expectedScale = Math.min((window.innerWidth - 12) / 1280, (window.innerHeight - 4) / 720, 1);
      const expectedStyleWidthPx = Math.round(1280 * expectedScale);
      const expectedStyleHeightPx = Math.round(720 * expectedScale);
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        stageWidth: rect.width,
        stageHeight: rect.height,
        stageStyleWidth: stage.style.width,
        stageStyleHeight: stage.style.height,
        stageStyleWidthPx,
        stageStyleHeightPx,
        inlineUnitPx,
        blockUnitPx,
        expectedStyleWidthPx,
        expectedStyleHeightPx,
      };
    });

    expect(cappedLayout).not.toBeNull();
    expect(cappedLayout?.viewportWidth).toBe(MOBILE_LANDSCAPE_CAPPED_REFERENCE_VIEWPORT.width);
    expect(cappedLayout?.viewportHeight).toBe(MOBILE_LANDSCAPE_CAPPED_REFERENCE_VIEWPORT.height);
    expect(cappedLayout?.stageStyleWidthPx ?? 0).toBe(cappedLayout?.expectedStyleWidthPx ?? 0);
    expect(cappedLayout?.stageStyleHeightPx ?? 0).toBe(cappedLayout?.expectedStyleHeightPx ?? 0);
    expect(Math.abs((cappedLayout?.stageStyleWidthPx ?? 0) / Math.max(cappedLayout?.stageStyleHeightPx ?? 1, 1) - (1280 / 720))).toBeLessThanOrEqual(0.01);
    expect(Math.abs((cappedLayout?.inlineUnitPx ?? 0) * 100 - (cappedLayout?.stageStyleWidthPx ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((cappedLayout?.blockUnitPx ?? 0) * 100 - (cappedLayout?.stageStyleHeightPx ?? 0))).toBeLessThanOrEqual(1);
    expect(cappedLayout?.stageStyleWidth).not.toBe('900px');

    await hostGame.screenshot('selection-phone-landscape-capped-entry', testInfo);
    await hostContext.close();
  });

  test('mobile landscape keeps faction selection aligned with pc composition', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const hostContext = await browser.newContext({
      baseURL,
      viewport: MOBILE_LANDSCAPE_REFERENCE_VIEWPORT,
      isMobile: true,
      hasTouch: true,
    });
    await initSWContext(hostContext, '__sw_selection_mobile_host');
    const hostPage = await hostContext.newPage();
    const hostGame = new GameTestContext(hostPage);

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await ensureGameServerAvailable(hostPage))) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSWRoomViaAPI(hostPage);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    await waitForFactionSelectionReady(hostPage);
    await waitForSelectionLayoutStable(hostPage);

    await expect(hostPage.getByTestId('sw-faction-stage')).toBeVisible();
    await expect(hostPage.getByTestId('sw-faction-grid')).toBeVisible();
    await expect(hostPage.getByTestId('sw-faction-player-rail')).toBeVisible();
    await expect(hostPage.getByTestId('sw-faction-title')).toBeVisible();

    const entryLayout = await hostPage.evaluate(() => {
      const vv = window.visualViewport;
      const viewportLeft = vv?.offsetLeft ?? 0;
      const viewportTop = vv?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (vv?.width ?? window.innerWidth);
      const viewportBottom = viewportTop + (vv?.height ?? window.innerHeight);
      const layoutViewportRight = document.documentElement.clientWidth;
      const layoutViewportBottom = document.documentElement.clientHeight;
      const effectiveViewportRight = Math.max(viewportRight, layoutViewportRight);
      const effectiveViewportBottom = Math.max(viewportBottom, layoutViewportBottom);
      const rectOf = (selector: string) => {
        const node = document.querySelector(selector) as HTMLElement | null;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      };
      const banner = document.querySelector('[data-testid="opponent-offline-banner"]') as HTMLElement | null;

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        viewportLeft,
        viewportTop,
        viewportRight,
        viewportBottom,
        effectiveViewportRight,
        effectiveViewportBottom,
        rootScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        stageRect: rectOf('[data-testid="sw-faction-stage"]'),
        lowerInnerRect: rectOf('[data-testid="sw-faction-lower-stage-inner"]'),
        gridRect: rectOf('[data-testid="sw-faction-grid"]'),
        previewRect: rectOf('[data-testid="sw-faction-preview-panel"]'),
        rightClusterRect: rectOf('[data-testid="sw-faction-right-anchor-cluster"]'),
        railRect: rectOf('[data-testid="sw-faction-player-rail"]'),
        titleRect: rectOf('[data-testid="sw-faction-title"]'),
        waitingBannerRect: rectOf('[data-testid="opponent-offline-banner"]'),
        waitingBannerStyleLeft: banner?.style.left ?? null,
        waitingBannerComputedLeft: banner ? window.getComputedStyle(banner).left : null,
        waitingBannerComputedTransform: banner ? window.getComputedStyle(banner).transform : null,
        computedStageWidthPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element).width || '0',
        ),
        computedStageHeightPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element).height || '0',
        ),
        inlineUnitPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element)
            .getPropertyValue('--sw-selection-inline-unit') || '0',
        ),
        blockUnitPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element)
            .getPropertyValue('--sw-selection-block-unit') || '0',
        ),
      };
    });

    expect(entryLayout.rootScrollWidth).toBeLessThanOrEqual(entryLayout.viewportWidth + 1);
    expect(entryLayout.bodyScrollWidth).toBeLessThanOrEqual(entryLayout.viewportWidth + 1);
    expect(entryLayout.stageRect?.left ?? -1).toBeGreaterThanOrEqual(entryLayout.viewportLeft - 1);
    expect(entryLayout.stageRect?.right ?? 99999).toBeLessThanOrEqual(entryLayout.effectiveViewportRight + 1);
    expect(Math.abs((entryLayout.stageRect?.centerX ?? 0) - entryLayout.viewportWidth / 2)).toBeLessThanOrEqual(24);
    expect(Math.abs((entryLayout.inlineUnitPx * 100) - entryLayout.computedStageWidthPx)).toBeLessThanOrEqual(1);
    expect(Math.abs((entryLayout.blockUnitPx * 100) - entryLayout.computedStageHeightPx)).toBeLessThanOrEqual(1);
    expect(entryLayout.previewRect?.left ?? -1).toBeGreaterThanOrEqual((entryLayout.stageRect?.left ?? 0) - 1);
    expect(
      (entryLayout.previewRect?.left ?? 99999) - (entryLayout.stageRect?.left ?? 0),
      '移动横屏预览区应保持靠左锚定，不应回到中间簇布局',
    ).toBeLessThanOrEqual(Math.max(entryLayout.inlineUnitPx, 1) * 5.6);
    expect(entryLayout.rightClusterRect).not.toBeNull();
    expect(entryLayout.rightClusterRect?.right ?? 99999).toBeLessThanOrEqual((entryLayout.stageRect?.right ?? 0) + 1);
    expect(
      (entryLayout.stageRect?.right ?? 99999) - (entryLayout.rightClusterRect?.right ?? 0),
      '移动横屏状态区应保持靠右锚定，不应明显远离舞台右边',
    ).toBeLessThanOrEqual(Math.max(entryLayout.inlineUnitPx, 1) * 5.6);
    expect(entryLayout.gridRect?.bottom ?? 0).toBeLessThan(entryLayout.previewRect?.top ?? 99999);
    expect(entryLayout.gridRect?.bottom ?? 0).toBeLessThan(entryLayout.railRect?.top ?? 99999);
    expect(entryLayout.waitingBannerRect).not.toBeNull();
    expect(
      Math.abs((entryLayout.waitingBannerRect?.centerX ?? 0) - (entryLayout.titleRect?.centerX ?? 0)),
      '等待横幅应与选择界面标题保持近似居中'
    ).toBeLessThanOrEqual(16);

    await hostGame.screenshot('selection-phone-landscape-entry', testInfo);

    const guestContext = await browser.newContext({ baseURL });
    await initSWContext(guestContext, '__sw_selection_mobile_guest');
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/', { waitUntil: 'domcontentloaded' });
    await joinGuestToSelectionMatch(guestPage, matchId);
    await waitForFactionSelectionReady(guestPage);
    await waitForSelectionLayoutStable(guestPage);

    await selectFactionById(hostPage, 'necromancer');
    await expect(getFactionCard(hostPage, 'necromancer')).toHaveAttribute('data-selected', 'true');

    await selectFactionById(guestPage, 'trickster');
    await expect(getFactionCard(guestPage, 'trickster')).toHaveAttribute('data-selected', 'true');

    const selectedLayout = await hostPage.evaluate(() => {
      const vv = window.visualViewport;
      const viewportLeft = vv?.offsetLeft ?? 0;
      const viewportTop = vv?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (vv?.width ?? window.innerWidth);
      const viewportBottom = viewportTop + (vv?.height ?? window.innerHeight);
      const layoutViewportRight = document.documentElement.clientWidth;
      const layoutViewportBottom = document.documentElement.clientHeight;
      const effectiveViewportRight = Math.max(viewportRight, layoutViewportRight);
      const effectiveViewportBottom = Math.max(viewportBottom, layoutViewportBottom);
      const rectOf = (selector: string) => {
        const node = document.querySelector(selector) as HTMLElement | null;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };
      const preview = document.querySelector('[data-testid="sw-faction-preview-panel"]') as HTMLElement | null;
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        viewportLeft,
        viewportTop,
        viewportRight,
        viewportBottom,
        effectiveViewportRight,
        effectiveViewportBottom,
        stageRect: rectOf('[data-testid="sw-faction-stage"]'),
        lowerInnerRect: rectOf('[data-testid="sw-faction-lower-stage-inner"]'),
        previewRect: rectOf('[data-testid="sw-faction-preview-panel"]'),
        rightClusterRect: rectOf('[data-testid="sw-faction-right-anchor-cluster"]'),
        railRect: rectOf('[data-testid="sw-faction-player-rail"]'),
        actionRailRect: rectOf('[data-testid="sw-faction-action-rail"]'),
        actionButtonRect: rectOf(
          '[data-testid="sw-faction-start"], [data-testid="sw-faction-ready"], [data-testid="sw-faction-unready"]',
        ),
        previewHasImage: !!preview?.querySelector('img'),
        waitingBannerRect: rectOf('[data-testid="opponent-offline-banner"]'),
        titleRect: rectOf('[data-testid="sw-faction-title"]'),
        computedStageWidthPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element).width || '0',
        ),
        computedStageHeightPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element).height || '0',
        ),
        inlineUnitPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element)
            .getPropertyValue('--sw-selection-inline-unit') || '0',
        ),
        blockUnitPx: Number.parseFloat(
          window.getComputedStyle(document.querySelector('[data-testid="sw-faction-stage"]') as Element)
            .getPropertyValue('--sw-selection-block-unit') || '0',
        ),
      };
    });

    expect(selectedLayout.stageRect?.right ?? 99999).toBeLessThanOrEqual(selectedLayout.effectiveViewportRight + 1);
    expect(Math.abs((selectedLayout.inlineUnitPx * 100) - selectedLayout.computedStageWidthPx)).toBeLessThanOrEqual(1);
    expect(Math.abs((selectedLayout.blockUnitPx * 100) - selectedLayout.computedStageHeightPx)).toBeLessThanOrEqual(1);
    expect(selectedLayout.previewHasImage).toBe(true);
    expect(selectedLayout.previewRect?.right ?? 0).toBeLessThanOrEqual(selectedLayout.railRect?.left ?? 99999);
    expect(selectedLayout.previewRect?.left ?? -1).toBeGreaterThanOrEqual((selectedLayout.stageRect?.left ?? 0) - 1);
    expect(
      (selectedLayout.previewRect?.left ?? 99999) - (selectedLayout.stageRect?.left ?? 0),
      '选将后预览区应继续贴近舞台左边缘',
    ).toBeLessThanOrEqual(Math.max(selectedLayout.inlineUnitPx, 1) * 5.6);
    expect(selectedLayout.railRect?.right ?? 99999).toBeLessThanOrEqual(selectedLayout.effectiveViewportRight + 1);
    expect(selectedLayout.actionRailRect).not.toBeNull();
    expect(selectedLayout.actionButtonRect).not.toBeNull();
    expect(selectedLayout.actionRailRect?.left ?? 0).toBeGreaterThanOrEqual(selectedLayout.railRect?.right ?? 99999);
    expect(selectedLayout.actionRailRect?.right ?? 99999).toBeLessThanOrEqual(selectedLayout.effectiveViewportRight + 1);
    expect(selectedLayout.rightClusterRect).not.toBeNull();
    expect(selectedLayout.rightClusterRect?.right ?? 0).toBeLessThanOrEqual((selectedLayout.stageRect?.right ?? 0) + 1);
    expect(
      (selectedLayout.stageRect?.right ?? 99999) - (selectedLayout.rightClusterRect?.right ?? 0),
      '选将后操作区应继续贴近舞台右边缘',
    ).toBeLessThanOrEqual(Math.max(selectedLayout.inlineUnitPx, 1) * 5.6);
    expect(selectedLayout.actionButtonRect?.left ?? 0).toBeGreaterThanOrEqual(selectedLayout.actionRailRect?.left ?? 99999);
    expect(selectedLayout.actionButtonRect?.right ?? 99999).toBeLessThanOrEqual(selectedLayout.effectiveViewportRight + 1);
    expect(
      selectedLayout.actionButtonRect?.width ?? 0,
      '移动横屏操作按钮不应再被玩家状态列挤压成窄条',
    ).toBeGreaterThanOrEqual(selectedLayout.inlineUnitPx * 12);
    expect(
      (selectedLayout.actionButtonRect?.width ?? 0) / Math.max(selectedLayout.actionButtonRect?.height ?? 1, 1),
      '移动横屏操作按钮应保持横向按钮形态，而不是接近竖条',
    ).toBeGreaterThanOrEqual(2);
    expect(selectedLayout.waitingBannerRect).toBeNull();

    await hostGame.screenshot('selection-phone-landscape-both-picked', testInfo);

    await hostContext.close();
    await guestContext.close();
  });

  test('tight mobile landscape keeps host start button visible under proportional scaling', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const hostContext = await browser.newContext({
      baseURL,
      viewport: MOBILE_LANDSCAPE_TIGHT_VIEWPORT,
      isMobile: true,
      hasTouch: true,
    });
    await initSWContext(hostContext, '__sw_selection_mobile_tight_host');
    const hostPage = await hostContext.newPage();
    const hostGame = new GameTestContext(hostPage);

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await ensureGameServerAvailable(hostPage))) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSWRoomViaAPI(hostPage);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    await waitForFactionSelectionReady(hostPage);
    await waitForSelectionLayoutStable(hostPage);

    const guestContext = await browser.newContext({ baseURL });
    await initSWContext(guestContext, '__sw_selection_mobile_tight_guest');
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/', { waitUntil: 'domcontentloaded' });
    await joinGuestToSelectionMatch(guestPage, matchId);
    await waitForFactionSelectionReady(guestPage);
    await waitForSelectionLayoutStable(guestPage);

    await selectFactionById(hostPage, 'necromancer');
    await selectFactionById(guestPage, 'trickster');
    await clickFactionReady(guestPage);

    const startButton = getFactionStartButton(hostPage);
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    const tightLayout = await hostPage.evaluate(() => {
      const vv = window.visualViewport;
      const viewportLeft = vv?.offsetLeft ?? 0;
      const viewportTop = vv?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (vv?.width ?? window.innerWidth);
      const viewportBottom = viewportTop + (vv?.height ?? window.innerHeight);
      const layoutViewportRight = document.documentElement.clientWidth;
      const layoutViewportBottom = document.documentElement.clientHeight;
      const effectiveViewportRight = Math.max(viewportRight, layoutViewportRight);
      const effectiveViewportBottom = Math.max(viewportBottom, layoutViewportBottom);
      const rectOf = (selector: string) => {
        const node = document.querySelector(selector) as HTMLElement | null;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        viewportLeft,
        viewportTop,
        viewportRight,
        viewportBottom,
        effectiveViewportRight,
        effectiveViewportBottom,
        stageRect: rectOf('[data-testid="sw-faction-stage"]'),
        railRect: rectOf('[data-testid="sw-faction-player-rail"]'),
        actionRailRect: rectOf('[data-testid="sw-faction-action-rail"]'),
        startButtonRect: rectOf('[data-testid="sw-faction-start"]'),
      };
    });

    expect(tightLayout.actionRailRect).not.toBeNull();
    expect(tightLayout.startButtonRect).not.toBeNull();
    expect(tightLayout.startButtonRect?.left ?? 0).toBeGreaterThanOrEqual(tightLayout.viewportLeft - 1);
    expect(tightLayout.startButtonRect?.right ?? 99999).toBeLessThanOrEqual(tightLayout.effectiveViewportRight + 1);
    expect(tightLayout.startButtonRect?.top ?? 0).toBeGreaterThanOrEqual(tightLayout.viewportTop - 1);
    expect(tightLayout.startButtonRect?.bottom ?? 99999).toBeLessThanOrEqual(tightLayout.effectiveViewportBottom + 1);
    expect(tightLayout.actionRailRect?.right ?? 99999).toBeLessThanOrEqual(tightLayout.effectiveViewportRight + 1);
    expect(tightLayout.railRect).not.toBeNull();
    expect(tightLayout.actionRailRect?.left ?? 0).toBeGreaterThanOrEqual(tightLayout.railRect?.right ?? 99999);
    expect(tightLayout.startButtonRect?.left ?? 0).toBeGreaterThanOrEqual(tightLayout.actionRailRect?.left ?? 99999);
    expect(tightLayout.startButtonRect?.right ?? 99999).toBeLessThanOrEqual(tightLayout.stageRect?.right ?? 99999);
    expect(tightLayout.startButtonRect?.bottom ?? 99999).toBeLessThanOrEqual(tightLayout.stageRect?.bottom ?? 99999);
    expect(tightLayout.stageRect?.right ?? 99999).toBeLessThanOrEqual(tightLayout.effectiveViewportRight + 1);
    expect(tightLayout.stageRect?.bottom ?? 99999).toBeLessThanOrEqual(tightLayout.effectiveViewportBottom + 1);

    await hostGame.screenshot('selection-phone-landscape-tight-start-visible', testInfo);

    await hostContext.close();
    await guestContext.close();
  });

  test('main flow enters match from faction selection', async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;

    const hostContext = await browser.newContext({
      baseURL,
      viewport: DESKTOP_REFERENCE_VIEWPORT,
    });
    await initSWContext(hostContext, '__sw_selection_host');
    const hostPage = await hostContext.newPage();
    const hostGame = new GameTestContext(hostPage);

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await ensureGameServerAvailable(hostPage))) {
      test.skip(true, 'Game server unavailable');
    }

    const matchId = await createSWRoomViaAPI(hostPage);
    if (!matchId) {
      test.skip(true, 'Room creation failed');
    }

    await hostPage.goto(`/play/${GAME_NAME}/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    await waitForFactionSelectionReady(hostPage);
    await hostGame.screenshot('selection-host-entry', testInfo);

    const guestContext = await browser.newContext({ baseURL });
    await initSWContext(guestContext, '__sw_selection_guest');
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/', { waitUntil: 'domcontentloaded' });
    await joinGuestToSelectionMatch(guestPage, matchId);
    await waitForFactionSelectionReady(guestPage);

    await selectFactionById(hostPage, 'necromancer');
    await expect(getFactionCard(hostPage, 'necromancer')).toHaveAttribute('data-selected', 'true');
    await hostGame.screenshot('selection-host-picked-necromancer', testInfo);

    await selectFactionById(guestPage, 'trickster');
    await expect(getFactionCard(guestPage, 'trickster')).toHaveAttribute('data-selected', 'true');
    await hostGame.screenshot('selection-guest-picked-trickster', testInfo);
    await expect(getPlayerStatusCard(hostPage, '1')).toHaveAttribute('data-faction-id', 'trickster');
    await hostGame.screenshot('selection-both-picked-before-ready', testInfo);
    await hostGame.screenshot('selection-both-picked', testInfo);

    await clickFactionReady(guestPage);
    await expect(getPlayerStatusCard(hostPage, '1')).toHaveAttribute('data-ready', 'true');
    await expect(getFactionStartButton(hostPage)).toBeEnabled();
    await hostGame.screenshot('selection-host-start-enabled', testInfo);

    await clickFactionStart(hostPage);
    await waitForSummonerWarsUI(hostPage, 30000);
    await waitForSummonerWarsUI(guestPage, 30000);
    await hostGame.screenshot('selection-game-started', testInfo);
    await hostGame.screenshot('selection-guest-game-started', testInfo);

    await expect(hostPage.getByTestId('sw-phase-tracker')).toBeVisible();
    await expect(hostPage.getByTestId('sw-hand-area')).toBeVisible();
    await expect(hostPage.getByTestId('sw-map-container')).toBeVisible();

    await hostContext.close();
    await guestContext.close();
  });

  test('ui stability keeps end-phase locked for waiting player', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await createStartedSelectionMatch(browser, baseURL);

    if (!setup) {
      test.skip(true, 'Game server unavailable or room creation failed');
    }

    const { hostPage, guestPage, hostContext, guestContext } = setup!;
    const guestGame = new GameTestContext(guestPage);

    await expect(hostPage.getByTestId('sw-end-phase')).toBeEnabled();
    await expect(guestPage.getByTestId('sw-end-phase')).toBeDisabled();
    await expect(guestPage.getByTestId('sw-action-banner')).toContainText(/等待对手|Waiting for opponent/i);
    await guestGame.screenshot('ui-guest-turn-locked', testInfo);

    await hostContext.close();
    await guestContext.close();
  });
});
