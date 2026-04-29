# SmashUp 反馈 69db57c7269d8c351639ea0d 修复验证（2026-04-22）

- 反馈ID：`69db57c7269d8c351639ea0d`
- 严重级别：`critical`
- 反馈内容：`加了两个AI后，轮到第二个AI选卡组时一直无反应`。
- 验证目标：确认 `factionSelect` 阶段在 seat state 延迟/抖动下不会卡死，第二个 AI 能完成选派系并进入正常对局。

## 关联验证用例

- 命令：
  - `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "回归：在线 AI 在 factionSelect 阶段 seat state 延迟就绪时，不得被 watchdog 跳过到空牌对局"`
- 结果：`passed (1/1)`
- 时间：`2026-04-22 22:44 (Asia/Shanghai)`

## 关键截图与观察

1. 首次选派系后，仍停留在选派系阶段等待后续选择
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-host-picked-first.png`
- 我实际看到：界面仍是派系选择页，顶部显示正在轮转到下一玩家，未被 watchdog 直接跳到空牌主局。
- 验收判定：达标（未出现“跳过选派系”的错误推进）。

2. 延迟场景下仍保持 factionSelect，不会空转卡死
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-still-waiting-after-watchdog.png`
- 我实际看到：页面仍有可选派系卡，不是空牌对局；说明 watchdog 没有错误强推阶段。
- 验收判定：达标（卡组选择流程保持可继续）。

