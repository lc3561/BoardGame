# Change: add-production-deploy-smoke-rollback

## Why
当前生产更新链路 `bash scripts/deploy/deploy-image.sh update` 在 `docker compose up -d` 成功后就直接宣告部署完成，但这只能证明容器已被拉起，不能证明：

- `web` / `game-server` 已经通过真实健康检查；
- `/health` 与关键只读接口返回的是正确 JSON，而不是 fallback HTML；
- 新镜像不会在启动后短时间内崩溃或持续重启；
- 当默认使用 `latest` 部署时，若新版本 smoke 失败，系统仍能自动恢复到部署前的稳定镜像引用。

当前这类问题需要人工 SSH 到服务器、看 `docker compose ps`、再手工 `curl` 和查日志，发现太晚且流程不统一。仅增加部署后 smoke 仍然只能“更早发现事故”，不能自动恢复。因此本变更要把“部署后 smoke + 自动回退”做成生产部署默认能力。

## What Changes
- 为生产镜像部署新增一条通用的 post-deploy smoke 检查链路，覆盖容器状态、启动等待、`/health`、首页与关键只读接口。
- 在部署前记录当前运行中的 `web` / `game-server` 精确镜像引用（优先 digest），即使默认更新目标仍为 `latest`，也能在 smoke 失败后自动回退到部署前版本。
- 将 `scripts/deploy/deploy-image.sh update` / `deploy` 接入 smoke 与自动回退：
  - smoke 通过才视为部署成功；
  - smoke 失败则自动执行回退，并对回退后的服务再次做 smoke 确认。
- 为部署脚本增加结构化结果输出，明确区分：部署成功、部署失败但回退成功、部署失败且回退失败。
- 更新部署文档，说明默认行为、手动跳过方式（若保留）与故障排查入口。

## Impact
- Affected specs: `production-deployment-safety`
- Affected code:
  - `scripts/deploy/deploy-image.sh`
  - `docs/deploy.md`
