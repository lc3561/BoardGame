# Kiro auto-continue retired

旧的 Kiro auto-continue / window-title monitor 方案已退役。

退役原因：

- 它们解决的是历史上的“向 Kiro 输入 `continue` 以恢复会话”问题
- 它们不是当前项目定义的“监察者模式”
- 继续在主文档和脚本入口暴露这些方案，会把 watcher / supervisor 误导成定时器恢复脚本

替代定义见：

- `docs/watcher-mode-completion-gate.md`
- `openspec/changes/add-ai-repo-workbench/design.md`
- `openspec/changes/add-ai-repo-workbench/specs/ai-repo-workbench/spec.md`

保留的经验：checkpoint / resume、false-active 识别、长任务健康判定。
