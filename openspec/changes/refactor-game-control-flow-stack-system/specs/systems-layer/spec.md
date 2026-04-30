## ADDED Requirements
### Requirement: 系统层 SHALL 围绕统一控制流权威协作
系统层 SHALL 允许 Modal、Interaction、ResponseWindow、Flow 等复用系统围绕统一控制流权威协作。跨游戏系统可以拥有各自的局部状态，但 MUST 通过统一 owner/frame 关系接入，而不是各自维护互不相认的主恢复栈。

#### Scenario: 复用系统共享同一 owner/frame 关系
- **GIVEN** 一个复杂游戏链路先后打开了 interaction、response window 与 blocking modal
- **WHEN** 这些系统共同参与同一笔业务链
- **THEN** 它们 MUST 能映射到同一个 owner/frame 主链
- **AND** 不得出现每个系统都各自判断“我才是当前主链”的情况

#### Scenario: 游戏私有缓存只能是派生视图
- **GIVEN** 游戏仍保留某些私有候选列表、展示文案或调试 session
- **WHEN** 系统层需要判断当前业务链该恢复到哪里
- **THEN** 系统 MUST 以统一控制流权威为准
- **AND** 游戏私有缓存 MUST 只作为派生视图或兼容过渡数据
