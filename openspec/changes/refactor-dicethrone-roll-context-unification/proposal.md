# Change: DiceThrone 掷骰上下文统一重构

## Why
当前 DiceThrone 对“可改骰的掷骰”存在三套并行路径：

- 主掷骰阶段使用 `core.dice`
- 少数额外掷骰使用 `pendingBonusDiceSettlement`
- 另一批额外掷骰直接走 `displayOnly` + 同批自动结算

这导致规则语义被拆散：通用改骰卡、被动重掷、命令校验、AI 与 UI 大多只认识 `state.dice`，看不到许多能力 / 卡牌 / 状态效果产生的额外骰子。按 Dice Throne 规则，“for any reason” 掷出的骰子通常都可被改动；当前实现里，很多额外骰子在没有进入统一可交互掷骰面之前就被自动结算或降级成展示链，和规则口径不一致。

这不是单点 bug，而是 DiceThrone 掷骰语义的建模裂缝。若继续在 `displayOnly`、`pendingBonusDiceSettlement`、`core.dice` 上做局部补丁，只会让改骰规则、Ultimate 例外、目标投掷和奖励骰交互继续分叉。

## What Changes
- 为 DiceThrone 增加统一的“权威掷骰上下文（roll context）”建模，覆盖：
  - 进攻掷骰
  - 防御掷骰
  - Targeting Roll
  - 技能 / 卡牌 / 状态效果产生的额外掷骰
- 让通用改骰入口（修改、重掷、被动、响应窗口中的掷骰类卡牌）统一针对“当前活跃掷骰上下文”，而不是只针对 `core.dice`。
- 将当前会直接 `displayOnly` 自动结算、但规则上仍应可改骰的额外掷骰迁移到统一掷骰上下文。
- 保留“展示专用”能力，但仅允许用于不承载规则决策的回放 / 镜像 / 旁观展示，不再承载可影响结算的真实掷骰。
- 显式建模 Ultimate 结算锁：成功发动 Ultimate 之后，其结算中新增的骰子不可再被修改。

## Impact
- Affected specs:
  - `dicethrone-roll-context`
- Affected code:
  - `src/games/dicethrone/domain/core-types.ts`
  - `src/games/dicethrone/domain/rules.ts`
  - `src/games/dicethrone/domain/effects.ts`
  - `src/games/dicethrone/domain/execute.ts`
  - `src/games/dicethrone/domain/executeTokens.ts`
  - `src/games/dicethrone/domain/reducer.ts`
  - `src/games/dicethrone/domain/commandValidation.ts`
  - `src/games/dicethrone/domain/passiveAbility.ts`
  - `src/games/dicethrone/domain/customActions/common.ts`
  - `src/games/dicethrone/domain/customActions/*`
  - `src/games/dicethrone/domain/flowHooks.ts`
  - `src/games/dicethrone/Board.tsx`
  - `src/games/dicethrone/ui/DiceTray.tsx`
  - `src/games/dicethrone/ui/BonusDieOverlay.tsx`
  - `src/games/dicethrone/ai.ts`
  - 现有 DiceThrone 相关 Vitest / Playwright / evidence 文档
