# SmashUp 反馈 69d71fc0932fe508b2420ca9 修复证据（2026-04-23）

- 反馈 ID：`69d71fc0932fe508b2420ca9`
- 目标：大图书馆（`base_great_library`）计分后效果执行命令异常
- 范围：`src/games/smashup/**`

## 是否复现

- 旧诊断包里的 `reaction_queue_0` 取消异常：**在当前主干未直接复现**。
- 我按反馈包的关键条件重建了最接近场景：
  - `base_great_library` 与 `alien_scout` 同时进入 `afterScoring`
  - 当前行动玩家是 `1`
  - 玩家 `1` 抽牌前 `deck = []`、`discard` 非空，必须先洗弃牌堆再抽牌
- 在当前实现下，这条链路能正常继续，不再出现“选择大图书馆后命令异常/直接卡住”。

## 根因定位

- 这条反馈的历史根因是：`base_great_library` 的 afterScoring 抽牌依赖 `random.shuffle`，而基地能力上下文对 `random` 的依赖没有被明确定义成显式契约。
- 当前 reaction queue 主链已经能把随机源带到执行器里，所以旧异常没有直接复现；但 `BaseAbilityContext` 本身仍没有显式声明 `random`，`triggerAllBaseAbilities(...)` 这类直调链路也没有把它做成明确参数，属于同一根因的残留缺口。
- 这会让“大图书馆/鬼屋”这类 afterScoring 抽牌能力继续依赖隐式上下文，后续重构时很容易再次漏传，重新回到“洗弃牌堆时执行命令异常”的老问题。

## 修复点

1. 在 `BaseAbilityContext` 上补齐显式 `random?: RandomFn` 字段，避免能力实现继续依赖未声明上下文。
2. 在 `triggerAllBaseAbilities(...)` 上补齐 `random` 透传，封住基地能力的直调入口。
3. 在现有测试文件 `afterScoring-rescoring.test.ts` 补一条贴近反馈包的回归：
   - 先点大图书馆 trigger
   - 验证会先产出 `DECK_RESHUFFLED` + 两个 `CARDS_DRAWN`
   - 验证后续 `alien_scout_return` 交互仍能继续出现

## 观察结论

- 大图书馆在多人 `afterScoring` 排序窗口里先结算时，可以正常给双方抽牌。
- 对于 `deck = []`、`discard` 非空的玩家，结算中会先发出 `DECK_RESHUFFLED`，再发出 `CARDS_DRAWN`，没有再抛执行命令异常。
- 大图书馆结算完成后，链路会继续进入 `alien_scout_return`，说明没有把 reaction session 打断。

## 验证命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterScoring-rescoring.test.ts --configLoader native -t "base_great_library 与 alien_scout 同时进入 afterScoring 时，先结算抽牌也不会触发命令异常"`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newBaseAbilities.test.ts --configLoader native -t "base_great_library: 有随从的玩家抽牌"`

## 验证结果

- 命令 1：通过
- 命令 2：通过

## 关键截图

- 本轮未跑 E2E，无截图产物。

## 回写状态建议

- 建议：`resolved`
- 理由：反馈包对应的关键链路已补成自动回归，当前主干下按同条件验证通过，且已把这条问题依赖的 `random` 上下文补成显式契约，后续不容易再从基地能力链路漏传。
