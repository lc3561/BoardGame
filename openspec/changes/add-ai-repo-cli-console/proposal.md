# Change: 扩展 AI Repo 工作台为 Flowise 宿主的项目级扩展层

> 状态：该 change 的“继续把工作台做成项目级主壳 / 多任务前端”方向，已被 `update-ai-repo-workbench-official-chat-executors` 覆盖。除非用户再次明确恢复这条路线，否则不要继续按本 proposal 实施。

## Why

当前 `ai-repo-workbench` 已经有本地 journal、固定模板流程和 Flowise 主壳，但仍然偏向“单模板演示页”。用户现在确认的真实目标不是让工作台反客为主接管整个产品，也不是让 `codex cli` 做宿主，而是保持 Flowise 作为主壳与主 workflow 表面，再由工作台补上项目管理、任务索引、worktree 与 CLI/Codex 扩展能力。

这意味着工作台必须解决三件事：

1. 单前端里持久化多个任务，而不是依赖浏览器窗口或终端窗口。
2. 不同项目可以对接不同的 Flowise 实例 / flow 集合，而不是把某一个固定 flow 写死成全局默认。
3. Flowise 继续负责 workflow 与 HITL，工作台只补项目级索引与执行扩展；Codex/CLI 只是被某些节点调用的执行器。

## What Changes

- 在 `ai-repo-workbench` capability 上明确“Flowise 做宿主、LangGraph 做底层 orchestration runtime、工作台做项目级扩展层、CLI/Codex 做执行器”的产品语义。
- 增加 `ProjectProfile` / `ProjectWorkflowBinding` 能力，让不同项目可以挂接各自的 Flowise `baseUrl + flowId` 集合。
- 增加 `TaskRun` / `flowiseSessionId` 持久化能力，让单前端可以切换多条任务，而不是依赖多窗口恢复。
- 保留 `Workflow Routing` 能力，但它的目标是从“当前项目已登记 workflow”中选路；工作台负责索引与切换，Flowise 仍是 workflow 主壳，LangGraph 负责底层 durable execution。
- 增加 `CLI Orchestration` 能力：workflow 节点可调度和跟踪 CLI/Codex 任务，但 CLI 只作为执行器，不作为唯一状态容器。
- 明确“自动创建 worktree”仍是后续优化，不作为第一阶段阻塞项。

## Impact

- Affected specs: `ai-repo-workbench`
- Affected code:
  - `src/pages/devtools/AIRepoWorkbench.tsx`
  - `src/features/ai-repo-workbench/*`
  - `apps/api/src/modules/ai-repo-workbench/*`
  - future `project registry` / `workflow router` / `CLI orchestrator` modules
