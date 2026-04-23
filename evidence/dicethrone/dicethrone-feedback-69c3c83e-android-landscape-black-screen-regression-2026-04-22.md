# DiceThrone 反馈修复证据（69c3c83e1cf16183c29891b7）

- 反馈标题：`黑屏`
- 严重级别：`critical`
- 游戏：`dicethrone`
- 用户环境线索：Android 横屏（线上反馈快照）。

## 对位验证

1. 旧 WebView board-shell 缩放变量回归单测
   - 命令：
     - `node scripts/infra/vitest-cli-safe.mjs run src/components/system/__tests__/GlobalErrorBoundary.test.tsx --configLoader native -t "board-shell 游戏页会把缩放变量写成旧 WebView 可消费的纯数字|summonerwars board-shell 游戏页会使用 900 设计宽度计算缩放变量"`
   - 结果：通过（1 passed）。
   - 说明：验证 board-shell 关键变量（`--mobile-board-shell-scale` / `--mobile-board-shell-inverse-scale`）仍输出为旧 WebView 可消费的纯数字，避免高度塌陷导致黑屏。

2. Android 兼容 smoke 辅助逻辑回归
   - 命令：
     - `node scripts/infra/vitest-cli-safe.mjs run src/lib/__tests__/androidCompatSmoke.test.ts --configLoader native`
   - 结果：通过（5 passed）。

3. 真实对局 UI 截图复核
   - 命令：
     - `node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone.e2e.ts "main flow: moon elf reaches defensive roll"`
   - 关键截图：
     - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone.e2e\main-flow-moon-elf-reaches-defensive-roll\01-main-flow-defensive-roll.png`
   - 我实际看到：
     - 游戏主画布完整可见，角色板与技能面板正常渲染，不是仅剩 HUD 的黑底状态。
     - 右侧操作区与底部手牌区均可见，可继续推进到防御掷骰流程。
   - 验收判定：达标。

## 结论

- 本轮回归未复现“横屏黑屏”问题，关键根因位点（board-shell 旧 WebView 缩放兼容）持续有效。
- 该反馈可从 `in_progress` 回写为 `resolved`（非 `closed`）。
