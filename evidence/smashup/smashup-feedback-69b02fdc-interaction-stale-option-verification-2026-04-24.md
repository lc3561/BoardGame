# SmashUp 反馈 69b02fdc36c755b464b0f51f 验证证据（2026-04-24）

- 反馈标题：`为什么交互到一半就提示没有待处理的选择，然后交互就关闭了`
- 反馈 ID：`69b02fdc36c755b464b0f51f`
- 处理口径：按 bug 链路复测“旧 optionId 导致交互被吞/被关闭”。

## 关联实现与回归用例

- `src/games/smashup/abilities/giant_ants.ts`
  - `giant_ant_who_wants_to_live_forever` 交互使用 `responseValidationMode: 'live'` + `optionsGenerator`，避免旧选项在状态变化后误命中。
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 用例：`无人想要永生：旧 optionId 不应在最后一个指示物移除后吞掉交互`
- `e2e/smashup/smashup-robot-hoverbot-chain.e2e.ts`
  - 用例：`无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭`

## 验证命令

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "无人想要永生"`
- `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-chain.e2e.ts "无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭"`

## 关键截图与观察

1. 快速双击后交互仍在  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭\who-wants-to-live-forever-double-click-still-open.png`
   - 我实际看到：在最后一个指示物目标上快速双击后，交互未消失，页面仍展示“确认并抽1张牌/取消并撤回此牌”。  
   - 验收判定：达标（未出现“交互突然关闭”）。

2. 确认后流程继续  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭\who-wants-to-live-forever-double-click-final.png`
   - 我实际看到：确认后进入后续正常流程（强制效果选择窗口可见），并抽到 1 张牌，未出现“没有待处理的选择”导致的中断。  
   - 验收判定：达标（交互链连续可推进）。

## 结论

- 该反馈描述的“中途无待处理选择并关闭交互”在当前实现下未复现。
- 回归用例已覆盖并通过，状态建议更新为 `resolved`（继续观察，不直接 `closed`）。
