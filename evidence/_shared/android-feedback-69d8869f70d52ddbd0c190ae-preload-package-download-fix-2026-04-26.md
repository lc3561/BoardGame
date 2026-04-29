# Android 反馈 69d8869f70d52ddbd0c190ae 预载包下载失败修复证据（2026-04-26）

## 反馈范围

- 反馈 ID：`69d8869f70d52ddbd0c190ae`
- 反馈时间：`2026-04-10T05:11:59.904Z`
- 用户原话：`APP无法下载预载包`
- 本轮目标：确认失败点属于 `manifest 拉取 / 版本门禁 / 下载任务 / 文件系统写入 / 安装状态机` 的哪一段，做最小修复，且不破坏 OTA 规则。

## 我实际看到的现象

### 1. 当前线上 manifest 已经会把 Android 资源包导向“增量安装”分支

`2026-04-26` 实查：

- `https://assets.easyboardgame.top/official/mobile-packages/android/stable/games/dicethrone.json`
- 返回 `200`
- manifest 中同时包含：
  - `assetPack.url`
  - `assetPack.fileIndexUrl`
  - `assetPack.fileIndexChecksum`

我实际看到的关键字段：

```json
{
  "gameId": "dicethrone",
  "publishedAt": "2026-04-25T15:35:08.172Z",
  "assetPack": {
    "version": "0.5.61-dicethrone-pkg-2026-04-25T15-35-05-209Z",
    "url": "https://assets.easyboardgame.top/official/mobile-packages/android/stable/bundles/dicethrone/0.5.61-dicethrone-pkg-2026-04-25T15-35-05-209Z.zip",
    "fileIndexUrl": "https://assets.easyboardgame.top/official/mobile-packages/android/stable/file-index/dicethrone/0.5.61-dicethrone-pkg-2026-04-25T15-35-05-209Z.json",
    "fileIndexChecksum": "26754117a37bb3dcd2f9c9c5b1e369e9ec907ba68fe26634ee78f9d94a612c41"
  }
}
```

结论：

- manifest 拉取本身不是失败点。
- 版本门禁不是失败点。
- 当前线上 manifest 会触发“先尝试增量安装”的分支。

### 2. file index 本身可读，不是下载源缺失

`2026-04-26` 实查：

- `https://assets.easyboardgame.top/official/mobile-packages/android/stable/file-index/dicethrone/0.5.61-dicethrone-pkg-2026-04-25T15-35-05-209Z.json`
- 返回 `200`
- 内容中能看到真实文件条目，例如：
  - `atlas-configs/dicethrone/ability-cards-common.atlas.json`
  - `i18n/zh-CN/dicethrone/assets-manifest.json`

我实际看到的是：file index 返回的是完整 JSON 文件列表，而不是 404、权限错误或空内容。

结论：

- 失败点不是 file index 拉取地址不存在。
- 失败点不是“线上没有包 / 没有索引文件”。

### 3. 已发布基线没有增量安装桥接能力，失败点落在“安装状态机 dispatch -> 原生桥接”阶段

我实际检查了 `HEAD` 基线，而不是当前工作区里别人的未提交 Java 改动：

- `git show HEAD:src/features/mobile-packages/nativeGamePackagePlugin.ts`
  - 没有 `installGamePackageIncremental`
- `git show HEAD:android/app/src/main/java/top/easyboardgame/app/GamePackagePlugin.java`
  - 仍是旧的 `enqueueInstallGamePackage(call)` 链路
  - 没有 `installGamePackageIncremental(...)`
  - 没有 `fileIndexUrl` 参数链路

这说明：

- 当前工作区里虽然已经有人在补原生增量安装实现，但**已提交基线**并没有这条原生方法。
- 一旦网页层根据 manifest 进入 `installGamePackageIncremental(...)`，老 Android 壳会在桥接层直接报“方法不存在 / 未实现”。
- 这时下载任务还没有真正开始，所以失败点不在：
  - 下载任务执行
  - 文件系统写入
  - 安装后的资源落盘

结论：

- 本反馈的高置信根因是：**manifest 已升级为增量安装入口，但老 Android 壳不认识新的原生方法，导致安装状态机在 dispatch 到原生桥接时失败**。

## 本次最小修复

修改文件：

- `src/features/mobile-packages/nativeGamePackagePlugin.ts`
- `e2e/src/features/mobile-packages/nativeGamePackagePlugin.ts`
- `src/lib/__tests__/androidLiveUpdates.test.ts`
- `e2e/src/lib/__tests__/androidLiveUpdates.test.ts`

修复内容：

1. 当 manifest 带有 `assetPackFileIndexUrl` 时，仍优先尝试 `installGamePackageIncremental(...)`。
2. 如果报错表现为原生桥接不支持该方法，例如：
   - `not implemented`
   - `not a function`
   - `method ... not found`
   - `does not exist`
