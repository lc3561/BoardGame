# SmashUp 世界冠军 金币猫 / 鲨鱼纹身 真实入口 E2E 证据（2026-04-26）

## 范围

- 对象：
  - `world_champs_calicoin / 金币猫`
  - `world_champs_shark_tattoo / 鲨鱼纹身`
- 目标：
  - 补齐《金币猫》“打出 -> 选择这里的其他随从 -> 放置 +1 指示物”的 L3 证据
  - 补齐《鲨鱼纹身》“打出附着 -> 立即放 1 个 +1 -> 下个自己回合开始再放 1 个 +1”的 L3 证据
  - 记录《鲨鱼纹身》本轮发现并修复的运行时根因：`startTurn` 流程把同一 `POWER_COUNTER_ADDED` 事件减到 core 两次

## 权威来源

- 卡图标题切片：
  - `temp/cards7-title-26.png`
  - `temp/cards7-title-36.png`
- 卡图正文切片：
  - `temp/cards7-26.png`
  - `temp/cards7-36.png`
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 当前能力回归文件：`src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "金币猫打出后应可选择这里的其他随从"
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "鲨鱼纹身打出后应附着到己方随从并在下个自己回合开始时再放一个"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts -t "world_champs_calicoin|world_champs_shark_tattoo" --configLoader native --maxWorkers 1
```

## 结果

- E2E：
  - `金币猫...` → `1 passed`
  - `鲨鱼纹身...` → `1 passed`
- 定向单测：
  - `world_champs_calicoin|world_champs_shark_tattoo` → `4 passed`

## 根因修订（鲨鱼纹身）

- 本轮不是数据录入错误。
- 真正根因是：`src/games/smashup/domain/index.ts` 的 `onPhaseEnter(startTurn)` / `onPhaseExit(endTurn)` 把**已经按事件 reduce 过的 core**夹带进 `updatedState` 返回，随后引擎又会把同一批返回事件再 reduce 一遍。
- 对《鲨鱼纹身》这种“回合开始时放 1 个 +1 指示物”的效果，这会把同一条 `POWER_COUNTER_ADDED` 事件算两次，表现为：
  - 事件流里只看到 `1` 条 `POWER_COUNTER_ADDED`
  - 最终力量指示物却从 `1` 直接跳到 `3`
- 当前修复：新增 `keepSysUpdatesOnly(...)`，只把 flow hook 里真正需要保留的 `sys` 变更带回引擎，不再把已预先 reduce 的 core 带回去双算。

## 关键截图

### 一、《金币猫》

1. 选择提示出现
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\金币猫打出后应可选择这里的其他随从并放置-+1-指示物\calicoin-prompt-visible.png`
   - 肉眼观察：
     - 左侧基地里能看到《金币猫》本体，说明是“真实打出后触发”，不是直接造 prompt。
     - 顶部提示文案明确写着“选择一个其他随从放置 1 个 +1 力量指示物”。
     - 同基地两张候选随从都在画面里：一张己方，一张敌方；这和卡图“这里的一个其他仆从”一致，不是被错误收窄成“只限己方”。

2. 选择敌方其他随从后结算
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\金币猫打出后应可选择这里的其他随从并放置-+1-指示物\calicoin-resolved-enemy-countered.png`
   - 肉眼观察：
     - 交互提示已关闭，说明链路正常收口，没有卡死在等待态。
     - 右侧那张被选中的敌方随从头上出现橙色 `+1` 与力量变化，己方原目标没有一起误加。
     - 《金币猫》仍留在同基地，证明这里结算的是它的 onPlay 效果，而不是串成别的牌。

### 二、《鲨鱼纹身》

1. 初次附着后
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鲨鱼纹身打出后应附着到己方随从并在下个自己回合开始时再放一个-+1-指示物\shark-tattoo-attached-initial.png`
   - 肉眼观察：
     - 左侧基地可见宿主随从本体，以及右侧紧贴显示的《鲨鱼纹身》附着卡面。
     - 宿主当前总力量显示为 `2`，对应基础力量 `1` + 当次打出获得的 `1` 个指示物。
     - 顶部还能看到 3 条相同“请选择一个随从来附着此卡”提示条；这说明当前截图里仍有额外提示残留，但它没有遮住宿主与附着关系，也没有阻断本轮效果验证。

2. 下个自己回合开始后
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鲨鱼纹身打出后应附着到己方随从并在下个自己回合开始时再放一个-+1-指示物\shark-tattoo-next-turn-counter-added.png`
   - 肉眼观察：
     - 回合角标已变为“回合 2 / 你自己 / 出牌阶段”，说明确实跨到了下个自己回合，而不是还停在同回合。
     - 宿主总力量显示为 `3`，对应基础力量 `1` + 两个 `+1` 指示物；没有再错误跳到 `4`。
     - 《鲨鱼纹身》仍然附着在同一宿主上，证明这张牌没有在回合切换时脱落或串线到别的目标。

## 状态断言

### 《金币猫》

- E2E 断言：
  - `interaction.sourceId === 'world_champs_calicoin'`
  - 候选 `minionUid` 同时包含 `ally-target / enemy-target`
  - 结算后：
    - 《金币猫》已在场
    - `ally-target.powerCounters === 0`
    - `enemy-target.powerCounters === 1`

### 《鲨鱼纹身》

- 单测断言：
  - 打出附着后宿主 `powerCounters === 1`
  - 下个自己回合开始时仅新增 `1` 条 `POWER_COUNTER_ADDED`
  - 最终宿主 `powerCounters === 2`
  - 若该基地还有你的另一张随从，则不再额外加指示物
- E2E 断言：
  - 初次打出后能找到附着中的 `world_champs_shark_tattoo`
  - 回合轮转到下个自己回合后，宿主 `powerCounters === 2`

## 结论等级

- **代表性玩法已验证**

## 残余观察

- 《鲨鱼纹身》两张截图里顶部仍能看到重复的“请选择一个随从来附着此卡”提示条；这不是本轮对象级效果错误的根因，也没有阻断附着与加指示物链路，但它属于额外 UI 观察项，当前**不把它写成“整体 UI 已完全收口”**。

