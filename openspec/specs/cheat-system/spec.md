# cheat-system Specification

## Purpose
TBD - created by archiving change update-cross-game-cheat-card-injection. Update Purpose after archive.
## Requirements
### Requirement: Cheat Card Operations Must Distinguish Deck Moves From Direct Injection
系统 SHALL 将“从当前剩余牌库移动卡牌”与“按稳定身份直接补牌到手牌”视为两类不同的调试操作，并分别定义其前置条件与失败语义。

#### Scenario: Deck-only cheat move uses remaining deck as source of truth
- **GIVEN** 某游戏声明一条调试卡牌操作为 deck-only
- **WHEN** 调试工具请求将一张牌发到手牌
- **THEN** 系统 MUST 只从当前剩余牌库查找并移动该牌
- **AND** 若剩余牌库中不存在该牌，系统 MUST 以“牌库中不存在”语义失败

#### Scenario: Direct injection ignores current remaining deck
- **GIVEN** 某游戏声明支持按稳定身份直接补牌到手牌
- **WHEN** 调试工具请求补入一张指定卡牌
- **THEN** 系统 MUST 基于游戏层提供的稳定身份与完整卡池创建或克隆卡牌实例
- **AND** 系统 MUST 不以当前剩余牌库是否仍包含该牌作为唯一前置条件

### Requirement: Cheat Card Identity Must Be Stable Across Games
系统 SHALL 使用游戏定义的稳定卡牌身份执行直接补牌，不能默认把裸 `atlasIndex` 当成跨游戏稳定主键。

#### Scenario: Game exposes cardId as stable injection identity
- **GIVEN** 某游戏存在稳定 `cardId` 或等价唯一身份
- **WHEN** 调试工具执行直接补牌
- **THEN** 调试命令 MUST 使用该稳定身份提交
- **AND** 展示层中的 atlas 速查信息只能作为辅助映射，不能替代稳定身份

#### Scenario: Sprite index is ambiguous across atlases
- **GIVEN** 某游戏的不同图集存在相同的 `spriteIndex`
- **WHEN** 调试工具允许玩家按图集点选卡牌
- **THEN** 系统 MUST 使用包含 atlas 维度的映射或直接映射到稳定身份
- **AND** 系统 MUST 避免因为复用的 `spriteIndex` 误命中错误卡牌

### Requirement: Games Without Direct Injection Must Degrade Explicitly
系统 SHALL 要求未实现完整卡池注入能力的游戏在调试界面和错误语义上显式降级，而不是伪装为支持“发指定牌”。

#### Scenario: Deck-only game exposes cheat UI
- **GIVEN** 某游戏只支持 deck-only 调试卡牌操作
- **WHEN** 玩家打开该游戏的调试面板
- **THEN** UI MUST 明确标注该工具仅操作剩余牌库
- **AND** UI MUST 不使用会暗示“完整卡池注入”能力的文案或禁用提示

#### Scenario: Game has not implemented direct injection helper yet
- **GIVEN** 某游戏尚未实现从稳定身份创建卡牌实例的 helper
- **WHEN** 共享调试框架检查该能力
- **THEN** 系统 MUST 允许该游戏显式声明“不支持直接补牌”
- **AND** 调试 UI MUST 呈现受控的降级说明，而不是静默失败
