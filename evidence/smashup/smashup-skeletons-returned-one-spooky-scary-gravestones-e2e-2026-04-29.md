# Smash Up 骷髅《轮回者 / 诡异。可怕。 / 墓碑》真实入口 E2E 证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：
  - `skeletons_returned_one / 轮回者`
  - `skeletons_spooky_scary / 诡异。可怕。`
  - `skeletons_gravestones / 墓碑`
- 本轮目标：
  1. 把这 3 张牌补到浏览器级真实入口；
  2. 回写本轮发现的两类低级错误：`轮回者` 的旧测试错误假设，以及《墓碑》旧场景没满足计分阈值。

## 本轮修正

- 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 修正点：
  1. `轮回者` 旧用例把“自埋后直接无交互”当成固定事实；实际真实链路先进入 `smashup_reaction_choose`，再由《轮回者》收口。
  2. `墓碑` 旧在线场景同样没有把《绿洲丛林》推到 `12` 点计分阈值；本轮改成真实卡面强度组合 `dino_king_rex (7) + dino_war_raptor (4) + robot_microbot_alpha (1)`。
  3. 《诡异。可怕。》本轮没有实现修复，主要是新增真实入口补证。

## 运行命令

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "轮回者打出后应可把自己埋葬到这里"

$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
$env:NODE_OPTIONS='--max-old-space-size=4096'
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "诡异。可怕。应从弃牌堆埋葬低力量随从并抽一张牌"

$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
$env:NODE_OPTIONS='--max-old-space-size=4096'
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "墓碑应在基地计分后可把自己埋葬到另一个基地"
```

## 结果

- `轮回者` E2E：`1 passed`
- `诡异。可怕。` E2E：`1 passed`
- `墓碑` E2E：`1 passed`

## 关键截图与肉眼结论

### 一、《轮回者》

#### 1. 自埋后真实进入反应窗，而不是直接静默收口

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-returned-one-reaction-prompt-2026-04-29.png`
- 我实际看到：
  1. 画面中央明确出现 `选择一个反应动作`。
  2. 按钮只有 `轮回者 / 让过` 两个，说明这一步确实是 reaction session，而不是普通埋葬 prompt。
  3. 基地上已经看不到刚打出的《轮回者》随从本体，只剩基地下方一张背面埋葬牌。
- 是否达到验收标准：
  - **达到。** 这张图直接否掉了旧“自埋后立刻无交互”的错误假设，证明真实浏览器链路里确实存在额外反应窗。

#### 2. 收口后《轮回者》已埋到基地下方

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-returned-one-buried-resolved-2026-04-29.png`
- 我实际看到：
  1. 左侧基地下方保留 1 张背面埋葬牌。
  2. 场上没有《轮回者》随从本体残留。
  3. 中央不再有反应窗，流程已回到可继续推进状态。
- 是否达到验收标准：
  - **达到。** 这张图配合状态断言证明《轮回者》已从场上离开并埋到这里。

### 二、《诡异。可怕。》

#### 1. 真实进入“选择力量 3 或以下随从”的弃牌堆候选

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-spooky-scary-card-prompt-2026-04-29.png`
- 我实际看到：
  1. 中央直接出现《微型机阿尔法号》卡图本体，不是纯按钮文字。
  2. 顶部提示条明确写着《诡异。可怕。》要选择一张力量 `3` 或以下随从。
  3. 右下弃牌堆里能看到《诡异。可怕。》自身已进入弃牌区，说明当前是在真实打出后的后续交互。
- 是否达到验收标准：
  - **达到。** 这张图证明候选来自真实弃牌堆，且限制条件是“力量 3 或以下随从”。

#### 2. 结算后，低力量随从已埋葬且已抽 1 张

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-spooky-scary-resolved-2026-04-29.png`
- 我实际看到：
  1. 右下手牌区能直接看到新抽到的《微型机档案号》本体。
  2. 中间基地下方保留 1 张背面埋葬牌，说明弃牌堆里的低力量随从已经被埋进基地。
  3. 右下弃牌堆里仍能看到《诡异。可怕。》行动牌本体，说明打出的行动牌正常进入弃牌堆，没有误回手。
- 是否达到验收标准：
  - **达到。** 这张图证明《诡异。可怕。》完成了“埋葬 1 张低力量随从 + 抽 1 张”的整条链路。

### 三、《墓碑》

#### 1. 计分后真实进入《墓碑》迁移提示

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-gravestones-after-scoring-prompt-2026-04-29.png`
- 我实际看到：
  1. 左侧《绿洲丛林》已灰掉，角标显示 `15 / 12`，说明基地确实进入了计分链路。
  2. 左上能直接看到《墓碑》行动牌本体挂在原基地附近。
  3. 中间与右侧基地出现绿色高亮，顶部提示条要求选择把《墓碑》埋到哪一个基地。
- 是否达到验收标准：
  - **达到。** 这张图证明《墓碑》是在真实计分后进入“把自己埋到另一个基地”的交互。

#### 2. 结算后，《墓碑》已不在原基地，并作为埋葬牌转移成功

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-gravestones-buried-2026-04-29.png`
- 我实际看到：
  1. 左侧原基地已经翻成新的《436-1337工厂》。
  2. 原基地只剩三张随从本体，不再保留《墓碑》这张持续行动。
  3. 中央基地下方出现 1 张背面埋葬牌，表示《墓碑》已经作为埋葬牌转移到目标基地。
- 是否达到验收标准：
  - **达到。** 这张图配合状态断言证明《墓碑》确实完成了“计分后埋到另一个基地”。

## 状态断言补充

### 《轮回者》

- `finalState.core.bases[0].buriedCards` 中存在 `skeletons_returned_one`
- `finalState.core.bases[0].minions` 中不存在 `skeletons_returned_one`

### 《诡异。可怕。》

- `finalState.core.bases[1].buriedCards` 中存在 `robot_microbot_alpha`
- `finalState.core.players['0'].hand` 中存在 `robot_microbot_archive`
- `finalState.core.players['0'].discard` 中不存在 `robot_microbot_alpha`

### 《墓碑》

- `resolvedCore.bases[1].buriedCards` 中存在 `gravestones-live`
- `resolvedCore.bases[0].ongoingActions` 中不存在 `gravestones-live`

## 结论

- 《轮回者》当前已补齐一条关键 L3，并纠正了旧测试对 `reaction session` 的错误假设。
- 《诡异。可怕。》当前已补齐一条浏览器级正路径 L3：`打出 -> 选基地 -> 选弃牌堆低力量随从 -> 埋葬 -> 抽 1`
- 《墓碑》当前已补齐一条浏览器级 L3：`计分 -> 选择目标基地 -> 把自己埋到另一个基地`
- `Skeletons` 整派系和三新派系整包仍然 **未收口**，这里只是新增对象级真实入口证据与测试场景修订记录。
