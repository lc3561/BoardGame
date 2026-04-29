# SmashUp 反馈 69e94b6bddc2605b331ece7b 处置记录（2026-04-23）

- 反馈 ID：`69e94b6bddc2605b331ece7b`
- 标题：`奇怪的爆分`
- 游戏：`smashup`
- 结论分类：`文案/表现问题`，不是规则错误，也不是计分实现错误。

## 根因判定

`过度生长（killer_plant_overgrowth）` 的规则与实现一致：
- 牌面规则：`自你的回合开始时，将本基地的爆破点降低到0点。`
- 当前实现：在控制者回合开始时发出 `BREAKPOINT_MODIFIED`，`delta = -base.breakpoint`，于是有效爆分线变为 `0`。

用户感知成“奇怪的爆分”，主要是旧 action log 文案把这件事显示成了：
- `神秘花园 爆分线-21 （原因：过度生长）`

这条日志只展示“变化量 -21”，没有明确说“目标是降到 0”，很容易被理解成系统把基地爆分线算坏了，或出现了异常爆分。

## 最小复现

1. 选择 `神秘花园（base_mystic_garden，爆分线 21）`。
2. 在该基地打出 `过度生长（killer_plant_overgrowth）`。
3. 保证该基地仍有任意随从留场。
4. 到该战术拥有者的回合开始时：
   - 规则正常触发，基地有效爆分线会从 `21` 变成 `0`；
   - 基地因此立即满足计分条件；
   - 旧日志会显示 `神秘花园 爆分线-21`，造成“爆分异常”的误读。

## 修复点

把 `过度生长` 触发出的 `BREAKPOINT_MODIFIED` action log 改成专用文案：
- 旧文案：`{{base}} 爆分线{{delta}}`
- 新文案：`{{base}} 爆分线降至0（{{delta}}）`

这样仍保留数值变化量，但明确告诉玩家这是“降到 0”的规则效果，不是引擎把爆分线炸成了负数。

## 回归测试

在现有测试文件补回归：
- `actionLogFormat.test.ts` 新增 `过度生长的 BREAKPOINT_MODIFIED 使用“降至0”文案`
- 断言点：
  - 使用新 i18n key：`actionLog.breakpointReducedToZero`
  - 保留 `delta = -21`
  - 仍保留原因卡牌 `killer_plant_overgrowth`

## 验证结果

已执行：

```powershell
npm run i18n:check
npm test -- src/games/smashup/__tests__/actionLogFormat.test.ts
git diff --no-index -- src/games/smashup/actionLog.ts e2e/src/games/smashup/actionLog.ts
git diff --no-index -- src/games/smashup/__tests__/actionLogFormat.test.ts e2e/src/games/smashup/__tests__/actionLogFormat.test.ts
```

结果：
- `i18n:check` 通过，无缺失 key。
- `src/games/smashup/__tests__/actionLogFormat.test.ts` 9/9 通过。
- `src` 与 `e2e/src` 的对应实现文件、测试文件镜像一致（`git diff --no-index` 无内容差异）。

## 改动文件

- `D:\gongzuo\webgame\BoardGame\src\games\smashup\actionLog.ts`
- `D:\gongzuo\webgame\BoardGame\e2e\src\games\smashup\actionLog.ts`
- `D:\gongzuo\webgame\BoardGame\src\games\smashup\__tests__\actionLogFormat.test.ts`
- `D:\gongzuo\webgame\BoardGame\e2e\src\games\smashup\__tests__\actionLogFormat.test.ts`
- `D:\gongzuo\webgame\BoardGame\public\locales\zh-CN\game-smashup.json`
- `D:\gongzuo\webgame\BoardGame\public\locales\en\game-smashup.json`

## 是否可回写 resolved

可以。

理由：
- 规则与实现本身无误，已确认不是异常计分。
- 造成误报的核心展示问题已修复。
- 已补现有测试回归并完成最小验证。
