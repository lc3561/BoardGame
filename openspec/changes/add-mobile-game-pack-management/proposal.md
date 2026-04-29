# Change: 移动端游戏包管理与按游戏下载更新

## Why
- 当前 Android App 壳虽然已经支持 `embedded` / `remote` 两种加载模式，但 `embedded` 方案默认仍以“完整 Web 包随 APK 一起内置”为主，不适合游戏数量持续增长后的体积控制。
- 如果只做“整套 Web 代码 OTA + 素材分包”，移动端仍会携带未游玩游戏的代码，无法体现平台型/UGC 引擎应有的按需下载能力。
- 用户已经明确选择更长期正确的方案：**首包只带壳与通用 runtime，游戏代码包与素材包按游戏独立下载/更新**，并要求安装/更新入口固定在**移动端游戏详情页左下角**。

## What Changes
- 新增移动端游戏包管理能力：区分 `runtime`、`game module pack`、`game asset pack` 三层内容，并通过发布清单声明兼容关系。
- Android `embedded` 壳改为“基础壳 + 通用 runtime + 包管理器”模式，不再要求所有官方游戏代码默认内置在首包。
- 允许移动端按游戏独立下载、校验、启用、更新游戏代码包与素材包；进入游戏前必须进行版本兼容检查。
- 游戏详情页在移动端提供固定的左下角安装/更新操作区，显示未下载、可更新、下载中、已安装、版本不兼容等状态。
- 游戏注册表补充显式的移动端包交付元数据，避免运行时靠隐式规则推断某个游戏是否需要模块包/素材包。

## Impact
- Affected specs:
  - android-app-shell
  - game-details-content
  - game-registry
  - mobile-game-pack-management
- Affected code:
  - `src/games/manifest.types.ts`
  - `src/config/games.config.tsx`
  - `src/components/lobby/GameDetailsModal.tsx`
  - `src/components/lobby/` 下与详情页动作区相关组件
  - 移动端包管理器、发布清单读取、下载/校验/切换相关模块（新建）
  - Android `embedded` 构建/运行时装载链路
