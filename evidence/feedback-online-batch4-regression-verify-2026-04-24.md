# 线上反馈批次回归与修复验证（2026-04-24 批次 4）

## 目标

- 本批处理以下 4 条仍为 `in_progress` 的 SmashUp 反馈：
  - `69c64529cb50687653b6fa85`（木乃伊之力未让选择随从）
  - `69cca762c3e278ba205eb08f`（木乃伊与大副同时结算时吞掉大副移动）
  - `69ce7167094b1acda250f8a9`（Run 'Em Off 移动控制权错误）
  - `69ce7ac2094b1acda250f933`（Gold in Them Thar Hills 额外打出失效）

## 验证命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/ancientEgyptiansMummyStrength.feedback-regression.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`1 passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`6 passed`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "cowboys_run_em_off|gold_in_them_thar_hills 选择额外随从时会先选基地再直接打出"`
   - 结果：`3 passed`

## 结论

- 四条反馈对应的修复链路均已通过当前回归验证，可回写 `resolved`。
