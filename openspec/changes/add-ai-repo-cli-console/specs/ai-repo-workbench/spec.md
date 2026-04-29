## ADDED Requirements

### Requirement: AI Repo Workbench SHALL 以 Flowise shell 作为宿主并由工作台补充项目级扩展能力

系统 MUST 以 Flowise shell 作为主 workflow 表面和唯一图交互面；`AIRepoWorkbench` MUST 作为围绕 Flowise 的项目级扩展层存在。系统不得为了接入 CLI/Codex 而把产品回退成聊天主界面，也不得要求工作台或 `codex cli` 反过来承担主壳职责。

#### Scenario: Flowise 继续作为主壳
- **WHEN** 用户进入 AI repo 工作台
- **THEN** Flowise shell MUST 作为当前任务的主 workflow 表面
- **AND** 工作台扩展层 MUST 补充项目、任务与运行上下文
- **AND** 不得要求用户直接把 `codex cli` 当作宿主使用

### Requirement: 系统 SHALL 支持项目级 Flowise 绑定

系统 MUST 支持不同项目绑定不同的 Flowise 配置与 workflow 集合，而不是把某一个固定 flow 写死成全局默认；这些绑定由工作台扩展层管理，但不改变 Flowise 的主壳地位。

#### Scenario: 项目绑定自己的 Flowise workflow 集合
- **WHEN** 用户切换到某个项目
- **THEN** 系统 MUST 加载该项目自己的 Flowise `baseUrl`、已登记 workflow 列表与 `flowId`
- **AND** 后续任务发起 MUST 只使用该项目已绑定的 workflow 集合

### Requirement: 系统 SHALL 以 TaskRun 作为单前端多任务切换的持久化单元

系统 MUST 通过持久化 `TaskRun` 来承载单前端里的多任务切换，而不是依赖多浏览器窗口或仅依赖页面内存状态；`TaskRun` 是工作台扩展层的索引对象，不替代 Flowise 的会话与 checkpoint 真相。

#### Scenario: 用户在单前端中切换任务
- **WHEN** 用户在工作台中切换到另一条任务
- **THEN** 系统 MUST 根据目标 `TaskRun` 加载对应的 workflow、运行状态和增强视图
- **AND** 不得要求用户通过另开浏览器窗口来维持任务上下文

#### Scenario: TaskRun 绑定 Flowise session
- **WHEN** 系统发起一条新的项目任务
- **THEN** 系统 MUST 为该任务保存 `TaskRun`
- **AND** `TaskRun` MUST 绑定对应的 `flowId` 与 `flowiseSessionId`
- **AND** 后续继续执行或查看历史时 MUST 通过该映射恢复同一条 workflow 运行

### Requirement: 系统 SHALL 以 LangGraph 作为底层 orchestration runtime

系统 MUST 允许 Flowise 宿主层与 LangGraph runtime 组合使用：Flowise 负责主 workflow 表面、Prediction API、`sessionId` 与 HITL 入口；LangGraph 负责 interrupt、checkpoint、resume 与 durable execution。工作台扩展层只保存项目级索引，不得重复实现运行时真相。

#### Scenario: TaskRun 同时索引 Flowise session 与 LangGraph thread
- **WHEN** 某条任务需要底层 durable orchestration
- **THEN** 系统 MUST 允许 `TaskRun` 同时绑定 `flowiseSessionId` 与 LangGraph `thread_id`
- **AND** Flowise `sessionId` MUST 用于宿主层会话继续与 HITL 恢复
- **AND** LangGraph `thread_id` MUST 用于底层 runtime 的 checkpoint / resume

#### Scenario: 工作台不重复实现 runtime 真相
- **WHEN** 系统已经通过 Flowise 与 LangGraph 提供会话、checkpoint 或 HITL 能力
- **THEN** 工作台扩展层 MUST 只保存项目、任务、worktree 与映射索引
- **AND** 不得再实现第二套 conversation history 或第二套 durable execution 真相

### Requirement: 系统 SHALL 支持根据当前项目任务自动选择已登记 workflow

系统 MUST 能根据用户任务意图在“当前项目已登记 workflow”中选择合适的一条，并将其作为后续执行链的入口；系统不得要求第一版只能由用户手动点击固定 workflow 按钮。

#### Scenario: 用户提交任务后自动选项目内 workflow
- **WHEN** 用户在某个项目下提交一个新的任务请求
- **THEN** 系统 MUST 先执行 workflow routing
- **AND** 从该项目已登记 workflow 中选择一条最合适的执行链
- **AND** 在任务记录或增强视图中说明系统选择了哪条 workflow 以及理由

#### Scenario: 自动选 workflow 只选择既有流程
- **WHEN** 系统完成 workflow routing
- **THEN** 系统 MUST 只从当前项目已登记 workflow 集合中选择
- **AND** 不得在第一版中自动创造新的 workflow

### Requirement: workflow 节点 SHALL 可编排 CLI / Codex 任务

系统 MUST 支持 workflow 节点调度 CLI/Codex 执行，将 CLI/Codex 作为可跟踪、可恢复、可重试的执行器，而不是临时命令调用或全局宿主。

#### Scenario: workflow 节点通过 CLI / Codex 执行
- **WHEN** 某个 workflow 节点声明需要 CLI 或 Codex 执行
- **THEN** 系统 MUST 记录该任务的命令、cwd、状态、退出码与输出引用
- **AND** 在工作台增强视图中展示其执行进度

#### Scenario: CLI / Codex 失败后仍可恢复
- **WHEN** CLI 或 Codex 任务执行失败或中断
- **THEN** 系统 MUST 保留任务状态和输出引用
- **AND** 后续恢复/重试 MUST 由 Flowise workflow 或工作台扩展层控制
- **AND** 不得依赖同一个 CLI 进程会话继续运行

### Requirement: worktree 自动创建 MAY 作为后续优化能力

系统 MAY 在后续阶段支持自动创建 worktree，但第一阶段 MUST 不把它作为项目级 Flowise 绑定、workflow router 或 CLI orchestration 的前置条件。

#### Scenario: 第一阶段不依赖自动创建 worktree
- **WHEN** 第一阶段交付项目级 Flowise 绑定、workflow router 与 CLI orchestration
- **THEN** 系统 MAY 继续使用已有 repo/worktree 上下文
- **AND** 不得因为尚未支持自动创建 worktree 而阻塞该 change 的主线能力
