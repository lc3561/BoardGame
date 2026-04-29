## ADDED Requirements

### Requirement: 生产镜像部署必须以 post-deploy smoke 作为成功判定
系统 SHALL 在生产镜像部署脚本完成容器拉起后执行通用 post-deploy smoke，只有 smoke 通过时才能将本次部署判定为成功。

#### Scenario: 新版本容器已启动且 smoke 通过
- **GIVEN** 生产服务器已完成新镜像拉取与 `docker compose up -d`
- **WHEN** 部署脚本执行 post-deploy smoke
- **THEN** 系统 MUST 检查关键容器状态与启动等待条件
- **AND** MUST 校验 `http://127.0.0.1/health` 返回有效 JSON
- **AND** MUST 校验首页与至少一个关键只读接口可正常响应
- **AND** 仅当上述检查全部通过时，才可输出“部署成功”

#### Scenario: 新版本容器启动但健康检查失败
- **GIVEN** 新镜像容器已被拉起
- **WHEN** post-deploy smoke 发现容器重启、健康接口异常或关键 HTTP 探活失败
- **THEN** 系统 MUST 将本次新版本部署标记为失败
- **AND** MUST 输出具体失败项，而不是仅保留 compose 启动成功的表象

### Requirement: 生产部署失败后必须自动回退到部署前镜像引用
系统 SHALL 在生产部署开始前记录当前运行中的关键服务镜像引用，并在新版本 smoke 失败时自动回退到部署前版本。

#### Scenario: 默认 latest 部署在 smoke 失败后自动恢复
- **GIVEN** 本次生产部署目标仍为默认 `latest`
- **AND** 系统在部署前已记录 `web` 与 `game-server` 的部署前镜像引用
- **WHEN** 新版本 post-deploy smoke 失败
- **THEN** 系统 MUST 使用部署前记录的精确镜像引用重新启动 `web` 与 `game-server`
- **AND** MUST 避免再次解析成新的 `latest`

#### Scenario: 自动回退后再次执行 smoke
- **GIVEN** 系统已触发自动回退
- **WHEN** 回退后的容器重新启动完成
- **THEN** 系统 MUST 对回退后的服务再次执行同一套 smoke
- **AND** MUST 明确区分“部署失败但已恢复”和“部署失败且未恢复”

### Requirement: 部署脚本必须输出可审计的部署结果摘要
系统 SHALL 为生产部署输出结构化结果摘要，便于快速判断是否升级成功、是否发生回退以及下一步排障入口。

#### Scenario: 新版本 smoke 成功
- **WHEN** 新版本 post-deploy smoke 通过
- **THEN** 输出 MUST 明确包含成功状态、关键容器状态与 smoke 通过摘要

#### Scenario: 新版本 smoke 失败但回退成功
- **WHEN** 新版本 smoke 失败且回退 smoke 通过
- **THEN** 输出 MUST 明确说明“升级失败，已自动恢复旧版本”
- **AND** MUST 提供日志查看入口或后续排障提示

#### Scenario: 新版本 smoke 失败且回退失败
- **WHEN** 新版本 smoke 失败且回退后的 smoke 也失败
- **THEN** 输出 MUST 明确说明服务当前未恢复到健康状态
- **AND** 部署命令 MUST 以失败状态退出
