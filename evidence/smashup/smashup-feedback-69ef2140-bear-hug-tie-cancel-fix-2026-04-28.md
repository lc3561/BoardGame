# SmashUp 反馈 69ef2140 修复证据（2026-04-28）

- 反馈 ID：`69ef2140039f95a4fe91c0f6`
- 标题：`Bear Hug 平局分支错误允许取消，导致应由拥有者选择的消灭可被跳过`

## 根因

- `Bear Hug` 平局选择 prompt 带了 `autoCancelOption`。
- 对应 handler 也接受 `__cancel__`。
- 结果把“由拥有者选择要消灭哪个最弱随从”的强制分支误做成了可跳过。

## 修复

- 去掉平局分支里的取消项。
- 保证存在平局时必须选定一名合法目标后才能继续结算。

## 验证

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionAbilities.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism --testNamePattern="bear_cavalry_bear_hug resolves tied weakest choice|每位对手消灭自己最弱随从"`

## 结论

- 这是已定位并修复的真实 bug。
- 2026-04-28 已将线上反馈状态回写为 `resolved`。
