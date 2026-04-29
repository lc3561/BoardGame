# Change: 收敛 SmashUp 计分结算链并稳定多重 afterScoring 场景

## Why
SmashUp 当前 `scoreBases` 结算链同时分散在 `scoreOneBase()`、`registerMultiBaseScoringInteractionHandler()`、`onPhaseExit('scoreBases')`、`onAutoContinueCheck()`、`SmashUpEventSystem.afterEvents()` 与 `InteractionSystem.resolveInteraction()` 中推进。多基地计分、afterScoring 响应窗口、链式交互与延迟 `BASE_CLEARED/BASE_REPLACED` 事件依赖多个隐式 flag（如 `_deferredPostScoringEvents`、`scoredBaseIndices`、`afterScoringInitialPowers`、`flowHalted`、`_waitForPostScoringReduce`）共同维持，已经反复引发重复计分、漏计分、交互链中断与“大副未触发”类回归。

继续在现结构上补点修复，无法稳定收敛计分链。需要把 SmashUp 计分阶段重构为单一的“计分会话（scoring session）”驱动器，消除跨系统分散推进和游戏专属逻辑侵入引擎层的问题。

## What Changes
- 新增 SmashUp 专用 `scoring session` 语义，作为 `scoreBases` 阶段唯一结算权威。
- 将“多基地顺序选择 / beforeScoring / BASE_SCORED / afterScoring 触发 / afterScoring 响应窗口 / 延迟清场与换基地 / 重算同一基地 / 继续下一个基地”统一收敛到同一状态机推进。
- 取消由 `InteractionSystem` 和通用交互 handler 传播、补发 `_deferredPostScoringEvents` 的做法；改为由 SmashUp session 驱动器统一决定何时补发且只补发一次。
- 收紧交互 handler 职责：交互 handler 只返回该步领域结果，不再自己判断“是否最后一个交互”、不再直接驱动多基地后续链路。
- 为多基地计分与 afterScoring 组合场景补齐领域测试与 E2E 证据，覆盖大副、侦察兵、母舰、托尔图加、刚柔流寺庙等代表性链路。

## Impact
- Affected specs:
  - `smashup-scoring-session`（新增）
  - `interaction-system`（新增 opaque continuation context 约束）
- Affected code:
  - `src/games/smashup/domain/index.ts`
  - `src/games/smashup/domain/systems.ts`
  - `src/games/smashup/domain/baseAbilities.ts`
  - `src/games/smashup/domain/baseAbilities_expansion.ts`
  - `src/games/smashup/abilities/pirates.ts`
  - `src/engine/systems/InteractionSystem.ts`
  - SmashUp 相关 scoring / afterScoring 测试与 E2E 证据文件
