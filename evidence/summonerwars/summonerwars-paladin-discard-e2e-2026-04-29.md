# Summoner Wars 圣堂骑士弃牌技能 E2E 复跑证据（2026-04-29）

## 范围

- 测试文件：`e2e/summonerwars/summonerwars-paladin-discard.e2e.ts`
- 运行命令：`npm run test:e2e:ci -- e2e/summonerwars/summonerwars-paladin-discard.e2e.ts`
- 结果：6/6 通过

## 截图与观察

### 圣光箭：可以跳过弃牌直接攻击

- 触发截图：
  `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\圣光箭：可以跳过弃牌直接攻击\圣光箭：可以跳过弃牌直接攻击-holy-arrow-skip-owner-visible.png`
- 我实际看到：
  1. 房主视角已出现弃牌前交互，能看到 `确认弃牌` / `跳过` 两个按钮。
  2. 棋盘与手牌都在真实对局页面内，没有脱离业务链路的单独调试容器截图。
  3. 这张图证明了“圣光箭跳过分支”的触发入口已出现，达到入口验收标准。

- 收口截图：
  `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\圣光箭：可以跳过弃牌直接攻击\圣光箭：可以跳过弃牌直接攻击-holy-arrow-skip-after-closeout.png`
- 我实际看到：
  1. 弃牌交互按钮已经关闭，页面回到正常战场视图。
  2. 这张图对应“跳过后 UI 已收口”，与测试里的权威状态断言一起证明流程不是卡在中间态。
  3. 达到本轮“跳过弃牌后能继续正常攻击并收口”的验收标准。

### 城塞之力：攻击阶段选择弃牌堆城塞单位回手

- 触发截图：
  `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\城塞之力：攻击后从弃牌堆拿取城塞单位\城塞之力：攻击阶段选择弃牌堆城塞单位回手-fortress-power-card-selector-visible.png`
- 我实际看到：
  1. 弃牌堆取牌选择器已展开，目标城塞单位在真实选择器里可见。
  2. 这是能力触发后的真实选择界面，不是静态摆拍。
  3. 达到“能打开正确交互并展示目标卡”的验收标准。

- 收口截图：
  `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\城塞之力：攻击后从弃牌堆拿取城塞单位\城塞之力：攻击阶段选择弃牌堆城塞单位回手-fortress-power-retrieve-complete.png`
- 我实际看到：
  1. 取牌选择器已关闭，战场恢复到可继续推进的状态。
  2. 这张图对应测试里的权威状态断言，证明回手流程已结算完成。
  3. 达到本轮“交互已关闭且流程已收口”的验收标准。

## 结论

- 本轮 Paladin 弃牌技能整文件 E2E 已通过。
- `holy_arrow` 两条收口已改成权威状态断言，不再错误依赖不稳定的特写层可见性。
- `healing` 的“跳过弃牌正常攻击”改为未预设 `healingMode` 的真实前置态，已不再卡在无效敌方目标链路。
