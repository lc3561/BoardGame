> 状态：该 change 已被 `update-ai-repo-workbench-official-chat-executors` 覆盖；以下任务仅保留为历史方案草稿，不应作为当前默认实现路线。

## 1. Product Model
- [ ] 1.1 定义 `ProjectProfile`、`ProjectWorkflowBinding`、`TaskRun`、`WorkflowSelection` 的持久化 schema。
- [ ] 1.2 明确 Flowise 继续作为主壳，LangGraph 作为底层 runtime，工作台只补项目级管理、任务索引与执行扩展，而不是反客为主替代 Flowise。
- [ ] 1.3 记录“自动创建 worktree”属于后续优化，不作为第一阶段阻塞项。

## 2. Project-Scoped Workflow Routing
- [ ] 2.1 定义项目级 workflow 注册表与选择输入/输出契约。
- [ ] 2.2 增加 `Workflow Router`，支持根据用户任务在“当前项目已登记 workflow”中自动选择一个执行链。
- [ ] 2.3 在任务记录中保存 workflow 选择结果、理由与置信度。

## 3. CLI / Codex Orchestration
- [ ] 3.1 定义 `CliTaskExecution` 持久化 schema 与状态迁移。
- [ ] 3.2 设计 workflow 节点如何声明“这一步通过 CLI/Codex 执行”。
- [ ] 3.3 明确 CLI stdout/stderr、退出码、失败原因、重试入口如何回流到 `TaskRun` 与 artifact。

## 4. Flowise / LangGraph Boundary
- [ ] 4.1 明确 Flowise `sessionId` 与 LangGraph `thread_id` 的映射契约。
- [ ] 4.2 明确哪些恢复语义由 LangGraph runtime 持有，哪些只在工作台扩展层做索引。
- [ ] 4.3 确认工作台不会重复实现 Flowise/LangGraph 已提供的 conversation history、checkpoint、HITL 真相。

## 5. Workbench UX
- [ ] 5.1 设计单前端多任务切换 UI：任务列表/任务标签 + Flowise 主壳 + 工作台增强面板。
- [ ] 5.2 设计项目切换与项目级 Flowise 绑定入口。
- [ ] 5.3 设计当前任务的 Human Input、CLI 日志、ArtifactBundle 增强视图。

## 6. Validation
- [ ] 6.1 为项目级 workflow router 增加最小集成测试。
- [ ] 6.2 为 CLI orchestration 增加最小状态流测试。
- [ ] 6.3 为 Flowise `sessionId` / LangGraph `thread_id` 映射补最小恢复测试。
- [ ] 6.4 补一条主界面 E2E：选择项目 -> 发起任务 -> 选中项目 workflow -> 执行 -> 回到同一 `TaskRun` 视图。
