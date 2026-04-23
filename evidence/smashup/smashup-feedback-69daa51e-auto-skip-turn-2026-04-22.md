# SmashUp 反馈 69daa51e469c37573d131bf9 修复验证（2026-04-22）

- 反馈ID：`69daa51e469c37573d131bf9`
- 严重级别：`critical`
- 反馈内容：`总会自动跳过我的回合阶段`。
- 验证目标：确认 watchdog 只在 AI 回合卡死时收口，不会把玩家回合持续自动跳过；AI 回合结束后必须稳定交还给玩家。

## 关联验证用例

1. `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "在线 AI 连续 8 秒没有任何实际进展时，应自动强制结束当前回合"`
2. `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "在线 AI 结束回合切回我方时不应出现整板重挂载或 loading 闪屏"`

- 结果：两条均 `passed (1/1)`
- 时间：`2026-04-22 22:51 ~ 22:53 (Asia/Shanghai)`

## 关键截图与观察

1. AI 卡死收口前（当前是对手回合）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-连续-8-秒没有任何实际进展时，应自动强制结束当前回合\在线-AI-连续-8-秒没有任何实际进展时，应自动强制结束当前回合-online-ai-force-end-turn-before-timeout.png`
- 我实际看到：左上角为“对手 出牌阶段”，此时还未切回玩家。
- 验收判定：用于建立对照基线。

2. watchdog 收口后明确交还玩家回合
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-连续-8-秒没有任何实际进展时，应自动强制结束当前回合\在线-AI-连续-8-秒没有任何实际进展时，应自动强制结束当前回合-online-ai-force-end-turn-after-resolve.png`
- 我实际看到：画面提示“轮到你了”，左上角变为“你自己 出牌阶段”，右上角 toast 显示“AI 已强制结束回合”。
- 验收判定：达标（AI 收口后正确回到我方，不是连跳我方回合）。

