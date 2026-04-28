# SmashUp 反馈 69ef2098 修复证据（2026-04-28）

- 反馈 ID：`69ef2098039f95a4fe91c0b4`
- 标题：`Field of Honor 被错误实现成每回合一次，后续消灭批次不会继续给分`

## 根因

- `base_the_field_of_honor` 额外维护了 `turnDestroyedMinions` 门禁。
- 引擎层本身已经对同一批 destroy 做了去重，这个额外门禁把“同回合后续新的消灭批次”也挡掉了。
- 结果是牌面本不该有的“每回合一次”限制被误实现进去了。

## 修复

- 移除 `base_the_field_of_honor` 自身的错误门禁。
- 保留引擎层对“同一批 destroy 不重复计分”的去重逻辑。

## 验证

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newBaseAbilities.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism --testNamePattern="base_the_field_of_honor"`

## 结论

- 这是已定位并修复的真实 bug。
- 2026-04-28 已将线上反馈状态回写为 `resolved`。
