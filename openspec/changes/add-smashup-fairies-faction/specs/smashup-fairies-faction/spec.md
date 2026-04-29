# smashup-fairies-faction Specification (delta)

## ADDED Requirements

### Requirement: 系统必须将 Fairies 作为正式 Smash Up 派系接入
系统 SHALL 将 `Fairies / 仙灵` 的 faction、card、base、locale、UI metadata 与运行时预览链路正式接入 Smash Up。

#### Scenario: 用户提供 Fairies 混排 atlas 并要求做到正式可玩
- **WHEN** Fairies 的图片真相源、英文名称与英文效果文本来源已经锁定
- **THEN** 系统 MUST 将 Fairies 的 card/base 数据、locale 与 UI metadata 正式接入
- **AND** 系统 MUST 在派系选择、卡牌预览与基地预览链路中可见
- **AND** 系统 MUST NOT 把“仅基地已接入”误报成“派系已完成”

### Requirement: 系统必须先裁定现有 Fairies 半成品再决定复用
系统 SHALL 在实现 Fairies 前，对仓库中已有的 `fairies` 残留实现执行真相源核对，并显式裁定哪些内容保留、哪些内容重做。

#### Scenario: 仓库已存在仙灵基地与基地能力半成品
- **WHEN** 系统开始实现 Fairies
- **THEN** 系统 MUST 先核对现有 `base_enchanted_glade`、`base_fairy_ring` 及其能力是否与本轮真相源一致
- **AND** 系统 MUST 将一致项作为复用实现保留，或将不一致项显式修正
- **AND** 系统 MUST NOT 因为仓库里已经有代码就默认跳过核对

### Requirement: 系统必须把 Fairies 玩法实现为可审计的单派系闭环
系统 SHALL 以单派系闭环的方式完成 Fairies 的玩法实现，并按“配置复用批 / 新机制扩展批 / 新 UI 与 E2E 批”推进。

#### Scenario: 系统开始实施 Fairies 能力
- **WHEN** 系统已完成 Fairies intake 并进入 implementation
- **THEN** 系统 MUST 先完成可直接配置复用的一批能力
- **AND** 系统 MUST 再完成需要共享机制扩展的一批能力
- **AND** 系统 MUST 最后完成需要真实入口交互验证的一批能力与对应 E2E
- **AND** 任一批次未完成时，系统 MUST 维持 Fairies 未完成状态

### Requirement: Fairies 交付必须同时包含自动化验证与视觉证据
系统 SHALL 为 Fairies 的正式接入提供相关 Vitest、真实入口 E2E、evidence 文档，以及资源链路的上传回查。

#### Scenario: Fairies 准备收口
- **WHEN** Fairies 的资源、静态数据与能力均已接入
- **THEN** 系统 MUST 运行相关 Smash Up 测试
- **AND** 系统 MUST 至少提供 1 条真实入口 E2E 与关键截图证据
- **AND** 若新增资源已进入运行时链路，系统 MUST 完成压缩、上传与远端可访问性验证

### Requirement: 系统必须在 Titan scope 获批后正式接入 Spirit of the Forest
当用户明确要求将 `Spirit of the Forest / 丛林之灵` 纳入 Fairies 交付时，系统 SHALL 将该 Titan 的资源、召唤条件、能力分支与 titan clash 例外完整接入。

#### Scenario: 用户要求把 Spirit of the Forest 做进 Fairies
- **WHEN** 用户已批准 Fairies Titan scope
- **THEN** 系统 MUST 将 `fairies_spirit_of_the_forest` 作为 Fairies Titan 正式注册
- **AND** 系统 MUST 让其特殊召唤遵守“代替通常随从和通常行动”的条件
- **AND** 系统 MUST 在 `Titania`、`Puck`、`Magic Acorns`、`Playful Tricks`、`Enchantment`、`Fairy Circle`、`Fairy Ballet` 等相关能力中正确接入其替代分支
- **AND** 系统 MUST 在 titan clash 输掉时提供“移动到另一个基地而非直接移除”的例外交互
