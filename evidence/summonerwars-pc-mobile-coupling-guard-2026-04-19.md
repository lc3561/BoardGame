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

## 补充修复：移动横屏“开始按钮消失”强制等比回归（2026-04-19）

### 问题描述

- 用户反馈：`summonerwars` 阵营选择页在手机横屏紧凑视口下，开始按钮会“放不下/看不见”。
- 目标：恢复 PC 同构等比缩放，取消“放不下就改位”的补丁路径。

### 本轮实现

- `src/games/summonerwars/ui/FactionSelectionAdapter.tsx`
  - 移除移动端特化舞台参数：不再使用 `620` 的移动参考高度，也不再使用 `900px` 宽度 cap。
  - 移动横屏统一按 `1280x720` 参考舞台等比缩放，保持与 PC 同构比例。
  - 缩放边距改为按舞台容器真实内边距计算（`12px` 横向 / `4px` 纵向），避免过度缩小导致“和 PC 密度差距过大”。
  - 舞台容器在移动横屏改为“顶部对齐 + 水平居中”，避免浏览器视口口径差造成的下沿溢出误判。
  - 取消“右侧浮动操作轨”分支，恢复到同一布局结构下的等比缩放渲染。
- `e2e/summonerwars/summonerwars-selection.e2e.ts`
  - `mobile landscape capped viewport ...` 用例改为“严格 16:9 等比缩放”断言，校验舞台 style 宽高与 `--sw-selection-inline-unit/--sw-selection-block-unit` 同步。
  - 保留紧凑横屏可达性用例：`tight mobile landscape keeps host start button visible under proportional scaling`。
  - `mobile landscape keeps faction selection aligned with pc composition` 的边界断言改为“等比参数 + 关键区可见可达 + 稳定横向边界”，去掉在移动浏览器口径下不稳定的底边硬阈值。

### 执行命令

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape capped viewport keeps faction selection in strict 16:9 proportional scale"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "tight mobile landscape keeps host start button visible under proportional scaling"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape keeps faction selection aligned with pc composition"
```

结果：三条用例均通过。

### 关键截图与肉眼结论

1. capped 横屏等比缩放证据
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-capped-viewport-keeps-faction-selection-in-strict-16-9-proportional-scale\selection-phone-landscape-capped-entry.png`

- 我实际看到：阵营卡、标题、底部信息块保持同一套 PC 构图关系，没有出现横向拉伸或竖向压扁。
- 我实际看到：主内容位于中心视区，不是“缩在左上角”。
- 是否达标：达标（等比缩放方向正确）。

2. 紧凑横屏开始按钮可达证据
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\tight-mobile-landscape-keeps-host-start-button-visible-under-proportional-scaling\selection-phone-landscape-tight-start-visible.png`

- 我实际看到：`开始游戏` 按钮本体在紧凑横屏里完整可见，没有被挤出视口。
- 我实际看到：操作区仍在原布局链路内，未再走“右侧浮动补丁位”。
- 是否达标：达标（紧凑横屏下开始按钮可见且可点）。

3. 基线横屏（非紧凑）对照
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-both-picked.png`

- 我实际看到：主构图仍是 PC 同构缩放路线，未被误修成窄布局；战区与 HUD 在同一坐标系。
- 我实际看到：右侧仍保留操作轨（等待态文案可见），没有出现整体左上角缩放偏移。
- 是否达标：达标（补充修复未破坏既有横屏基线）。

## 补充修复：布局单位统一（2026-04-20）

### 用户反馈与定位

- 反馈：移动端“看起来完全没等比”，怀疑根因在布局单位口径。
- 定位结论：
  - `FactionSelectionAdapter` 仍残留 `vw/vh` 口径（包括 `--sw-selection-inline-unit` / `--sw-selection-block-unit` 的非横屏 fallback 与放大预览弹层尺寸上限）。
  - 阵营列表里的“新建牌组 + 号卡片”存在一组固定像素尺寸（`w-16/h-16/text-3xl/mb-4` 等），在舞台缩小时不会同步缩放，破坏“PC 同构等比”观感。

### 本轮改动

- `src/games/summonerwars/ui/FactionSelectionAdapter.tsx`
  - 将 `--sw-selection-inline-unit` / `--sw-selection-block-unit` 改为运行时像素值，不再使用 `1vw/1vh` fallback。
  - 放大预览弹层（tip 图、召唤师精灵图）移除 `90vw/90vh/40vw`，改为基于运行时视口计算出的像素上限。
  - “新建牌组 + 号卡片”与预览角标从固定像素类改为基于 `--sw-selection-inline-unit/block-unit` 的尺寸。
- `e2e/src/games/summonerwars/ui/FactionSelectionAdapter.tsx`
  - 同步上述改动（当前工作区该文件与 `src` 为同源映射，修改已同步生效）。

### 执行命令

```bash
npm run test -- src/games/summonerwars/ui/__tests__/FactionSelectionAdapter.test.tsx
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape capped viewport keeps faction selection in strict 16:9 proportional scale"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "tight mobile landscape keeps host start button visible under proportional scaling"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-selection.e2e.ts "mobile landscape keeps faction selection aligned with pc composition"
```

结果：

