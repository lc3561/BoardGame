## 1. Contract / Intake

- [x] 1.1 固化 Princesses 的真相源合同、atlas 几何、索引表与旧草稿复用边界
- [x] 1.2 确认 Princesses 是否复用现有 `CARDS8 / BASE3` 资源链与对应 locale / base 数据，若有偏差先修正合同
- [ ] 1.3 落地运行时资源路径、压缩产物计划与上传清单

## 2. Runtime Wiring

- [x] 2.1 接入 Princesses 的 card atlas / base atlas 与相关 `previewRef`
- [x] 2.2 新增/补齐 Princesses faction metadata、card/base 静态数据与 locale
- [ ] 2.3 校准关键图片预加载与预览链路，确保选派系与对局内可见

## 3. Gameplay

- [x] 3.1 先完成可直接配置复用的一批能力与数据接线
- [x] 3.2 再完成需要共享机制或规则扩展的一批能力
- [ ] 3.3 最后完成需要真实 UI 交互验证的一批能力实现
- [x] 3.4 若发现旧草稿与真相源不一致，直接做可复用修正并同步测试

## 4. Verification / Closeout

- [x] 4.1 运行相关 Smash Up Vitest / 审计测试
- [ ] 4.2 运行至少 1 条 Princesses 真实入口 E2E 并人工看图验收
- [x] 4.3 产出 evidence 文档与截图路径
- [ ] 4.4 如资源进入运行时链路，完成压缩、上传与远端 `HEAD 200` 回查
- [x] 4.5 运行 `openspec validate add-smashup-princesses-faction --strict --no-interactive`
