# SmashUp 反馈批次修复证据（计分顺序/重复触发/锁定计分，2026-04-24）

## 反馈范围

- `69a59808bd494244e5a2a029`：发明家沙龙计分疑似重复
- `69a2ee8f17d6c58872681252`：消灭加分基地疑似双倍加分
- `69a003894366b2c03b21f5be`：寺庙计分后触发导致结算时序异常
- `69d8b1bc70d52ddbd0c190ea`：计分前消灭高战力后仍按原先第一名计分

## 验证命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newBaseAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "base_the_field_of_honor|同一张牌一次性消灭多个随从只给 1VP|消灭者获1VP"`
- 结果：`5 passed`

2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoringEligibleLock.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1`
- 结果：`10 passed`

3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "base_inventors_salon|发明家沙龙|base_temple_of_goju|寺庙"`
- 结果：`4 passed`

## 我实际看到的关键结论

- `69a2ee8f`（荣誉之地双倍加分）
  - 当前实现对同批 destroy 触发有批次去重，测试验证“同一张牌一次性消灭多个随从只给 1VP”。
  - 旧日志里的“同原因双 1VP”属于历史缺陷现象，现版本回归已覆盖并通过。

- `69d8b1bc`（计分前消灭高战力仍第一）
  - 这是 SmashUp 的锁定计分规则场景：进入 `scoreBases` 时达标基地会先锁定 eligible，后续响应窗口内变动不取消本次计分。
  - `scoringEligibleLock` 全量回归通过，行为与规则一致。

- `69a00389`（寺庙时序）
  - 寺庙 afterScoring 与链式交互共存路径在当前测试中可正确收口，不会产生错误重复事件。

- `69a59808`（发明家沙龙重复计分）
  - 发明家沙龙 afterScoring 集成链路回归通过，未出现重复记分现象。

## 结论

- 本批 4 条均按“计分时序与重复触发”专项回归验证通过。
- 建议状态：`resolved`（保留证据路径与命令，继续观察线上新样本）。
