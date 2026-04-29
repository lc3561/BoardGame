## Context

这一轮的真实用户裁决已经很清楚：

- 不再围绕外部自定义 `AIRepoWorkbench` 页面继续加线程式 UI。
- 内部主入口回到 Flowise 官方聊天页。
- Flowise 只做聊天壳和节点编排。
- 真正执行数据录入、旧派系参考、实施、审计、上传验收的，不应再是 LLM 摘要节点，而应是外部专业执行器。

当前仓库已经完成了这条裁决的一部分实现：

- Flowise 左侧菜单已能直接进入固定 `flowId` 的官方聊天页。
- 外部自定义 workbench 页面和首页入口已经撤下。
- 官方聊天页的 reset 已修正为真正清除 external 会话。

仍未完成的部分，是把 5 个子流从 `llmAgentflow` 摘要节点切换成外部执行器。

## Goals

- 把“官方聊天入口 + 外部专业执行器”写成当前唯一继续方向。
- 给下一会话一个明确的继续边界：优先补 `apps/api` 执行端点、seed 中的 `httpAgentflow` 切换。
- 把 `Codex CLI` 从“产品语义”降回“可选后端实现”。

## Non-Goals

- 不恢复外部自定义 `AIRepoWorkbench` 页面。
- 不把工作台重新做成项目级主壳、任务总控台或多任务前端。
- 不要求当前 change 立刻完成所有编码执行器的真实落盘能力。
- 不要求当前 change 规定唯一执行器品牌。

## Decisions

- Decision: 内部主入口固定为官方聊天页。  
  Reason: 用户已经明确要求“更接近官方心智”，而官方聊天页就是 Flowise 当前最直接的工作流使用入口。
- Decision: Flowise 只负责编排与会话。  
  Reason: 官方文档已经给出三条正路：HTTP Node、Custom Tool、MCP、Children Flows。对本项目最稳的是 `HTTP Node -> 本地 Nest API`，让 Flowise 只负责编排，不再直接承担仓库执行逻辑。
- Decision: 五个业务阶段都必须走专业执行器边界。  
  Reason: 这些阶段都属于“真实项目工作”，不是单纯总结文本。继续用 `llmAgentflow` 只会制造“看起来跑了，实际上没执行”的假象。
- Decision: Codex CLI 是可插拔执行器，而不是架构前提。  
  Reason: 用户已经明确 Codex 可选；因此系统必须以“执行器契约”而不是“某个具体 CLI”来建模。
- Decision: 运行入口必须显式接受 `projectPath`。  
  Reason: 用户已经明确要求“更通用一点，可以指定目录”。因此执行上下文不能再偷绑当前工具仓库路径，而要允许工具仓库与目标项目仓库平级放置，并在每次启动工作流时显式指定目标目录。
- Decision: reset 行为必须覆盖 external 会话。  
  Reason: 官方聊天页用于当前主入口时，reset 不再是细枝末节，而是主路径会话控制能力。

## Recommended Integration Pattern

最正确方案：

`Flowise Chatbot / AgentFlow -> HTTP Node -> apps/api ai-repo-workbench executor endpoints(projectPath, stage payload) -> 可替换执行器（CLI / 本地服务 / MCP adapter）`

理由：

- 保留 Flowise 官方产品心智。
- 执行边界集中在本项目可控的 Nest API。
- 后续无论接 Codex CLI、其他 CLI，还是接本地专用服务，都不需要再改 Flowise 产品语义。

## Implementation Notes

建议下一会话直接按这条顺序推进：

1. 在 `apps/api/src/modules/ai-repo-workbench` 增加 5 个执行端点：
   - `faction-intake/data-entry`
   - `faction-intake/reference-faction`
   - `faction-intake/implementation`
   - `faction-intake/audit`
   - `faction-intake/upload`
2. 在 `D:/gongzuo/webgame/flowise-fork/packages/server/src/enterprise/dev/aiRepoWorkbenchSeed.ts` 中对 5 个子流从 `llmAgentflow` 改为：
   - `startAgentflow`
   - `customFunctionAgentflow`（解析输入）
   - `httpAgentflow`
   - `directReplyAgentflow`
3. 真实验证 `prediction` 链路中出现新的 `POST /devtools/ai-repo-workbench/faction-intake/...`。
4. 补齐启动入口、执行端点、UI 展示对 `projectPath` 的显式输入、透传与展示，确保本地使用时可以直接指定目标项目目录。

## Risks

- 若只改 spec 不改 seed，下一会话仍可能被 `llmAgentflow` 误导。
- 若只改 seed 不补执行端点，主链路会变成 5 条 HTTP 404。
- 若把 `Codex CLI` 写死进 spec，会再次背离用户刚刚确认的“Codex 可选”。
