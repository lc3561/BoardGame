# Home V2 左页卡片验收

日期：2026-04-05

## 本轮验收口径

- 所有卡片都在左页内容区内部
- 所有卡片都在左侧，不能越过书本中线
- 首页卡片简化为：方框底 + 缩略图 + 标题

## 访问链接

- `http://127.0.0.1:4273/?homeV2Draft=1`

## 数据证据

原始数据文件：

- `D:\gongzuo\webgame\BoardGame-wt-home-v2\temp\home-v2-leftpage-acceptance.json`
- 页面链接：`http://127.0.0.1:4273/?homeV2Draft=1`

### 桌面 1600×900

- 书本容器：`left=240`，`top=0`，`width=1120`，`height=900`
- 书本中线：`x=800`
- 左页内容区：`left=357.5`，`top=122.5`，`right=707.5`，`bottom=745`

卡片数据：

| gameId | left | top | right | bottom | 在左页内 | 未过中线 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `cardia` | 366.59 | 198.22 | 527.52 | 359.14 | 是 | 是 |
| `dicethrone` | 537.47 | 198.20 | 698.41 | 359.14 | 是 | 是 |
| `smashup` | 366.59 | 508.34 | 527.52 | 669.27 | 是 | 是 |
| `summonerwars` | 537.47 | 508.34 | 698.41 | 669.28 | 是 | 是 |

关键边距：

- 最靠中线的卡片是 `dicethrone` / `summonerwars`，右边界到中线还剩 `101.59px`
- 最贴左页右边缘的卡片到左页内容区右边界还剩 `9.09px`
- 最贴左页左边缘的卡片到左页内容区左边界还剩 `9.09px`

### 移动横屏 932×430

- 书本容器：`left=198.44`，`top=0`，`width=535.11`，`height=430`
- 书本中线：`x=466`
- 左页内容区：`left=254.55`，`top=58.52`，`right=421.77`，`bottom=355.93`

卡片数据：

| gameId | left | top | right | bottom | 在左页内 | 未过中线 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `cardia` | 258.90 | 94.68 | 335.79 | 171.57 | 是 | 是 |
| `dicethrone` | 340.54 | 94.68 | 417.43 | 171.57 | 是 | 是 |
| `smashup` | 258.90 | 242.87 | 335.79 | 319.76 | 是 | 是 |
| `summonerwars` | 340.54 | 242.87 | 417.43 | 319.76 | 是 | 是 |

关键边距：

- 最靠中线的卡片是 `dicethrone` / `summonerwars`，右边界到中线还剩 `48.57px`
- 最贴左页右边缘的卡片到左页内容区右边界还剩 `4.34px`
- 最贴左页左边缘的卡片到左页内容区左边界还剩 `4.35px`

## 缩放验证

- 书本可视容器现在按父容器百分比走：`src/pages/HomeV2Draft.tsx` 中书本壳容器是 `h-full`，书本舞台是 `h-[100%]`。
- 内容层没有跟着书本 `presentationScale` 一起放大：`src/ugc/runtime/ui-scene/UISceneRenderer.tsx` 第 164-170 行只给场景节点层加了 `scale(${presentationScale})`；第 222-248 行的 `contentRegions` 是单独的 overlay，只按 `scaleArtboardRect(region, scale)` 定位，没有再乘 `presentationScale`。
- 左页卡片当前按区域百分比铺满：`src/components/home-v2/LobbyDirectory.tsx` 第 34 行使用百分比 `gap-x / gap-y / px / py`，并且移除了之前的 `transform: scale(0.9)`。

## 截图证据

- 桌面：`D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-leftpage-desktop-data.png`
- 移动：`D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-leftpage-mobile-data.png`

## 人工观察

- 4 张卡都落在左页米色内框里，没有任何一张压到书脊或右页。
- 左页 4 张卡现在已经收进书页那圈棕色内边框里面，不再压着边框带。
- 当前首页卡片已简化成“方框底 + 缩略图 + 标题”，描述和标签已移除。
- 卡片本体已经收成更接近正方形的布局，桌面与移动都没有越过左页内框或书本中线。
- 右页当前为空白页，左页是 2×2 四张卡，视觉上没有卡片越过中缝。
- 当前截图里缩略图资源没有正常加载，显示的是破图占位；这不影响本轮只检查“位置是否越界”的验收口径。

## 结论

- 桌面：通过
- 移动横屏：通过
- 结论依据：真实 DOM 坐标 + 实际截图双重确认
