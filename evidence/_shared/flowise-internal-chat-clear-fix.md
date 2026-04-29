# Flowise 内部聊天清空修复记录

## 当前源码落点

本次迁仓后，相关源码不再位于 BoardGame worktree 的 `forks/flowise`，而是位于独立仓：

- `D:/gongzuo/webgame/flowise-fork/packages/ui/src/views/chatmessage/ChatMessage.jsx`
- `D:/gongzuo/webgame/flowise-fork/packages/ui/src/views/chatmessage/ChatPopUp.jsx`

## 迁仓说明

- BoardGame 侧仅保留证据记录与路径引用
- 后续若继续修这条内部聊天链路，应直接在 `flowise-fork` 仓处理，再按需要回填 BoardGame 证据/规范

## 本轮结论

- 修复关联源码已完成从内嵌 fork 到独立仓的迁移
- BoardGame worktree 已不再作为这批 Flowise UI 文件的源码落点
