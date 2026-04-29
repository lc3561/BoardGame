# Change: 收口 AI Repo Workbench 为官方聊天入口与专业执行器编排

## Why

当前仓库里同时存在两条会互相打架的方向：

- 一条是已经落地的收口方向：去掉外部自定义 workbench 壳，保留 Flowise 官方聊天页作为内部主入口。
- 另一条是尚未实现的旧提案方向：继续把工作台扩成项目级主壳、任务索引层和 CLI 控制台。

用户已经明确裁决：这条线不再继续堆“外部工作台线程”或“项目级主壳”，而是回到更接近官方的心智模型：

1. Flowise 负责官方聊天入口、节点编排和子流组织。
2. 数据录入、旧派系参考、实施、审计、上传验收这些实际工作，必须由专业执行器承担。
3. Codex CLI 只是可选执行器，不是产品前提，也不是唯一实现。

如果不把这个裁决写进 OpenSpec，下一会话很容易又顺着 `add-ai-repo-cli-console` 的旧方向走偏。

## What Changes

- 明确 `AI Repo Workbench` 的内部主入口是 Flowise 官方 `/chatbot/:flowId` 页面，而不是外部自定义工作台页面。
- 明确官方聊天页的 `Reset Chat` 对 external 会话必须真正删除服务端记录并恢复欢迎态。
- 明确总控流中的 `数据录入 / 旧派系参考 / 实施 / 审计 / 上传验收` 五个阶段必须通过外部专业执行器完成，而不是继续用 `llmAgentflow` 产出阶段摘要来冒充执行。
- 为执行器边界定正式产品语义：推荐 `Flowise HTTP Node -> 本地 Nest API -> 可替换执行器`，但也允许 MCP / Custom Tool 等官方扩展方式。
- 明确运行入口与执行端点必须支持显式 `projectPath`，使工具仓库可以与目标项目平级放置，并在启动时指定目标目录，而不是把当前工具仓库路径硬编码为唯一执行上下文。
- 明确 `Codex CLI` 只是实现 `implementation` 等阶段的一种后端执行器；系统不得把它写成唯一前提。
- 将 `add-ai-repo-cli-console` 中“工作台继续做主壳 / TaskRun 多任务前端”的方向标记为已被当前 change 覆盖。

## Impact

- Affected specs: `ai-repo-workbench`
- Affected code:
  - `D:/gongzuo/webgame/flowise-fork/packages/ui/src/menu-items/dashboard.js`
  - `D:/gongzuo/webgame/flowise-fork/packages/ui/src/views/chatbot/index.jsx`
  - `D:/gongzuo/webgame/flowise-fork/packages/server/src/enterprise/dev/aiRepoWorkbenchSeed.ts`
  - `apps/api/src/modules/ai-repo-workbench/*`
  - `src/pages/devtools/AIRepoWorkbench.tsx`
  - `src/features/ai-repo-workbench/*`
  - `src/api/ai-repo-workbench.ts`
