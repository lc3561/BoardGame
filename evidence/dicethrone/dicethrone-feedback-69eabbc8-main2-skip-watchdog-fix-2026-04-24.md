# DiceThrone 反馈 69eabbc89426aced057fa84f 收口记录（2026-04-24）

## 反馈信息
- feedbackId: `69eabbc89426aced057fa84f`
- gameId: `dicethrone`
- 原始内容: `结束防御后被跳过第二主要阶段`
- 来源: 本地 Mongo `feedbacks`
- 路由: `/play/dicethrone/match/sPBnl6-6yWX?playerID=0`

## 复现与快照核对
- 本地快照文件: `temp/feedback-closeout/query-feedback-69eabbc89426aced057fa84f-local-20260424.json`
- 关键事件链（eventStream 尾段）:
  - `offensiveRoll -> defensiveRoll`（id=131）
  - `defensiveRoll -> main2`（id=140）
  - `main2 -> discard`（id=141）
- 结论: 不是 `defensiveRoll` 直接跳过 `main2`，而是进入 `main2` 后立即推进到 `discard`。

## 根因
- 在线 AI watchdog 的 `seat-legal-only` 代打路径在 DiceThrone 中对“human active + main2”缺少阶段门禁。
- 这会引入“真人主阶段被代推进”的风险，形成“被跳过”的主观体感。

## 修复
- 文件: `src/engine/transport/server.ts`
- 变更: `resolveOnlineAiLegalActionOnlyCandidate` 增加 DiceThrone 阶段保护。
- 规则: 当 `match.gameId === 'dicethrone'` 且当前阶段不是 `defensiveRoll` 时，直接返回 `null`，不触发 `seat-legal-only` 代打。

## 回归测试
- 新增用例: `src/engine/transport/__tests__/server.test.ts`
  - `dicethrone: human active main2 时 watchdog 不应触发 seat-legal-only 代打推进`
- 定向执行（通过）:
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "online AI watchdog 在 human active 的 off-turn 防御阶段也应代 AI 执行合法动作，避免 defensiveRoll 卡死|dicethrone: human active main2 时 watchdog 不应触发 seat-legal-only 代打推进|online AI watchdog 在 defensiveRoll 实际由 human 防御方行动时，不应误对 AI 攻击方执行 force-end-turn"`
- 静态检查（通过）:
  - `node node_modules/eslint/bin/eslint.js src/engine/transport/server.ts src/engine/transport/__tests__/server.test.ts`

## 收口结论
- 已加防误推进门禁并补回归测试。
- 该反馈按“已修复并防回归”关闭。
