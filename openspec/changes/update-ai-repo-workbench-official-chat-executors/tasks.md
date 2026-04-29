## 1. Spec Alignment

- [x] 1.1 把“官方聊天入口 + 专业执行器”写成新的 change，避免下一会话继续沿旧主壳方向推进。
- [x] 1.2 明确 `Codex CLI` 只是可选执行器，不是产品前提。
- [x] 1.3 明确 `add-ai-repo-cli-console` 的主壳方向已被本 change 覆盖。

## 2. Official Entry

- [x] 2.1 Flowise 左侧菜单新增 `AI 仓库工作台`，并直达固定 `flowId` 的官方聊天页。
- [x] 2.2 撤掉外部自定义 `AIRepoWorkbench` 页面、首页入口与 manifest 启用态。
- [x] 2.3 修复官方聊天页 `Reset Chat`，确保 external 会话真正删除并恢复欢迎态。

## 3. Professional Executor Boundary

- [x] 3.1 在 `apps/api` 补齐 `data-entry / reference-faction / implementation / audit / upload` 五个执行端点。
- [x] 3.2 将 seed 中对应五个子流从 `llmAgentflow` 改成 `httpAgentflow` 执行链。
- [x] 3.3 让 `implementation` 阶段通过统一执行器契约暴露可用执行器，避免把 `Codex CLI` 写死成唯一实现。
- [x] 3.4 为工作流启动与执行端点补齐 `projectPath` 透传，避免把工具仓库路径硬编码为唯一目标目录。

## 4. Validation

- [x] 4.1 补齐 Flowise 侧边栏入口、聊天入口、发送后状态、reset 后状态的证据文档。
- [x] 4.2 验证主总控 flow 触发后，5 个阶段至少出现新的 HTTP executor 调用日志。
- [x] 4.3 通过最小 workflow API smoke 验证 reset 修复不影响新 executor 链路。
- [ ] 4.4 验证本地 UI 入口可直接填写 `projectPath` 并启动到正确目标目录。

## 5. Cleanup

- [ ] 5.1 后续归档或继续实现时，处理 `add-ai-repo-cli-console` 与本 change 的冲突说明，避免长期双轨口径并存。
- [x] 5.2 把当前 `projectPath` UI 收尾与剩余浏览器级验证状态补进证据或交接文档，方便本地续做。
- [x] 5.3 运行 `openspec validate update-ai-repo-workbench-official-chat-executors --strict --no-interactive`。
