# SmashUp 反馈 69a8413b / 69a83eea 计分收口复核（2026-04-23）

- 反馈 ID：
  - `69a8413bcebe857cd3e18ea7`
  - `69a83eeacebe857cd3e18e8c`
- 用户现象：
  - 拉莱耶达到爆破点后无法爆炸
  - 涉及克苏鲁/米斯卡塔尼克时基地长期不结算
- 验证目标：确认 `scoreBases -> afterScoring -> BASE_CLEARED/BASE_REPLACED` 链路不会卡住。

## 本轮回归命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/turnTransitionInteractionBug.test.ts --configLoader native -t "拉莱耶 onTurnStart Interaction 导致回合切换卡死"`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts --configLoader native -t "afterScoring 已完成清场换基地后，后续结束回合不应再次给第一个基地计分"`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts --configLoader native -t "集成: base_miskatonic_university_base 密大基地"`

## 结果与观察

- 命令 1：通过（1 passed）
  - 我实际看到：拉莱耶 onTurnStart 交互可正常响应，流程回到 `playCards`，不存在“进入对手回合后卡死”。
- 命令 2：通过（1 passed）
  - 我实际看到：afterScoring 清场后不会重复计分，`BASE_CLEARED` 收口行为稳定。
- 命令 3：通过（1 passed）
  - 我实际看到：米斯卡塔尼克大学基地集成交互链路正常，能力触发不破坏计分流程。

## 结论

- 这两条反馈对应的“基地达标后不爆炸/不结算”链路在当前实现下未复现。
- 相关回归测试均通过，建议状态由 `in_progress` 回写为 `resolved`（不是 `closed`）。
