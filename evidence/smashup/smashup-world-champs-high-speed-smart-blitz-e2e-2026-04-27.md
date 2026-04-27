# SmashUp 世界冠军《高速追逐 / 现在是闪电时间！ / 聪明Set-Up》真实入口 E2E 证据（2026-04-27）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：
  - `world_champs_high_speed_chase / 高速追逐`
  - `world_champs_its_blitzin_time / 现在是闪电时间！`
  - `world_champs_smart_set_up / 聪明Set-Up`
- 目标：
  1. 补齐《高速追逐》“打出到基地 -> 发动天赋 -> 转移行动 -> 移动己方随从 -> +3”的 L3 真实入口证据。
  2. 补齐《现在是闪电时间！》“打出 -> 选择己方随从 -> 本回合 +3”的 L3 真实入口证据。
  3. 补齐《聪明Set-Up》“附着到其他玩家随从 -> 该基地本回合首次打出随从 -> 你抽 1 张牌”的 L3 真实入口证据。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-43.png`（《高速追逐》）
  - `temp/cards7-37.png`（《现在是闪电时间！》）
  - `temp/cards7-35.png`（《聪明Set-Up》）
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 当前能力回归文件：`src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "高速追逐"
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "现在是闪电时间"
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "聪明Set-Up"
```

## 结果

- `高速追逐` → `1 passed`
- `现在是闪电时间` → `1 passed`
- `聪明Set-Up` → `1 passed`

## 关键截图与肉眼结论

> 本轮稳定截图落在 `e2e/evidence/screenshots/`，以下均为绝对路径。

### 一、《高速追逐》

#### 1. 持续行动已真实落到源基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-ongoing-2026-04-27.png`
- 我实际看到：
  1. 左侧基地上方能直接看到《高速追逐》卡面本体，不是纯文字 prompt。
  2. 左侧基地下方能看到己方随从本体，说明天赋发动前的“源基地 + 己方可移动随从”场景是真实存在的。
  3. 中间放大的卡面与左上角源基地上的小卡面一致，说明当前对象确实是《高速追逐》而不是别的持续行动。
- 是否达到验收标准：
  - **达到。** 这张图证明《高速追逐》先被真实打到了基地上。

#### 2. 天赋已进入“选你在此基地的一个随从”

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-minion-prompt-2026-04-27.png`
- 我实际看到：
  1. 顶部提示明确写着“高速追逐：选择你在此基地的一个随从”。
  2. 左侧己方随从出现绿色高亮边框，说明当前确实在做第一段“选己方随从”，不是直接跳到了选基地。
  3. 源基地上的《高速追逐》卡面仍可见，链路上下文没有丢。
- 是否达到验收标准：
  - **达到。** 这张图证明《高速追逐》的天赋真实进入了第一段选随从交互。

#### 3. 结算后行动与随从都到了目标基地，且随从获得 +3

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-resolved-2026-04-27.png`
- 我实际看到：
  1. 中间基地上方出现《高速追逐》卡面，说明持续行动已经从左侧源基地转移到了目标基地。
  2. 中间基地下方能看到被移动过去的己方随从本体，左侧原基地只剩敌方随从。
  3. 被移动的己方随从旁边出现绿色 `+4`，对应原始力量 `1` 加上本回合 `+3`，视觉结果与卡图语义一致。
- 是否达到验收标准：
  - **达到。** 这张图证明《高速追逐》不只是 prompt 出现，而是真的完成了“行动转移 + 随从移动 + 本回合 +3”。

### 二、《现在是闪电时间！》