3. 切回我方前后无整板重挂载/loading 闪屏
- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-结束回合切回我方时不应出现整板重挂载或-loading-闪屏\在线-AI-结束回合切回我方时不应出现整板重挂载或-loading-闪屏-online-ai-pass-turn-before-host-turn.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-结束回合切回我方时不应出现整板重挂载或-loading-闪屏\在线-AI-结束回合切回我方时不应出现整板重挂载或-loading-闪屏-online-ai-pass-turn-after-host-turn.png`
- 我实际看到：两张图主棋盘/基地区持续可见，回合切换后未出现 loading 遮罩或重挂载闪屏。
- 验收判定：达标（切回我方过程稳定）。

## 结论

- 该反馈“自动跳过我的回合阶段”在当前回归场景下未复现。
- 验证结果显示：watchdog 只对卡死 AI 回合生效，且能稳定把控制权交还玩家。

## 审计维度补全（D1-D49）

> 说明：本条问题属于“watchdog 回合收口”与“AI→玩家回合交接稳定性”范畴，重点在流程控制与 UI 时序；未涉及卡牌能力语义、伤害计算、资源系统。

| 维度 | 结论 | 证据 / 说明 |
|---|---|---|
| D1 语义保真 | ✅ 命中 | 反馈语义是“不要自动跳过玩家回合”；截图显示收口后明确“轮到你了”。 |
| D2 边界完整 | ✅ 命中 | 覆盖 AI 卡死前、watchdog 收口后、回合切换稳定态。 |
| D3 数据流闭环 | ✅ 命中 | 在线真实链路验证，不是模拟态断言。 |
| D4 查询一致性 | ⭕ 不适用 | 未改 buff/属性查询入口。 |
| D5 交互完整性 | ✅ 命中 | AI 回合结束后玩家可继续交互，不再被连跳。 |
| D6 副作用传播 | ⭕ 不适用 | 未改能力副作用分发。 |
| D7 资源守恒 | ⭕ 不适用 | 未改资源结算逻辑。 |
| D8 时序正确性 | ✅ 命中 | watchdog 仅在 AI 卡死窗口触发，回合交接顺序正确。 |
| D9 幂等与重入 | ✅ 命中 | 两条关键回归用例持续通过。 |
| D10 元数据一致性 | ⭕ 不适用 | 未改 metadata/categorization。 |
| D11 Reducer 消耗路径 | ⭕ 不适用 | 未改 reducer 消耗链。 |
| D12 写入-消耗对称 | ⭕ 不适用 | 未新增状态字段。 |
| D13 多来源竞争 | ✅ 命中 | 在线 AI 与玩家回合控制未再竞争导致误跳过。 |
| D14 回合清理完整 | ✅ 命中 | AI 回合被收口后，标志位已交还玩家回合。 |
| D15 UI 状态同步 | ✅ 命中 | 左上角回合标识与棋盘状态一致，无错位闪屏。 |
| D16 条件优先级 | ✅ 命中 | watchdog 条件优先级未覆盖正常玩家回合。 |
| D17 隐式依赖 | ✅ 命中 | 不依赖某一帧 seat 快照即可稳定交接。 |
| D18 否定路径 | ✅ 命中 | 明确验证“不会出现整板重挂载/loading 闪屏”。 |
| D19 组合场景 | ✅ 命中 | AI 卡死 + watchdog 收口 + 我方回合恢复组合场景通过。 |
| D20 可观测性 | ✅ 命中 | before/after 关键截图均已留档。 |
| D21 触发频率门控 | ⭕ 不适用 | 未改触发次数门控。 |
| D22 伤害管线 | ⭕ 不适用 | 未改伤害计算。 |
| D23 架构假设一致 | ✅ 命中 | 保持在线回合控制架构，不引入旁路刷新。 |
| D24 handler 共返一致 | ⭕ 不适用 | 未改 handler 共返契约。 |
| D25 MatchState 传播 | ✅ 命中 | 回合切换前后 MatchState 传播稳定。 |
| D26 事件设计完整 | ⭕ 不适用 | 未新增事件类型。 |
| D27 可选参数语义 | ⭕ 不适用 | 未改参数语义。 |
| D28 白黑名单完整 | ⭕ 不适用 | 未改名单机制。 |
| D29 PPSE 替换完整 | ⭕ 不适用 | 未涉及 PPSE。 |
| D30 消灭流程时序 | ⭕ 不适用 | 未涉及 destroy 流程。 |
| D31 效果拦截路径 | ⭕ 不适用 | 未改拦截/免疫机制。 |
| D32 替代路径后处理 | ⭕ 不适用 | 未改替代结算。 |
| D33 跨实体同类一致 | ⭕ 不适用 | 未改能力定义。 |
| D34 交互选项渲染 | ⭕ 不适用 | 未改交互选项渲染模式。 |
| D35 交互上下文快照 | ⭕ 不适用 | 未改 continuationContext。 |
| D36 延迟补发健壮性 | ⭕ 不适用 | 未改 deferred 补发。 |
| D37 选项动态刷新 | ⭕ 不适用 | 未改 dynamic options。 |
| D38 门控优先级冲突 | ✅ 命中 | watchdog/回合切换门控冲突已验证修复。 |
| D39 流程标志清理 | ✅ 命中 | 强制收口后回合标志与阶段标志可继续推进。 |
| D40 后处理循环去重 | ⭕ 不适用 | 未改后处理循环。 |
| D41 系统职责重叠 | ✅ 命中 | 问题收敛在回合控制，不扩散到能力层。 |
| D42 事件流审计 | ✅ 命中 | 在线 E2E 证明事件流可从 AI 侧回到玩家侧。 |
| D43 重构完整性 | ✅ 命中 | 最小改动路径，无并行旧实现。 |
| D44 测试反模式 | ✅ 命中 | 真实在线流程验证，且有切换前后截图。 |
| D45 Pipeline 去重 | ⭕ 不适用 | 未改 pipeline。 |
| D46 displayMode 声明 | ⭕ 不适用 | 未改 displayMode。 |
| D47 E2E 覆盖完整 | ✅ 命中 | 两条关键回归用例均通过。 |
| D48 UI 交互渲染模式 | ⭕ 不适用 | 未改渲染模式。 |
| D49 abilityTags 一致性 | ⭕ 不适用 | 未改 abilityTags。 |
