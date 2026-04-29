## Context

当前 workbench 已经逐步收口到“本地 journal + Flowise 主壳 + Human Input + ArtifactBundle”，并且页面也已经以 Flowise shell 作为主要工作流表面。用户现在确认的真实目标不是：

- 让 `codex cli` 做宿主
- 把页面再翻回聊天主界面
- 把产品复杂化为多浏览器窗口工作台

而是：

1. 继续保留 Flowise 作为宿主与主 workflow 表面。
2. 让工作台成为 Flowise 的项目级扩展层。
3. 让不同项目可以对接不同的 Flowise workflow。
4. 在单前端里持久化多条任务并自由切换。
5. 某些 workflow 节点需要时再调用 Codex/CLI。

这里的关键不是“Flowise vs LangGraph vs 工作台 二选一”，而是：

- **Flowise 是宿主**
- **LangGraph 是 orchestration runtime**
- **工作台是项目级扩展层**
- **CLI/Codex 是执行器**

三者必须保持清晰分层，避免把任何一层误实现成另一层的状态真相源。

## Goals / Non-Goals

- Goals:
  - 保持 Flowise 作为主壳和主 workflow 表面，不把产品复杂化为多窗口恢复系统。
  - 支持项目级 Flowise 绑定：不同项目可配置不同 `baseUrl`、`flowId`、workflow 集合。
  - 明确 LangGraph 负责 interrupt / checkpoint / resume / durable execution，而不是把这些职责重新塞回 Flowise UI 或工作台索引层。
  - 支持单前端中切换多条 `TaskRun`，并通过 `flowiseSessionId` 保持某条 workflow 的连续性。
  - 支持 workflow 内编排 CLI/Codex，并将执行结果、失败、暂停和证据回流到同一任务记录。
  - 明确“自动创建 worktree”属于后续优化，不阻塞第一阶段。
- Non-Goals:
  - 第一阶段不要求让工作台替代 Flowise 成为主壳。
  - 第一阶段不要求让 `codex cli` 成为宿主。
  - 第一阶段不要求实现多浏览器窗口同步或桌面级窗口管理器。
  - 第一阶段不要求自动生成新的 workflow。
  - 第一阶段不要求自动创建或销毁 worktree。

## Decisions

### Decision: Flowise 保持宿主地位，工作台作为扩展层挂接

主界面不再从 Flowise 主壳回退到聊天主界面，也不把工作台重新抬成主壳。正确方向是：

- Flowise shell 继续作为主 workflow 表面和唯一图交互面。
- 工作台扩展层补充项目、任务、worktree 和运行列表。
- 时间线、Human Input、CLI 日志、ArtifactBundle 作为围绕 Flowise 的增强面板出现。

### Decision: LangGraph 作为底层 orchestration runtime

Flowise 负责宿主、workflow 表面、session 入口与 HITL 交互，但不应单独承担全部 durable orchestration 真相。正确方向是：

- LangGraph 持有 interrupt / checkpoint / resume / durable execution 的底层运行时职责。
- Flowise 继续提供主 workflow 表面、Prediction API、`sessionId` 和 HITL UI 接入点。
- 工作台扩展层只保存项目级索引，例如 `TaskRun -> flowId -> flowiseSessionId` 的映射，不重复实现 LangGraph runtime 真相。

这样可以避免两类错误：

- 把 Flowise UI 强行扩展成底层运行时
- 把工作台索引层误写成另一套 durable execution 引擎

### Decision: 多任务通过单前端 TaskRun 切换实现，而不是多窗口恢复

用户当前最需要的是“工作台统一发起/切换任务”，不是“恢复多个浏览器窗口”。因此第一阶段以单前端多任务切换建模：

- 左侧/顶部维护任务列表
- 中心区域继续展示当前选中的 Flowise workflow
- 右侧或侧边面板展示当前 `TaskRun` 的日志、Human Input、ArtifactBundle

任务切换依赖持久化的 `TaskRun`，而不是依赖浏览器窗口本身。

### Decision: 项目级 Flowise 绑定是正式能力

工作台扩展层必须允许不同项目对接不同的 Flowise 配置。例如：

- 项目 A 绑定 `flowise-a`，只暴露 `new-faction`、`audit`
- 项目 B 绑定 `flowise-b`，暴露另一组 flow

因此需要正式建模：

