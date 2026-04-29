# SummonerWars 选将横屏流程反馈修复证据（2026-04-20）

## 本轮目标

- 核对用户点名位点：`派系预览区歪位`。
- 恢复移动横屏下“PC 同构缩放 + 靠边锚点关系”，并保证“开始游戏”按钮按阶段可见。

## 本轮实现（代码）

- `src/games/summonerwars/ui/FactionSelectionAdapter.tsx`
  - 移动横屏下半区内层改为固定同构宽度：`lowerStageInnerStyle.width = inlineUnit(72)`，避免 `100%` 拉满后锚点漂移。
  - 增加 `shouldShowLandscapeActionRail`，未选阵营时不渲染右侧动作轨，避免空轨道挤占预览/状态布局。
- `e2e/summonerwars/summonerwars-selection.e2e.ts`
  - 对齐断言改为“相对网格边缘”：
    - 预览左边缘对齐网格左边缘
    - 右侧状态簇右边缘对齐网格右边缘
  - 补充移动横屏“选阵营 -> 开始游戏 -> 进入对局”全流程截图链。

## 运行与结果

- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape keeps faction selection aligned with pc composition"`：通过
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape flow captures full selection-to-start chain"`：通过
- `npm run test:e2e:ci -- e2e/summonerwars/summonerwars-selection.e2e.ts`：`6/6` 通过

## 关键截图与位点验收

### 1) 对齐位点：进入页（未选）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-entry.png`
- 我实际看到：下方左侧预览占位与上方网格保持左侧同构关系，没有出现“整块漂到中间”或“被挤到右侧”。
- 我实际看到：右侧玩家状态簇在网格右缘附近，不再有明显远离右缘的飘移。
- 判定：达标（位点已收敛）。

### 2) 对齐位点：双方已选
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-both-picked.png`
- 我实际看到：预览图出现后仍在左侧锚点区域，未出现“选中后跳位”。
- 我实际看到：右侧状态簇与右侧操作区保持在网格右侧，不压进预览区。
- 判定：达标（X 方向锚点关系稳定）。

### 3) 全流程：进入选将
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-flow-captures-full-selection-to-start-chain\selection-mobile-entry.png`
- 我实际看到：未选阵营阶段没有提前出现“开始游戏”按钮列，主舞台构图完整。
- 判定：达标。

### 4) 全流程：开始按钮可用
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-flow-captures-full-selection-to-start-chain\selection-mobile-host-start-enabled.png`
- 我实际看到：右侧“开始游戏”按钮出现且完整可见，没有被挤没或被截断。
- 判定：达标。

### 5) 全流程：进入对局
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-flow-captures-full-selection-to-start-chain\selection-mobile-host-game-started.png`
- 我实际看到：已进入战场主界面，右侧阶段条与“结束阶段”按钮、底部手牌区都在正确位置并可见。
- 判定：达标。

## 结论

- 用户点名的“派系预览歪位”已按网格锚点口径收敛；开始按钮在可开局阶段恢复可见。
- 当前结果是“PC 同构缩放 + 横屏条件化动作轨”，没有回到“空间自适应强行改位”路线。

## 审计维度补全（D1-D49）

> 说明：本次改动是 **SummonerWars 选将页移动横屏布局修复**，不涉及战斗结算、能力执行、资源消耗、伤害管线与卡牌触发器。  
> 下表中“命中”= 本轮有直接验证；“不适用”= 该维度对应的系统不在本次改动范围内。

