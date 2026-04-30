## Context

- Smash Up 已存在 `simple-choice`、`multi`、`continuationContext` 等交互原语，能够承载基础单选和多选。
- Fairies 的 `Spirit of the Forest` 规则要求：当玩家使用写有 `OR` 的能力时，可以改为使用两边效果，且顺序由玩家决定。
- 当前项目里这类能力主要通过单卡 handler 链式手写实现，缺少统一的分支能力抽象。

## Goals / Non-Goals

- Goals:
  - 用统一 builder 显式表达“这是一条 OR 分支能力”
  - 让 Titan/持续效果能通过统一入口升级分支能力，而不是卡牌内散落 `if (spirit)`
  - 保留多分支执行顺序，使“both in any order”可被正确表达
  - 让 UI / AI / handler 共用同一份分支选择契约
- Non-Goals:
  - 不把引擎层 `simple-choice` 全部替换成新 interaction kind
  - 不尝试从任意普通按钮 prompt 自动推断规则级 `OR` 语义
  - 不在第一轮迁移全部 Smash Up 派系

## Decisions

- Decision: OR 能力用专用 builder 显式建模，而不是运行时猜测普通 prompt 是否代表规则文本中的 OR。
  - Why: 规则级 OR 与实现细节按钮列表不是一回事；纯推断容易误判。

- Decision: 继续复用 `simple-choice` 作为交互载体，而不是新增 engine-level interaction kind。
  - Why: 现有 `simple-choice` 已支持 `multi`、`optionsGenerator`、`continuationContext`，改造面更小。

- Decision: 通过新的 ordered multi-selection 契约保留选中顺序。
  - Why: `both parts in any order` 不是无序集合；AI 和 UI 都必须区分 `A -> B` 与 `B -> A`。

- Decision: upgrade provider 只介入 branching builder 产物，不碰普通 simple-choice。
  - Why: 这样可以让“自动识别”建立在统一 DSL 上，而不是靠脆弱的运行时推断。

## Architecture

### 1. Smash Up 域层新增 branching choice 抽象

- 新增统一 helper，用于声明：
  - `sourceId`
  - `branches`
  - `upgradeKey` / `upgradeProvider`
  - `allowBoth`
  - `allowOrderedSelection`
- builder 负责生成首个 branch 选择 prompt，并把 branch plan 写入 `continuationContext`。

### 2. Branch plan 作为链式执行状态

- branch 选择后不直接把所有效果一次性执行完，而是生成 plan：
  - `selectedBranchIds`
  - `remainingBranchIds`
  - `ordered`
  - `upgradeSource`
  - `upgradeConsumed`
- 每个 branch 的 handler 在完成自己的效果或后续子交互后，回到统一 resume helper 继续执行下一 branch。

### 3. InteractionSystem 增加 ordered multi-selection 契约

- 在 `simple-choice` 的 `multi` 基础上增加顺序语义字段。
- 响应 payload 中的 `optionIds` 必须按玩家点击顺序保留。
- 刷新选项时只允许过滤失效候选，不得重排已选顺序语义。

### 4. UI 与 AI 同步支持顺序化多选

- UI:
  - generic multi-select 需要显示顺序编号
  - 提交时按选择顺序发送 `optionIds`
- AI:
  - 无序多选继续枚举组合
  - ordered multi-select 需要枚举排列

## Migration Plan

1. 先为 InteractionSystem / AI / Smash Up 域层补齐 ordered multi + branching builder 契约。
2. 先迁移 Fairies 中最典型的 OR 能力作为首批验证对象。
3. 用新增抽象替换 `Spirit of the Forest` 的散落特判。
4. 保留旧 helper 一轮兼容，仅在首批迁移稳定后再继续清理。

## Risks / Trade-offs

- Risk: UI 当前对 generic multi-select 的顺序支持不足。
  - Mitigation: 第一轮明确补齐顺序可视化和提交契约。

- Risk: AI 对 ordered multi 的排列枚举可能带来候选爆炸。
  - Mitigation: 第一轮仅用于低分支数 OR 能力，保持候选规模受控。

- Risk: 某些现有 Fairies 能力并不完全等价于“先选 branch 再顺序执行”。
  - Mitigation: 首批迁移只覆盖语义最清晰的一组卡，逐步扩展。
