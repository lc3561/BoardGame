# Change: Refactor Smash Up OR Branch Upgrades

## Why

Smash Up 当前已经有多处“选择 A 或 B 效果”的能力实现，但这些实现把 `OR` 分支语义、Titan 升级语义、后续目标选择交互和一次性额度消耗都硬编码在单卡 handler 中。  
当 `Spirit of the Forest` 这类效果需要把 `OR` 升级为“可两边都做，且顺序可选”时，现有写法会导致重复实现、语义漂移和 AI/UI 支持不一致。

## What Changes

- 为 Smash Up 新增统一的 branching choice / OR 能力 builder，而不是继续在单卡里手写分支 prompt
- 为 branching OR 能力新增 upgrade provider 介入点，用于将单选升级为可选双执行
- 明确“both parts in any order”必须保留玩家选择顺序，而不是仅按无序多选处理
- 扩展交互层对 ordered multi-selection 的契约，让 UI 和 AI 都能识别并保序处理
- 将 Fairies 中第一批 `OR` 能力迁移到统一抽象，作为首批验证对象

## Impact

- Affected specs:
  - `interaction-system`
  - `game-ai-system`
  - `smashup-or-branch-upgrades`
- Affected code:
  - `src/engine/systems/InteractionSystem.ts`
  - `src/games/smashup/Board.tsx`
  - `src/games/smashup/ai.ts`
  - `src/games/smashup/domain/**`
  - `src/games/smashup/abilities/fairies.ts`
