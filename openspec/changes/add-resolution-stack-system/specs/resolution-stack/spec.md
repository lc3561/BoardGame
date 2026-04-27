## ADDED Requirements
### Requirement: 系统 SHALL 为连续结算提供统一的 resolution frame 栈
系统 SHALL 提供通用 resolution frame 栈，用于表达一条尚未完成的连续结算事务，而不是把恢复点分散在 flow、interaction、response window 与游戏私有 flag 中。

#### Scenario: 连续结算跨交互暂停后恢复
- **GIVEN** 一条结算链在执行到一半时需要玩家选择
- **WHEN** 系统创建该选择交互
- **THEN** 当前 resolution frame MUST 进入 blocked 状态
- **AND** 交互解决后系统 MUST 能恢复到同一 resolution frame 继续推进

#### Scenario: 连续结算跨响应窗口暂停后恢复
- **GIVEN** 一条结算链执行到响应窗口
- **WHEN** 响应窗口打开并等待所有响应者完成
- **THEN** 当前 resolution frame MUST 记录自己被 response window 阻塞
- **AND** 响应窗口关闭后系统 MUST 从同一 frame 恢复，而不是依赖游戏层手动续链

### Requirement: resolution frame SHALL 支持显式顺序策略
系统 SHALL 允许 resolution frame 声明自己的推进顺序策略，而不强制所有连续结算都使用单一的 LIFO 栈语义。

#### Scenario: 显式顺序链按既定顺序推进
- **GIVEN** 某条结算链要求按预先锁定的顺序依次处理多个目标
- **WHEN** 系统推进该 resolution frame
- **THEN** 它 MUST 按 frame 声明的显式顺序推进
- **AND** 不得因为通用栈机制而打乱既定顺序

#### Scenario: 反应链可使用栈式或队列式策略
- **GIVEN** 某条结算链属于反应/响应类链路
- **WHEN** 游戏声明该 frame 使用栈式或队列式策略
- **THEN** 系统 MUST 按该策略恢复下一个待处理步骤

### Requirement: deferred follow-up SHALL 由 resolution frame 单一持有
系统 SHALL 要求 deferred follow-up（如延迟补发事件、延迟动作、替换后动作）由 resolution frame 单一持有并统一发出，不得分散在 interaction data、afterEvents 兜底与多个游戏私有 flag 中重复拥有。

#### Scenario: frame 完成时只补发一次 deferred follow-up
- **GIVEN** 当前 resolution frame 持有待补发的 deferred follow-up
- **WHEN** 系统确认该 frame 已完成所有交互、响应窗口和 reduce 后步骤
- **THEN** 系统 MUST 只补发一次这些 follow-up
- **AND** 补发后 MUST 清空该 frame 上的 deferred follow-up

### Requirement: resolution frame SHALL 支持父子嵌套结算恢复
系统 SHALL 支持一个正在执行的 resolution frame 被新的子 frame 打断，并在子 frame 完成后恢复到原父 frame，而不是要求游戏层额外维护第二套主结算栈。

#### Scenario: 子 frame 打断父 frame 后优先完成
- **GIVEN** 一个父 resolution frame 正在推进当前步骤
- **AND** 该步骤触发了必须立即完整结算的内层牌或能力
- **WHEN** 系统为该内层结算创建子 frame
- **THEN** 子 frame MUST 成为新的 active frame
- **AND** 父 frame MUST 以 suspended 或等价可恢复状态保留在同一通用 frame 栈中

#### Scenario: 子 frame 完成后恢复父 frame
- **GIVEN** 一个父 resolution frame 因子 frame 打断而暂停
- **AND** 该子 frame 已完成并清空自己的 deferred follow-up
- **WHEN** 系统选择下一个待推进的 frame
- **THEN** 系统 MUST 恢复该父 frame
- **AND** 父 frame MUST 从被打断的恢复位点继续，而不是依赖游戏私有 session 栈重新拼接主链
