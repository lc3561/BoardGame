# SmashUp Skeletons《骸骨之王》浏览器级真实入口证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：`skeletons_lord_of_bones / 骸骨之王`
- 卡图基线：`temp/skeletons-card-18.png`
- 本轮目标：
  - 证明《骸骨之王》从场上发动天赋时，确实能挖掘“这里任意埋葬牌”，而不是只限自己的埋葬牌；
  - 证明真实浏览器入口里，这条后续不是直接弹 +1 提示，而是先进入 `smashup_reaction_choose`；
  - 证明选中这条反应后，才能继续进入“给挖出的随从放置 1 个 +1 指示物”的后续交互，并最终真实落地。

## 运行命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "skeletons_lord_of_bones 天赋可挖掘这里任意埋葬牌而不只限自己"`
2. `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "骸骨之王应可从场上发动天赋挖掘这里任意埋葬牌，并在挖出其他随从后可放置 \+1 指示物"`

## 结果

- `newFactionAbilities` 定向：`1 passed`
- 浏览器级真实入口 E2E：`1 passed`

## 关键截图与肉眼结论

### 1. 挖掘候选提示

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-lord-of-bones-uncover-prompt-2026-04-29.png`
- 我实际看到：
  1. 顶部提示条明确写着 `骸骨之王：挖掘这里一张埋葬牌`。
  2. 左侧基地下方能直接看到《骸骨之王》本体，以及一张可被挖掘的埋葬牌本体。
  3. 这张图对应的场景里，那张埋葬牌是其他玩家的牌；配合状态断言，证明候选确实不是“只限自己”。
- 是否达到验收标准：
  - **达到。** 这张图证明《骸骨之王》真实入口已允许挖掘这里任意埋葬牌。

### 2. 反应窗中转

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-lord-of-bones-reaction-prompt-2026-04-29.png`
- 我实际看到：
  1. 中央出现 `选择一个反应动作`。
  2. 按钮不是直接的 `放置 +1 指示物`，而是先给出 `骸骨之王 / 让过`。
  3. 被挖出的随从此时已经落到基地上，但流程还没有收口，说明真实入口里还有一层 reaction session。
- 是否达到验收标准：
  - **达到。** 这张图直接证明了浏览器真入口与单测观察面的差异：这里先走 `smashup_reaction_choose`，不能假定为“直接弹后续提示”。

### 3. +1 指示物后续提示

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-lord-of-bones-counter-prompt-2026-04-29.png`
- 我实际看到：
  1. 提示条变为 `骸骨之王：你可以在该随从上放置 1 个 +1 力量指示物`。
  2. 中央出现 `放置 +1 指示物 / 跳过` 两个按钮。
  3. 左侧基地下方已经能看到刚挖出的随从本体，说明这不是假提示，而是接在真实挖掘之后的后续交互。
- 是否达到验收标准：
  - **达到。** 这张图证明选中 `骸骨之王` 反应后，后续交互才会被真正打开。

### 4. 收口后棋盘结果

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-lord-of-bones-resolved-2026-04-29.png`
- 我实际看到：
  1. 左侧基地下方仍能看到《骸骨之王》与被挖出的随从本体。
  2. 基地总力量从 `7` 变成 `8`，说明 +1 已真实计入。
  3. 流程已收口，棋盘回到可继续推进状态。
- 是否达到验收标准：
  - **达到。** 这张图和状态断言一起证明“挖掘任意埋葬牌 + 通过反应窗继续加 1”已经真实完成。

## 状态断言补充

- `lob-enemy-buried` 已从 `base_1.buriedCards` 移除。
- `lob-enemy-buried` 已进入 `base_1.minions`。
- `lob-enemy-buried.powerCounters === 1`。
- 真实入口里在 `BURIED_CARD_UNCOVERED` 之后先出现 `smashup_reaction_choose`，再进入 `skeletons_lord_of_bones_ongoing`。

## 结论

- 《骸骨之王》当前已补齐一条浏览器级正路径 L3：`场上发动天赋 -> 挖掘这里任意埋葬牌 -> 先经过 reaction session -> 进入 +1 后续交互 -> 真实落地`。
- 这轮新增的是**真实入口补证**，同时新增一条流程 finding：**单测里看到的直接后续提示，不代表浏览器真入口没有中间 reaction session。**
- `Skeletons` 整派系和三新派系整包仍然是 **仍有残余范围**，不能把这条单卡证据外推成最终收口。
