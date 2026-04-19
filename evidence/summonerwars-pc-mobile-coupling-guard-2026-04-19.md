# SummonerWars PC/移动互相影响门禁收口（2026-04-19）

## 背景与结论

- 目标：排查“PC 调整后移动端又偏”的风险，并为 `summonerwars` 沉淀可复用的双端门禁。
- 本轮结论：
  - 当前 `summonerwars` 主战场对照链路（PC 基线 + 手机横屏）可通过，未出现“缩在左上角 / 错误窄布局”回归。
  - 新增的在线 AI `seat-swap` 面板在移动横屏下已补齐可视区与锚点约束。
  - 共享 HUD/FAB 的新卫星动作已补“长面板列锚点”规则，避免 PC 可用但移动端面板漂移。

## Git 基线（对比“之前正常”）

- last known good（候选）：`aadbac10`（当前 HEAD，未包含本轮未提交 seat-swap 锚点修正）。
- first known bad（候选）：当前工作区里新增 `seat-swap` 动作但未显式声明移动端长面板锚点的版本（未提交态，位于 `src/components/game/framework/widgets/GameHUD.tsx` 的 `seat-swap` action）。
- 本轮修复：给 `seat-swap` 增加 `mobilePopoverVerticalAnchor: 'column'`，并新增移动横屏 E2E 门禁。

## 历史正常图对照（2026-04-13 vs 2026-04-19）

- 历史基线（2026-04-13）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\00-pc-reference-board.png`
- 当前复核（2026-04-19）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\00-pc-reference-board.png`

我实际看到：

- 两张图的主构图一致：战场主体居中、右侧阶段区保持同列、底部手牌轨道仍在同一视觉层级。
- 差异主要是资源加载时机（历史图存在占位块，当前图卡面素材已完整渲染），不是布局坐标漂移。

对照结论：

- “之前正常”的 PC 主构图在当前版本仍成立；本轮重点风险在“新加 FAB 动作导致移动端弹层锚点漂移”，不是主战场布局基线漂移。

## 本轮执行

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线 AI 阵营选择 HUD 换位：移动横屏展开面板应留在视口并与按钮列对齐"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线 AI 阵营选择 HUD 换位：应显示入口并可与 AI 交换先手"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机可达"
```

结果：以上 3 条用例最终均通过。

## 关键截图与肉眼结论

### A. 移动横屏 seat-swap 面板打开态（本轮新增门禁）

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-阵营选择-HUD-换位：移动横屏展开面板应留在视口并与按钮列对齐\online-ai-seat-swap-mobile-panel-open.png`

我实际看到：

- 面板本体完整位于视口内，没有跑到右侧按钮列之外。
- 面板位于按钮列左侧，且与按钮列保持同一垂直范围，不是漂到屏幕上沿或下沿角落。
- `seat-swap` 图标与面板在同一交互簇中，未出现“图标在中段、面板掉到 settings 层级”的错位。

是否达标：

- 达标（移动横屏布局与交互可达均满足）。

### B. 移动横屏 seat-swap 执行后

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-阵营选择-HUD-换位：移动横屏展开面板应留在视口并与按钮列对齐\online-ai-seat-swap-mobile-after-click.png`

我实际看到：

- 阵营选择页仍保持完整可见，没有因换位交互导致整页偏移或裁切。
- 按钮列仍在右侧可达区域，且没有挤压主内容到异常窄布局。

是否达标：

- 达标（执行动作后未引入新布局异常）。

### C. PC 基线 + 手机横屏主态（“之前正常”对照链路延续）

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\00-pc-reference-board.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\10-phone-landscape-board.png`

我实际看到：

- PC 主态下战场、手牌、右侧阶段控件关系保持稳定。
- 手机横屏主态下战场与 HUD 仍在同一视觉坐标系，未出现“缩在左上角”或“误改成窄布局”现象。
- 右侧控件与底部手牌仍可达，不存在整块越界。

是否达标：

- 达标（PC/手机同场景对照通过）。

## 规范落地

本轮已写入 `docs/mobile-adaptation.md`：

- 共享 FAB/HUD 卫星按钮只要发生新增/删减/顺序调整/面板变长，必须做“同场景 PC + 手机横屏”对照验收。
- 长列表/可滚动面板必须显式使用 `mobilePopoverVerticalAnchor: 'column'`；短提示面板才允许按钮锚点。

## 代码改动

- `src/components/game/framework/widgets/GameHUD.tsx`
  - `seat-swap` action 补 `mobilePopoverVerticalAnchor: 'column'`。
- `e2e/summonerwars/summonerwars.e2e.ts`
  - 新增用例：`在线 AI 阵营选择 HUD 换位：移动横屏展开面板应留在视口并与按钮列对齐`。
  - 该用例覆盖移动横屏下 seat-swap 面板的视口边界、按钮列对齐与交换后状态收口。
- `docs/mobile-adaptation.md`
  - 增加共享 FAB/HUD 双端联动门禁条款。
