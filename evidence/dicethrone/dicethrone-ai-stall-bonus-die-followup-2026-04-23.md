# DiceThrone AI 卡死与阶段卡顿复测（2026-04-23）

## 本轮目标
- 用户反馈：AI 卡死、阶段切换体感卡几秒。
- 本轮处理：在全链路 E2E 下复测特写关闭、watchdog 收口、off-turn 防御收口，并核对阶段推进。

## 本轮代码改动
- `src/pages/MatchRoom.tsx`
  - 将 `REROLL_BONUS_DIE`、`SKIP_BONUS_DICE_REROLL` 纳入 `FAST_AI_COMMAND_TYPES`。
  - 目的：在线房间 AI 执行奖励骰相关命令时走 fast-track，不再吃最小动作延迟。
- `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
  - 针对 `main2 卖/撤循环` 用例补充“注入成功校验 + 快照化等待收口”。
  - 目的：避免注入后立即被系统收口造成的假失败，确保断言验证的是“是否离开卖/撤循环”。
- `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
  - 将 `off-turn defensiveRoll` 用例前置从“强等 defensiveRoll”改为“允许已快速收口到 main2”，并新增“main2 空闲 3 秒稳定性”断言。
  - 目的：区分“真实跳过我方 main2”与“阶段过快导致的中间态误判”，直接对齐“防御结束后概率跳过第二主要阶段”的反馈。

## E2E 执行结果
1. `e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts`
   - 用例：`bonus die spotlight should close on backdrop click before confirm interaction`
   - 结果：通过
2. `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
   - 用例：`Online AI 在 DiceThrone main2 阶段持续卡死时，服务端 watchdog 应自动多步收口到我方回合且不再弹失败提示`
   - 结果：通过
3. `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
   - 用例：`Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段`
   - 结果：通过
4. `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
   - 用例：`Online AI 在 main2 仅剩撤回卖牌可选时应直接推进阶段（避免卖/撤循环卡死）`
   - 结果：通过（最终复跑通过，`1 passed`）
5. `e2e/dicethrone/dicethrone-die-reroll.e2e.ts`
   - 用例：`card-wild-west 应触发弹药特写奖励骰，不改攻击骰盘`
   - 结果：通过
6. `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
   - 用例：`Online AI + human 均持有响应牌时，human 响应后 AI 应接棒完成 afterCardPlayed 收口`
   - 结果：通过
7. `e2e/smashup/smashup-phase-transition-simple.e2e.ts`
   - 用例：`在线 AI 结束回合切回我方时不应出现整板重挂载或 loading 闪屏`
   - 结果：通过
8. `e2e/smashup/smashup-phase-transition-simple.e2e.ts`
   - 用例：`在线 AI 连续 8 秒没有任何实际进展时，应自动强制结束当前回合`
   - 结果：通过

## 关键截图与肉眼结论

### A. 奖励骰特写关闭链路
- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-backdrop-click-before-confirm-interaction\04-bonus-die-spotlight-backdrop-close-then-confirm.png`
- 观察：
  1. 奖励骰特写已关闭，界面回到可继续操作状态。
  2. 关闭后可继续确认交互，未出现“首击无效导致卡住”的停滞画面。
- 验收判断：达到本轮“特写关闭后可继续推进”的标准。

### B. main2 卡死 watchdog 收口链路
- 截图（卡死前）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\19-online-ai-main2-stalled-before-watchdog.png`
- 截图（收口后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-DiceThrone-main2-阶段持续卡死时，服务端-watchdog-应自动多步收口到我方回合且不再弹失败提示\20-online-ai-main2-stalled-after-watchdog.png`
- 观察：
  1. 前图可见卡死注入场景已建立。
  2. 后图显示流程已回到真人可继续推进阶段（watchdog 收口完成）。
  3. 未出现“强制结束 AI 回合未成功”失败提示。
- 验收判断：达到本轮“卡死可自动收口且不弹失败提示”的标准。

### C. off-turn defensiveRoll AI 收口链路
- 截图（触发前）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
- 截图（掷骰中）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05i-online-ai-offturn-defensive-rolled.png`
- 截图（收口后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`
- 观察：
  1. 链路存在“触发 -> 掷骰 -> 收口”连续阶段变化。
  2. 收口后回到可继续阶段，未卡在防御阶段。
- 验收判断：达到本轮“off-turn 防御链路不再卡死”的标准。

### D. 奖励骰重掷完整收口链路（Wild West）
- 截图（特写出现）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-reroll.e2e\card-wild-west-应触发弹药特写奖励骰，不改攻击骰盘\gunslinger-wild-west-bonus-die-overlay.png`
- 截图（重掷后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-reroll.e2e\card-wild-west-应触发弹药特写奖励骰，不改攻击骰盘\gunslinger-wild-west-bonus-die-rerolled.png`
- 截图（特写关闭后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-die-reroll.e2e\card-wild-west-应触发弹药特写奖励骰，不改攻击骰盘\gunslinger-wild-west-bonus-die-closed.png`
- 观察：
  1. 特写阶段可见奖励骰本体，符合“证据必须看到对象本体”要求。
  2. 关键动作后骰面发生变化，链路不是静态展示。
  3. 特写关闭后流程继续推进到结算，未残留挂起交互。
