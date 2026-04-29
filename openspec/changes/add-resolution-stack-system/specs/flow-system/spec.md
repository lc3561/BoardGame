## ADDED Requirements
### Requirement: FlowSystem 自动推进 SHALL 尊重未完成的 resolution frame
当系统中存在未完成且仍需恢复的 resolution frame 时，FlowSystem SHALL NOT 把阶段自动推进当作该结算链已经完成。

#### Scenario: active resolution frame blocks auto-continue
- **GIVEN** 当前阶段存在活跃的 resolution frame
- **AND** 该 frame 正在等待 interaction、response window 或 post-reduce 恢复
- **WHEN** FlowSystem 评估是否自动推进阶段
- **THEN** FlowSystem MUST 保持当前阶段
- **AND** 直到对应 resolution frame 显式恢复并完成后才允许继续推进

#### Scenario: completed resolution frame no longer blocks phase advance
- **GIVEN** 当前阶段相关的 resolution frame 已完成并清空
- **WHEN** FlowSystem 再次评估是否自动推进阶段
- **THEN** FlowSystem MAY 按原有 flow 规则继续推进
