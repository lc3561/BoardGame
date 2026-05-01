## Context
当前 DiceThrone 把“当前可操作骰子”分散在三处：

- `core.dice`：主掷骰与 Targeting Roll
- `pendingBonusDiceSettlement`：少数奖励骰重掷链
- `displayOnly BONUS_DICE_REROLL_REQUESTED`：大量额外掷骰的展示态

与此同时，通用改骰链路主要建立在以下假设上：

- `common.ts` 里的 `modify-die-*` / `reroll-die-*` 交互默认读 `getRollerId(state)` 与 `state.dice`
- `commandValidation.ts` 的 `validateDieInteraction()` 只校验 `state.dice`
- `passiveAbility.ts` 的 `rerollDie` 只允许在 `offensiveRoll` / `defensiveRoll` 且存在主骰池时使用

这意味着只要额外掷骰没有进入 `state.dice`，大量本应作用于该次掷骰的改骰入口就天然失效。

## Goals
- 用单一权威模型表达 DiceThrone 当前“正在发生的、规则可修改的掷骰”。
- 让通用改骰卡、被动、响应窗口与 AI 不再区分“主骰子”和“额外骰子”的私有实现。
- 显式保留 Ultimate 成功发动后的唯一硬例外：结算中新增骰子不可修改。

## Non-Goals
- 本 change 不重写引擎层通用骰子 primitive。
- 本 change 不顺手扩展新的英雄规则，只修正现有掷骰语义建模。
- 本 change 不要求把所有骰子展示都强制做成同一种 UI 皮肤；关键是权威状态与可交互语义统一。

## Decisions
- Decision: 新增 DiceThrone 领域层 `roll context`，作为“当前活跃掷骰”的单一真实来源。
  - Rationale: 继续沿用 `core.dice + pendingBonusDiceSettlement + displayOnly` 三分结构，无法让校验、卡牌和被动共享同一套掷骰语义。

- Decision: `displayOnly` 不再承载规则上可修改的真实掷骰。
  - Rationale: 只要某次掷骰仍可能被卡牌 / 状态 / 被动修改，就必须进入权威掷骰上下文，而不是先自动结算再播特写。

- Decision: 结算模式显式建模为上下文元数据，而不是散落在调用点。
  - Rationale: 额外掷骰的差异不在“是否是骰子”，而在“最终如何结算”。
  - Expected modes:
    - `targeting`
    - `damage`
    - `attackBonus`
    - `threshold`
    - `none`

- Decision: Ultimate 锁定也做成上下文元数据，不再靠调用点口头约定。
  - Rationale: 这是唯一通用硬例外，必须在命令校验与交互层都有统一门禁。

## Proposed Model
- `activeRollContext`
  - `id`
  - `kind`: `offensive | defensive | targeting | extra`
  - `ownerPlayerId`
  - `sourceAbilityId` / `sourceCardId` / `sourceStatusId`
  - `dice`
  - `phase`
  - `modifiable: boolean`
  - `settlementMode`
  - `settlementMeta`

- 原 `pendingBonusDiceSettlement` 保留兼容迁移期字段，最终应退化为：
  - UI 展示派生数据
  - 或直接并入 `activeRollContext`

## Migration Strategy
1. 先建立 `roll context` 与 helper，不立即删除旧字段。
2. 先迁移通用校验 / 通用改骰入口，让它们支持从新上下文取骰。
3. 再分批迁移现有 custom action：
   - 第一批：当前已经进入 `pendingBonusDiceSettlement` 的技能
   - 第二批：当前直接 `displayOnly` 但规则上应可修改的技能 / 状态 / 卡牌
4. 最后收口 UI / AI / evidence。

## Risks / Trade-offs
- Risk: 现有很多 UI 特写与测试默认依赖 `displayOnly` 自动结算。
  - Mitigation: 保留展示层组件，但其数据来源切到权威掷骰上下文。

- Risk: `flowHooks` 当前把很多 `displayOnly` 视为“不阻塞流程”。
  - Mitigation: 由 `roll context.modifiable` 与 `settlementMode` 接管“是否应 halt”的判断，不再以 `displayOnly` 猜语义。

- Risk: 少数技能其实只需要“角色专属重掷”，并不一定要开放所有通用改骰入口。
  - Mitigation: 这类限制必须由规则元数据显式声明，不能靠“不进入权威掷骰上下文”偷实现。

## Open Questions
- 是否需要把 `offensiveRoll` / `defensiveRoll` 主骰池也完全收编到 `activeRollContext`，还是先做“主骰池 + 额外掷骰共享接口”的过渡层？
- UI 最终是否继续保留 `BonusDieOverlay` 作为“额外掷骰皮肤”，还是完全折叠到 `DiceTray`？
