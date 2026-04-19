# DiceThrone AI 对局 HUD 换位 E2E 证据

## 用例
- 测试文件：`dicethrone-simple-start.e2e.ts`
- 用例名：`Online AI setup HUD seat swap: should render entry and swap with AI immediately`
- 执行命令：`npm run test:e2e:ci:file -- dicethrone-simple-start.e2e.ts "Online AI setup HUD seat swap: should render entry and swap with AI immediately"`
- 执行时间：2026-04-19

## 结果
- Playwright 实跑通过：2/2（`e2e/dicethrone-simple-start.e2e.ts` 与 `e2e/dicethrone/dicethrone-simple-start.e2e.ts`）
- 关键状态断言通过：点击 AI 座位后 `seatingOrder` 从 `['0','1']` 变为 `['1','0']`

## 截图与目检

### 1) 入口出现
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-setup-HUD-seat-swap-should-render-entry-and-swap-with-AI-immediately\30-online-ai-hud-seat-swap-entry.png`
- 目检：右侧 FAB 竖列可见换位图标（左右箭头），说明 AI 对局 setup 阶段已出现换位入口。
- 验收结论：达到“AI 对局有换位入口”的标准。

### 2) 换位面板可操作
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-setup-HUD-seat-swap-should-render-entry-and-swap-with-AI-immediately\31-online-ai-hud-seat-swap-before-click.png`
- 目检：换位入口已激活，测试中可见并可点击 `hud-seat-swap-seat-1`，该座位标记 `AI`。
- 验收结论：达到“可对 AI 座位发起换位”的标准。

### 3) 点击后即时生效
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-setup-HUD-seat-swap-should-render-entry-and-swap-with-AI-immediately\32-online-ai-hud-seat-swap-after-click.png`
- 目检：点击 AI 座位后流程无阻塞，测试状态断言确认座位顺序已交换。
- 验收结论：达到“与 AI 换位立即生效”的标准。
