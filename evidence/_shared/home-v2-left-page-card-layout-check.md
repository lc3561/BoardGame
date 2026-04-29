# Home V2 左页卡片布局核查

日期：2026-04-06

访问链接：

- `http://127.0.0.1:4280/?homeV2Draft=1`
- `http://127.0.0.1:4280/?homeV2Draft=1&homeV2Debug=1`

截图：

- 整页调试图：`D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-card-crops\page-debug.png`
- 左页裁图：`D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-card-crops\left-page.png`
- 左上单卡：`D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-card-crops\card-1.png`

肉眼观察：

- 左上单卡四边框都可见，不再是只有底边花纹露出；上边框、左右边框和底部标题区都能直接看到。
- 图片与标题恢复成“上图下字”的关系，标题没有再压到边框上。
- 四张卡都落在左页内容区内，右边没有越过书脊中线。

DOM / bbox 数据：

- 左页总览区 `leftPageOverview`：`x=337.5, y=38.5, width=395, height=685`
- 书脊参考线 `spine` 左边界：`x=780.5`
- `cardia`：`left=343.02, top=115.20, right=531.16, bottom=303.34`
- `dicethrone`：`left=538.83, top=115.20, right=726.98, bottom=303.36`
- `smashup`：`left=343.02, top=458.64, right=531.16, bottom=646.78`
- `summonerwars`：`left=538.83, top=458.64, right=726.98, bottom=646.80`

核对结论：

- 4 张卡的 `left/right/top/bottom` 全部位于 `leftPageOverview` 边界内。
- 最右卡片 `right=726.98`，仍小于书脊左边界 `780.5`，没有越过中线。
