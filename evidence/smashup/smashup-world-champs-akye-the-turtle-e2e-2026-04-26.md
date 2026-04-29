# SmashUp 世界冠军 海龟阿凯 真实入口 E2E 证据（2026-04-26）

## 范围

- 对象：`world_champs_akye_the_turtle / 海龟阿凯`
- 目标：补齐“真实对局入口打出后，先选玩家 -> 再选要交出的手牌 -> 对手获得该牌 -> 自己抽两张”的 L3 玩法证据

## 权威来源

- 本地卡图标题切片：`temp/cards7-title-29.png`
- 10 周年重录合同：`evidence/smashup/smashup-10th-anniversary-reintake-2026-04-25.md`
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "海龟阿凯打出后应先选玩家再交牌并抽两张"
```

## 结果

- 结果：`1 passed`

## 关键截图

1. 先选玩家
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\海龟阿凯打出后应先选玩家再交牌并抽两张\akye-player-prompt-visible.png`
   - 肉眼观察：
     - 左侧基地上已经能看到 `海龟阿凯` 本体，说明这是打出后的真实 onPlay 交互，不是裸注入 prompt。
     - 中央提示文案是“选择一位玩家并交给其一张手牌（然后你抽两张牌）”，与卡面语义一致。
     - 画面里能看到玩家选择按钮，不是直接跳到交牌步骤。

2. 再选手牌
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\海龟阿凯打出后应先选玩家再交牌并抽两张\akye-card-prompt-visible.png`
   - 肉眼观察：
     - 交互已经切换到第二步，标题变成“选择要交给对方的一张手牌”。
     - 中央只显示 1 张可交出的手牌 `召唤`，没有把已经打出的 `海龟阿凯` 自己错误列进候选。
     - 该候选以卡牌形式展示，不是空按钮或错误目标类型。

3. 交牌并抽两张后收口
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\海龟阿凯打出后应先选玩家再交牌并抽两张\akye-transfer-and-draw-resolved.png`
   - 肉眼观察：
     - 中央交互提示已经关闭，链路正常收口，没有卡在二段交互。
     - `海龟阿凯` 仍留在左侧基地，说明执行的是交牌 + 抽牌，而不是错误替换成别的打出效果。
     - 底部手牌区已变成两张新抽到的机器人卡，原本交出的 `召唤` 不再留在自己手里。

## 状态断言

- E2E 断言了第一步 `interaction.sourceId === 'world_champs_akye_the_turtle_player'`
- E2E 断言了第二步 `interaction.sourceId === 'world_champs_akye_the_turtle_card'`
- E2E 断言了第二步唯一卡牌候选为 `wizard_summon`
- E2E 断言了结算后：
  - `finalState.core.players['1'].hand` 包含 `wizard_summon`
  - `finalState.core.players['0'].hand` 不再包含 `wizard_summon`
  - `finalState.core.players['0'].hand` 包含 `robot_microbot_alpha` 与 `robot_microbot_beta`
  - `finalState.core.bases[0].minions` 仍包含 `world_champs_akye_the_turtle`

## 结论等级

- **代表性玩法已验证**

## 影响到总审计的修订

- 旧“`海龟阿凯` 只有引擎级单测、缺真实入口玩法证据”的说法在当前基线上已失效。
- 这只补齐了 `海龟阿凯` 单卡的 L3 证据，不等于 `World Champs` 或“三派系整包”已经收口。
