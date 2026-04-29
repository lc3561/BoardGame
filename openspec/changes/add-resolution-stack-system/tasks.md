## 1. Spec
- [x] 1.1 新增 `resolution-stack` capability spec，定义 frame、阻塞、恢复、完成语义
- [x] 1.2 修改 `interaction-system` spec，明确 interaction 只能阻塞/解锁 resolution frame，不拥有 deferred follow-up
- [x] 1.3 修改 `flow-system` spec，明确存在未完成 resolution frame 时不得错误 auto-continue
- [x] 1.4 补充“父子 frame 嵌套、子帧优先完成后恢复父帧”的规范语义
- [x] 1.5 明确本次只收口通用嵌套主链与 SmashUp 首批迁移，不把全部非计分 optional response 一次性并入 scope

## 2. Engine skeleton
- [x] 2.1 在引擎层引入最小 resolution state 与基础 helper（push / block / resume / complete）
- [x] 2.2 为 InteractionSystem / ResponseWindowSystem / FlowSystem 接上 resolution-aware gate
- [x] 2.3 增加引擎层测试，覆盖 interaction 阻塞恢复、response window 阻塞恢复、phase auto-continue gate
- [ ] 2.4 将现有 helper 扩成真正的 resolution driver，支持 parent/child frame、resume point 与 completion handoff
- [ ] 2.5 增加引擎层测试，覆盖“子 frame 打断父 frame -> 子 frame 完成 -> 父 frame 恢复”主链

## 3. SmashUp pilot migration
- [ ] 3.1 将 SmashUp `scoreBases` 主结算链迁移到通用 resolution frame，去掉“私有 session 栈才是主权威”的现状
- [ ] 3.2 把 `smashupReactionSession / smashupReactionStack` 收束为 reaction/轮询状态，不再承载主结算恢复点
- [ ] 3.3 把 `afterScoring` 与计分相关 deferred follow-up 统一收口到 resolution frame ownership
- [ ] 3.4 补齐多基地、afterScoring、response window、re-score、嵌套本体恢复顺序回归测试

## 4. Follow-up validation
- [ ] 4.1 选择第二个非 SmashUp 连续结算场景做试点验证
- [ ] 4.2 记录哪些旧 `pending* / continuationContext` 仍需保留为兼容层，哪些可删除
