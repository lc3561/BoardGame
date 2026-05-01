## Context
DiceThrone 当前同时存在两条掷骰实现路线：

1. 主骰路线  
`core.dice` -> `DiceTray` -> `MODIFY_DIE / REROLL_DIE / TOGGLE_DIE_LOCK` -> `rollConfirmed` / 技能重选

2. 额外骰路线  
`BONUS_DIE_ROLLED` / `BONUS_DICE_REROLL_REQUESTED` / `displayOnly` -> `pendingBonusDiceSettlement` 或 `BonusDieOverlay/EventStream` -> 直接伤害/加伤/状态结算

这导致多个本应共享同一规则语义的投掷，被拆成了“真骰盘”与“特效骰”两种模型。当前代码里已经出现以下症状：

- `rollDie` 在 `effects.ts` 中总是追加 `createDisplayOnlySettlement(...)`，即便该投掷结果按规则仍可被改骰。
- 多个英雄 custom action 直接 `BONUS_DIE_ROLLED + createDisplayOnlySettlement + DAMAGE_DEALT/BONUS_DAMAGE_ADDED`，绕过统一改骰链路。
- `flowHooks.ts` / `systems.ts` 只把非 `displayOnly` 的奖励骰视为阻塞性交互，默认把很多额外骰降级为“展示后立即继续”。
- `commandValidation.ts` 的 `MODIFY_DIE / REROLL_DIE` 仍默认围绕 `state.dice` 和当前 pending interaction，缺乏“当前活动临时骰池”的统一抽象。

## Goals
- 让 DiceThrone 所有“规则上可被改骰/重掷/干预”的投掷进入统一可交互模型。
- 统一主骰、目标掷骰、技能额外骰、奖励骰、对掷的所有权、可修改性和阶段阻塞规则。
- 保留现有结果特写/回放能力，但把它降级为 UI 展示层，而不是规则承载层。

## Non-Goals
- 不在本 change 内重写所有骰子视觉表现。
- 不要求所有额外骰都必须长得和主骰盘完全一致；本 change 先统一规则与交互语义。
- 不顺带修改无关英雄平衡、卡牌数值或特效文案。

## Decisions

- Decision: 引入 DiceThrone 专用“活动骰子上下文”而不是继续用 `core.dice` 与 `pendingBonusDiceSettlement` 并存。
  - Rationale: 当前真正的问题不是“有没有 overlay”，而是“哪些骰子被规则系统承认为可操作对象”。需要一个能描述主骰与临时骰池的单一抽象。

- Decision: 用“规则可干预性”决定是否进入统一交互链路，而不是用“来源是主技能还是 custom action”决定。
  - Rationale: 规则关心的是这次投掷能否被改骰，不关心实现上它来自 `rollDie`、`bonus dice` 还是某个英雄脚本。

- Decision: `displayOnly` 只保留给三类场景：
  - 已经完成规则结算后的结果回放
  - 规则明确不可干预的投掷
  - 纯汇总说明，不承载后续命令入口
  - Rationale: 这样能保留 UI 氛围层，同时避免再把规则交互埋进特效。

- Decision: Ultimate / Targeting Roll / 多人目标选择通过“上下文策略矩阵”建模，而不是在各处 scattered `if (isUltimate)`。
  - Rationale: 当前 `execute.ts`、`flowHooks.ts`、`rules.ts`、custom actions 都散落着 Ultimate/targeting 的特判，容易继续漏口。

## Proposed Model

### Active Dice Context
为 DiceThrone 增加统一的活动骰子上下文，至少包含：

- `contextId`
- `kind`: `main-roll | targeting-roll | effect-roll | bonus-roll | compare-roll`
- `ownerPlayerId`
- `targetPlayerId`
- `phase`
- `dice[]`
- `modifiableBy`: `owner | opponents | both | none`
- `rerollPolicy`
- `resolutionPolicy`
- `displayPolicy`
- `ultimateLocked`

### Resolution Policy
- `interactive`: 必须等待改骰/重掷/放弃后才能结算
- `auto-settle`: 规则不允许干预，可直接结算
- `replay-only`: 已结算，仅用于回放 UI

### UI Policy
- `DiceTray` 或等价统一骰子操作视图负责展示可交互上下文
- `BonusDieOverlay` 仅负责 `auto-settle` / `replay-only`
- `useCardSpotlight` 不再承担“是否是可操作骰子”的判定，只负责展示已发生的结果

## Risks / Trade-offs
- 风险：主骰与临时骰池统一后，会波及 `commandValidation`、`flowHooks`、`systems`、`Board`、`AI` 的假设。
  - Mitigation: 先定义上下文边界和迁移顺序，逐类掷骰切换，不一次性推平所有 custom action。

- 风险：一部分当前 `displayOnly` 的技能链路已经依赖“同批事件立刻出伤害/状态”。
  - Mitigation: 将这些链路显式拆成“掷骰上下文创建 -> 玩家干预/放弃 -> 结算事件”三段式。

- 风险：多人局和 2v2 的目标拥有者/干预者判断容易再次分叉。
  - Mitigation: 统一通过上下文的 `ownerPlayerId / targetPlayerId / modifiableBy / ultimateLocked` 判定，禁止 UI 和领域层各自推断。

## Migration Plan
1. 先补文档/spec，锁定哪些投掷必须进入统一可交互模型。
2. 抽出活动骰子上下文与阶段阻塞模型。
3. 先迁移 `targetingRoll` 与 `rollDie` 这两类最明显的规则缺口。
4. 再迁移 `pendingBonusDiceSettlement` / `BonusDieOverlay` 中仍应可干预的奖励骰。
5. 最后清理剩余 `displayOnly` 滥用点，并补 E2E/证据。

## Open Questions
- 可交互额外骰是否直接复用现有 `DiceTray`，还是提供“同语义、不同布局”的共享组件壳层。
- 某些 compare roll / duel roll 是否允许完整复用 `MODIFY_DIE / REROLL_DIE`，还是需要轻量上下文专用命令包装。
