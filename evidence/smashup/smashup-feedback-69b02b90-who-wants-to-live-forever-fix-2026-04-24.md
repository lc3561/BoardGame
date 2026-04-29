# SmashUp 反馈 69b02b9036c755b464b0f4e3 修复证据（2026-04-24）

- 反馈标题：`无人永生有bug，交互老自动关闭，而且也没抽牌`
- 反馈 ID：`69b02b9036c755b464b0f4e3`
- 处理口径：按 bug 链路复测并修复回归测试阻塞点，不做关闭，仅回写 `resolved`。

## 本轮改动

- `e2e/framework/GameTestContext.ts`
  - 修复 `playCard()` 在新版 SmashUp UI 下对“无目标行动卡”的兼容：首击仅选中时自动补第二次点击，确保真正打出。
- `e2e/smashup/smashup-robot-hoverbot-chain.e2e.ts`
  - 更新“可选随从”判定：从单一旧样式类名改为“交互选项命中或可选样式命中”。
  - 更新确认后断言：兼容当前引擎会进入 `smashup_reaction_choose` 的强制效果选择窗口，不再误判为交互异常关闭。

## 验证命令

- `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-chain.e2e.ts "无人想要永生：正常流程应完成移除指示物并抽牌"`
- `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-chain.e2e.ts "无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "无人想要永生"`

## 关键截图与观察

1. 正常流程确认前  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：正常流程应完成移除指示物并抽牌\who-wants-to-live-forever-before-confirm.png`
   - 我实际看到：提示为“已移除 2”，工蚁力量指示物已归零，页面仍保留“确认并抽2张牌/取消并撤回”按钮，交互没有自动消失。  
   - 验收判定：达标（覆盖“交互不会提前关闭”）。

2. 正常流程确认后  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：正常流程应完成移除指示物并抽牌\who-wants-to-live-forever-final.png`
   - 我实际看到：手牌出现 2 张新牌（`献祭`、`聚集秘术`），弃牌计数为 1，`无人想要永生` 在弃牌堆中。  
   - 验收判定：达标（覆盖“确认后确实抽牌，不再出现‘没抽牌’”）。

3. 快速双击场景确认前  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭\who-wants-to-live-forever-double-click-still-open.png`
   - 我实际看到：在只剩最后 1 个指示物时快速双击目标后，交互仍在，显示“确认并抽1张牌/取消并撤回”。  
   - 验收判定：达标（覆盖“快速双击不会吞掉交互”）。

4. 快速双击场景确认后  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-chain.e2e\无人想要永生：快速双击最后一个指示物目标时交互不应自动关闭\who-wants-to-live-forever-double-click-final.png`
   - 我实际看到：工蚁仍在场且指示物为 0，手牌抽到 1 张 `献祭`，并出现后续强制效果选择窗口（`smashup_reaction_choose`），未出现异常自动关闭。  
   - 验收判定：达标（流程连续且结果正确）。

## 结论

- 该反馈对应问题已可稳定复现并通过真实 E2E 链路验证修复：  
  - 交互不会在最后一个指示物移除时被误吞；  
  - 确认后抽牌数量正确；  
  - 快速双击场景可稳定收口。
- 本轮状态建议：`resolved`（保留继续观察，不直接 `closed`）。
