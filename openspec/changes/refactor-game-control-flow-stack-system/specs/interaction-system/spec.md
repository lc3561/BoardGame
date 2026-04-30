## ADDED Requirements
### Requirement: 交互 SHALL 绑定所属 resolution frame 而不是独立持有主续链
InteractionSystem SHALL 把每个阻塞式交互绑定到其所属的 resolution frame。交互可以阻塞或解锁该 frame，但不得自行拥有第二套主续链、deferred follow-up 或阶段推进权。

#### Scenario: 交互阻塞并解锁所属 frame
- **GIVEN** 一个 resolution frame 在执行途中创建了交互
- **WHEN** 该交互进入 `sys.interaction.current`
- **THEN** 所属 frame MUST 进入 blocked 状态
- **AND** 当交互被解决后，系统 MUST 恢复同一 frame 继续推进

#### Scenario: 交互切换时不再由通用系统拼接游戏私有 continuation
- **GIVEN** 一个交互解决后队列中的下一个交互成为 current
- **WHEN** InteractionSystem 切换 current / queue
- **THEN** 它 MAY 刷新候选与更新通用元数据
- **BUT** 它 MUST NOT 代表游戏拼接第二套私有主续链或决定 deferred follow-up 的补发时机

### Requirement: 多步交互进度 SHALL 以系统交互状态为真相源
InteractionSystem SHALL 要求多步交互的当前步骤与中间结果以系统交互状态为真相源。游戏本地 UI route、局部 Hook state 或 modal 草稿态 MAY 作为派生视图，但 MUST NOT 成为唯一进度来源。

#### Scenario: 召唤师战争本地 route 只是系统交互的视图
- **GIVEN** 召唤师战争某个能力需要多步选择
- **WHEN** UI 通过 adapter 把系统交互映射为本地 route 或 mode
- **THEN** 当前步骤与候选集合 MUST 仍来自 `sys.interaction`
- **AND** 刷新页面或 AI 接管后系统 MUST 能重建相同步骤