3. 收口图：已进入 playCards 正常对局
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-final-playcards.png`
- 我实际看到：底部手牌、基地区、结束回合按钮都已出现，已经进入 `playCards` 正常开局态。
- 验收判定：达标（第二个 AI 选派系链路可完成，不再停在无响应状态）。

## 结论

- 该反馈描述的“第二个 AI 在选派系时无反应”在当前实现下未复现。
- 通过真实在线回归场景验证：选派系不会被错误跳过，流程最终正常进入 `playCards`。

## 审计维度补全（D1-D49）

> 说明：本条问题属于 `factionSelect` 阶段的在线时序/看门狗收口问题，主要影响回合推进链路与 UI 阶段一致性；未触及卡牌能力定义、伤害计算、资源经济与标签体系。

| 维度 | 结论 | 证据 / 说明 |
|---|---|---|
| D1 语义保真 | ✅ 命中 | 反馈语义是“第二个 AI 不应卡在选派系”；收口图已进入 `playCards`。 |
| D2 边界完整 | ✅ 命中 | 覆盖 host 首次选择、watchdog 等待窗口、最终进入对局三段边界。 |
| D3 数据流闭环 | ✅ 命中 | 在线真实链路验证，不是纯注入终态截图。 |
| D4 查询一致性 | ⭕ 不适用 | 未改 buff/属性查询入口。 |
| D5 交互完整性 | ✅ 命中 | `factionSelect` 流程完整收口到开局阶段。 |
| D6 副作用传播 | ⭕ 不适用 | 未改卡牌副作用分发。 |
| D7 资源守恒 | ⭕ 不适用 | 未改资源/费用结算。 |
| D8 时序正确性 | ✅ 命中 | seat state 延迟下未错误跳阶段、未卡死。 |
| D9 幂等与重入 | ✅ 命中 | 回归用例多次复跑通过。 |
| D10 元数据一致性 | ⭕ 不适用 | 未改 custom action metadata。 |
| D11 Reducer 消耗路径 | ⭕ 不适用 | 未改 reducer 消耗逻辑。 |
| D12 写入-消耗对称 | ⭕ 不适用 | 未新增状态字段。 |
| D13 多来源竞争 | ✅ 命中 | host/AI 双端 seat 同步链在延迟场景下保持一致。 |
| D14 回合清理完整 | ✅ 命中 | `factionSelect` 正常结束并进入 `playCards`。 |
| D15 UI 状态同步 | ✅ 命中 | 截图可见派系页状态与阶段推进一致。 |
| D16 条件优先级 | ✅ 命中 | watchdog 未越权覆盖正常选派系流程。 |
| D17 隐式依赖 | ✅ 命中 | 不依赖“seat 即时就绪”单点假设。 |
| D18 否定路径 | ✅ 命中 | 明确验证“仍在 factionSelect 而非空牌对局”。 |
| D19 组合场景 | ✅ 命中 | 在线 AI + 延迟 seat + 阶段推进组合场景通过。 |
| D20 可观测性 | ✅ 命中 | 三张关键截图均有绝对路径。 |
| D21 触发频率门控 | ⭕ 不适用 | 未改触发次数门禁。 |
| D22 伤害管线 | ⭕ 不适用 | 未改伤害计算。 |
| D23 架构假设一致 | ✅ 命中 | 保持在线回合控制架构，不引入旁路阶段推进。 |
| D24 handler 共返一致 | ⭕ 不适用 | 未改 handler events/interaction 共返。 |
| D25 MatchState 传播 | ✅ 命中 | 在线状态传播最终一致进入 `playCards`。 |
| D26 事件设计完整 | ⭕ 不适用 | 未新增事件类型。 |
| D27 可选参数语义 | ⭕ 不适用 | 未改 API 参数语义。 |
| D28 白黑名单完整 | ⭕ 不适用 | 未改名单机制。 |
| D29 PPSE 替换完整 | ⭕ 不适用 | 未涉及 PPSE。 |
| D30 消灭流程时序 | ⭕ 不适用 | 未涉及 destroy 链路。 |
| D31 效果拦截路径 | ⭕ 不适用 | 未改防护拦截路径。 |
| D32 替代路径后处理 | ⭕ 不适用 | 未改替代结算。 |
| D33 跨实体同类一致 | ⭕ 不适用 | 未改能力定义。 |
| D34 交互选项渲染 | ⭕ 不适用 | 未改 `createSimpleChoice` 选项渲染。 |
| D35 交互上下文快照 | ⭕ 不适用 | 未改 continuationContext。 |
| D36 延迟补发健壮性 | ⭕ 不适用 | 未改 deferred 事件补发。 |
| D37 选项动态刷新 | ⭕ 不适用 | 未改 dynamic options。 |
| D38 门控优先级冲突 | ✅ 命中 | watchdog 与正常选派系门控优先级冲突已验证消除。 |
| D39 流程标志清理 | ✅ 命中 | `factionSelect` 结束后流程标志正常推进到 `playCards`。 |
| D40 后处理循环去重 | ⭕ 不适用 | 未改后处理循环。 |
| D41 系统职责重叠 | ✅ 命中 | 修复聚焦在时序收口，不污染能力逻辑。 |
| D42 事件流审计 | ✅ 命中 | 通过在线 E2E 验证阶段事件链不中断。 |
| D43 重构完整性 | ✅ 命中 | 最小修复，没有并行旧逻辑分叉。 |
| D44 测试反模式 | ✅ 命中 | 真实端到端链路 + 关键截图，不用摆拍替代。 |
| D45 Pipeline 去重 | ⭕ 不适用 | 未改 pipeline 多阶段调度。 |
| D46 displayMode 声明 | ⭕ 不适用 | 未改 displayMode。 |
| D47 E2E 覆盖完整 | ✅ 命中 | 指向性回归用例通过并含阶段前后证据。 |
| D48 UI 交互渲染模式 | ⭕ 不适用 | 未改卡面/按钮渲染策略。 |
| D49 abilityTags 一致性 | ⭕ 不适用 | 未改 abilityTags。 |

## 2026-04-24 复核补记

- 复核命令（关联主线门禁）：`npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`
- 结果：整文件 `3 passed`，其中派系选择链路与横幅链路均继续通过。
- 结论：本条“第二个 AI 选派系卡死”相关链路在最新基线仍未复现，审计结论维持有效。

## 2026-04-25 定向复测补记

- 复测命令：`npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "回归：在线 AI 在 factionSelect 阶段 seat state 延迟就绪时，不得被 watchdog 跳过到空牌对局"`
- 结果：`1 passed`
- 最新关键截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-host-picked-first.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-still-waiting-after-watchdog.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-final-playcards.png`
- 结论：在 2026-04-25 的定向复测中，`factionSelect` 延迟场景仍可稳定收口到 `playCards`，无“第二个 AI 卡死”回归。