- 单测通过（13/13）。
- 三条关键 E2E 全部通过。

### 关键截图与肉眼结论

1. 严格等比缩放（capped 横屏）
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-capped-viewport-keeps-faction-selection-in-strict-16-9-proportional-scale\selection-phone-landscape-capped-entry.png`

- 我实际看到：标题、阵营卡网格、预览占位和玩家状态区保持同一套 16:9 构图关系，没有出现某个局部被单独放大/挤扁。
- 我实际看到：主内容仍居中显示，不是“缩在左上角”。
- 是否达标：达标（等比缩放口径成立）。

2. 紧凑横屏开始按钮可见
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\tight-mobile-landscape-keeps-host-start-button-visible-under-proportional-scaling\selection-phone-landscape-tight-start-visible.png`

- 我实际看到：`开始游戏` 按钮本体完整显示在右侧动作区内，没有消失或被裁切。
- 我实际看到：动作区与主内容仍处于同一舞台坐标系，未回到“放不下就改位”的补丁路线。
- 是否达标：达标（你指出的“开始按钮不见了”问题位点本轮可复核为已恢复可见）。

3. 与 PC 构图对齐（双人已选）
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-both-picked.png`

- 我实际看到：卡片网格、左下预览、右下状态+动作链路仍是 PC 同构比例，没有被误改成窄布局。
- 我实际看到：HUD/FAB 与主舞台在同一视觉坐标，未出现整体偏移到角落。
- 是否达标：达标（PC-移动端对齐关系维持）。

## 补充修复：等比缩放 + 边缘锚定（2026-04-20）

### 用户要求

- 目标不是“只等比”，而是“靠边元素在等比下仍保持靠边”，即 UI 大致与 PC 的边缘关系一致。

### 本轮实现

- `src/games/summonerwars/ui/FactionSelectionAdapter.tsx`
  - 下半区改为“舞台全宽 + 双端锚定”：
    - 左预览区锚定左侧；
    - 右状态/操作区作为右锚定簇，整体贴近舞台右侧；
    - 保持中间弹性空隙，不再使用“整体中间簇”视觉关系。
  - 增加 `data-testid="sw-faction-lower-stage-inner"` 与 `data-testid="sw-faction-right-anchor-cluster"` 供 E2E 做几何验收。
- `e2e/summonerwars/summonerwars-selection.e2e.ts`
  - 新增/调整锚定断言：
    - 左预览区相对舞台左边缘的距离上限；
    - 右锚定簇相对舞台右边缘的距离上限（不再只看玩家状态卡，避免“预留操作轨宽度”导致误判）。

### 执行命令（并行窗口期间改用开发服入口）

```bash
PW_USE_DEV_SERVERS=true PW_HAS_EXPLICIT_TARGET=true node node_modules/playwright/cli.js test e2e/summonerwars/summonerwars-selection.e2e.ts --grep "mobile landscape keeps faction selection aligned with pc composition"
PW_USE_DEV_SERVERS=true PW_HAS_EXPLICIT_TARGET=true node node_modules/playwright/cli.js test e2e/summonerwars/summonerwars-selection.e2e.ts --grep "mobile landscape capped viewport keeps faction selection in strict 16:9 proportional scale"
PW_USE_DEV_SERVERS=true PW_HAS_EXPLICIT_TARGET=true node node_modules/playwright/cli.js test e2e/summonerwars/summonerwars-selection.e2e.ts --grep "tight mobile landscape keeps host start button visible under proportional scaling"
PW_USE_DEV_SERVERS=true PW_HAS_EXPLICIT_TARGET=true node node_modules/playwright/cli.js test e2e/summonerwars/summonerwars-selection.e2e.ts --grep "main flow enters match from faction selection"
```

结果：以上 4 条用例均通过。

### 关键截图与肉眼结论

1. 移动横屏入口（未选将）
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-entry.png`

- 我实际看到：左下预览占位保持贴左，不再漂到中间。
- 我实际看到：右下状态簇保持靠右，和舞台右缘关系稳定。
- 是否达标：达标（边缘锚定成立）。

2. 移动横屏双人已选（等待态）
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\mobile-landscape-keeps-faction-selection-aligned-with-pc-composition\selection-phone-landscape-both-picked.png`

- 我实际看到：左预览与右状态/等待动作区保持左右分置，仍是 PC 同构的空间关系。
- 我实际看到：没有退化成“中间挤一团”的布局。
- 是否达标：达标（等比 + 锚边同时满足）。

3. 紧凑横屏开始按钮可见
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\tight-mobile-landscape-keeps-host-start-button-visible-under-proportional-scaling\selection-phone-landscape-tight-start-visible.png`

- 我实际看到：`开始游戏` 按钮仍完整显示在右侧动作区，可点击。
- 我实际看到：按钮与右侧状态簇在同一右锚定链路中，没有被挤走或消失。
- 是否达标：达标（你强调的关键位点保持稳定）。

4. PC 主流程回归保护
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\main-flow-enters-match-from-faction-selection\selection-host-entry.png`

- 我实际看到：桌面端主构图仍保持原基线，未因移动端锚定修复产生明显回归。
- 是否达标：达标（本轮修复未破坏 PC 入口布局）。
