# SmashUp 反馈 69ede79e 修复证据（2026-04-28）

- 反馈 ID：`69ede79e9087da2a55c927d1`
- 标题：`翻开埋葬的附着行动多目标时读错字段，选目标后卡死`

## 根因

- `bury_uncover_ongoing_target` 的 handler 只读取 `targetMinionUid`。
- 实际交互回传的是 `minionUid`。
- 结果是玩家选中合法目标后，handler 返回空事件，链路停在原地。

## 修复

- 兼容读取 `targetMinionUid` / `minionUid` 两种字段。
- 保证多目标翻开埋葬的附着行动时，选中目标后能继续进入后续确认交互。

## 验证

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism --testNamePattern="翻开埋葬的远古诅咒在存在多个合法目标时，选择目标后应继续进入确认交互"`

## 结论

- 这是已定位并修复的真实 bug。
- 2026-04-28 已将线上反馈状态回写为 `resolved`。
