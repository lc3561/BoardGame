# smashup-princesses-faction Specification (delta)

## ADDED Requirements

### Requirement: 系统必须将 Princesses 作为正式 Smash Up 派系接入
系统 SHALL 将 `Princesses / 公主` 的 faction、card、base、locale、UI metadata 与运行时预览链路正式接入 Smash Up。

#### Scenario: 用户提供 Princesses 混排 atlas 并要求做到正式可玩
- **WHEN** Princesses 的图片真相源、英文名称与英文效果文本来源已经锁定
- **THEN** 系统 MUST 将 Princesses 的 card/base 数据、locale 与 UI metadata 正式接入
- **AND** 系统 MUST 在派系选择、卡牌预览与基地预览链路中可见
- **AND** 系统 MUST NOT 把“只有旧草稿存在”误报成“派系已完成”

### Requirement: 系统必须先裁定现有 Princesses 草稿再决定复用
系统 SHALL 在实现 Princesses 前，对旧草稿中的 `princesses` 数据与能力执行真相源核对，并显式裁定哪些内容保留、哪些内容重做。

#### Scenario: 旧 worktree 已存在 Princesses 局部实现
- **WHEN** 系统开始实现 Princesses
- **THEN** 系统 MUST 先核对旧 `Princesses` 卡牌数据、基地数据与已实现能力是否与本轮真相源一致
- **AND** 系统 MUST 将一致项作为候选复用实现保留，或将不一致项显式修正
- **AND** 系统 MUST NOT 因为旧 worktree 中已有代码就默认跳过核对

### Requirement: 系统必须把 Princesses 玩法实现为可审计的单派系闭环
系统 SHALL 以单派系闭环的方式完成 Princesses 的玩法实现，并按“配置复用批 / 共享规则扩展批 / 新 UI 与 E2E 批”推进。

#### Scenario: 系统开始实施 Princesses 能力
- **WHEN** 系统已完成 Princesses intake 并进入 implementation
- **THEN** 系统 MUST 先完成可直接配置复用的一批能力
- **AND** 系统 MUST 再完成需要共享规则扩展的一批能力
- **AND** 系统 MUST 最后完成需要真实入口交互验证的一批能力与对应 E2E
- **AND** 任一批次未完成时，系统 MUST 维持 Princesses 未完成状态

### Requirement: Princesses 交付必须同时包含自动化验证与视觉证据
系统 SHALL 为 Princesses 的正式接入提供相关 Vitest、真实入口 E2E、evidence 文档，以及资源链路的上传回查。

#### Scenario: Princesses 准备收口
- **WHEN** Princesses 的资源、静态数据与能力均已接入
- **THEN** 系统 MUST 运行相关 Smash Up 测试
- **AND** 系统 MUST 至少提供 1 条真实入口 E2E 与关键截图证据
- **AND** 若新增资源已进入运行时链路，系统 MUST 完成压缩、上传与远端可访问性验证
