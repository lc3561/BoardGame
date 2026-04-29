## 1. Proposal
- [x] 1.1 确认生产部署成功/失败/回退的统一判定口径
- [x] 1.2 确认 `latest` 默认部署下的回退引用保存策略（tag / digest / 本地镜像 ID）

## 2. Implementation
- [x] 2.1 新增通用 post-deploy smoke 脚本，支持等待服务 ready、容器状态检查与关键 HTTP 探活
- [x] 2.2 在部署前记录当前 `web` / `game-server` 运行镜像引用，供失败回退使用
- [x] 2.3 将 `deploy-image.sh deploy|update` 接入“部署 → smoke → 失败自动回退 → 回退后复检”流程
- [x] 2.4 输出结构化部署结果与明确错误摘要，避免“容器起了但脚本仍显示成功”
- [x] 2.5 更新 `docs/deploy.md`，写清 smoke 与自动回退行为、限制与排障口径

## 3. Validation
- [x] 3.1 运行 `openspec validate add-production-deploy-smoke-rollback --strict --no-interactive`
- [ ] 3.2 在本地或受控环境验证至少一条成功路径和一条 smoke 失败触发回退路径
