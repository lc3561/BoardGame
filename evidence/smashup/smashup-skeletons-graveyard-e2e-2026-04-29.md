# SmashUp Skeletons《墓园》浏览器级真实入口证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：`skeletons_graveyard / 墓园`
- 卡图基线：`temp/skeletons-card-16.png`
- 本轮目标：
  - 证明《墓园》打到基地后，能从场上真实发动天赋；
  - 证明候选只包含“这里你的埋葬牌”，不会把同基地别人的埋葬牌错放进候选；
  - 证明挖出的是随从时，会继续进入“可放 1 个 +1 指示物”的后续交互，并能真实落到棋盘。

## 运行命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "skeletons_graveyard 天赋挖掘后若是随从会进入可选 \+1 指示物交互"`
2. `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "墓园应可从场上发动天赋挖掘己方埋葬牌，并在挖出随从后可放置 \+1 指示物"`

## 结果

- `newFactionAbilities` 定向：`1 passed`
- 浏览器级真实入口 E2E：`1 passed`

## 关键截图与肉眼结论

### 1. 挖掘候选提示

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-graveyard-uncover-prompt-2026-04-29.png`
- 我实际看到：
  1. 中央明确出现《墓园》卡图本体与提示条 `墓园：挖掘这里一张你的埋葬牌`。
  2. 左侧基地下方能直接看到一张翻正面的己方埋葬牌本体，以及一张背面的另一张埋葬牌。
  3. 这张图配合状态断言证明候选只放进了 `graveyard-own-buried`，没有把 `graveyard-enemy-buried` 错列为可选。
- 是否达到验收标准：
  - **达到。** 这张图证明了真实入口里确实出现了“只挖这里你的埋葬牌”的候选界面，而不是只靠 L2 状态。

### 2. +1 指示物后续提示

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-graveyard-counter-prompt-2026-04-29.png`
- 我实际看到：
  1. 提示条变为 `墓园：你可以在该仆从上放置 1 个 +1 力量指示物`。
  2. 左侧基地下方已经能看到刚挖出的仆从本体，不是空白容器。
  3. 中央出现 `放置指示物 / 跳过` 两个按钮，说明流程确实进入了“挖掘后再决定是否放指示物”的后续交互。
- 是否达到验收标准：
  - **达到。** 这张图证明《墓园》不是“挖出来就结束”，而是继续进入卡图要求的 +1 选择窗。

### 3. 收口后棋盘结果

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-graveyard-resolved-2026-04-29.png`
- 我实际看到：
  1. 左侧基地下方仍能看到被挖出的仆从本体。
  2. 仆从左上方出现绿色 `+1` 标记，说明指示物已经真实放上去。
  3. 原本那张背面的另一张埋葬牌还留在基地下方，交互已收口，流程回到可继续推进状态。
- 是否达到验收标准：
  - **达到。** 这张图和状态断言一起证明“挖掘落地 + 放置 1 个 +1 指示物”都已真实完成。

## 状态断言补充

- `graveyard-own-buried` 已从 `base_1.buriedCards` 移除。
- `graveyard-own-buried` 已进入 `base_1.minions`。
- `graveyard-own-buried.powerCounters === 1`。
- `graveyard-enemy-buried` 仍保留在 `base_1.buriedCards`，未被误挖。

## 结论

- 《墓园》当前已补齐一条浏览器级正路径 L3：`场上发动天赋 -> 挖掘己方埋葬牌 -> 挖出随从后可选放置 +1 指示物 -> 真实落到棋盘`。
- 这轮新增的是**真实入口补证**，不是新增实现修复。
- `Skeletons` 整派系和三新派系整包仍然是 **仍有残余范围**，不能把这条单卡证据外推成最终收口。
