# Online AI 回合误跳过防护修复核验（2026-04-23）

## 范围
- 修复目标：减少 watchdog 在边界态误发 `ADVANCE_PHASE` 导致“玩家回合被跳过”的风险。
- 代码范围：
  - `src/engine/transport/server.ts`
  - `src/engine/transport/__tests__/server.test.ts`

## 代码修复结论
1. 修复 `runOnlineAiRecoverySequence` 末尾 `unresolvedCandidate` 的漏 `await`，避免未解析 Promise 导致的错误收口判断。
2. 新增 `ADVANCE_PHASE` 执行前 guard：仅当“当前仍是同一 AI 回合、无交互阻塞、无人类 responder 窗口”时才允许 watchdog 强推阶段。
3. 新增单测覆盖 `advance_guard_blocked`：当前轮到 human 时，watchdog fallback 不得执行 `ADVANCE_PHASE`。

## E2E 证据（真实链路）

### 场景 A：off-turn defensiveRoll 收口不应吞掉玩家 main2
- 用例：`Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段`
- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05i-online-ai-offturn-defensive-rolled.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`
- 观察：
  - 触发前处于 off-turn defensiveRoll 场景。
  - 中间态可见 AI 完成防御阶段动作（掷骰/推进）。
  - 收口后稳定停在 `main2` 且 `activePlayerId='0'`，3 秒稳定观察未自动跳过。
- 验收：达标。

### 场景 B：human 响应后 AI 接棒收口（双方均有响应牌）
- 用例：`Online AI + human 均持有响应牌时，human 响应后 AI 应接棒完成 afterCardPlayed 收口`
- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-before-human-pass.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-after-human-pass.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-after-ai-resolved.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-stable-no-reopen.png`
- 观察：
  - human pass 前，当前 responder 是 human，AI 未抢跑。
  - human pass 后，AI 成功接棒处理并消费响应牌。
  - 窗口关闭后保持稳定，不发生 reopen 抖动。
- 验收：达标。

### 场景 C：AI main2 卡死时 watchdog 多步收口后回到玩家回合
- 用例：`Online AI 在 DiceThrone main2 阶段持续卡死时，服务端 watchdog 应自动多步收口到我方回合且不再弹失败提示`
- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\19-online-ai-main2-stalled-before-watchdog.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\20-online-ai-main2-stalled-after-watchdog.png`
- 观察：
  - 卡死前停在 AI main2。
  - watchdog 收口后回到 human 回合起始链（upkeep/income/main1）。
  - 未出现“AI 强制结束失败”类 toast。
- 验收：达标。

## 执行记录
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native`（58 passed）
- `npm run test:ai:decision-view`（4 files, 140 passed）
- `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段"`（1 passed）
- `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-simple-start.e2e.ts "human 响应后 AI 应接棒完成 afterCardPlayed 收口"`（1 passed）
- `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online AI 在 DiceThrone main2 阶段持续卡死时，服务端 watchdog 应自动多步收口到我方回合且不再弹失败提示"`（1 passed）
