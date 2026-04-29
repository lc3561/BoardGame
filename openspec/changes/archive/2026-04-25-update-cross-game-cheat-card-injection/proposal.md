# Change: Update Cross-Game Cheat Card Injection

## Why
当前跨游戏调试发牌能力把两种不同语义混在了一起：一类是“从当前剩余牌库移动一张牌到手牌”，另一类是“按指定卡面直接补一张到手牌”。`dicethrone` 已经因为这个问题做了局部修复，而 `summonerwars` 也存在同类问题，并且还暴露出 `spriteAtlas + spriteIndex` 未被完整建模的歧义风险。

如果继续让每个游戏各自补洞，未来游戏数扩展到 100 个时，调试工具会持续重复犯同样的错误：把“剩余牌库”误当成“完整可调试卡池”，以及把不稳定的图集索引当成跨游戏通用主键。

## What Changes
- 新增 `cheat-system` capability，明确跨游戏调试卡牌操作必须区分：
  - `deal from deck`：仅从当前剩余牌库移动牌
  - `add to hand by stable identity`：按游戏定义的稳定标识直接补牌
- 规定调试 UI 不得把裸 `atlasIndex` 视为跨游戏稳定键；展示层可以显示 atlas 信息，但提交层必须使用稳定身份键，或使用游戏显式声明的复合键。
- 规定支持完整卡池注入的游戏必须在调试面板里提供正确语义；不支持的游戏必须显式降级为“仅牌库操作”，不能再给出误导性文案。
- 首轮实现范围聚焦到现有已命中的游戏：
  - `dicethrone` 保持现有正确语义并纳入通用规范
  - `summonerwars` 对齐到同一套通用语义
  - `smashup` 显式保留 deck-only 调试语义
  - `cardia` 不强行补完业务，但需要补齐“不支持直接补牌”的明确约束或后续接入点

## Impact
- Affected specs:
  - `cheat-system`（新增）
- Affected code:
  - `src/engine/systems/CheatSystem.ts`
  - `src/games/dicethrone/domain/cheatModifier.ts`
  - `src/games/dicethrone/debug-config.tsx`
  - `src/games/summonerwars/game.ts`
  - `src/games/summonerwars/debug-config.tsx`
  - `src/games/smashup/cheatModifier.ts`
  - `src/games/smashup/debug-config.tsx`
  - `src/games/cardia/domain/cheatModifier.ts`
  - 对应测试、E2E 和证据文档
