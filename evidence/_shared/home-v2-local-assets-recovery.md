# Home V2 壳体素材本地包体验证

日期：2026-04-06

## 目标

- 核查 `home-v2` 书本壳、桌面底图、书签逐帧、翻页逐帧、holder 方框是否已从包体内本地资源正确显示
- 确认这批壳体素材运行时请求的是本地 `/assets/common/images/home-v2/...`
- 把缩略图链路与 `home-v2` 壳体素材链路分开，不再混为一个问题

## 本轮改动

- `src/pages/HomeV2Draft.tsx`
  - `HOME_V2_BOOK_DESK` 使用本地 `/assets/common/images/home-v2/book-desk/1.png`
- `src/components/lobby/GameList.tsx`
  - `HOME_V2_HOLDER_BG` 使用本地 `/assets/common/images/home-v2/holders/1.png`
- `src/ugc/runtime/ui-scene/scenes/homeV2BookScene.ts`
  - `book-idle`
  - `book-open`
  - `side-tabs-static`
  - `side-tabs-appear`
  - `page-flip-right`
  - `page-flip-left`
  - 全部使用本地 `/assets/common/images/home-v2/...`

## 验证命令

```powershell
npm run typecheck
npm run build
node scripts/infra/vite-cli-safe.mjs preview --host 127.0.0.1 --port 4276 --configLoader bundle
```

## 产物

- 截图：
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-local-desktop.png`
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-local-detail-desktop.png`
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-local-mobile.png`
- 网络日志：
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-local-network.json`
- 最新包体链路截图：
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-packaged-desktop.png`
- 最新包体链路网络日志：
  - `D:\gongzuo\webgame\BoardGame-wt-home-v2\test-results\home-v2-packaged-network.json`

## 肉眼观察

### 桌面总览

- 深色木桌背景已经出现，不再是单色暗底。
- 摊开的书本壳已经完整出现，左右页、书脊、右侧书签都可见。
- 左页 4 张卡片在书页内部，holder 方框已经出现，没有之前左上角破图图标。
- 右页目前仍为空白页，这是当前布局/交互实现状态，不是资源缺失。

### 桌面详情

- 点击第一页卡片后，仍然使用同一本书进入详情，没有再出现第二本书叠底。
- 左页详情文案与右页房间占位都在书页内部。
- 书本底图、壳体、书签仍然保持显示，没有因为状态切换掉图。

### 移动横屏

- 木桌背景与摊开书本都已显示。
- 左页 4 张卡片都在书页内，右页空白。
- 相比桌面，书本在横屏下仍明显可见，未退化成只有卡片和纯背景。

## 请求数据结论

对 `test-results/home-v2-packaged-network.json` 统计结果：

- 本地 `http://127.0.0.1:4278/assets/common/images/home-v2/...` 成功响应：`25`
- `home-v2` 远端请求数：`0`
- `requestfailed`：`0`
- `4xx/5xx`：`0`

结论：

- `home-v2` 壳体素材当前正确运行路径是包体内本地 `/assets/common/images/home-v2/...`
- 当前页面没有请求 `assets.easyboardgame.top/official/common/images/home-v2/...`
- 书本壳、桌面底图、书签逐帧、翻页逐帧、holder 方框均由包体内本地资源提供

## 还剩的相邻问题

- 游戏缩略图仍走各自原有链路，不属于这次 `home-v2` 公共素材缺失问题。
- 当前桌面总览里，`卡迪亚 / 大杀四方 / 召唤师战争` 的缩略图视觉上仍显得发白或被裁切，这是卡片内部缩略图呈现问题，不是本次 `home-v2` 本地素材请求失败。
