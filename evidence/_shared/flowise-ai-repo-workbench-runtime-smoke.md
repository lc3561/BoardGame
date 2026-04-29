# Flowise AI Repo Workbench Runtime Smoke

## 本轮范围

本轮只收口“Flowise 从 BoardGame worktree 迁出到独立仓”的路径切换与静态核对，不宣称已重跑完整运行时联调。

## 静态核对结果

- BoardGame 本地启动入口已改为：`D:/gongzuo/webgame/BoardGame-wt-ai-repo-workbench/package.json`
  - `dev:flowise`
  - `dev:flowise:open`
- 启动脚本外链目标为：`D:/gongzuo/webgame/flowise-fork/boardgame/scripts/start-boardgame-local.ps1`
- AI Repo Workbench 基线已改为引用：`../flowise-fork`
- `D:/gongzuo/webgame/BoardGame-wt-ai-repo-workbench/forks/flowise` 已物理删除
- 相关运行时源码现位于独立仓，例如：`D:/gongzuo/webgame/flowise-fork/packages/components/src/httpSecurity.ts`

## 本轮结论

- 迁仓后的 BoardGame 工作树已经不再内嵌 Flowise fork
- 本地开发入口已经切到外部独立仓
- 本次未重跑完整 Flowise UI/服务端 smoke；若要做动态回归，应在独立仓脚本链路上单独执行
