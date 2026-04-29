# SmashUp 反馈修复证据 - 69e8375fddc2605b331ec265（2026-04-23）

- 反馈内容：`武士战斗力5时+1vp的技能还是无法生效`
- 反馈类型：人类反馈（`feedback-modal`）
- 游戏：`smashup`

## 根因

- `MINION_DESTROYED` 触发链中没有传递 `triggerMinionPower`，`samurai_bushi` 只能回退到 `basePower` 判定。
- 当武士通过指示物/修正达到 5 力量（例如 `4 + 1`）时，会被错误判定为 `< 5`，导致不发放 VP。

## 修复

- 在销毁触发链路内写入“离场前有效力量”：
  - `src/games/smashup/domain/reducer.ts`
  - `e2e/src/games/smashup/domain/reducer.ts`
- 新增回归测试（双端镜像）：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - `e2e/src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 验证

- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 -t "samurai_bushi 在被消灭时应使用离场前有效力量判定 5 力量奖励 VP"`
- 结果：
  - `1 passed`（命中新增回归用例）

## 验收结论

- 已确认 `samurai_bushi` 在“离场前有效力量=5（如 4+1）”场景能正确进入 VP 判定链路。
- 该反馈可进入 `resolved`。