3. 则自动回退到旧的 `installGamePackage(...)` 全量安装链路。
4. 对于真正的下载 / 校验 / IO 错误，不做吞错回退，仍按原错误抛出，避免把真实故障误判成兼容问题。

为什么这是最小修复：

- 没有改 OTA 规则。
- 没有修改 manifest 兼容策略。
- 没有覆盖或回滚别人正在做的 Java 增量安装实现。
- 只是在网页层补了一层**向后兼容**，让新 manifest 遇到老壳时还能退回旧下载链路。

## 回归验证

### 1. ESLint

命令：

```powershell
npx eslint src/features/mobile-packages/nativeGamePackagePlugin.ts e2e/src/features/mobile-packages/nativeGamePackagePlugin.ts src/lib/__tests__/androidLiveUpdates.test.ts e2e/src/lib/__tests__/androidLiveUpdates.test.ts
```

结果：

- 退出码 `0`
- 我实际看到：无 lint 错误输出
- 验收判断：达标

### 2. `src` 侧定向单测

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/lib/__tests__/androidLiveUpdates.test.ts --configLoader native --maxWorkers 1 -t "游戏包增量安装方法在老 Android 壳不可用时，回退到全量下载"
```

结果：

- 退出码 `0`
- `1 passed`
- 日志里实际出现了：
  - `install-native-call-dispatch`
  - `install-incremental-unavailable-fallback`
  - `install-native-call-resolved`
  - `install-finished`

我实际看到的关键行为：

- 先尝试了 `installGamePackageIncremental`
- 收到 `GamePackage.installGamePackageIncremental() is not implemented on android`
- 随后回退执行 `installGamePackage`
- 最终状态是 `installed`
- 资源路径被规范化为 `/_capacitor_file_/data/user/0/top.easyboardgame.app/files/game-packages/dicethrone/current/assets`

验收判断：

- 达标
- 这直接证明“老壳不支持增量方法”时，下载链路不会停死在桥接层，而是能继续完成安装

### 3. `e2e/src` 镜像测试文件执行门槛

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run e2e/src/lib/__tests__/androidLiveUpdates.test.ts --configLoader native --maxWorkers 1 -t "游戏包增量安装方法在老 Android 壳不可用时，回退到全量下载"
```

结果：

- 退出码 `1`
- 实际输出：`No test files found`

我实际看到的原因不是“测试断言失败”，而是仓库当前 `vitest.config.ts` 的 `include` 只覆盖 `src/**` 和 `apps/api/**`，不包含 `e2e/src/**`。因此这条命令没有真正进入测试执行阶段。

验收判断：

- 这不能算该镜像用例“已通过”
- 但这是测试入口配置问题，不是本次修复逻辑失败

### 4. 镜像一致性校验

为了确认 `e2e` 镜像没有漏同步，我额外做了 SHA256 校验。

命令：

```powershell
Get-FileHash src/features/mobile-packages/nativeGamePackagePlugin.ts, e2e/src/features/mobile-packages/nativeGamePackagePlugin.ts -Algorithm SHA256
Get-FileHash src/lib/__tests__/androidLiveUpdates.test.ts, e2e/src/lib/__tests__/androidLiveUpdates.test.ts -Algorithm SHA256
```

结果：

- `nativeGamePackagePlugin.ts`
  - `src` 与 `e2e/src` 均为 `DDF1E866B4B04DC9541CF6A34D36D428F7F3043B807E6D4A8253522BE7CD8330`
- `androidLiveUpdates.test.ts`
  - `src` 与 `e2e/src` 均为 `11C415EF6A84D7F18579DDC92A608836D819D0B6B1C47B62BA50A5F3DC124665`

验收判断：

- 达标
- 我实际看到两个镜像文件内容完全一致

## 是否破坏 OTA 规则

没有。

我实际检查到本次修改只发生在游戏资源包安装桥接层，不涉及：

- OTA manifest 门禁
- `targetNativeVersion / minNativeVersion / maxNativeVersion`
- Android OTA 发布脚本
- OTA bundle 版本命名

结论：

- 本次修复没有引入新的 OTA 规则偏差

## 最终结论

- 根因判断：**高置信成立**
- 失败点定位：**安装状态机 dispatch 到原生桥接阶段**
- 代码修复：**已完成**
- 定向验证：**`src` 侧通过；`e2e/src` 镜像因仓库默认 include 未执行，但镜像内容已校验一致**

状态判断：

- **从代码修复角度：可作为 resolved 候选**
- **从线上反馈关闭角度：需等包含本次 H5 兼容回退的版本实际发布后，再正式标记 resolved**