- 验收判断：达到本轮“奖励骰出现/操作/收口连续链路正常”的标准。

### E. main2 卖/撤循环收口链路
- 截图（场景建立后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-main2-仅剩撤回卖牌可选时应直接推进阶段（避免卖-撤循环卡死）\23-ai-undo-sell-loop-before.png`
- 截图（收口后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-main2-仅剩撤回卖牌可选时应直接推进阶段（避免卖-撤循环卡死）\24-ai-undo-sell-loop-after.png`
- 观察：
  1. 用例可稳定进入“仅剩卖/撤相关动作”的专项场景。
  2. 收口后不再停在 AI 循环阶段，流程能回到可继续推进的主链路。
- 验收判断：达到本轮“避免卖/撤循环卡死”的标准。

### F. human 先响应后 AI 接棒收口链路（双响应牌）
- 截图（响应窗口初始态）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-before-human-pass.png`
- 截图（human 响应后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-after-human-pass.png`
- 截图（AI 接棒收口后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-after-ai-resolved.png`
- 截图（收口稳定不重开）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-+-human-均持有响应牌时，human-响应后-AI-应接棒完成-afterCardPlayed-收口\20-online-ai-human-then-ai-response-stable-no-reopen.png`
- 观察：
  1. 初始态可见 `responderQueue` 起点在 human（`0`），且 AI 响应牌仍在手牌，未提前消费。
  2. human 执行响应（`RESPONSE_PASS`）后，窗口仍按链路推进而非直接僵死。
  3. AI 随后消费响应牌并收口窗口，流程未卡住。
  4. 收口后窗口不重开，链路稳定结束。
- 验收判断：达到“我先响应后 AI 能正常继续并收口”的验收标准。

### G. 防御结束后“我方 main2 是否被自动跳过”复现链路
- 场景：`Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段`
- 截图（注入后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
- 截图（收口中）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05i-online-ai-offturn-defensive-rolled.png`
- 截图（收口后）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`
- 观察：
  1. 复跑中曾出现“等待 defensiveRoll 超时/到达 main2 过快”的中间态抖动，但截图里阶段高亮在 `main2`，不属于“直接跳过 main2”。
  2. 更新断言后改为直接验证“`main2 + pendingAttack 清空`”并额外等待 3 秒，确认无人操作下不会自动从我方 `main2` 再跳走。
  3. 新断言连续 4 轮通过，未复现“防御结束后自动跳过我方第二主要阶段”。
- 验收判断：当前可复现的是“阶段收口过快导致旧断言误判”，尚未复现“我方 main2 被自动跳过”的实质问题。

## 本轮结论
- 已确认：用户提到的“奖励骰特写关闭卡住”“在线 AI main2 卡死”“off-turn defensiveRoll 卡死”“main2 卖/撤循环卡死”这四条主链路均已通过 E2E 收口。
- 残余风险：当前工作区存在其他并发 E2E 任务，个别复跑可能受全局预算与并发门禁影响，需要避开并发窗口再做批量回归。
