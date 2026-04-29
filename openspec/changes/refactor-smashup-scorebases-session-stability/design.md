## Context
SmashUp 的计分阶段已经不是单个函数能描述的线性流程，而是一个跨多基地、多类触发源、多轮交互、多轮响应窗口的长事务。当前代码把这条事务拆散在多个系统中：

- FlowHooks 负责进入与退出 `scoreBases`
- `scoreOneBase()` 内部既做 beforeScoring、计分、afterScoring，又决定是否打开响应窗口和延迟清场
- `multi_base_scoring` handler 一边补链，一边继续推进剩余基地
- `SmashUpEventSystem.afterEvents()` 再次兜底 deferred events、flowHalted 与 post-scoring pending actions
- `InteractionSystem.resolveInteraction()` 还内嵌了 SmashUp 专属 `_deferredPostScoringEvents` 传递逻辑

这导致同一语义在不同层反复出现，任何一处新增“提前 return / halt / queue next interaction / auto continue”都可能破坏整条链。

## Goals / Non-Goals
- Goals:
  - 用单一状态机驱动 SmashUp `scoreBases` 结算链
  - 明确延迟清场/换基地事件的唯一所有者和唯一补发点
  - 让 afterScoring 响应窗口与重算流程回到同一会话，而不是依赖分散 flag 回跳
  - 让具体交互 handler（如大副、母舰、寺庙）只关心本步业务，不再负责全局续链
  - 移除引擎层对 SmashUp 专属 continuation payload 的认知
- Non-Goals:
  - 不改变 SmashUp 规则语义本身（结算先后、可选与强制效果仍按当前规则）
  - 不把通用引擎改造成“所有游戏都必须有 scoring session”
  - 不顺手重写无关的 response window / prompt UI 渲染逻辑

## Decisions

### Decision 1: 引入 SmashUp 专用 `scoring session` 作为唯一结算权威
在 `sys` 中新增 SmashUp 专用 session 状态（命名实现期再定），至少显式保存：
- 锁定的待计分基地集合
- 当前正在结算的基地引用
- 已完成基地集合
- 当前结算阶段（beforeScoring / scored / afterScoringTriggers / afterScoringResponse / emitDeferred / nextBase）
- 当前基地的延迟 post-scoring 事件
- 当前基地的 afterScoring 初始力量快照

之后所有“继续同一基地 / 继续下一个基地 / 等待交互 / 等待 response window / 恢复清场换基地”都只读写这份 session，不再靠多个松散 flag 拼接。

### Decision 2: 延迟 `BASE_CLEARED/BASE_REPLACED` 只由 SmashUp session 驱动器补发
`_deferredPostScoringEvents` 仍可作为 session 内部过渡数据，但：
- `InteractionSystem` 不再感知并转移该字段
- 具体交互 handler 不再判断“是否最后一个交互”或直接 append deferred events
- `SmashUpEventSystem.afterEvents()` 不再兼任 deferred events 的最终补发器

唯一允许补发 deferred post-scoring events 的地方，是 scoring session 驱动器在确认：
1. 当前基地的 afterScoring 交互链全部结束
2. 当前基地的 afterScoring 响应窗口已结束
3. 如果需要重算，也已经完成重算

### Decision 3: 用稳定的基地引用替代长链上的裸 `baseIndex`
多基地计分会跨 `BASE_CLEARED/BASE_REPLACED`，单纯持有 `baseIndex` 很容易在“旧基地 / 新基地 / replacement target / pending action”之间混淆。实现期应改为使用稳定 session 引用（如 slot-based ref，或 `slotIndex + expectedBaseDefId` 组合），确保：
- 当前正在计分的是哪个槽位
- 延迟动作作用于“原计分基地”还是“替换后新基地”
- 多基地剩余列表不会因为中途替换而误判成新目标

### Decision 4: `scoreOneBase()` 退化为单基地步骤执行器，不再负责全局续链
重构后 `scoreOneBase()` 应只处理“当前基地下一步能推进到哪里”，而不再同时承担：
- 多基地总控
- deferred event 分发
- auto-continue 回跳策略
- 交互链续接

多基地推进、halt/恢复、响应窗口关闭后继续等逻辑都交给 scoring session driver。

### Decision 5: 交互系统只保留通用职责，continuationContext 视为 opaque 数据
引擎层交互系统只能做：
- 出队 / 选项刷新 / 交互切换
- 保持 `data.continuationContext` 原样透传

禁止在交互系统里写入、合并或解释 SmashUp 专属 `_deferredPostScoringEvents` 之类字段，避免游戏规则再次侵入通用引擎。

## Risks / Trade-offs
- 这是高耦合链路重构，短期改动面会明显大于“修一个触发器”。
- 需要同步改测试，否则旧测试会继续固化旧式 flag 行为。
- 重构过程中，最容易回归的是“单基地正常计分”和“afterScoring 响应窗口关闭后的自动推进”。

## Migration Plan
1. 先引入 session 结构与单一推进入口，但保持旧行为对齐。
2. 把 deferred post-scoring 补发从 handler / event system / interaction system 逐步收回到 session。
3. 收敛 `onPhaseExit('scoreBases')` 与 `multi_base_scoring` handler 的职责边界。
4. 移除不再需要的 flag 或把它们降级为 session 内部字段。
5. 用领域测试和 E2E 逐步锁定回归：单基地 → 多基地 → 链式 afterScoring → afterScoring response window → 重算。

## Open Questions
- session 状态最终是挂在 `sys.smashupScoring` 还是更通用命名下，但仅 SmashUp 使用？
- 稳定基地引用最终采用“槽位引用”还是“槽位 + 原基地 defId 校验”？
- `pendingPostScoringActions` 是否直接并入 scoring session，而不是继续留在 core？
