# SmashUp 线上反馈 69a2994f17d6c58872680809 修复验收

## 问题对象

- 反馈 ID：`69a2994f17d6c58872680809`
- 游戏：`smashup`
- 具体卡牌：`pirate_sea_dogs`（UI 文案显示为“水手”）
- 用户问题：使用后看不到前一步选中的种族，后续“选来源基地 / 选目标基地”阶段缺少可见的上下文提示

## 命令 -> 状态 -> UI 链路

1. 玩家通过 `su:play_action` / `PLAY_ACTION` 打出 `pirate_sea_dogs`。
2. `pirateSeaDogs()` 先创建 `pirate_sea_dogs_choose_faction` 交互，让玩家选择一个对手种族。
3. 选择种族后，handler 会把 `factionId` 写入 `continuationContext`，再继续创建 `pirate_sea_dogs_choose_from`。
4. 再选择来源基地后，继续创建 `pirate_sea_dogs_choose_to`。
5. 原实现里，第 3、4 步虽然已经持有真实的 `factionId`，但没有把这份状态投到后续交互 descriptor 的可见文案里，所以玩家进入第 2/3 步时看不到“我刚选的是哪个种族”。

## 根因

- 根因不是状态丢失。
- `continuationContext.factionId` 已经正确保存了前一步选择。
- 真正缺口在 `状态 -> UI`：后续交互没有把已选种族映射到 prompt / board 横幅可见文本，因此链路真实状态存在，但用户不可见。

## 修复点

### 代码修复

- 在 `src/games/smashup/abilities/pirates.ts` 和 `e2e/src/games/smashup/abilities/pirates.ts` 新增 `buildSeaDogsFactionSubtitle(factionId)`。
- 在创建 `pirate_sea_dogs_choose_from` 时，把 `subtitle` 设为 `已选种族：<派系名>`。
- 在创建 `pirate_sea_dogs_choose_to` 时，继续沿用同一份 `factionId` 生成 `subtitle`。

这次修复使用的是交互链里的真实状态，不是额外补一个临时本地 UI 变量，也不是只改测试态反馈。

### 回归测试

- 在 `src/games/smashup/__tests__/interactionChainE2E.test.ts` 与 `e2e/src/games/smashup/__tests__/interactionChainE2E.test.ts` 的 `pirate_sea_dogs（海狗）3步链` 用例中补断言：
  - 第二步交互 `subtitle === 已选种族：外星人`
  - 第三步交互 `subtitle === 已选种族：外星人`
- 在 `e2e/smashup/smashup-multistep-pirates.e2e.ts` 的现有 `pirate_sea_dogs` 用例里补真实链路验证：
  - 用真实命令 `su:play_action` 触发出牌
  - 第 2 步和第 3 步都断言页面可见 `已选种族：忍者`
  - 最终读取真实 core state，断言来源基地 `base0` 已没有对手随从，证明效果链实际执行完成

## 测试命令与结果

### 单元/交互链测试

命令：

```powershell
npm run test -- src/games/smashup/__tests__/interactionChainE2E.test.ts --runInBand --testNamePattern="pirate_sea_dogs（海狗）3步链|pirate_sea_dogs"
```

结果：

- 退出码：`0`
- `1 passed`
- `53 passed | 1 skipped`
- 备注：项目当前 `npm` 会提示 `--runInBand`、`--testNamePattern` 是未知 cli config，但测试实际已按目标文件执行并通过

### E2E 定向验证

命令：

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-multistep-pirates.e2e.ts "pirate_sea_dogs: 选派系 → 选来源基地 → 选目标基地 → 批量移动"
```

结果：

- 退出码：`0`
- `1 passed (36.1s)`

## 截图证据与肉眼结论

### 1. 第 2 步：选择来源基地

截图：

- `D:\gongzuo\webgame\BoardGame\evidence\smashup\assets\feedback-69a2994f17d6c58872680809\01-sea-dogs-choose-from-base.png`

我实际看到什么：

- 顶部交互横幅显示“选择来源基地（移动该派系所有对手随从）”。
- 横幅第二行明确显示“已选种族：忍者”。
- 中央已打出“水手”行动卡，说明这不是静态 mock 图，而是海盗 `pirate_sea_dogs` 的真实第 2 步。

是否达标：

- 达标。
- 这张图直接证明“选完种族后，进入下一步时玩家能看到自己刚选的种族”。

### 2. 第 3 步：选择目标基地

截图：

- `D:\gongzuo\webgame\BoardGame\evidence\smashup\assets\feedback-69a2994f17d6c58872680809\02-sea-dogs-choose-to-base.png`

我实际看到什么：

- 顶部交互横幅显示“选择目标基地”。
- 横幅第二行继续显示“已选种族：忍者”。
- 第 2 步进入第 3 步后，已选种族提示没有丢失，说明不是只在某一个阶段短暂显示。

是否达标：

- 达标。
- 这张图证明海狗三步链的后两步都能持续看到已选种族，用户不会在中途失去上下文。

### 3. 最终收口

截图：

- `D:\gongzuo\webgame\BoardGame\evidence\smashup\assets\feedback-69a2994f17d6c58872680809\03-sea-dogs-final.png`

我实际看到什么：

- 顶部交互横幅已经消失，没有继续卡在“选来源基地 / 选目标基地”状态。
- 页面右侧调试面板显示阶段为 `playCards`，交互链已经退出到主流程。
- 中央仍是这次打出的“水手”行动卡，说明截图来自真实出牌后的收口场景。

是否达标：

- 达标，但这张图主要证明“交互已收口”。
- “批量移动确实发生”不是只靠肉眼图判断，而是由同一条 E2E 用例中的真实状态断言证明：来源基地 `base0` 的对手随从数量变为 `0`。

## 结论

- 已定位具体卡牌：`pirate_sea_dogs（水手）`
- 已定位完整触发链：`PLAY_ACTION / su:play_action -> pirate_sea_dogs_choose_faction -> continuationContext.factionId -> pirate_sea_dogs_choose_from -> pirate_sea_dogs_choose_to -> UI subtitle`
- 根因明确：真实状态存在，但未投影到后续交互 UI
- 修复为最小实现：仅把真实 `factionId` 映射到后续交互 `subtitle`，不改卡牌规则语义
- 定向测试与 E2E 已通过，并保留截图证据

## 未覆盖风险

- 本次修复只覆盖 `pirate_sea_dogs` 这条反馈链路，没有顺手改动其它多步交互卡牌的提示文案。
- 若后续其它卡牌也存在“continuationContext 已存状态但未投到 UI”的问题，需要按具体链路逐条审计，不能据此推断整个项目都已修复。
