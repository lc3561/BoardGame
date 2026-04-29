# SummonerWars 交互迁移复跑证据（2026-04-29）

## 范围

- 目标：复跑本轮重构后最容易受影响的三条真实链路，确认没有把“提示可见性”和“二段位置点击”打坏。
- 覆盖链路：
  - `grab_follow`
  - `frost_axe`
  - `structure_shift`

## 本轮执行

- `npm run typecheck`
- `npm run i18n:check`
- `npx vitest run src/games/summonerwars/__tests__/useGameEvents.test.ts src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts src/games/summonerwars/__tests__/entity-chain-integrity.test.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-grab-follow.e2e.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-choice-selection.e2e.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-structure-shift.e2e.ts`

## 验证结果

- `typecheck`：通过
- `i18n:check`：通过
- SummonerWars 定向 vitest：`207 passed`
- `grab_follow` E2E：通过
- `choice-selection` E2E：2 条用例通过
- `structure_shift` E2E：通过

## 截图与结论

### 1. `grab_follow` 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-prompt-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“抓附：选择跟随位置”，右侧存在“跳过”按钮。
  - 棋盘上出现两块绿色高亮候选格，不是静默自动执行。
  - 画面里能直接看到抓附手和目标区域本体，不是只拍到空棋盘或外围容器。
- 验收判断：
  - 达标。这张图证明 `grab_follow` 不只是“流程能点”，提示本体确实上屏。

### 2. `grab_follow` 处理后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-follow-position-resolved.png`
- 我实际看到：
  - 顶部已回到普通移动提示“移动最多3个单位，每个最多2格”，不再停留在抓附提示。
  - 左侧原本高亮候选格已消失，被抓附单位位置发生变化。
  - 右侧阶段条仍在移动阶段，可继续推进，没有残留遮罩或卡死横幅。
- 验收判断：
  - 达标。`grab_follow` 从提示出现到结果落地形成完整闭环。

### 3. `frost_axe` 的 after-move 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-choice-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“冰霜战斧：充能自身，或消耗充能附加友方士兵”。
  - 右侧同时存在“充能自身”和“跳过”按钮，说明这是效果选择态而不是普通移动阶段。
  - 棋盘上友方目标单位有黄色高亮边框，玩家能看到“附加到友方士兵”这条分支的落点提示。
- 验收判断：
  - 达标。`frost_axe` 的提示链路没有因为这轮收敛而丢失。

### 4. `frost_axe` 附加后的界面提示仍可见

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-icon-visible.png`
- 我实际看到：
  - 目标单位左下角出现新的黄色状态标记。
  - 顶部已经回到普通移动提示，说明效果选择态已收口。
  - 目标单位与状态标记同框可见，不是只靠日志或隐藏状态证明。
- 验收判断：
  - 达标。附加结果在玩家界面上有持续可见的提示锚点。

### 5. `frost_axe` 附加后的详情提示仍能出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-details-visible.png`
- 我实际看到：
  - 附加目标左下方存在一块额外的黄蓝色详情提示层，不只是单个图标。
  - 详情层与目标单位同区域出现，没有跑到棋盘无关区域。
  - 顶部仍保持普通移动提示，说明详情展示没有把流程重新锁回交互态。
- 验收判断：
  - 基本达标。当前图能看到详情提示层，但面积较小；若后续要做最终总验收，建议补一张更聚焦的局部图提升可复查性。

### 6. `structure_shift` owner prompt 仍然存在

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-owner-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“结构变换：选择3格内友方建筑”，右侧有“跳过”按钮。
  - 棋盘上能直接看到施术者、门和友方建筑本体，不是空提示。
  - 右侧仍处于移动阶段，符合 `after_move` 触发时机。
- 验收判断：
  - 达标。第一步 prompt 没被这轮重构打坏。

### 7. `structure_shift` 结果落地后流程能继续

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-after-move.png`
- 我实际看到：
  - 建筑已经移动到新的右侧位置，说明二段点击结果已真正落地。
  - 顶部横幅已回到普通移动提示，不再停留在结构变换提示。
  - 棋盘上没有残留方向选择浮层或未清理高亮。
- 验收判断：
  - 达标。二段点击后的收口没有回归。

## 本轮未完全补齐的证据缺口

- `structure_shift` 当前仍缺一张“第二步位置高亮已经出现”的专门截图；现有证据是“第一步 prompt 可见”直接跳到“结果已落地”。
- `withdraw / mind_capture / rapid_fire / fortress_power / fire_sacrifice_summon / life_drain` 仍缺真实成功 E2E 证据链，不能据此宣称 SummonerWars 交互迁移已全面验收。
- 英文 locale 下的真实提示截图仍缺；现阶段更多是中英双语断言，不是英文界面肉眼证据。

## 结论

- 本轮重构后的高风险回归面已复跑：
  - `grab_follow`：提示可见，选择后收口正常。
  - `frost_axe`：提示可见，附加后状态提示仍在。
  - `structure_shift`：第一步提示仍在，二段点击结果正常落地。
- 这说明本轮代码改动没有把已修好的核心链路重新打坏。
- 但从“全面验收”口径看，任务仍未结束，剩余 blockers 主要是缺失的真实 E2E 证据链，而不是今天这批代码本身再次失败。
