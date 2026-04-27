## Context
当前引擎已经具备多种“局部正确”的阻塞机制：
- FlowSystem 负责阶段推进
- InteractionSystem 负责玩家选择
- ResponseWindowSystem 负责时窗响应
- 游戏层会再叠加 `pending*`、`continuationContext`、`triggerQueue`、`afterEvents` 兜底

但这些机制缺少统一的“结算主链”抽象。也就是说，引擎知道“现在有个交互”，知道“现在有个响应窗口”，却不知道：
- 这个交互/窗口属于哪条连续结算事务
- 当前事务完成到第几步
- 何时允许 auto-continue
- 哪些 deferred follow-up 只能发一次

SmashUp `scoreBases` 只是这个问题最明显的一条链，不是唯一一条链。

更具体地说，当前仓库已经有了 `resolutionStack` 的基础状态与 gate：
- `ResolutionFrame / ResolutionState`
- `upsertActiveResolutionFrame()`
- `syncActiveResolutionWithInteraction()`
- `syncActiveResolutionWithResponseWindow()`
- Flow 层的 `hasBlockingResolutionFrame()`

但这套能力目前主要表达“有东西在阻塞阶段推进”，而不是“当前正在结算的主链是谁、被谁打断、恢复点在哪里”。`SmashUp` 仍主要依赖：
- `smashupReactionSession`
- `smashupReactionStack`
- `scoringSession`
- `pendingAfterScoringSpecials`
- `deferredPostScoringEvents`

来承载真正的嵌套恢复。

## Goals / Non-Goals
- Goals:
  - 为“跨事件批 + 交互 + 响应窗口 + 后续补发”的连续结算提供统一权威
  - 让游戏层能声明一条结算链，而不是把恢复点分散在多个系统
  - 让 auto-continue / queueInteraction / response window close 都能围绕同一权威协作
  - 支持不同顺序策略：栈式（LIFO）、队列式（FIFO）、显式顺序（按 frame order）
  - 支持“父 frame 被子 frame 打断，子 frame 完成后恢复父 frame”的嵌套结算语义
  - 优先让 SmashUp 的计分主链与被打断恢复逻辑落到通用抽象上，验证设计
- Non-Goals:
  - 不把所有普通命令都变成“上栈法术”
  - 不要求所有游戏立即迁移
  - 不重写现有 UI 交互组件
  - 不在本次变更里一次性把 SmashUp 所有非计分 optional response 时机都产品化

## Key Observation
“通用栈式处理”不能简单理解成“所有效果都 LIFO 入栈”。

本项目至少有三类连续结算：
1. **显式顺序链**：例如 SmashUp 多基地计分，顺序由当前规则严格限定
2. **反应/响应链**：例如 response window / simultaneous triggers，可能更接近 stack 或 responder queue
3. **链式交互链**：当前交互完成后立即进入下一个步骤，但仍属于同一事务

所以真正需要的不是单一 LIFO，而是：
**统一 resolution frame 模型 + 可配置顺序策略**

同时还需要补上当前 spec 里写得不够实的另一点：
**“有 resolution frame 状态”不等于“游戏已经把主结算链迁到 resolution frame 上”。**
这次设计要覆盖的是后者。

## Decision 1: 新增通用 resolution stack 状态
在 `sys` 中新增通用 resolution 状态（命名实现期可再定），至少包含：
- `frames`: 当前活跃 frame 栈
- `activeFrameId`

每个 frame 至少包含：
- `id`
- `kind`
- `ownerSystem` / `ownerGame`
- `ordering`：`stack | queue | explicit`
- `status`：`running | blocked | completed`
- `step`
- `deferredEvents`
- `deferredActions`
- `resumeToken` / `resumeReason`

补充约束：
- 子 frame 入栈后必须成为 `activeFrameId`
- 父 frame 必须保留自己的恢复位点，而不是在游戏私有 session 中另存一份第二权威
- 子 frame 完成后，驱动器必须恢复父 frame，而不是要求游戏层自己再手写一次“回去继续原链”

## Decision 2: Interaction / ResponseWindow 只阻塞 frame，不拥有长事务
InteractionSystem 和 ResponseWindowSystem 仍负责自己的局部状态，但它们只表达：
- 当前 frame 被我阻塞
- 当前 frame 已解锁

它们不再承担：
- 决定整条事务是否结束
- 决定 deferred follow-up 是否该补发
- 决定 phase 是否可推进

## Decision 3: FlowSystem 自动推进必须尊重 resolution stack
当存在未完成且阻塞中的 resolution frame 时：
- FlowSystem 不得把阶段自动推进当成“已经收口”
- 游戏层 `onAutoContinueCheck` / `onPhaseExit` 等 hook 只允许通过 resolution driver 恢复主链

## Decision 4: 游戏层通过 frame handler 声明连续结算链
游戏层不直接手写“交互结束后再去某某系统补下一段”。
而是注册 frame handler，由统一 driver 反复调用，直到 handler 明确返回：
- `emit events and continue`
- `block for interaction`
- `block for responseWindow`
- `wait for post-reduce`
- `complete`

对于嵌套链，再补一类结果：
- `push child frame and suspend current frame`

## Decision 5: SmashUp scoring session 作为首个迁移对象
SmashUp 当前已有 `scoringSession`，但它还不是通用 resolution frame 的真实拥有者。
第一阶段落下的 `resolutionStack` 骨架不会自动带来稳定性；必须把 SmashUp 当前分散在以下位置的恢复逻辑收束进去：
- `scoreBases` 计分主链
- `smashupReactionSession / smashupReactionStack`
- `afterScoring` deferred follow-up
- 被打断后“先收内层，再回外层”的恢复顺序

本次迁移的目标不是简单“把 scoringSession 改个名字”，而是验证：
- 多基地顺序
- 嵌套本体先结算、外层本体后恢复
- afterScoring 交互链
- response window
- deferred `BASE_CLEARED / BASE_REPLACED`
- re-score / replay 当前基地

迁移完成后，`SmashUp` 仍可保留 reaction queue / trigger queue 作为“第 3 步与第 4 步候选集合”，
但**不再让私有 session 栈充当主结算链的唯一权威**。

## Risks / Trade-offs
- 这是引擎级抽象升级，设计过度会带来接入复杂度
- 若把“resolution stack”做成只支持 LIFO，会与 SmashUp 这类显式顺序链冲突
- 若抽象太弱，又会退回每个游戏继续自己拼 `pending*`
- 若在未收束权威之前保留“通用 frame + 游戏私有主链”双主线过久，会让 bug 形态更隐蔽

## Migration Plan
1. 先补 spec，明确 resolution frame 的职责边界
2. 在现有引擎骨架上补齐真正的 frame driver，支持 parent/child 嵌套、resume point 与统一补发
3. 先迁移 SmashUp 计分主链与被打断恢复逻辑到通用 frame
4. 收束 `SmashUp` 私有 session 栈，只保留 reaction/trigger 候选所需的最小状态
5. 再挑一个非 SmashUp 的连续结算点验证（优先 response window + interaction 并存场景）
6. 验证稳定后，再逐步替换游戏层散落的 `pending* + continuationContext + afterEvents` 续链逻辑

## Open Questions
- `resolution stack` 应该作为独立 System，还是作为 Systems 层共享原语？
- frame 的 `deferredActions` 应落在 `sys` 还是继续允许 game core 持有镜像？
- response window 与 frame 的关系是“一窗对应一帧”，还是“一个 frame 内可多次打开窗口”？
- `SmashUp` 的 `reactionSession` 最终是保留为“UI 轮询状态”，还是进一步折叠为 frame metadata 的一个视图？
