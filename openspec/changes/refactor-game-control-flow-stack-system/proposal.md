# Change: 基于现有系统重构统一控制流栈

## Why
当前仓库已经分别有：
- `ModalStackContext` 负责弹窗栈前台；
- `InteractionSystem` 负责阻塞式玩家输入；
- `ResponseWindowSystem` 负责响应者轮询；
- `FlowSystem` 负责阶段推进门禁；
- `resolutionStack` 负责“有阻塞 frame 就别 auto-advance”的骨架。

但这些系统还没有形成**单一控制流权威**。现在仍然存在两类根问题：

1. **业务结算主链分散**
   - 大杀四方仍把主结算恢复点分散在 `smashupReactionSession`、`smashupReactionStack`、`scoringSession`、`deferredPostScoringEvents` 等私有状态里；
   - 结果是“插队本体先结算、再回父本体”“强制触发排序”“当前玩家起顺时针可选响应轮”这些规则只能部分成立；
   - stale 目标/触发器仍可能留在“选择结算顺序”里，点了却没有效果。

2. **前台交互与业务续链脱节**
   - 王权骰铸已经把 token response、selectPlayer、choice 等阻塞 UI 接到了 modal stack，但 modal stack 现在只解决“谁在前台”，并没有和统一业务主链形成严格所有权；
   - 召唤师战争仍有一部分多步交互要靠 UI route / 本地 mode 还原，如果未来更复杂的多弹窗、多步骤、多玩家链路继续扩张，会再次分叉。

已有的 `add-resolution-stack-system` change 只覆盖了 resolution frame 骨架与 Flow gate，不足以定义这次真正要做的事情。用户现在要的是：
- **不是每个游戏各做一套栈**
- **不是再发明一个平行系统**
- **而是把现有 Modal / Interaction / ResponseWindow / Flow / resolutionStack 升级成一套统一控制流系统**

## What Changes
- 新增 `game-control-flow` capability，明确 **resolution frame stack 是唯一业务主链权威**。
- 在 spec 层收紧现有系统边界：
  - `ModalStack`：只负责前台弹窗 ownership 与恢复顺序；
  - `InteractionSystem`：只负责输入步骤与结果回传；
  - `ResponseWindowSystem`：只负责响应轮询模式；
  - `FlowSystem`：只负责阶段推进 gate；
  - `resolution frame stack`：负责嵌套结算、恢复位点、顺序策略、deferred follow-up、候选有效性。
- 统一三种核心顺序语义：
  - **嵌套本体优先栈**：新本体先结算，再回父本体；
  - **显式顺序链**：如多基地记分，按当前玩家锁定顺序推进；
  - **顺时针响应轮**：如大杀四方第 4 步，当前玩家起轮流响应，直到所有玩家连续 pass。
- 把“显示了一个可选按钮但其实目标已失效”的问题上升为框架规则：阻塞候选必须在**展示前**与**提交时**都按最新状态重验。
- 把跨游戏验收写进 spec，强制覆盖：
  - 王权骰铸：4 人枪手多目标 + token response 前台恢复；
  - 大杀四方：复杂嵌套结算链、计分链、顺序选择、插队恢复、stale 候选清理；
  - 召唤师战争：统一交互系统回归与大部分 E2E 重跑。

## Impact
- Affected specs:
  - `game-control-flow`（新增）
  - `manage-modals`
  - `interaction-system`
  - `flow-system`
  - `systems-layer`
- Affected code:
  - `src/contexts/ModalStackContext.tsx`
  - `src/hooks/ui/useSyncedModalStackEntry.tsx`
  - `src/engine/systems/resolutionStack.ts`
  - `src/engine/systems/InteractionSystem.ts`
  - `src/engine/systems/ResponseWindowSystem.ts`
  - `src/engine/systems/FlowSystem.ts`
  - `src/games/dicethrone/Board.tsx`
  - `src/games/smashup/domain/reactionSession.ts`
  - `src/games/smashup/domain/scoringSession.ts`
  - `src/games/smashup/domain/index.ts`
  - `src/games/summonerwars/ui/systemInteractionAdapter.ts`
  - 对应 E2E 与 evidence 文档
