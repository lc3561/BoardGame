# Change: AI 仓库工作台

## Why
- 当前项目已经具备 `create-new-game`、数据录入、资源上传、审计、E2E、PR 自动化等流程知识，但这些能力仍散落在 skill、脚本、规范与人工盯进度中，缺少一个围绕仓库与工作流组织的产品化工作台。
- 官方 `Flowise` 的 `Human-in-the-Loop` 并不是“只有节点图没有对话”，而是通过 `Chatflow / Assistant / Prediction API` 这类会话入口触发工作流，在会话里暂停、等待 `Human Input`、再恢复执行；本项目之前把这一点理解得过窄，导致 spec 错把“聊天入口”排除到了产品外。
- 这条线不能走“先做个空聊天壳、以后再补架构”的随意拼装路线，但也不能退化成“只有表单和按钮、没有会话”的假工作流；正确方向是先建立当前可执行的架构基线：仓库会话、工作流运行、人工决策、证据回传、本地执行边界与会话事件边界一起定义清楚，再在实现中按真实反馈持续完善。
- 用户的真实场景以本地仓库、本地文件、本地浏览器与本地 dev server 为中心；如果核心链路过早迁到远端服务器，不但延迟高，也会削弱仓库语义、目录语义与证据交付的稳定性。
- 在扩到“数据录入 / Bug 修复 / 审计 / PR / merge”之前，必须先用一个最能验证编排能力的闭环模板把底座跑通；“新建派系”正好覆盖规则来源选择、PDF 转录、素材缺失暂停、结构化定义确认与产物打包这些关键能力。

## What Changes
- 新增 `ai-repo-workbench` capability，但第一版的主交付不再是“单模板页面”，而是 **`RepoSession / WorktreeTask / WorkflowRun` 工作台骨架**；`new-faction` 只是首个正式模板，用来验证骨架可运行。
- 前置形成《开源基线与可复用结论》，对照 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu，明确“借鉴什么 / 不借鉴什么 / 为什么最终选择 Flowise 作为 fork 起点”。
- 把“开源参考对照 + 产品底座决策”提升为**第一版实现前置门禁**：每个候选都必须回答“它具体提供什么 / 哪些能力可直接借鉴 / 哪些不适合我们”，并显式比较 `fork OpenHands / Flowise / n8n / Activepieces`；当前裁决固定为 **fork Flowise，并把它限制在会话入口 / 节点画布 / workflow shell 层**。
- 当前锁定的上游 fork 基线为 `Flowise` `flowise@3.1.1`（commit `34cf285`，2026-03-23）；后续升级必须按 tag 增量评估，不允许直接追踪 upstream `main`。
- 当前 change 只负责把 fork 裁决、版本基线、领域边界与工作台骨架写成可执行规范；**并不等于已经把 Flowise 上游代码 fork/接入到仓库中**。真正的上游代码引入、目录布局、Node 版本隔离、构建/升级策略，应拆到后续单独实现 change。
- 建立当前五层骨架基线：`RepoSession / WorktreeTask` 仓库层，`WorkflowRun / NodeExecutionRecord / DecisionRequest / ArtifactBundle` 领域层，`WorkflowOrchestrator` 编排层，`LocalRuntime` 执行层，工作台前端展示层；后续允许在不破坏主语义的前提下持续调整细节。
- 明确 LangGraph 只允许位于 `WorkflowOrchestrator` 层，用于节点图推进、interrupt/resume 与 durable execution 思路；它不拥有 `RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 的领域定义。
- 将仓库入口收敛为更贴近产品语义的“初始化项目 / 导入项目 / 获取项目到本地”，并保持 local-first 执行；前端展示项目入口，核心运行依赖本机仓库上下文。
- 将用户入口重新收敛为 **官方 Flowise 风格的最小会话面板 + 固定工作流画布**：用户通过会话输入启动 `new-faction`，工作流在对话中返回状态、请求 `Human Input`、最终回传 `ArtifactBundle` 与图片产物，而不是只有独立表单按钮。
- 把“新建派系”降为第一版首个正式模板，要求它运行在已可管理的仓库/工作树骨架上；每个节点都有明确输入/输出/状态，所有人工输入都通过统一 `DecisionRequest` 聚合，所有阶段性交付都通过 `ArtifactBundle` 回传。
- 工作流节点需要支持用户级开关；例如本轮不做 E2E 时，用户可以在启动前直接关闭 `run-e2e-validation` 节点，而不是让系统把“没做 E2E”混成隐式遗漏。
- 保留未来引入 Temporal 的接口边界，但不把 Temporal 设为 MVP 前置依赖。

## Impact
- Affected specs:
  - `ai-repo-workbench`（新增）
- Affected code:
  - 未来会影响工作台前端、会话事件层、仓库执行器、工作流编排层、本地运行时、决策卡片与产物展示链路
  - 设计上与现有 `ugc-prototype-builder`、`ugc-runtime`、`e2e-runtime-management`、`add-ai-pr-review-merge-automation` 相邻，但本 proposal 先建立 `ai-repo-workbench` 的独立骨架基线与当前实施顺序，后续可按落地反馈迭代
  - 实现前必须先完成开源基线对照、fork 裁决、LangGraph 分层边界确认，再扩更多模板
  - 当前 proposal 收口后，下一条 change 应单独处理 `Flowise` fork 的真实落地：上游源码放置位置、与现有前端壳的集成边界、Node/构建隔离、升级审计与安全策略
