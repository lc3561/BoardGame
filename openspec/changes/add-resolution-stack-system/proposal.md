# Change: 引入通用连续结算栈，并让嵌套结算主链真正接入引擎

## Why
现在不只是 SmashUp `scoreBases`，仓库里多种“连续结算”都在重复踩同一类坑：一条逻辑链需要跨 **事件批、交互、响应窗口、阶段推进、延迟补发** 多个节点连续完成，但当前引擎过去没有“这是一笔尚未结清的长事务”的统一模型。

现状通常依赖以下手段拼接：
- `flowHalted`
- `responseWindow.current`
- `sys.interaction.current / queue`
- 游戏专属 `pending*` / `continuationContext`
- 事件系统里的 afterEvents 兜底补发

这些状态分别成立，但**没有一个统一权威来描述“当前还在结算哪条链、卡在哪一步、何时恢复、何时只允许补发一次”**。结果就是：
- 连续交互后漏续链 / 重复续链
- 响应窗口关闭后误自动推进
- 延迟清场、替换、补算等 follow-up 在多个系统重复持有
- 某个游戏修好一条链，另一条链继续按旧模式出 bug

仓库里现在已经落下了第一阶段 `resolutionStack` 骨架，但 **SmashUp 仍主要依赖 `smashupReactionSession`、`smashupReactionStack`、`scoringSession` 和局部 deferred 状态来恢复主链**。这意味着：
- 引擎知道“当前有个 frame 在阻塞阶段推进”，
- 但 `SmashUp` 仍没有把“哪张牌/哪个能力打断了谁、何时先收内层再回外层”完全交给通用 frame 栈承载。

继续逐游戏打补丁，只会复制 SmashUp 之前的问题；而如果只停留在“有 frame 容器”但不让游戏主结算链真正迁上去，也无法获得你要的那种稳定性提升。

## What Changes
- 把现有引擎层 `resolutionStack` 从“阻塞门控骨架”推进为真正可承载 **嵌套结算主链** 的通用能力。
- 支持把一条结算链显式拆成 resolution frame（步骤帧），并支持父子 frame 嵌套；由统一驱动器决定：
  - 继续同步推进
  - 暂停等待 interaction
  - 暂停等待 response window
  - 等待 reduce 后再恢复
  - 完成当前子帧后恢复父帧/同级帧
- 明确 deferred follow-up（如补发事件、延迟动作、替换后落点动作）归 resolution frame 所有，而不是散落在 interaction data 或 afterEvents 兜底里。
- 让 FlowSystem / InteractionSystem / ResponseWindowSystem 都只认“当前是否有未完成 resolution frame”，不再各自猜测是否还能自动推进。
- 第二阶段明确让 SmashUp 把“被打断的本体结算链”迁移到通用 frame 栈，而不是继续由私有 session 栈充当主结算权威。
- `SmashUp` 首批迁移范围聚焦：
  - 计分主链及其嵌套打断恢复
  - `afterScoring` / 计分相关交互与 deferred follow-up
  - 反应 session 与通用 frame 的职责边界收束
- 非计分事件的“第 4 步可选响应轮询”先不在本提案里一次性全量收口；该问题会被本次设计预留接入点，但另行按能力接入。

## Impact
- Affected specs:
  - `resolution-stack`（新增）
  - `interaction-system`
  - `flow-system`
- Affected code:
  - `src/engine/systems/resolutionStack.ts`
  - `src/engine/systems/InteractionSystem.ts`
  - `src/engine/systems/FlowSystem.ts`（或等价 flow 实现入口）
  - `src/engine/systems/ResponseWindowSystem.ts`（或等价 response window 实现入口）
  - `src/engine/types.ts`
  - `src/games/smashup/domain/reactionSession.ts`
  - `src/games/smashup/domain/scoringSession.ts`
  - `src/games/smashup/domain/index.ts`
  - `src/games/smashup/domain/reducer.ts`
  - 其他存在连续结算链的游戏系统（按接入范围逐步推进）
