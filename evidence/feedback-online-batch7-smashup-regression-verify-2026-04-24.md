# 线上反馈批次7回归验证（SmashUp，2026-04-24）

- 批次目标：对 10 条 `smashup` 人类反馈进行“按 bug 复核 + 回归验证”，确认对应问题已由现有实现覆盖并通过自动化回归。
- 结论：本批 10 条均通过对应回归测试，可回写 `resolved`。

## 反馈与验证映射

1. `69bff045c22fb28875c818ed`（侏儒效果重复/可误伤自身）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/factionAbilities.test.ts --configLoader native --testNamePattern "trickster_gnome_pod beforeScoring options exclude the source gnome itself|trickster_gnome_pod resolves only once for the same gnome during one scoring"`
- 结果：`2 passed`。

2. `69bff3bdc22fb28875c818f2`（通路禁止不能打到基地）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionChainE2E.test.ts --configLoader native --testNamePattern "trickster_block_the_path_pod: 打到基地后应创建派系选择交互，并把选择写入持续战术元数据"`
- 结果：`1 passed`。

3. `69bff402c22fb28875c818f6`（牌库剩 1 抽牌后未洗牌继续抽）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/turnCycle.test.ts --configLoader native --testNamePattern "draw phase reshuffles after drawing the last card in deck"`
- 结果：`1 passed`。

4. `69ce7589094b1acda250f8c6`（阿努比斯错误给全体随从加力）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/ancientEgyptiansMummyStrength.feedback-regression.test.ts --configLoader native`
- 结果：`1 passed`。

5. `69d72257932fe508b2420cdb`（适者生存打不出）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/audit-d1-d8-d33-dino-survival-of-the-fittest.test.ts --config vitest.config.audit.ts --configLoader native`
- 结果：`7 passed`。

6. `69d8ffc570d52ddbd0c19516`（泰坦冲突无反应）
7. `69da0feb2893f751f02f83fa`（巫师泰坦天赋可无限使用）
8. `69da6cc5469c37573d131b32`（远古诅咒触发后消失）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --testNamePattern "第二个泰坦进入标准基地时触发 clash，平局保留先在场者|奥术守护者使用天赋后抽 1 张牌并标记已使用|翻开埋葬的远古诅咒在仅有一个跨基地合法目标时会自动附着，并进入远古诅咒确认交互|翻开埋葬的远古诅咒在没有合法随从目标时会弃置，不会从状态里消失"`
- 结果：`4 passed`。

9. `69d9a78470d52ddbd0c196d0`（激光三角龙目标判定异常）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/specialInteractionChain.test.ts --configLoader native --testNamePattern "会保留有效力量 3 的狂战迅猛龙，并明确提示按印制力量判定"`
- 结果：`1 passed`。

10. `69da6ea5469c37573d131b43`（3 张同名抽 3 条件误判）
- 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/cthulhuExpansionAbilities.test.ts --configLoader native --testNamePattern "POD 与基础版同名随从应共同计数触发抽3"`
- 结果：`1 passed`。

## 汇总

- 本批命中反馈：10
- 定向通过：19 tests passed
- 回写策略：线上 Mongo 将上述 10 条 `in_progress/open` 回写为 `resolved`，并追加批次说明与证据路径。
