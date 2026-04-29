# SmashUp 反馈 69d9f9692893f751f02f820d 卡图加载核验（2026-04-24）

## 结论

- 判定：`已修`
- 本轮没有发现当前环境阻塞，也没有复现出“SmashUp 卡图加载不出来”的现象。
- 当前仓库里的资源加载链路已经包含两层保障：
  - 浏览器真实页面里，SmashUp 卡图/基地图可正常渲染，不再停留在 `shimmer` 占位态。
  - Android 本地素材包链路里，`_capacitor_file_` 本地包命中与缺图回退 CDN 的逻辑已有修复和测试覆盖。

## 本轮实际执行

### 1. CardPreview 回归单测

命令：

```powershell
npx vitest run src/components/common/media/__tests__/CardPreview.i18n.test.tsx
```

结果：

- `1` 个测试文件通过，`10` 个用例全部通过。
- 覆盖点包含：
  - SmashUp `tts_atlas_*` 在游戏包 override 下优先走 `/_capacitor_file_/...`
  - 本地包缺图时，atlas 背景图应回退到真实成功加载的 CDN 候选 URL

### 2. SmashUp 真实页面 E2E

命令：

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "Oops 四派系在派系选择与注入场景中都能显示资源"
```

结果：

- Playwright 通过，`1 passed`
- 用例会同时验证：
  - 派系选择页里 `Ancient Egyptians / Cowboys / Samurai / Vikings` 这些接入较晚的卡图能真实显示
  - 注入对局后，基地图与手牌卡图不会卡在 `shimmer` 占位态

## 本轮截图证据与肉眼观察

### A. 派系选择页

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-四派系在派系选择与注入场景中都能显示资源\oops-faction-selection-visible.png`

我实际看到：

- `古埃及人 / 牛仔 / 武士 / 维京人` 四个派系卡面都已经出图，不是空白卡框，也不是纯底纹占位。
- 同屏的 `海盗 / 忍者 / 恐龙 / 外星人 / 机器人 / 丧尸 / 巫师` 等卡图也都正常显示。
- 画面里看不到仍在覆盖卡面的 `atlas-shimmer` 占位层。

验收判断：

- 达到“派系选择页卡图可正常显示”的验收标准。

### B. 注入对局后的基地图与手牌图

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-四派系在派系选择与注入场景中都能显示资源\oops-faction-intake-board.png`

我实际看到：

- 三个基地位上的 `Drakkar / Kyuden Kobin / Pyramids` 基地图都已经渲染出来，不是空白底板。
- 底部手牌里的 `Huscarl` 与 `Yokai Attack` 卡图清晰可见。
- 页面没有出现“卡位已在但图没出来”的白块，也没有残留 `shimmer` 占位条。

验收判断：

- 达到“进入对局后基地图和手牌卡图都能稳定显示”的验收标准。

## Android 本地素材包链路的交叉证据

本轮没有重新连接 Android 模拟器或真机，因此下面内容属于“已有证据交叉核对”，不是本轮新跑出来的设备验证。

### 历史修复证据

- `D:\gongzuo\webgame\BoardGame\evidence\android-app-local-package-image-fallback-fix.md`

该证据说明的根因是：

- 旧逻辑会把“逻辑 atlas key”误判成已加载成功，导致 shimmer 消失后，背景图仍指向坏掉的本地 `_capacitor_file_` URL，用户看到空白卡面。

对应修复后给出的设备侧产物：

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\smashup\android-smashup-asset-fallback-fix\screen.png`
- DOM/网络检查：`D:\gongzuo\webgame\BoardGame\test-results\smashup\android-smashup-asset-fallback-fix\inspect.json`

### inspect.json 可复查结论

- 共检查 `24` 个 SmashUp 派系列表项。
- 本地包命中的条目使用 `http://localhost/_capacitor_file_/.../smashup/current/assets/...`，状态为 `200`。
- 本地缺失的条目回退到 `https://assets.easyboardgame.top/official/...`，状态也为 `200`。
- 文档里记录的失败条目数为 `0`。

这说明：

- 即使 Android 安装的是不完整素材包，当前逻辑也不会再把坏掉的本地 URL 留在最终背景图上。

## 判定依据

之所以把这条反馈归类为 `已修`，而不是 `环境阻塞` 或 `未修`，依据如下：

1. 当前仓库代码里已经有针对该类问题的明确回归测试，且本轮复跑通过。
2. 浏览器真实 E2E 截图能直接看到 SmashUp 卡图与基地图已正常渲染。
3. Android 本地素材包回退链路已有独立修复证据与检查产物，且当前单测仍覆盖该逻辑。
4. 本轮未观察到资源 404、CDN 不可达、测试环境缺图或当前端口/服务异常导致的阻塞现象。

## 改动文件

- `D:\gongzuo\webgame\BoardGame\evidence\smashup\smashup-feedback-69d9f969-card-art-loading-verify-2026-04-24.md`
