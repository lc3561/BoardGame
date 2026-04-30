## 1. 引擎层统一控制流重构
- [ ] 1.1 把 `src/engine/systems/resolutionStack.ts` 从 block gate 升级为真正的 resolution frame driver
- [ ] 1.2 为 resolution frame 增加 parent/child 嵌套恢复、显式顺序、顺时针响应轮、deferred follow-up 所有权
- [ ] 1.3 收紧 `InteractionSystem` / `ResponseWindowSystem` / `FlowSystem` 边界，使其围绕同一 frame 主链协作
- [ ] 1.4 为 blocking UI 提供稳定 owner 映射，保证 modal foreground 与业务 owner 对齐

## 2. 大杀四方迁移
- [ ] 2.1 用统一 frame driver 替换 `smashupReactionSession` / `smashupReactionStack` 的主链职责
- [ ] 2.2 把计分链、嵌套本体恢复、强制触发排序、顺时针可选响应轮迁到统一控制流
- [ ] 2.3 把 deferred post-scoring events / actions 收束到 frame 所有权
- [ ] 2.4 修复“选择结算顺序”中的 stale trigger / stale target 仍可点击的问题

## 3. 王权骰铸与召唤师战争对齐
- [ ] 3.1 对齐王权骰铸 token response、selectPlayer、choice 等 blocking modal 的前台 ownership 与恢复顺序
- [ ] 3.2 确保王权骰铸的业务续链不再依赖 modal close 作为收口信号
- [ ] 3.3 复核召唤师战争 `systemInteractionAdapter` 与多步 interaction route，保证 UI 本地 mode 不再成为唯一真相源

## 4. 验证与回归
- [ ] 4.1 运行王权骰铸强制验收 E2E：`e2e/dicethrone/dicethrone-simple-start.e2e.ts` 中 The Law 4 人多目标场景，以及 `e2e/dicethrone-status-interaction-complete.e2e.ts` 的 modal stack / token response 场景
- [ ] 4.2 运行大杀四方强制验收 E2E：`e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`、`e2e/smashup-afterscoring-simple-complete.e2e.ts`、`e2e/smashup-multi-base-scoring-complete.e2e.ts`
- [ ] 4.3 运行召唤师战争代表性 E2E 回归：至少覆盖 `e2e/summonerwars/summonerwars.e2e.ts`、`e2e/summonerwars/summonerwars-grab-follow.e2e.ts`、`e2e/summonerwars/summonerwars-ally-selection.e2e.ts`
- [ ] 4.4 完成后三游戏大部分既有 E2E 重跑，并补齐 `evidence/` 文档
