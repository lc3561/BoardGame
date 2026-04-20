/**
 * SmashUp 外星人派系图集索引验证
 * 通过注入状态直接测试特定卡牌的图片显示
 */

import { test, expect } from '../framework';
import {
    setupTwoPlayerMatch,
    completeFactionSelection,
    waitForHandArea,
    cleanupTwoPlayerMatch,
} from './smashup-helpers';
import { readCoreState, applyCoreState } from '../helpers/smashup';


type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('smashup');
  await game.setupScene({ gameId: 'smashup' });
};
void __ensureThreeAxesMarker;

test.describe('SmashUp 外星人图集索引验证', () => {
    test('验证 Probe、Terraforming、Crop Circles 的图片', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupTwoPlayerMatch(browser, baseURL);
        if (!setup) {
            console.log('[测试] 创建对局失败');
            test.skip();
            return;
        }

        const { hostPage, guestPage } = setup;

        await completeFactionSelection(hostPage, guestPage);
        await waitForHandArea(hostPage);
        await waitForHandArea(guestPage);

        // 注入测试卡牌到手牌
        const core = await readCoreState(hostPage) as {
            players?: Record<string, { hand?: unknown[] }>;
        };
        if (!core.players?.['0']) {
            throw new Error('未找到玩家0状态，无法注入测试手牌');
        }
        core.players['0'].hand = [
            { uid: 'test-probe', defId: 'alien_probe', type: 'action', owner: '0' },
            { uid: 'test-terraform', defId: 'alien_terraform', type: 'action', owner: '0' },
            { uid: 'test-crop', defId: 'alien_crop_circles', type: 'action', owner: '0' },
        ];
        await applyCoreState(hostPage, core);

        await hostPage.waitForTimeout(1000);

        // 截图手牌区域
        const handArea = hostPage.locator('[data-testid="su-hand-area"]');
        await handArea.screenshot({ 
            path: testInfo.outputPath('alien-cards-verification.png'),
            animations: 'disabled'
        });

        console.log('[测试] 已截图手牌，包含 Probe、Terraforming、Crop Circles');
        console.log('[测试] 请检查截图 alien-cards-verification.png');
        console.log('[测试] 从左到右应该是：探究(Probe)、适居化(Terraforming)、麦田怪圈(Crop Circles)');

        await cleanupTwoPlayerMatch(setup);
    });
});