- `ProjectProfile`
- `ProjectWorkflowBinding`

这样 Flowise 主壳可以保持稳定，而工作台扩展层也能保持通用，而不是为每个项目复制一套工作台 UI。

### Decision: Workflow Router 只在当前项目已登记 workflow 中选路

系统维护一组“当前项目已登记 workflow”，例如：

- `new-faction`
- `data-entry`
- `audit`
- `bug-fix`
- `cli-task`

用户输入任务后，可先进入 `Workflow Router`：

- router 解析任务意图
- 只在当前项目可用的 workflow 集合中选择
- 将任务和上下文映射为该 workflow 的启动参数

这意味着系统是“项目内选路”，不是“全局创造 workflow”。

### Decision: CLI/Codex 是编排对象，不是宿主

CLI orchestration 的正式边界：

- 工作台扩展层、Flowise 宿主层和 LangGraph runtime 共同持有任务上下文、输入快照、重试信息、人工决策、输出引用，但职责边界必须清晰
- CLI/Codex 进程只负责执行某一步
- stdout/stderr、退出码、关键产物和失败原因必须回写 durable state
- 任何重试都由 orchestrator/runtime 或工作台决定，而不是依赖同一个 CLI 进程会话续跑

### Decision: worktree 自动创建是后续优化

第一阶段：

- 继续允许 `TaskRun` 引用已有 repo/worktree 上下文
- 支持未来补充“自动创建 worktree”
- 不把它作为 Flowise 绑定、任务切换或 CLI orchestration 的阻塞项

## Proposed Model

```ts
type ProjectProfile = {
  id: string
  name: string
  repoRoot: string
  flowiseBaseUrl: string
  flowiseTemplateSetId: string
  createdAt: string
  updatedAt: string
}

type ProjectWorkflowBinding = {
  id: string
  projectId: string
  workflowKey: string
  flowId: string
  title: string
  description: string
  supportsCodexExecution: boolean
  createdAt: string
  updatedAt: string
}

type TaskRun = {
  id: string
  projectId: string
  title: string
  worktreeTaskId?: string
  workflowKey: string
  flowId: string
  flowiseSessionId: string
  orchestrationThreadId?: string
  status: 'routing' | 'running' | 'waiting_decision' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

type WorkflowSelection = {
  id: string
  taskRunId: string
  sourcePromptTurnId: string
  selectedWorkflowId: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
  createdAt: string
}

type CliTaskExecution = {
  id: string
  runId: string
  nodeId: string
  command: string[]
  cwd: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  exitCode?: number
  stdoutRef?: string
  stderrRef?: string
  startedAt?: string
  finishedAt?: string
}
```

## Rollout Phases

### Phase 1

- 保持 Flowise 主壳 + 单前端扩展层
- 明确 LangGraph 作为底层 runtime 的接入边界
- 增加 `ProjectProfile` / `ProjectWorkflowBinding`
- 增加 `TaskRun` / `flowiseSessionId`
- 先支持在当前项目已登记 workflow 中自动选路
- 先把 CLI/Codex orchestration 建模为节点级执行器

### Phase 2

- 增加任务列表/任务切换 UI
- 增加项目切换 UI
- 增加 CLI 任务列表、日志面板、恢复/重试入口

### Phase 3

- 评估自动创建 worktree
- 评估更复杂的跨项目工作台视图

## Risks / Trade-offs

- 若过早把范围拉到“多窗口工作台”，会偏离当前单前端主线。
- 若 workflow router 过于黑箱，用户会失去对为什么走某条流程的理解，因此必须输出选择原因。
- 若把工作台扩展层误写成主壳、把 Flowise session 误写成项目任务中心，或把 LangGraph runtime 误塞进 UI 层，都会再次混淆层次职责。
- CLI orchestration 一旦没有 durable state，就会重新踩回“CLI 进程就是上下文容器”的老问题。

## Open Questions

- workflow router 的第一版是规则路由、LLM 分类，还是二者结合。
- 项目级 Flowise 绑定是否需要支持一个项目多个 Flowise endpoint，还是第一阶段只支持一个项目一个 endpoint。
- 单前端多任务切换是做成左侧任务列表、顶部标签，还是两者结合。
- Flowise `sessionId` 与 LangGraph `thread_id` 的正式映射字段是否统一落到 `TaskRun`，还是额外拆表。
