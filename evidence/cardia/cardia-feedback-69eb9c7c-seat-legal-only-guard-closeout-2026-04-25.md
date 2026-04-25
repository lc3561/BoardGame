# Cardia 反馈修复证据（69eb9c7c53c8e640a44761ca）

- 反馈 ID：`69eb9c7c53c8e640a44761ca`
- 来源：`online-ai-watchdog`
- 反馈内容：`force-end-turn-failed seat-legal-only:follow-up-advance:legal_action_unavailable`
- 场景：`cardia`，`phase=play`，当前操作者为真人。

## 结论与修复口径

- 该问题属于 watchdog 的旧路径残留：在 **human active + 非 defensiveRoll** 阶段，不应触发 `seat-legal-only` 代打。
- 当前主干已具备保护（`server.ts` 中 `currentPhase !== 'defensiveRoll'` 直接返回）。
- 本次补充了 **cardia 专项回归测试**，锁死 `phase=play` 时不再进入 `seat-legal-only`。

相关测试改动：

- `src/engine/transport/__tests__/server.test.ts`
  - 新增：`cardia: human active play 阶段时，watchdog 不应触发 seat-legal-only 代打`

## 验证命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "human active 且非 defensiveRoll 阶段时，watchdog 不应尝试 seat-legal-only 代打|cardia: human active play 阶段时，watchdog 不应触发 seat-legal-only 代打"`
2. `node node_modules/eslint/bin/eslint.js src/engine/transport/__tests__/server.test.ts`
3. `ssh admin@8.148.71.102 "docker exec -i boardgame-mongodb mongosh boardgame --quiet --file /dev/stdin"`（`69eb9c7c53c8e640a44761ca` 更新为 `resolved`）

## 验收判定

- 回归测试通过：`2 passed`（含新增 `cardia play` 场景）。
- 说明在该场景 watchdog 不会尝试代打，也不会再落 `legal_action_unavailable` 失败反馈。
