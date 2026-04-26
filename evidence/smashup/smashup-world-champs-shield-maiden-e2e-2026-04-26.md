# SmashUp 世界冠军 盾牌少女 真实入口 E2E 证据（2026-04-26）

## 范围

- 对象：`world_champs_shield_maiden / 盾牌少女`
- 目标：补齐“真实对局入口打出后，选择对手 -> 揭示其牌库顶 -> 若符合条件则拿到手”的 L3 玩法证据

## 权威来源

- 本地卡图标题切片：`temp/cards7-title-30.png`
- 10 周年重录合同：`evidence/smashup/smashup-10th-anniversary-reintake-2026-04-25.md`
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "盾牌少女打出后应选择对手并拿走其牌库顶的合格卡牌"
```

## 结果

- 结果：`1 passed`

## 关键截图

1. 选择对手
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\盾牌少女打出后应选择对手并拿走其牌库顶的合格卡牌\shield-maiden-player-prompt-visible.png`
   - 肉眼观察：
     - 左侧基地上已经能看到 `盾牌少女` 本体，说明是真实打出后的 onPlay 交互。
     - 中央提示文案是“选择另一位玩家，展示其牌库顶的一张牌”，与卡面语义一致。
     - 画面中可见对手玩家选项，而不是错误地要求选手牌、选基地或直接跳过。

2. 合格卡牌入手
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\盾牌少女打出后应选择对手并拿走其牌库顶的合格卡牌\shield-maiden-gained-top-card.png`
   - 肉眼观察：
     - 中央提示已经关闭，链路正常收口，没有卡在 reveal/interaction 状态。
     - `盾牌少女` 仍留在左侧基地，说明执行的是揭示并拿牌，不是错误替换成别的打出效果。
     - 底部手牌区已经出现从对手牌库顶拿到的 `召唤`，符合“顶牌为行动牌则归你”的结果。

## 状态断言

- E2E 断言了 `interaction.sourceId === 'world_champs_shield_maiden'`
- E2E 断言了可选玩家里包含 `targetPlayerId === '1'`
- E2E 断言了结算后：
  - `finalState.core.players['0'].hand` 包含 `wizard_summon`
  - `finalState.core.players['1'].deck` 不再包含 `wizard_summon`
  - `finalState.core.bases[0].minions` 仍包含 `world_champs_shield_maiden`

## 结论等级

- **代表性玩法已验证**

## 影响到总审计的修订

- 旧“`盾牌少女` 仅有引擎级单测、缺真实入口玩法证据”的说法在当前基线上已失效。
- 这只补齐了 `盾牌少女` 单卡的 L3 证据，不等于 `World Champs` 或“三派系整包”已经收口。
