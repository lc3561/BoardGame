# SmashUp 反馈修复证据：69ec35a19087da2a55c911b4（身体改造 +1 未触发 The Bride 抽牌）

- 反馈 ID：`69ec35a19087da2a55c911b4`
- 游戏：`smashup`
- 严重级别：`low`
- 线上反馈原文：`身体改造让本地人+1，没有触发科学巨人泰坦新娘的抽一张牌`

## 根因定位

- `The Bride` / `Ancient Lord` 触发注册在 `onPowerCounterChanged`，但当前后处理管线实际只收集 `onMinionAffected`。
- 结果是“+1 指示物变化”事件没有进入对应触发回调，`The Bride` 抽牌不会触发。

## 修复内容

1. 触发时机统一到可收集链路
   - `src/games/smashup/abilities/titans.ts`
   - `e2e/src/games/smashup/abilities/titans.ts`
   - 将 `frankenstein_the_bride` / `vampires_ancient_lord` 的触发注册改为 `onMinionAffected`。

2. 新增计数器变化上下文透传（added/removed + delta）
   - `src/games/smashup/domain/affect.ts`
   - `src/games/smashup/domain/reducer.ts`
   - `src/games/smashup/domain/ongoingEffects.ts`
   - `src/games/smashup/domain/types.ts`
   - `src/games/smashup/domain/reactionSession.ts`
   - 以及 `e2e/src/games/smashup/**` 对应镜像文件。

3. 回调收口逻辑修正
   - `The Bride`：仅 `power_change + added + delta>0` 时触发抽牌；同回合只触发一次。
   - `Ancient Lord`：仅 `power_change + added + delta>0` 时创建特殊交互，且避开自身 special 造成的重复链。

## 验证记录

1. 计数器上下文透传回归
   - 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/reactionQueueOrdering.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism -t "processAffectTriggers 为 POWER_COUNTER 变化透传 counterChangeKind/counterDelta"`
   - 结果：通过（1 passed）。

2. The Bride 反馈路径回归
   - 命令：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism -t "The Bride 仅在己方随从新增"`
   - 结果：通过（1 passed，122 skipped）。
   - 关键断言：
     - `counterChangeKind=removed` 不触发抽牌。
     - `counterChangeKind=added` 触发 `TITAN_METADATA_UPDATED + CARDS_DRAWN`。
     - 同回合第二次新增不再重复触发。

## 结论

- 已修复“身体改造给本地人 +1 不触发 The Bride 抽牌”的触发链断裂问题。
- 修复后 `The Bride` 抽牌与去重语义具备可复查单测证据。
