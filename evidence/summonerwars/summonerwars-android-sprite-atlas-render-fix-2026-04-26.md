# Summoner Wars Android 图集裁切错位修复（2026-04-26）

## 结论

- 本轮 `summonerwars` 安卓“下载游戏包后进局素材/手牌不显示”不是下载失败，也不是图片没加载到。
- 根因是底层 `computeSpriteImgStyle()` 把 `<img>` 的 `translateX/translateY` 百分比按“单帧宽高”计算，导致非首帧卡面被平移出容器。
- 修复后，真机同场景里底部手牌和棋盘上的非首帧卡面都已恢复显示。

## 代码变更

- 修复文件：[src/engine/primitives/spriteAtlas.ts](/D:/gongzuo/webgame/BoardGame/src/engine/primitives/spriteAtlas.ts)
- 回归测试：[src/engine/primitives/__tests__/primitives.test.ts](/D:/gongzuo/webgame/BoardGame/src/engine/primitives/__tests__/primitives.test.ts)

## 真机证据

### 修复前

- 截图：[sw-current.png](/D:/gongzuo/webgame/BoardGame/temp/mobile-debug/2026-04-26-summonerwars-live-current/sw-current.png)
- 观察：
  - 底部手牌区域大部分只剩空卡槽和召唤高亮边框，不是正常手牌卡面。
  - 棋盘上只有少数首帧卡面还能看到，符合“非首帧被裁出容器外”的现象。

### 修复后

- 截图：[sw-postfix-after-install.png](/D:/gongzuo/webgame/BoardGame/temp/mobile-debug/2026-04-26-summonerwars-postfix/sw-postfix-after-install.png)
- 配套 UI dump：[sw-postfix-after-install.xml](/D:/gongzuo/webgame/BoardGame/temp/mobile-debug/2026-04-26-summonerwars-postfix/sw-postfix-after-install.xml)
- 观察：
  - 底部 5 张手牌都能直接看到完整卡面内容，不再是空槽。
  - 棋盘中部与上部的单位卡面也已正常显示，不再只剩 portal 或首帧图片。
  - 这张图达到本轮验收标准：问题位点“下载后进局素材/手牌不显示”已被修正。

## 正式包验证

- 重新用正式环境值执行 `node scripts/mobile/android.mjs build-release` 后，`release` 构建成功。
- 产物：[easyboardgame-release.apk](/D:/gongzuo/webgame/BoardGame/android/app/build/outputs/apk/release/easyboardgame-release.apk)
- `aapt dump badging` 结果确认：
  - 包名：`top.easyboardgame.app`
  - 应用名：`易桌游`

## 本轮命令

```powershell
npm run test -- src/engine/primitives/__tests__/primitives.test.ts
npm run typecheck
$env:CAPACITOR_APP_ID='top.easyboardgame.app'
$env:VITE_CAPACITOR_APP_ID='top.easyboardgame.app'
$env:CAPACITOR_APP_NAME='易桌游'
$env:VITE_BACKEND_URL='https://api.easyboardgame.top'
node scripts/mobile/android.mjs build-release
```
