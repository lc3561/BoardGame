# DiceThrone AI 卡死与阶段卡顿复测（2026-04-23）

## 本轮目标
- 用户反馈：AI 卡死、阶段切换体感卡几秒。
- 本轮处理：在全链路 E2E 下复测特写关闭、watchdog 收口、off-turn 防御收口，并核对阶段推进。

## 本轮代码改动
- `src/pages/MatchRoom.tsx`
  - 将 `REROLL_BONUS_DIE`、`SKIP_BONUS_DICE_REROLL` 纳入 `FAST_AI_COMMAND_TYPES`。
  - 目的：在线房间 AI 执行奖励骰相关命令时走 fast-track，不再吃最小动作延迟。

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
   - 结果：失败（两次复跑均失败，卡在测试等待 `main2` 的断言点）
5. `e2e/dicethrone/dicethrone-die-reroll.e2e.ts`
   - 用例：`card-wild-west 应触发弹药特写奖励骰，不改攻击骰盘`
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

## 未达标项（必须继续跟进）
- 用例：`Online AI 在 main2 仅剩撤回卖牌可选时应直接推进阶段（避免卖/撤循环卡死）`
- 现象：两次均在测试步骤 `waitForPhase(hostPage, 'main2', 30000)` 超时，当前不能作为“该分支已完全稳定”的证明。
- 失败截图：`D:\gongzuo\webgame\BoardGame\test-results\playwright-artifacts\dicethrone-dicethrone-simp-492c5-仅剩撤回卖牌可选时应直接推进阶段（避免卖-撤循环卡死）-chromium\test-failed-1.png`
- 结论：该链路本轮**未收口**，需单独继续排查（实现或测试时机问题）。

## 本轮结论
- 已确认：用户提到的“奖励骰特写关闭卡住”与“在线 AI main2/off-turn defensiveRoll 卡死”主链路可通过 E2E 收口。
- 仍存在：`main2 卖/撤循环`专项链路未达标，不能宣称该分支已完全无卡死风险。
