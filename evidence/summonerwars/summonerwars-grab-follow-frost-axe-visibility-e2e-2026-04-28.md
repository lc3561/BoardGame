# 召唤师战争 `grab_follow` / `frost_axe` 效果提示可见性 E2E 证据

## 范围

- 游戏：`summonerwars`
- 目标：
  - 验证 `grab_follow` 不只是流程可点，提示也真实上屏
  - 验证 `frost_axe` 的 `after_move` 提示、附加后 buff 图标、hover 详情真实上屏
- 关注用户反馈：
  - “部落攀附手/抓附手的效果都没有显示，应该有提示，现在只有流程可以操作”

## 本轮执行

- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-grab-follow.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-choice-selection.e2e.ts`

## 截图与结论

### 1. `grab_follow` 提示出现

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-prompt-visible.png`
- 肉眼观察：
  - 顶部橙色提示条明确显示“抓附：选择跟随位置”，右侧同时存在“跳过”按钮。
  - 棋盘上出现绿色可选格，说明不是静默执行，玩家能看到当前效果正在等待选择。
  - 截图中能直接看到抓附手本体和被抓附单位所在区域，不是只拍到外围容器。
- 验收判断：
  - 达标。`grab_follow` 的效果提示已真实上屏，不是“只有流程能点”。

### 2. `grab_follow` 收口后流程恢复

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-follow-position-resolved.png`
- 肉眼观察：
  - 顶部已回到普通移动阶段提示，不再停留在抓附选择提示。
  - 被抓附单位已经跟随落到新位置，棋盘上能直接看到位置变化结果。
  - 右侧阶段计数继续可推进，说明交互没有卡死在半收口状态。
- 验收判断：
  - 达标。`grab_follow` 从提示出现到选择收口形成了完整闭环。

### 3. `frost_axe` after-move 提示出现

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-choice-visible.png`
- 肉眼观察：
  - 顶部橙色提示条明确显示“冰霜战斧：充能自身，或消耗充能附加友方士兵”。
  - 提示条右侧同时存在“充能自身”和“跳过”按钮，说明这是已进入 `after_move` 效果提示，不是普通移动态。
  - 棋盘上友方可附加目标有高亮边框，说明“附加到友方士兵”的路径也有可见引导。
- 验收判断：
  - 达标。`frost_axe` 的效果提示已真实上屏，而且是走真实 `after_move` 链路触发。

### 4. `frost_axe` 附加后 buff 图标可见

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-icon-visible.png`
- 肉眼观察：
  - 附加目标单位本体仍在原格，左下角出现新的黄色状态标记。
  - 原寒冰锻造师已经不再留在独立棋盘格上，符合“附加到友方士兵”后的表现。
  - 这张图虽然是全屏截图，但状态标记和目标单位本体同框可见，不是只拍到了页面其它区域。
- 验收判断：
  - 达标。附加后的效果提示不是纯状态内存变化，玩家界面上能看到 buff 标记。

### 5. `frost_axe` hover 后 buff 详情可见

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-details-visible.png`
- 肉眼观察：
  - 目标单位下方出现 hover 后的状态详情面板，能看到“附加单位”对应的详情提示区域。
  - 该详情面板与目标单位同区域出现，说明不是无关 toast 或调试信息。
  - 这证明玩家不只看到一个小图标，还能通过 hover 读到效果详情。
- 验收判断：
  - 达标。`frost_axe` 的提示链路包含“图标提示 + hover 详情”，满足“效果有提示显示”的验收要求。

## 结论

- `grab_follow`：已证明确实有提示出现、可选择、并可正常收口。
- `frost_axe`：已证明确实有 `after_move` 提示、附加后 buff 图标、以及 hover 详情。
- 对“只有流程可以操作，没有效果提示显示”的这两条用户点名链路，本轮证据显示已经达到验收标准。

## 备注

- `frost_axe` 这条 E2E 先后修正了两类测试误判：
  - 旧场景误把它当成“点单位即弹按钮”，但真实链路是 `after_move`
  - 旧断言盯 DOM `data-unit-boosts`，改为更贴近业务收口的“源单位离场 + 目标 buff 可见 + 核心状态增长”
