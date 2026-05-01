# Change: 重构 DiceThrone 额外掷骰与目标投掷的统一改骰语义

## Why
当前 DiceThrone 的掷骰实现被拆成两套体系：主骰使用 `state.dice + DiceTray + MODIFY_DIE/REROLL_DIE`，而大量额外掷骰/技能投掷使用 `pendingBonusDiceSettlement + BonusDieOverlay/EventStream` 或 `displayOnly` 特写直接结算。这样会导致“规则上可被改骰的投掷”在实现上被错误降级成仅展示特效，无法复用统一的改骰、重掷、目标选择与 Ultimate 锁定语义。

项目内已确认的规则基线要求：
- 目标掷骰（Targeting Roll）本身可被改骰，Ultimate 成功启动后仅保留规则允许的干预窗口。
- 因卡牌、状态效果、技能效果而产生的额外掷骰，若规则未禁止，仍属于可被改骰的掷骰结果，不应默认走“展示即结算”。

## What Changes
- 引入 DiceThrone 专用的“统一骰子上下文”建模，覆盖主骰、目标掷骰、技能额外骰、奖励骰组、对掷/比骰等临时骰池。
- 规定凡是规则上允许被修改/重掷/响应的掷骰，必须进入统一可交互链路，而不是 `displayOnly` 直接结算。
- 将 `displayOnly` 的职责收敛为“不可干预的结果回放 / 已结算结果展示 / 纯汇总说明”，禁止再承载本应进入规则交互的掷骰。
- 为 Ultimate、目标掷骰、多人对手选择、攻击修正、奖励骰重掷建立明确的“可干预矩阵”与阶段阻塞规则。
- 为 DiceThrone 的 UI、验证层、FlowHooks、事件系统定义一致的收口方式，避免一部分骰子走骰盘、一部分骰子走特写导致语义分裂。

## Impact
- Affected specs: `dicethrone-dice-resolution`
- Affected code:
  - `src/games/dicethrone/domain/effects.ts`
  - `src/games/dicethrone/domain/execute.ts`
  - `src/games/dicethrone/domain/executeTokens.ts`
  - `src/games/dicethrone/domain/reducer.ts`
  - `src/games/dicethrone/domain/flowHooks.ts`
  - `src/games/dicethrone/domain/systems.ts`
  - `src/games/dicethrone/domain/commandValidation.ts`
  - `src/games/dicethrone/ui/DiceTray.tsx`
  - `src/games/dicethrone/ui/BoardOverlays.tsx`
  - `src/games/dicethrone/hooks/useCardSpotlight.ts`
  - `src/games/dicethrone/domain/customActions/*`
