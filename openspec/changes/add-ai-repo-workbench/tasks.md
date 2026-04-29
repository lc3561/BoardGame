## 0. Baseline & Architecture Alignment
- [x] 0.0 将“先完成开源参考对照与底座决策，才能开始第一版实现”写成显式门槛，未满足前不得进入 runtime / UI / 节点开发。
- [x] 0.1 在 `design.md` 前置补齐《开源基线与可复用结论》，基于官方仓库 / 官方文档比较 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu 的成熟做法。
- [x] 0.2 对每个候选明确写出“它具体提供什么 / 哪些能力可直接借鉴 / 哪些不适合我们”，禁止只点名不展开。
- [x] 0.3 输出一张硬决策表，显式比较 `fork OpenHands / Flowise / n8n / Activepieces` 与“在现有 BoardGame 基础上扩展实现”的可行性，并写明为什么 fork / 不 fork。
- [x] 0.4 建立五层骨架的当前基线：`Workbench Surface -> WorkflowOrchestrator -> LocalRuntime -> Repo Domain -> Artifact Publisher`，后续实现不得绕过主分层；若需要调整，必须显式更新文档而不是隐式漂移。 
- [x] 0.5 明确 LangGraph 只允许位于 `WorkflowOrchestrator` 层，并写清它与 `LocalRuntime`、`RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 的边界。
- [x] 0.6 若继续沿用当前技术路线，必须同步记录“为什么成立、风险在哪里、还需要哪些优化”，不能只保留结论。
- [x] 0.7 锁定 `Flowise` 作为 fork 起点，并明确“只复用会话入口 / 节点画布 / workflow shell，不接管 repo/worktree/domain 真相”的实施边界。

## 1. Runtime Foundation
- [x] 1.1 定义 `RepoSession`、`WorktreeTask`、`WorkflowRun`、`NodeExecutionRecord` 的持久化 schema，并让工作台能管理多个 `WorktreeTask`；每次模板运行仍必须绑定到单一工作树。
- [x] 1.1a 定义 `ConversationSession`、`ConversationTurn` 的持久化 schema，并明确它们只作为会话展示层对象，不替代 `WorkflowRun` / `DecisionRequest` / `ArtifactBundle` 真相。
- [ ] 1.1b 为 coding 节点定义 `promptSnapshot`、输出摘要、失败状态、重试标记与副作用检查的持久化字段。
- [x] 1.2 定义 `WorkflowOrchestrator` 与 `LocalRuntime` 的分层接口；如采用 LangGraph，只允许它藏在 orchestrator 适配层后面。
- [x] 1.3 实现 `LocalRuntime` 的最小执行接口：`runNode`、`pauseForDecision`、`resumeRun`、`publishArtifactBundle`。
- [x] 1.4 选择并落地本地状态存储方案（文件 journal / SQLite / 等价实现），确保节点状态、决策对象与产物索引可在进程重启后恢复。

## 2. New-Faction Workflow
- [x] 2.1 实现 `new-faction` 画布式固定节点图：`capture-faction-intent -> select-rule-source -> acquire-rule-material -> transcribe-or-normalize-rules -> inspect-assets -> draft-faction-definition -> review-faction-definition -> publish-artifact-bundle`。
- [x] 2.1a 按用户故事把总控流收敛为高层任务输入，并将数据来源策略从总控表单下沉到模块节点配置。
- [x] 2.1b 把素材路径改为可选输入，并将素材人工介入改成“仅异常时进入 Human Input”。
- [x] 2.1c 把总控顶层收口为抽象模块节点，并改为通过官方子流承载素材检查、数据录入、实施、审计、上传验收细节。
- [x] 2.1d 在实施模块内增加音效配置子流，输出用点说明与可点击试听链接。
- [x] 2.1e 新增独立的“旧派系参考对照” workflow，并在主链路里以节点形式插入到数据录入之后、实施之前。
- [x] 2.1f 收紧顶层总览 UI：禁止把描述性说明带入总览层，只保留结构化编排与下钻入口。
- [ ] 2.2 为每个节点定义输入 schema、输出 schema、持久化状态键与失败/重试语义，禁止未建模的隐式共享状态。
- [ ] 2.3 实现规则来源分支：支持 Wiki、上传文档、上传 PDF、其他 URL 四类来源，并统一汇总为 `rawSourceSet`。
- [ ] 2.4 实现 PDF 转录 / 文本规范化节点，保证输出 `normalizedRuleCorpus` 与来源映射。
- [x] 2.5 实现素材检查节点，支持“补素材后继续”和“先走纯规则模式”两种恢复路径。
- [x] 2.6 实现可选节点开关能力；至少支持用户在启动前关闭 `run-e2e-validation`，并让节点图/执行记录显式显示 `skipped`。

## 3. Human-in-the-Loop
- [x] 3.1 实现 `DecisionRequest` 领域对象及前后端传输结构，至少支持 `single_select`、`form`、`approval` 三类决策。
- [x] 3.1a 把简单决策自动化 rubric 写成显式规则：`single-right-answer / low-risk / reversible` 命中时默认自动处理，并要求自动决策同样可审计。
- [ ] 3.2 为规则来源选择、素材缺失继续策略、派系定义确认三个节点接入 `DecisionRequest`，并支持 `resumeToken` 幂等恢复。
- [ ] 3.2a 在需要时才创建人工决策卡：先跑自动决策 rubric，再将多解/高风险/外部副作用场景升级为 `waiting_decision`。
- [x] 3.3 在运行详情页渲染决策卡片，展示 `summary`、`rationale`、`evidenceRefs`、推荐选项与用户最终 resolution。
- [x] 3.4 把 `DecisionRequest` 挂接到会话时间线，在同一会话里完成暂停、提交与恢复，而不是只在侧栏孤立渲染。

## 4. Artifact & Evidence
- [x] 4.1 实现 `ArtifactBundle` 生成逻辑，至少包含规则来源索引、规范化规则文本、素材核对清单、派系定义快照、决策日志与 `e2eStatus`。
- [x] 4.2 为 MVP 明确 `e2eStatus` 的显式生成条件与前端展示；当前已支持 `skipped / passed_demo`，避免把缺少 E2E 误判为失败。
- [x] 4.3 在运行详情页展示节点输入/输出摘要、关键日志、失败原因与 bundle 证据索引。
- [x] 4.4 让 `ArtifactBundle` 同时以结构化对象和会话消息两种形式返回，并校验两边摘要/状态一致。

## 5. UX Surface
- [x] 5.1 在工作台入口先展示 repo / worktree / run 管理骨架，再把 `new-faction` 作为首个正式模板挂载上去，不把其他模板伪装成“即将可用”的主功能。
- [x] 5.2 设计运行详情页的画布式固定节点图与节点详情区，展示 `pending / running / waiting_decision / blocked / completed / failed` 状态。
- [x] 5.3 提供 worktree 管理视图，支持登记、聚焦和查看各工作树当前状态、路径与最近运行归属。
- [x] 5.4 提供 bundle 预览面板，让用户能直接查看规则文本、素材缺失项、定义草案与确认后的最终版本。
- [x] 5.5 把当前入口改回官方风格的最小会话面板：用户通过会话发送“创建派系”请求，系统在同一时间线里回传状态、`Human Input` 和 `ArtifactBundle`。
- [x] 5.6 收口页面文案和布局，避免再出现“只有表单/按钮、没有会话感”的入口形态，同时不引入解释型大壳。

## 6. Validation
- [ ] 6.1 为节点状态迁移、`DecisionRequest` 幂等恢复、`ArtifactBundle` 最小字段完整性补充自动化测试。
- [ ] 6.1a 为 `codex exec` 节点补充“CLI 异常退出 / 超时 / 重试恢复 / 已落盘改动”四类恢复测试。
- [ ] 6.2 为“Wiki 路径”“PDF 路径”“素材缺失路径”三条典型主流程补最小集成验证。
- [x] 6.3 运行 `openspec validate add-ai-repo-workbench --strict --no-interactive`，并在实现落地时同步补充用户可见的证据文档。

## 7. Delivery & Remote Repo
- [ ] 7.1 细化远程 GitHub 仓库接入：明确 `clone-remote` 与 `import-local` 的差异、权限前提、落地本地路径与 repo 指纹生成策略。
- [ ] 7.2 细化受保护分支 / 无权限场景的安全降级：定义只到 commit、只到 PR、必须人工 merge 三种交付上限。
- [ ] 7.3 细化 ArtifactBundle 网页展示层级：运行总览卡、节点证据卡、原始文件跳转、失败节点恢复入口。

## 8. LangGraph Backend Orchestrator
- [x] 8.1 创建 NestJS 侧全流程 LangGraph StateGraph (`langgraph-orchestrator.ts`)，覆盖 9 个工作流节点，在决策点使用 `interrupt()` 实现 human-in-the-loop。
- [x] 8.2 创建 journal sync 层 (`langgraph-journal-sync.ts`)，将 LangGraph 内部状态转换为前端期望的 `WorkbenchJournal` 格式。
- [x] 8.3 更新 `ai-repo-workbench.service.ts`，使用 LangGraph orchestrator 替代旧的前端侧 LocalRuntime 驱动。
- [x] 8.4 确保决策 ID 生成为确定性（`decision-{runId}-{nodeId}`），避免 LangGraph resume 后重新执行时 ID 不匹配。
- [x] 8.5 验证 API bundle 编译通过（425.6kb）。
- [x] 8.6 补齐会话事件映射：把启动、节点状态更新、`DecisionRequest`、`DecisionResolution`、`ArtifactBundle` 同步为 `ConversationTurn`。
- [x] 8.7 为 coding 节点接入 `codex exec` 执行器适配层，并把重试/恢复控制留在 orchestrator。

## 9. Frontend Flowise Canvas Rewrite
- [x] 9.1 前端 `applyAsyncJournalMutation` 改为 server-first：server 模式下跳过冗余的本地计算，直接使用后端返回的权威 journal。
- [x] 9.2 简化 auto-advance：server 模式下 LangGraph 一次调用完成所有节点，不再需要 300ms 定时器轮询。
- [x] 9.3 重写 `AIRepoWorkbench.tsx` 页面布局：让 Flowise shell 成为页面主骨架，模板/RepoSession/工作树填入 header + palette，右侧决策/节点/产物改为覆盖在画布边缘的业务层。
- [x] 9.4 所有子组件（`StatusBadge`、`NodeStatusRail`、`DecisionPanel`、`ArtifactPanel`、`NodeDetailCard`、`WorktreeManagerPanel`）统一适配当前 Flowise 主布局，不再维护与主画布平级的自绘节点图风格。
- [x] 9.5 同步更新工作台 E2E 测试钩子与断言：保留核心入口与业务文本稳定，同时将图区域断言从旧的 `node-graph-*` 收敛到 `flowise-shell-panel` / `node-status-*`。
- [x] 9.6 右侧面板自动切换：出现决策时切到决策 tab，完成后切到产物 tab。
- [x] 9.7 把固定 flow 的启动方式从“独立表单卡”收回到会话式 composer，同时保留可选节点开关和仓库上下文展示。
- [x] 9.8 让默认入口直达总控流，并保留官方 Flowise 画布/节点编辑能力与父子流层级钻取。
- [x] 9.9 去掉总控表单顶部的默认兜底说明占位，避免无意义文案挡住输入区。

## 11. Flowise Seed Alignment
- [x] 11.1 将 5 条固定 `AI Repo Workbench` agentflow 的 seed 行为改为按固定 ID / 名称 upsert，而不是“只创建缺失流”。
- [x] 11.2 修复本地启动验证链路，确认旧占位进程不会掩盖新版 Flowise server 与新版 seed。
- [x] 11.3 通过真实运行态日志与 SQLite 落库结果验证：总控流已更新为新版字段与节点语义。
- [x] 11.4 再次验证新版 seed 已落库为“总控抽象模块 + 子流细节 + 音效配置分支”结构。

## 10. Future-Proofing
- [ ] 10.1 把执行器接口与领域模型解耦，确保后续接入 Temporal 或替换 LangGraph 实现时，无需改写 `DecisionRequest`、节点 I/O schema 与 `ArtifactBundle`。
- [ ] 10.2 为 Temporal 适配预留边界说明：Temporal 只接管 durable orchestration，不接管仓库安全策略、前端展示与证据结构。
- [ ] 10.3 保持 `codex exec` 适配层与工作流持久化层解耦，避免未来替换为 Codex SDK、远程 agent 或其他 coding 执行器时牵动领域 schema。
