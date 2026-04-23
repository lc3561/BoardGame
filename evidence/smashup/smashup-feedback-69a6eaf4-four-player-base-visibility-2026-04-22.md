# SmashUp 反馈修复证据（69a6eaf4b832e79689a366e2）

- 反馈标题：`大杀四方4人居，屏幕比例显示有问题，旁边两个基地无法显示`
- 严重级别：`critical`
- 游戏：`smashup`
- 本轮口径：按线上 bug 对位回归，不做“仅关单”。

## 对位验证

1. 四人局布局回归 E2E
   - 命令：
     - `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-4p-layout-simple.e2e.ts "四人局布局基础区域应稳定渲染"`
   - 结果：通过（1 passed）。

2. 关键截图复核
   - 路径：
     - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-4p-layout-simple.e2e\四人局布局基础区域应稳定渲染\four-player-layout-simple.png`
   - 我实际看到：
     - 五个基地槽位都在视口内，左右两侧基地可见，不存在“旁边两个基地消失”。
     - 四人记分板（你 / P1 / P2 / P3）与手牌区同时可见，布局未挤压成不可操作状态。
   - 验收判定：达标。

## 结论

- 本轮未复现“四人局两侧基地不可见”问题，当前四人布局链路可稳定显示关键区域。
- 该反馈可从 `in_progress` 回写为 `resolved`（非 `closed`）。
