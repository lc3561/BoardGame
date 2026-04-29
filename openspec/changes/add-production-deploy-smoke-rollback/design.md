# Design: add-production-deploy-smoke-rollback

## Context
当前生产部署脚本的时序是：

1. `docker compose pull`
2. `docker compose down --remove-orphans`
3. `docker compose up -d`
4. 直接输出“部署完成”

这意味着：

- 脚本没有等待 `web` / `game-server` 真正 ready；
- 没有检查 HTTP 层是否正常返回；
- 没有发现短时间 crash / restart loop；
- 一旦默认 `latest` 部署落地且失败，现有脚本也没有办法回到“部署前的精确镜像”。

## Goals
- 将“部署完成”的定义从“容器启动命令返回成功”提升为“真实 smoke 通过”。
- 在保持现有单机 compose 部署模型的前提下，为 `latest` 默认部署补上可自动恢复的最小机制。
- 尽量不引入蓝绿切流这类更重的基础设施改造。

## Non-Goals
- 本变更不引入双活/蓝绿/灰度流量切换。
- 本变更不尝试覆盖所有业务交互，仅覆盖“服务已明显挂掉或启动异常”的通用风险。

## Proposed Flow

### 1. 部署前快照当前运行镜像引用
在执行 `pull` / `down` 之前，读取当前运行中的：

- `boardgame-web`
- `boardgame-game-server`

并保存它们各自的精确镜像引用，优先使用可回放的 digest 引用，而不是仅记录容器名或模糊的 `latest`。

这样即使本次更新目标仍然是 `latest`，失败时仍能回到“部署前实际正在跑的那一版”。

### 2. 启动后 smoke，而不是仅看 compose 返回值
在生产部署脚本中内建一套可复用的 post-deploy smoke，负责：

- 轮询等待 `mongodb` healthy、`web` / `game-server` 进入 `running`；
- 检查关键容器的 `RestartCount` 是否异常增长；
- `curl/fetch` `http://127.0.0.1/health`，要求返回预期 JSON；
- 探活首页 `http://127.0.0.1/`，确认 HTTP 正常；
- 探活至少一个关键只读接口，确认不是 fallback HTML。

smoke 失败即返回非 0，并给出清晰的失败点摘要。

### 3. 失败自动回退
当 smoke 失败时：

1. 生成临时 compose override 或等价环境覆盖，使 `web` / `game-server` 使用部署前保存的镜像引用；
2. 重新执行 compose 启动；
3. 对回退后的服务再次执行同一套 smoke；
4. 输出三态结果：
   - 新版本 smoke 成功；
   - 新版本 smoke 失败，但回退成功；
   - 新版本 smoke 失败，且回退也失败。

## Why digest-based rollback
当前 `docker-compose.prod.yml` 中 `web` / `game-server` 都直接写死 `:latest`。如果只记 `latest`，部署失败时无法知道“回到哪一个旧 latest”。因此回退必须基于部署前运行中的精确镜像引用，而不是再次解析 `latest`。

## Failure Semantics
- **部署成功**：新版本启动并通过 smoke。
- **部署失败但已回退**：新版本 smoke 失败，但回退后的服务通过 smoke；脚本应返回非 0 还是 0 需要在实现时明确，但必须在输出中显式标红这次部署失败。
- **部署失败且未恢复**：新版本 smoke 失败，回退也失败；脚本必须返回非 0，并输出日志入口。

建议默认：
- 新版本 smoke 失败即整体返回非 0；
- 即使自动回退成功，也要让调用方知道“本次升级未成功，只是服务已恢复”。

## Open Questions
- 是否需要提供显式 `--no-smoke` 或 `--no-rollback` 逃生开关，还是生产路径默认强制不可跳过。
- 关键只读接口应选择现有 `/health` 之外哪一条最稳定、最不依赖业务数据的接口。
