# SmashUp 线上反馈 69a6eac7b832e79689a366dc 修复验收

## 问题对象

- 反馈 ID：`69a6eac7b832e79689a366dc`
- 游戏：`smashup`
- 涉及卡牌：
  - `pirate_broadside`（侧翼开炮）
  - `pirate_saucy_wench`（粗鲁少妇）
- 用户问题：
  - 海盗消灭效果有 bug，`Broadside` 只能消灭自己
  - `Saucy Wench` 打出后无法正常触发“消灭力量 2 以下随从”

## 命令 -> 技能 -> 交互链定位

### 1. `pirate_broadside`

链路：

1. `PLAY_ACTION / su:play_action`
2. `pirateBroadside(ctx)` in `src/games/smashup/abilities/pirates.ts`
3. 创建 `pirate_broadside_choose_base`
4. `pirateBroadsideChooseBaseHandler`
5. 创建 `pirate_broadside_choose_player`
6. `pirateBroadsideChoosePlayerHandler`
7. 只对被选中的 `targetPlayerId` 执行 `destroyMinion(...)`

根因：

- 旧链路把 `Broadside` 做成了单步“基地 + 玩家”混合选择，真实语义不够贴近卡面，也容易把目标玩家维度压扁。
- 当前工作树里的最小源修复已经把它拆成“先选你有随从的基地，再选该基地上的一个玩家”两步交互：
  - `collectPirateBroadsideTargetPlayers`
  - `pirateBroadsideChooseBaseHandler`
  - `pirateBroadsideChoosePlayerHandler`
- 这样第二步的 `targetPlayerId` 是明确的，`destroyMinion` 只会清掉该玩家在该基地上力量 `<= 2` 的随从，不再误退化成“只能打自己”。

### 2. `pirate_saucy_wench`

链路：

1. `PLAY_MINION`
2. `pirateSaucyWench(ctx)` in `src/games/smashup/abilities/pirates.ts`
3. 创建 `sourceId = pirate_saucy_wench`、`targetType = minion` 的 simple-choice
4. `registerPirateInteractionHandlers()` 里的 `pirate_saucy_wench` handler
5. 对所选 `minionUid` 执行 `destroyMinion(...)`

结论：

- `Saucy Wench` 的规则实现链并没有缺 handler。
- 这次需要补的是回归测试和真实页面验证，证明“打出后交互确实会出现，且能消灭本基地力量 <= 2 的随从”。

## 最小修复与本轮改动

### 规则侧最小修复

- `Broadside` 的源修复位于 `src/games/smashup/abilities/pirates.ts`
- 当前工作树现状是把旧的单步目标选择改成：
  - `pirate_broadside_choose_base`
  - `pirate_broadside_choose_player`
- 这是本次反馈对应的最小规则修复，不改其它海盗卡的语义

### 本轮补的回归与验证

- `src/games/smashup/__tests__/pirate-broadside-self-target.test.ts`
- `e2e/src/games/smashup/__tests__/pirate-broadside-self-target.test.ts`
  - 补强 `Broadside`：
    - 先选基地，再选自己，确认只消灭自己的弱随从
    - 先选基地，再选对手，确认只消灭对手的弱随从
  - 新增 `Saucy Wench`：
    - 打出后会创建交互
    - 选择目标后会消灭本基地力量 `<= 2` 的随从

- `e2e/smashup/smashup-multistep-pirates.e2e.ts`
  - 新增 `Broadside` 定向 E2E
  - 新增 `Saucy Wench` 定向 E2E
  - `Broadside` 先真实看到“选择一个你有随从的基地”UI，再通过 interaction optionId 推进到第二步玩家选择
  - `Saucy Wench` 先真实看到“你可以消灭本基地一个力量≤2的随从”UI，再通过 interaction optionId 选择目标

- `e2e/smashup/smashup-debug-helpers.ts`
  - 把基地点击 helper 改为直接命中 `data-testid="base-zone-{index}"`，减少旧 class selector 对 BaseZone 结构的猜测

## 测试命令与结果

### 单测

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/pirate-broadside-self-target.test.ts --configLoader native --maxWorkers 1
```

结果：

- 退出码：`0`
- `5 passed`

### E2E - Broadside

命令：

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-multistep-pirates.e2e.ts "pirate_broadside: 可选对手并只消灭对手弱随从"
```

结果：

- 退出码：`0`
- `1 passed (34.5s)`

