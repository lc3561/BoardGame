# Change: 首页 V2 书本式导航与详情翻页壳

## Why
当前首页仍以普通列表页思路组织内容，不适合作为移动端 App 的主入口，也无法承载“开书进入大厅、翻页浏览目录、翻页进入游戏详情、左右翻切换上下文”这一更强的产品体验。

现已找到一整套可用的书本像素素材，足以支撑首页 V2 的主容器、开书动画、左右翻页和右侧书签导航。需要先把这些能力收敛为独立 spec，明确素材边界、页面状态机、移动端优先方向和后续实现切分。

## What Changes
- 新增 `home-book-navigation` 能力，定义首页 V2 作为移动端 App 优先的书本式首页壳。
- 定义首页进入时的开书动画与后台预加载策略，保证动画与首屏数据并行进行。
- 定义大厅目录页与游戏详情页的双页结构，以及“点击游戏进入详情、左翻回大厅、右翻切到下一个游戏”的翻页语义。
- 固化本轮可用素材清单，包括背景、书本开合、左右翻页、书签出现/消失与静态书签资源。
- 明确当前素材缺口与可接受的 HTML/SVG 补位范围，避免后续实现时误以为所有控件都必须从素材包里硬拼。
- 补充下一阶段 UI 风格匹配目标：先把书本当作唯一内容主体，按 90% 视口高度居中放大，并把当前大厅入口收敛成左页内框中的 2×2 游戏卡基线。
- 固化下一阶段验收数据：卡片全部位于左页内框中、不得越过书脊中线、缩略图保持原始比例、翻页期间隐藏附加 UI。

## Impact
- Affected specs:
  - `home-book-navigation`
- Affected code:
  - `src/pages/Home.tsx`
  - `src/components/system/GlobalHUD.tsx`
  - `src/components/lobby/GameDetailsModal.tsx`
  - 未来新增的首页 V2 书本壳组件与资源注册入口
- Affected assets:
  - `temp/Super Asset Bundle #2 - Adventure Time v1.5/Updated Paper Book/Sprites/**`
  - 后续正式落地时的首页 V2 运行时资源目录