| 维度 | 结论 | 证据 / 说明 |
|---|---|---|
| D1 语义保真 | ✅ 命中 | 目标语义是“移动横屏保持 PC 同构锚点关系”；截图 1/2 直接验证预览区与右侧状态簇锚点关系。 |
| D2 边界完整 | ✅ 命中 | 覆盖未选、双方已选、可开局、进局后四段边界。 |
| D3 数据流闭环 | ✅ 命中 | `FactionSelectionAdapter.tsx` 布局参数 → `data-testid` DOM → E2E 断言与截图闭环。 |
| D4 查询一致性 | ⭕ 不适用 | 未修改可被 buff/光环影响的数值读取。 |
| D5 交互完整 | ✅ 命中 | 选将→准备→开始→进局链路 E2E 通过。 |
| D6 副作用传播 | ⭕ 不适用 | 未引入新规则副作用。 |
| D7 资源守恒 | ⭕ 不适用 | 未改资源/费用/额度。 |
| D8 时序正确 | ✅ 命中 | 动作轨仅在横屏且满足阶段条件展示，避免未选阶段提前挤压布局。 |
| D9 幂等与重入 | ✅ 命中 | 全文件 6 条用例连续执行通过，未出现重复渲染导致链路中断。 |
| D10 元数据一致 | ⭕ 不适用 | 未改能力 metadata。 |
| D11 Reducer 消耗路径 | ⭕ 不适用 | 未改 reducer 消耗逻辑。 |
| D12 写入-消耗对称 | ⭕ 不适用 | 未改状态写入/消耗字段。 |
| D13 多来源竞争 | ⭕ 不适用 | 无多来源资源竞争改动。 |
| D14 回合清理完整 | ⭕ 不适用 | 未改临时状态生命周期。 |
| D15 UI 状态同步 | ✅ 命中 | `sw-faction-stage/grid/preview/rail/action-rail` 位置断言与截图一致。 |
| D16 条件优先级 | ✅ 命中 | `shouldShowLandscapeActionRail` 条件门控已验证（未选时不显示，开局前可显示）。 |
| D17 隐式依赖 | ✅ 命中 | 不再依赖“空动作轨道占位”维持布局，改为显式条件渲染。 |
| D18 否定路径 | ✅ 命中 | 未选阶段“开始按钮轨道不出现”已在全流程截图验证。 |
| D19 组合场景 | ✅ 命中 | 手机横屏 + 双玩家状态同步 + 选将流程组合场景通过。 |
| D20 状态可观测性 | ✅ 命中 | 玩家状态卡、ready 状态、开始按钮可见性均可在截图中直接观察。 |
| D21 触发频率门控 | ⭕ 不适用 | 未改触发型能力。 |
| D22 伤害计算管线 | ⭕ 不适用 | 未改伤害管线。 |
| D23 架构假设一致性 | ✅ 命中 | 继续沿用“PC 同构缩放”主路径，未引入第二套移动布局架构。 |
| D24 Handler 共返一致性 | ⭕ 不适用 | 未改交互 handler 的 events+interaction 共返逻辑。 |
| D25 MatchState 传播完整性 | ⭕ 不适用 | 未改 matchState 传递链。 |
| D26 事件设计完整性 | ⭕ 不适用 | 未新增事件类型。 |
| D27 可选参数语义 | ⭕ 不适用 | 未改可选参数契约。 |
| D28 白名单/黑名单完整性 | ⭕ 不适用 | 未改名单机制。 |
| D29 PPSE 事件替换完整性 | ⭕ 不适用 | 未触及 PPSE。 |
| D30 消灭流程时序与白名单 | ⭕ 不适用 | 未触及消灭流程。 |
| D31 效果拦截路径完整性 | ⭕ 不适用 | 未触及保护/拦截事件链。 |
| D32 替代路径后处理对齐 | ⭕ 不适用 | 未触及战斗替代路径。 |
| D33 跨实体同类能力一致性 | ⭕ 不适用 | 未改能力实现。 |
| D34 交互选项 UI 渲染模式 | ⭕ 不适用 | 未新增 `createSimpleChoice` 选项结构。 |
| D35 交互上下文快照完整性 | ⭕ 不适用 | 未改 continuationContext。 |
| D36 延迟事件补发健壮性 | ⭕ 不适用 | 未改 deferred 事件链。 |
| D37 交互选项动态刷新完整性 | ⭕ 不适用 | 未改动态 options 逻辑。 |
| D38 UI 门控系统优先级冲突 | ✅ 命中 | 动作轨显示条件与选将阶段门控已验证，无“空轨道挤压”冲突。 |
| D39 流程控制标志清除完整性 | ⭕ 不适用 | 未改 flowHalted/interaction 标志。 |
| D40 后处理循环事件去重完整性 | ⭕ 不适用 | 未改后处理循环。 |
| D41 系统职责重叠检测 | ⭕ 不适用 | 未新增系统职责。 |
| D42 事件流全链路审计 | ⭕ 不适用 | 未改事件产生/消费链。 |
| D43 重构完整性检查 | ✅ 命中 | 仅布局层重构，未引入并行旧实现，路径单一。 |
| D44 测试设计反模式检测 | ✅ 命中 | 本轮验证以 E2E 真实链路为主，非仅内部函数调用。 |
| D45 Pipeline 多阶段调用去重 | ⭕ 不适用 | 未改 pipeline。 |
| D46 交互 displayMode 声明完整性 | ⭕ 不适用 | 未改交互选项 displayMode。 |
| D47 E2E 覆盖完整性 | ✅ 命中 | 单用例+整文件均通过，覆盖布局与真实开局链路。 |
| D48 UI 交互渲染模式完整性 | ⭕ 不适用 | 未改卡牌/按钮 displayMode 渲染模式。 |
| D49 abilityTags 一致性 | ⭕ 不适用 | 未改 SummonerWars abilityTags。 |

## 未覆盖风险（必须记录）

1. 本轮主要修的是“选将页布局与流程链路”，未覆盖 SummonerWars 对局内其它移动端布局回归（例如战场内浮层与 HUD 同屏冲突）。
2. 本轮未改任何规则执行层；若后续出现“能进局但对局内交互异常”，需按 D8/D15/D47 再开专项审计。