### E2E - Saucy Wench

命令：

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-multistep-pirates.e2e.ts "pirate_saucy_wench: 打出后会触发并消灭本基地弱随从"
```

结果：

- 退出码：`0`
- `1 passed (32.3s)`

## 截图证据与肉眼结论

### 1. Broadside 第一步：基地选择确实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a6eac7-broadside-choose-base.png`
- 我实际看到什么：
  - 顶部横幅明确写着“选择一个你有随从的基地”
  - 左侧 `436-1337工厂` 有明显绿色高亮边框，说明该基地被识别为合法目标
  - 同一基地上肉眼能看到我方 `大副`、`粗鲁少妇`，以及对手两张弱随从，场景与反馈需要的目标分布一致
- 是否达到验收标准：
  - 达到“第一步交互已触发”的标准
  - 这张图证明 `Broadside` 已进入正确的两步交互链，而不是停留在旧的单步错误语义

### 2. Broadside 第二步：玩家选择确实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a6eac7-broadside-choose-player.png`
- 我实际看到什么：
  - 中央按钮面板写着“选择该基地上的一个玩家，消灭其所有力量≤2的随从”
  - 面板里同时存在“你自己（1个弱随从）”和“对手二（2个弱随从）”两个按钮
  - 这直接证明系统已经把目标玩家分开，不再只有“自己”一个可打对象
- 是否达到验收标准：
  - 达到
  - 这张图直接对应用户反馈“只能消灭自己”的问题点，现已能看到对手选项

### 3. Broadside 收口：只清掉对手弱随从

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a6eac7-broadside-after-resolve.png`
- 我实际看到什么：
  - 左侧基地总力量从 `8` 变成 `5`
  - 基地下方只剩我方随从区域，右侧对手随从区已经清空
  - 顶部玩家选择按钮和横幅都已消失，流程已经回到正常出牌页
- 是否达到验收标准：
  - 达到
  - 这张图结合同一条 E2E 的最终状态断言，证明本次选择“对手”后，被消灭的是对手弱随从，不是己方随从

### 4. Saucy Wench：打出后交互确实触发

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a6eac7-saucy-prompt.png`
- 我实际看到什么：
  - 顶部横幅明确写着“你可以消灭本基地一个力量≤2的随从”
  - 基地上我方新打出的 `粗鲁少妇` 已经在左侧落地
  - 对手的 `影舞者` 被高亮为可选目标，底部同时有“跳过（不消灭随从）”按钮
- 是否达到验收标准：
  - 达到
  - 这张图直接证明 `Saucy Wench` 的 onPlay 交互会出现，不再是“无法触发”

### 5. Saucy Wench 收口：弱随从被消灭且自己留场

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a6eac7-saucy-after-resolve.png`
- 我实际看到什么：
  - 基地总力量从 `8` 变成 `6`
  - 画面上仍能看到我方 `粗鲁少妇` 留在基地
  - 对手那张力量 `2` 的随从已经不在基地上，交互横幅也已消失
- 是否达到验收标准：
  - 达到
  - 这张图证明 `Saucy Wench` 不只是“弹窗出现”，而是真的执行了消灭弱随从的效果

## 结论

- 已定位具体卡牌与技能链：
  - `pirate_broadside`: `PLAY_ACTION -> pirate_broadside_choose_base -> pirate_broadside_choose_player -> destroyMinion`
  - `pirate_saucy_wench`: `PLAY_MINION -> pirate_saucy_wench(simple-choice) -> handler -> destroyMinion`
- `Broadside` 的根因是旧单步目标语义不稳，当前工作树的最小规则修复已经改为“基地 -> 玩家”两步链
- `Saucy Wench` 的规则链本身存在，本轮验证证明它确实会触发并执行
- 结合单测、E2E 和截图证据，这条反馈可以标记为 `resolved`

## 剩余风险

- Broadside / Saucy 的第一步棋盘直点在这次 E2E 里是“先看到真实 prompt，再用 interaction optionId 推进”，没有完全依赖鼠标命中 `BaseZone`
- 这不影响本次反馈要验证的规则语义：
  - prompt 本体已真实出现
  - Broadside 第二步玩家选择走了真实 UI
  - 最终销毁结果走了真实状态断言
- 如果后续要单独收口“移动端/桌面端点击高亮基地或高亮随从的自动化稳定性”，应另开一条 UI 输入层问题排查，而不是混入这条海盗规则反馈
