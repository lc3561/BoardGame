# SmashUp 反馈批次修复证据（机械师/神秘花园/计分可见性，2026-04-24）

## 反馈范围

- `69b0eac957a311c84a8fd565`：机械师有 bug，只能是到基地的牌
- `69b0e9e957a311c84a8fd551`：生效效果变成了从手牌额外打出一张随从
- `69a949a2cebe857cd3e1913b`：神秘花园额外随从位可错误打到任意基地
- `69a94893cebe857cd3e19137`：神秘花园打了 2 战力后 3 战力常规随从不能再打
- `69b02e1236c755b464b0f4f9`：莫名其妙加了三分

## 本轮修复/复核口径

- 机械师与神秘花园两组问题走“规则测试 + 线上状态快照复核”双证据。
- “加三分”问题走“计分日志可见性增强 + 格式断言”证据（显示总力量、有效破坏点、锁定计分提示）。

## 验证命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionOngoing.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "steampunk_mechanic|机械师|只能选择打出到基地上的行动牌"`
- 结果：`7 passed`

2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseRestrictions.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "base_secret_garden|神秘花园|power>2|power≤2|误拦截"`
- 结果：`15 passed`

3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/actionLogFormat.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "base_scored|总力量|锁定计分|有效破坏点"`
- 结果：`2 passed`

## 我实际看到的关键结论

- `69b0eac9`（机械师）：
  - 交互与测试均限定“只能从弃牌堆选择可打到基地上的持续行动卡”；不会把打到随从上的行动或普通行动误当候选。
  - 线上快照日志中机械师已执行“从弃牌堆取回 1 张卡（原因：机械师）”，对应当前规则链路。

- `69a949a2` 与 `69a94893`（神秘花园）：
  - 线上快照可见 `baseLimitedMinionQuota` 已消费为 `0`，同时玩家仍可能有常规随从额度（`minionLimit > minionsPlayed`），因此“还能打 3 战力常规随从”是正确行为。
  - 回归测试覆盖了“仅剩神秘花园额度时应限制 ≤2”与“仍有常规额度时不应误拦截 >2”两种分支，均通过。

- `69b0e9e9`（额外打随从来源误解）：
  - 快照显示额外出牌来源为基地/效果额度链，而非把机械师效果错误替换成“手牌额外随从”。
  - 机械师与基地限定相关回归均通过，未复现该类错误行为。

- `69b02e12`（加三分）：
  - 已通过 `BASE_SCORED` 日志增强明确展示“总力量/有效破坏点/锁定计分”，可直接解释看似“多加分”的来源，避免误判。

## 结论

- 本批 5 条反馈在当前代码与规则测试下均已可解释且复核通过。
- 处理策略为 `resolved`（附证据与验证命令），继续观察后续线上新增样本。
