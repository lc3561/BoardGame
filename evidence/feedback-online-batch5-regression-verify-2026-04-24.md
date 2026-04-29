# 线上反馈批次回归与修复验证（2026-04-24 批次 5）

## 目标

- `69ce6ca7094b1acda250f831`（决斗链重复触发选择）
- `69ce7bbf094b1acda250f93e`（Dynamite Surprise 条件未满足仍触发）

## 验证命令与结果

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "cowboys_deputy 可在决斗中弃牌给任意随从 \+2 力量并改变胜负|cowboys_dynamite_surprise"`
  - 结果：`4 passed`

## 结论

- 决斗链路与 Dynamite Surprise 条件触发链路回归通过，可回写 `resolved`。
