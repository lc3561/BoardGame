## ADDED Requirements

### Requirement: DiceThrone SHALL Maintain a Single Authoritative Roll Context
DiceThrone SHALL 将当前正在发生且规则上可被修改的掷骰表示为单一权威掷骰上下文，而不是在 `core.dice`、奖励骰结算对象和展示专用事件之间分叉建模。

#### Scenario: 额外掷骰进入权威上下文
- **GIVEN** 某个技能、卡牌或状态效果要求玩家额外掷出 1 颗或多颗骰子
- **AND** 该次掷骰在规则上仍允许被修改或重掷
- **WHEN** 该效果开始解析
- **THEN** 系统必须创建当前活跃的权威掷骰上下文
- **AND** 该上下文必须记录骰子归属者、来源与最终结算模式

### Requirement: Dice-Throne Dice Modification SHALL Target the Active Roll Context
DiceThrone 的通用改骰入口 SHALL 始终针对当前活跃掷骰上下文，而不是只针对主骰池 `state.dice`。

#### Scenario: 通用改骰卡可作用于额外掷骰
- **GIVEN** 当前活跃掷骰来自技能 / 卡牌 / 状态效果的额外掷骰
- **AND** 该掷骰上下文允许修改
- **WHEN** 玩家打出一个合法的掷骰阶段改骰卡或触发一个合法的被动重掷动作
- **THEN** 系统必须把该交互绑定到当前活跃掷骰上下文中的骰子
- **AND** 不得因为该骰子不在 `state.dice` 中就拒绝该操作

### Requirement: DiceThrone SHALL Settle Extra Rolls From Final Accepted Dice
DiceThrone SHALL 基于最终被接受的骰面结果执行额外掷骰的后续结算，而不是在可修改窗口关闭前先行应用伤害、攻击加值或阈值效果。

#### Scenario: 额外掷骰先改骰再结算
- **GIVEN** 一个额外掷骰效果最终会转化为伤害、攻击加值或阈值附加效果
- **WHEN** 所有合法的改骰 / 重掷动作结束并确认最终结果
- **THEN** 系统必须基于最终骰面进行结算
- **AND** 之前的中间骰面结果不得提前写入最终伤害或状态

### Requirement: Ultimate Resolution Dice SHALL Be Explicitly Immutable
DiceThrone SHALL 对“成功发动 Ultimate 之后、在其结算过程中新增的骰子”显式施加不可修改门禁。

#### Scenario: Ultimate 结算骰拒绝后续改骰
- **GIVEN** 某玩家已经成功发动 Ultimate
- **AND** 该 Ultimate 的后续效果要求再掷出额外骰子
- **WHEN** 任意玩家尝试在该结算过程中继续修改或重掷这些额外骰子
- **THEN** 系统必须拒绝该操作
- **AND** 不得为这些骰子打开新的改骰交互

### Requirement: Display-Only Dice Presentation SHALL Not Carry Gameplay-Critical Rolls
DiceThrone SHALL 不再使用纯 `displayOnly` 展示链承载仍会影响真实规则结算的掷骰。

#### Scenario: 仍可改骰的额外掷骰不能只走展示链
- **GIVEN** 某个额外掷骰仍可能被通用卡牌、状态效果、被动能力或显式规则文本修改
- **WHEN** 系统为该效果准备 UI 展示
- **THEN** 展示层必须消费权威掷骰上下文
- **AND** 不得仅创建 `displayOnly` 展示事件后立即自动结算