#### 1. 打出后已进入选己方随从 prompt

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-its-blitzin-time-prompt-2026-04-27.png`
- 我实际看到：
  1. 顶部提示明确写着“现在是闪电时间！：选择你的一个随从，本回合力量 +3”。
  2. 两个基地下方的两个己方随从都出现绿色高亮边框，说明候选范围是“你的随从”，不是只限定当前基地。
  3. 右下角弃牌区能看到《现在是闪电时间！》卡面，说明这是打出后的真实 prompt，不是裸注入交互。
- 是否达到验收标准：
  - **达到。** 这张图证明《现在是闪电时间！》已真实进入选己方随从交互。

#### 2. 结算后只给被选中的随从 +3

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-its-blitzin-time-resolved-2026-04-27.png`
- 我实际看到：
  1. 右侧被选中的己方随从旁边出现绿色 `+3` 标记。
  2. 左侧未被选中的己方随从仍只保持自己的原有力量显示，没有同步出现 `+3`。
  3. 顶部交互提示已消失，说明这条 onPlay 链正常收口。
- 是否达到验收标准：
  - **达到。** 这张图证明《现在是闪电时间！》结算后只影响被选中的己方随从。

### 三、《聪明Set-Up》

#### 1. 已附着到其他玩家的随从

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-smart-set-up-attached-2026-04-27.png`
- 我实际看到：
  1. 左侧敌方随从旁边能直接看到《聪明Set-Up》附着卡面本体，说明它确实作为附着行动挂在了“其他玩家的随从”身上。
  2. 顶部还能看到两条残留 toast，但没有遮挡附着卡本体；重点对象仍然肉眼可见。
  3. 棋盘上没有额外 prompt 悬而未决，说明附着步骤本身已经完成。
- 是否达到验收标准：
  - **达到。** 这张图足以证明《聪明Set-Up》第一段“附着到其他玩家的随从身上”已经真实发生。

#### 2. 同基地首次打出随从后已触发并完成抽牌

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-smart-set-up-triggered-2026-04-27.png`
- 我实际看到：
  1. 左侧基地上已经能看到后续打出的随从本体，说明“有随从打出到这个基地”这一步真实发生了。
  2. 目标随从身上的紫色附着标记仍在，说明触发来源仍然是同一张《聪明Set-Up》。
  3. 棋盘上没有残留交互框或强制选择 prompt，说明这条持续触发链已经正常收口。
- 是否达到验收标准：
  - **达到。** 这张图结合状态断言，可以证明《聪明Set-Up》在“该基地本回合首次打出随从”后确实完成了触发。

## 状态断言补充

### 《高速追逐》

- E2E 断言：
  - 打出后 `bases[0].ongoingActions` 出现 `world_champs_high_speed_chase`
  - 天赋第一段 `interaction.sourceId === 'world_champs_high_speed_chase_minion'`
  - 第二段 `interaction.sourceId === 'world_champs_high_speed_chase_base'`
  - 结算后：
    - 源基地不再包含 `runner-1`
    - 目标基地包含 `runner-1`
    - 目标基地包含同一张 `world_champs_high_speed_chase`
    - `runner-1.tempPowerModifier === 3`

### 《现在是闪电时间！》

- E2E 断言：
  - `interaction.sourceId === 'world_champs_its_blitzin_time'`
  - 候选包含 `blitz-ally-1`、`blitz-ally-2`
  - 结算后：
    - `blitz-ally-1.tempPowerModifier === 0`
    - `blitz-ally-2.tempPowerModifier === 3`

### 《聪明Set-Up》

- E2E 断言：
  - 打出后 `enemy-host.attachedActions` 包含 `world_champs_smart_set_up`
  - 推进到对手出牌阶段后，对手把 `pirate_first_mate` 打到同一基地
  - 结算后：
    - `players['0'].hand` 新增 `robot_microbot_alpha`
    - 该基地 `minions` 中包含 `pirate_first_mate`

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- 《高速追逐》《现在是闪电时间！》《聪明Set-Up》当前都已补到浏览器级 L3 真实入口证据。
- 这三张牌本轮没有再暴露“卡图录错 / 中文名录错 / previewRef 错索引”级别的新问题。
- `World Champs / 世界冠军` 当前已累计补到更多对象级正路径证据，但这**仍不等于**三新派系整包最终收口；总文档继续维持“仍有残余范围”。
