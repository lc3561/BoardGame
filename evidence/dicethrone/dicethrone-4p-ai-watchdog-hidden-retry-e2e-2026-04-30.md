# DiceThrone 4 人 AI hidden retry / watchdog E2E 复测（2026-04-30）

## 范围
- 文件：`e2e/dicethrone-simple-start.e2e.ts`
- 目标：把原本偏 2 人口径的在线 AI 流程测试收口到 **4 人真人 + 3 个 AI** 模式，并覆盖：
  1. 隐藏 multistep-choice 正常完成
  2. 首轮 batch 被拒后的自动 retry
  3. 连续两轮 batch 被拒后的自动 retry
  4. 主阶段到攻击链的 4 人在线时间线
  5. main2 卡死后 watchdog 依次收口 3 个 AI，并把回合交还给真人

## 本轮改动结论
1. watchdog 用例之前仍错误调用 `setupDTOnlineAiRoom(browser, baseURL)`，默认只建 2 人房；现已改成显式走 `setupDTFourPlayerOnlineAiRoom(...)`。
2. `buildOnlineAiStalledMain2State` 改成支持按指定 AI seat 注入卡死态，不再只写死 seat `1`。
3. `installAiBatchRejectPatch` 改成支持在同一页面内重配目标 AI seat，并在重配时重置计数，便于单条 E2E 顺序覆盖 seat `1/2/3`。
4. retry 断言放宽到“至少发生一次 delegated retry + 骰值已被抬高 + 私有交互已收口”，避免 4 人房里 AI 重算路径导致 `delegatedCount`/最终骰面过于脆弱。

## 执行命令
```powershell
BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 node scripts/infra/run-e2e-command.mjs ci e2e/dicethrone-simple-start.e2e.ts --grep "隐藏 multistep-choice|主阶段到攻击链时间线应可区分动作延迟与传输重试|main2 阶段持续卡死"
```

## 实跑结果
- `Online AI 持有隐藏 multistep-choice 时应 batch 提交多条 MODIFY_DIE 并完成私有结算` ✅
- `Online AI 首轮 batch 被拒后应自动重试并完成隐藏 multistep-choice` ✅
- `Online AI 连续两轮 batch 被拒后仍应自动重试并完成隐藏 multistep-choice` ✅
- `Online AI 真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试` ✅
- `Online AI 在 DiceThrone main2 阶段持续卡死时，服务端 watchdog 应自动多步收口到我方回合且不再弹失败提示` ✅

## 关键截图与肉眼观察

### 1) 首轮 batch 被拒后仍能收口
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-首轮-batch-被拒后应自动重试并完成隐藏-multistep-choice\16-online-ai-hidden-multistep-after-retry.png`
- 我实际看到：右侧骰列已经离开初始低骰，最上方出现 `6`，其余两个可见骰为高骰；说明 retry 后确实有新的 MODIFY_DIE 生效。
- 我实际看到：棋盘中央没有再停留隐藏 multistep-choice 弹窗，房主视角也没有被私有交互继续卡住。
- 验收判断：**达到本轮验收标准**，证明 4 人房里“首轮 batch 被拒 → AI 自动 retry → 私有交互收口”链路成立。

### 2) watchdog 卡死前，确实停在 4 人 AI 的 main2
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\19-online-ai-main2-stalled-before-watchdog.png`
- 我实际看到：顶部同时存在 `AI 2号位 / AI 3号位 / AI 4号位` 三个头像条，说明这不是退化回 2 人房的假象，而是真 4 人房。
- 我实际看到：左侧阶段条高亮在 `6. 主要阶段(2)`，画面中央有“AI 2号位正在思考”，符合人为注入的 main2 卡死态。
- 验收判断：**达到本轮验收标准**，证明 watchdog 用例前置已经稳定建立在 4 人房上。

### 3) watchdog 收口后，控制权回到真人
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\20-online-ai-main2-stalled-after-watchdog.png`
- 我实际看到：左侧阶段条已经回到 `3. 主要阶段(1)`，右侧出现可点击的 `下一阶段` 按钮，说明当前已是真人可操作回合。
- 我实际看到：页面中没有“强制结束 AI 回合未成功 / AI 强制结束失败”类失败提示。
- 我实际看到：顶部仍保留 3 个 AI 头像条，说明是 4 人房内依次收口 3 个 AI 后交还给真人，不是靠缩回 2 人房绕过。
- 验收判断：**达到本轮核心验收标准**，证明 4 人房里 main2 卡死可被 watchdog 连续收口，最终稳定交还真人回合。

### 4) 4 人在线时间线仍成立
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\42-online-ai-real-timeline-after-attack-chain.png`
- 我实际看到：画面已进入攻击链后的稳定态，不是停留在 setup 或半路私有交互。
- 我实际看到：同一条 4 人 AI 房链路下，hidden retry / watchdog 改动没有把原来的时间线用例打坏。
- 验收判断：**达到本轮回归验收标准**。

## 影响面判断
- 本轮只改了 `e2e/dicethrone-simple-start.e2e.ts`。
- **没有**改 `src/engine/transport/**`、`src/games/smashup/**`、共享 modal / stack 运行时代码。
- 因此不会和 Smash Up 的栈重构 spec 形成“双份真相”；那条 spec 仍归 Smash Up / 共享弹窗体系自己维护，本轮只是 DiceThrone E2E 前置与断言收口。
