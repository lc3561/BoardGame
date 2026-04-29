# DiceThrone 反馈修复证据（69cba605d5dec909a0b74c9f）

- 反馈标题：`无法显示出骰面`
- 严重级别：`critical`
- 游戏：`dicethrone`
- 本轮口径：按线上 bug 回归验证；不做批量关单。

## 对位验证

1. 骰面 fallback 回归单测
   - 命令：
     - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/StatusEffectsIcons.test.tsx --configLoader native -t "dice sprite 缺失时应渲染可见骰面文本兜底，避免整块空白"`
   - 结果：通过（1 passed）。
   - 说明：覆盖“sprite 缺失时不再整块空白”的核心风险点。

2. 真实 UI 链路截图复核
   - 命令：
     - `node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone.e2e.ts "ui stability: die lock toggle syncs state"`
   - 关键截图：
     - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone.e2e\ui-stability-die-lock-toggle-syncs-state\03-dice-lock-state.png`
   - 我实际看到：
     - 进攻掷骰阶段右侧 5 颗骰子均有可见图标/符号，不是空白块。
     - 锁骰后第一颗骰子显示“已锁定”，视觉状态与交互状态一致。
   - 验收判定：达标。

## 结论

- 本轮复核未发现“骰面不可见”回归；问题位点已具备稳定兜底与可视化证据。
- 该反馈可从 `in_progress` 回写为 `resolved`（非 `closed`）。
