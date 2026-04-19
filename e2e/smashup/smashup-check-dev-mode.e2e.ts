/**
 * 检查开发模式状态
 */

import { test } from '../framework';
import {
    setupTwoPlayerMatch,
    completeFactionSelection,
    waitForHandArea,
    cleanupTwoPlayerMatch,
} from './smashup-helpers';

test.describe('检查开发模式', () => {
    test('检查 import.meta.env.DEV 的值', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupTwoPlayerMatch(browser, baseURL);
        if (!setup) {
            console.log('[测试] 创建对局失败');
            test.skip();
            return;
        }

        const { hostPage, guestPage } = setup;

        try {
            await completeFactionSelection(hostPage, guestPage, {
                hostFactions: ['aliens', 'robots'],
                guestFactions: ['ninjas', 'pirates'],
            });

            await waitForHandArea(hostPage);

            // 检查环境变量
            const envInfo = await hostPage.evaluate(() => {
                // 通过全局变量检查
                const harness = (window as Window & {
                    __BG_TEST_HARNESS__?: {
                        state?: { isRegistered?: () => boolean };
                        command?: { isRegistered?: () => boolean };
                    };
                }).__BG_TEST_HARNESS__;
                const globalCheck = {
                    hasDebugFlag: (window as any).__BG_E2E_DEBUG__,
                    hasHarnessState: harness?.state?.isRegistered?.() ?? false,
                    hasHarnessDispatch: harness?.command?.isRegistered?.() ?? false,
                };

                return {
                    global: globalCheck,
                    // 无法直接读取 import.meta.env，但可以检查其他线索
                    location: window.location.href,
                    userAgent: navigator.userAgent,
                };
            });

            console.log('[测试] 环境信息:', JSON.stringify(envInfo, null, 2));

            // 检查调试面板元素
            const debugElements = await hostPage.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return {
                    totalButtons: buttons.length,
                    bugButtons: buttons.filter(b => b.textContent?.includes('🐛')).length,
                    allButtonTexts: buttons.slice(0, 10).map(b => b.textContent?.substring(0, 20)),
                };
            });

            console.log('[测试] 调试元素:', JSON.stringify(debugElements, null, 2));

            await hostPage.screenshot({
                path: testInfo.outputPath('dev-mode-check.png'),
                fullPage: true,
            });

        } finally {
            await cleanupTwoPlayerMatch(setup);
        }
    });
});
