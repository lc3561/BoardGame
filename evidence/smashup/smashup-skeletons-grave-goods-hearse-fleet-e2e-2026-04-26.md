# SmashUp Skeletons 关键交互 E2E 证据（殉葬品 / 灵车队伍）- 2026-04-26

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：
  - `skeletons_grave_goods / 殉葬品`
  - `skeletons_hearse_fleet / 灵车队伍`
- 目标：
  - 证明 `殉葬品` 已改成“先强制首埋，再进入后续分支”，且额外埋葬允许去不同基地。
  - 证明 `灵车队伍` 普通打出已允许搬运其他玩家的埋葬牌。

## 运行命令

1. `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "殉葬品打出后应先强制埋一张，再允许把额外埋葬牌放到不同基地"`
2. `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "灵车队伍普通打出应可移动其他玩家的埋葬牌"`

## 结论等级

- **代表性玩法已验证**

## 关键截图与肉眼结论

### 1. 殉葬品：后续分支出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\殉葬品打出后应先强制埋一张，再允许把额外埋葬牌放到不同基地\grave-goods-followup-mode.png`
- 我实际看到：
  1. 画面中央明确出现 `殉葬品：你可以弃一张牌来额外埋葬一张牌，或挖掘一张你的埋葬牌`。
  2. 只在首埋完成后才出现两个后续按钮：`额外埋葬一张牌` / `挖掘一张埋葬牌`。
  3. 棋盘左侧基地下方已经能看到一张埋葬牌，说明不是跳过首埋直接进分支。
- 是否达到验收标准：
  - **达到。** 这张图直接证明了“先强制首埋，再进入后续分支”的修复口径。

### 2. 殉葬品：额外埋葬可去不同基地

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\殉葬品打出后应先强制埋一张，再允许把额外埋葬牌放到不同基地\grave-goods-resolved.png`
- 我实际看到：
  1. 左侧第一个基地下方有一张埋葬牌。
  2. 中间第二个基地下方也有一张埋葬牌。
  3. 后续交互已收口，画面回到可继续推进状态。
- 是否达到验收标准：
  - **达到。** 这张图与测试断言共同证明“额外埋葬”不再被锁死到首埋同一基地。

### 3. 灵车队伍：可选目标本体可见

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\灵车队伍普通打出应可移动其他玩家的埋葬牌\hearse-fleet-cards-prompt.png`
- 我实际看到：
  1. 画面顶部提示是 `灵车队伍：选择要移动的埋葬牌`。
  2. 左侧基地下方能直接看到一张埋葬牌卡面本体，不是空容器或纯文字提示。
  3. 这张牌在本用例里是其他玩家的埋葬牌，因此该提示图证明普通打出阶段已经把“非己方埋葬牌”列入候选。
- 是否达到验收标准：
  - **达到。** 这张图证明了普通打出候选已从“只有你的埋葬牌”放宽为“任意埋葬牌”。

### 4. 灵车队伍：搬运后收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\灵车队伍普通打出应可移动其他玩家的埋葬牌\hearse-fleet-resolved.png`
- 我实际看到：
  1. 左侧原来源基地下方已没有那张埋葬牌。
  2. 中间目标基地下方出现了一张埋葬牌。
  3. 交互已关闭，流程已经回到可继续推进状态。
- 是否达到验收标准：
  - **达到。** 这张图与状态断言共同证明普通打出成功搬运了其他玩家的埋葬牌。

## 状态断言补充

- `殉葬品`
  - 断言首张埋葬牌仍在基地 1。
  - 断言额外埋葬牌最终落在基地 2。
- `灵车队伍`
  - 断言 `enemy-buried-1` 从基地 1 消失。
  - 断言 `enemy-buried-1` 出现在基地 2。

## 残余范围

- 当前只补了 `Skeletons` 两条最关键的真实入口交互证据，不等于三派系整包已具备完整 L3 覆盖。
