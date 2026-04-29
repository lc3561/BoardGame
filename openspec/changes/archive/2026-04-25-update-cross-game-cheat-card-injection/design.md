## Context
- 当前引擎 `CheatSystem` 已同时暴露 `DEAL_CARD_BY_INDEX`、`DEAL_CARD_BY_ATLAS_INDEX`、`ADD_CARD_TO_HAND_BY_CARD_ID`，但只有部分游戏真正实现了第二类“直接补牌”能力。
- `dicethrone` 已有完整卡池和 `cardId` 稳定标识，因此已通过本地修复解决问题。
- `summonerwars` 也有阵营级注册表和稳定 `card.id`，但 UI 和 cheat modifier 仍停留在“只查剩余牌库”的旧语义。
- `summonerwars` 额外存在 `spriteIndex` 跨不同 `spriteAtlas` 冲突的问题，说明裸 `atlasIndex` 不是可靠的跨游戏标识。
- `smashup` 的调试工具本质上是 deck-only 操作器，不应被误改为完整卡池注入器。
- `cardia` 挂载了 CheatSystem，但自身 cheat modifier 仍是旧接口和未完成 TODO，不能被当成已经支持完整卡池注入。

## Goals
- 为跨游戏调试卡牌操作建立稳定、可扩展的统一语义。
- 避免未来游戏继续把“剩余牌库”误当成“完整卡池”。
- 允许不同游戏在“能否直接补牌”上显式声明能力，而不是隐式失败。
- 保持 deck-only 游戏的既有调试语义，不制造不必要的业务改动。

## Non-Goals
- 不在本次变更里强制所有游戏都实现完整卡池注入。
- 不尝试在引擎层统一创建所有游戏的卡牌实例。
- 不把现有所有调试面板一次性重写成同一种 UI。

## Decisions

### Decision: 区分两类调试卡牌操作
- `deal from deck` 只操作当前剩余牌库，失败条件是牌库中没有该牌。
- `add to hand by stable identity` 不依赖当前牌库，只依赖游戏层可用的完整卡池/注册表。

原因：
- 两类操作服务的调试目的不同，一个是验证真实抽牌链路，一个是构造目标局面。
- 把它们混成一个按钮，会导致 UI 和错误提示都在说谎。

### Decision: 裸 atlasIndex 不再作为跨游戏稳定键
- atlas 只适合展示和速查，不适合作为跨游戏通用注入主键。
- 若游戏确实需要按图集点选，提交层必须映射到稳定身份键，或显式携带复合标识（如 `spriteAtlas + spriteIndex`）。

原因：
- `summonerwars` 已证明不同图集会复用同一个 index。
- 即使 index 在单图集中唯一，也无法表达“这张卡是否来自完整卡池还是当前剩余牌库”。

### Decision: 卡牌实例构造仍由游戏层负责
- 引擎层只负责统一命令语义和能力契约。
- 每个游戏继续在自己的 cheat modifier 或 helper 中决定如何从稳定标识生成实例、克隆卡牌、补到手牌。

原因：
- `dicethrone`、`summonerwars`、`cardia` 的卡实例结构和唯一 ID 规则不同。
- 在引擎层硬做统一实例工厂会把领域结构耦死。

### Decision: 不支持完整卡池注入的游戏必须显式降级
- 这类游戏的 UI 文案、禁用态和按钮命名必须明确为 deck-only。
- 不能再用“发指定牌”“牌库中不存在该索引”之类话术暗示存在完整卡池注入能力。

原因：
- 现在最大的体验问题不是“不支持”，而是“看起来支持，实际失败”。

## Risks / Trade-offs
- 增加一个新的规范能力后，后续接入游戏需要补 capability 对齐工作。
  - Mitigation: 首轮只迁移已命中的游戏，其他游戏先显式降级。
- 将 atlas 退回到展示层后，部分现有快捷点选 UI 需要补映射逻辑。
  - Mitigation: 先为已有图集速查表增加稳定标识映射，不要求一次性重做界面。
- `cardia` 现有 cheat modifier 接口可能与引擎主接口不一致。
  - Mitigation: 本次先把它纳入规范和风险清单，不把未完成 TODO 冒充已支持。

## Migration Plan
1. 新增 `cheat-system` spec，固定跨游戏调试卡牌操作语义。
2. 在引擎层保留现有命令，但明确推荐路径为 `deck-only` 与 `stable identity injection` 两条分支。
3. 将 `summonerwars` 从 atlas-only / deck-only 的错误混合语义迁移到显式稳定身份注入。
4. 将 `smashup` 标记为 deck-only 语义，不进入完整卡池注入路线。
5. 为 `cardia` 补齐能力缺口说明，待后续单独实现时再接入。

## Open Questions
- `summonerwars` 的调试 UI 最终提交层是直接用 `cardId`，还是保留 `spriteAtlas + spriteIndex` 作为展示键后再映射到 `cardId`。
- 是否需要在引擎层新增更中性的命令名，替代语义过窄的 `DEAL_CARD_BY_ATLAS_INDEX`。
