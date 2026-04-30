import { test } from '@playwright/test';

test.describe.skip('SmashUp 弃牌堆闪烁修复（根目录旧副本已废弃）', () => {
    test('请改跑 e2e/smashup/smashup-discard-glow-fix.e2e.ts', async () => {
        // 旧根级副本曾依赖已废弃的本地模式与调试全局变量，不再作为有效 E2E 入口。
    });
});
