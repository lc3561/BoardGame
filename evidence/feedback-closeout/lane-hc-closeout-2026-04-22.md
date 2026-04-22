# lane-HC 线上 resolved 人类反馈收口（2026-04-22）

## 范围

- 目标：线上 human unresolved 中 `status=resolved` 的三条反馈。
- 生产数据源：SSH `admin@8.148.71.102`，容器 `boardgame-mongodb`，数据库 `boardgame`，集合 `feedbacks`。
- 写入约束：只更新 `status` 与 `updatedAt`。

## 生产核对

- 回写前目标状态核对：`temp/feedback-closeout/lane-hc-query-targets-20260422.json`
- 回写前 human unresolved：17。
- 三条目标回写前均为 `resolved`。

## Evidence / Verification 核对

### 69e33e9322d9c762518777f3 / dicethrone

- 原文：`ai怎么跳过了防御投掷阶段啊`
- 关闭依据：已有专门复核文档证明可防御攻击不会被规则直接跳过；复用 online AI off-turn defensiveRoll 证据链证明防御阶段会出现、AI 会掷骰、流程可回到 `main2`。
- Evidence：`evidence/dicethrone/dicethrone-feedback-69e33e9322d9c762518777f3-defense-roll-skip-verification-2026-04-22.md`
- Evidence：`evidence/dicethrone/dicethrone-online-ai-offturn-defensive-watchdog-feedback-fix-2026-04-21.md`
- Verification：`node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/defense-trigger-audit.test.ts ...`
- Verification：`node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段"`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05i-online-ai-offturn-defensive-rolled.png`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`
- 判定：证据充分，可从 `resolved` 关闭为 `closed`。

### 69e230c0fa0a796a40c9e05a / dicethrone

- 原文：`ai卡死在防御阶段`
- 关闭依据：与 DiceThrone 防御阶段卡死同根因；已有 transport 回归和真实 online E2E，截图证明从 defensiveRoll 卡住前置状态收口回 `main2`。
- Evidence：`evidence/dicethrone/dicethrone-online-ai-offturn-defensive-watchdog-feedback-fix-2026-04-21.md`
- Evidence：`evidence/engine/online-feedback-closeout-2026-04-19.md`
- Verification：`node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在 human active 的 off-turn 防御阶段也应代 AI 执行合法动作，避免 defensiveRoll 卡死" --configLoader native --maxWorkers 1`
- Verification：`node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段"`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`
- 判定：证据充分，可从 `resolved` 关闭为 `closed`。

### 69e2315bfa0a796a40c9e05c / summonerwars

- 原文：`ai召唤阶段被强制跳过`
- 关闭依据：与 SummonerWars AI 召唤阶段被强制跳过同根因；已有真实 online E2E，截图证明 watchdog 后执行召唤，不是直接跳过 summon。
- Evidence：`evidence/engine/online-feedback-closeout-2026-04-19.md`
- Evidence：`evidence/online-ai-attack-duplicate-repro-2026-04-18-e2e-test.md`
- Verification：`npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线 AI 回合起始若 seatState 落后上一拍 draw，不得在 8 秒兜底中直接跳过 summon，且后续应由 watchdog 真正召唤单位"`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-回合起始若-seatState-落后上一拍-draw，不得在-8-秒兜底中直接跳过-summon，且后续应由-watchdog-真正召唤单位\online-ai-stale-seat-before-guard.png`
- 关键截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-回合起始若-seatState-落后上一拍-draw，不得在-8-秒兜底中直接跳过-summon，且后续应由-watchdog-真正召唤单位\online-ai-stale-seat-watchdog-summoned.png`
- 判定：证据充分，可从 `resolved` 关闭为 `closed`。

## 生产回写

- 脚本：`temp/feedback-closeout/lane-hc-closeout-20260422.js`
- 报告：`temp/feedback-closeout/lane-hc-closeout-20260422-report.json`
- 写入结果：`matched=3, modified=3`
- human unresolved：17 -> 14
- 统一 `updatedAt`：`2026-04-21T16:16:33.903Z`

## 关闭结果

- `69e33e9322d9c762518777f3`：`resolved -> closed`
- `69e230c0fa0a796a40c9e05a`：`resolved -> closed`
- `69e2315bfa0a796a40c9e05c`：`resolved -> closed`

## 剩余未关原因

- lane-HC 指定三条目标无剩余未关。
- 生产 human unresolved 仍有 14 条，但不属于本 lane-HC 指定范围；本轮未逐条核验证据，禁止顺手关闭。
