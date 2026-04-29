## Context
- 项目已经存在两种 Android WebView 模式：
  - `remote`：直接加载线上 H5
  - `embedded`：将 `dist/` 内嵌进 APK
- 用户当前选择的长期方案不是 `remote`，而是更接近平台型引擎的 `embedded + OTA runtime + 按游戏分包`。
- 这意味着移动端交付需要从“整包交付”改成“壳、运行时、游戏模块、游戏素材”分层交付。

## Goals / Non-Goals
- Goals:
  - 首包只携带移动端基础壳、通用 runtime、包管理 UI 与少量通用资源。
  - 官方游戏按游戏拆分为“代码包 + 素材包”，用户按需安装。
  - 支持 OTA 更新通用 runtime，而不是每次更新所有游戏。
  - 在移动端详情页左下角提供清晰、固定、可恢复的安装/更新入口。
  - 通过显式 manifest 建立 `runtime -> module pack -> asset pack` 的兼容关系。
- Non-Goals:
  - 本次不设计任意用户 JS 代码执行的 UGC 热插拔机制。
  - 本次不覆盖 iOS 审核/渠道发布细则，只规定工程侧能力与边界。
  - 本次不要求桌面 Web 立即复用同一套分包 UI。

## Decisions

### Decision: 采用四层交付结构
- 层级：
  - `shell`：原生壳与包管理容器
  - `runtime`：通用大厅、路由、下载/更新器、引擎公共层
  - `module pack`：某个游戏的专属规则、UI、注册入口
  - `asset pack`：某个游戏的图片、音频、图集与资源清单
- 理由：
  - 避免所有游戏代码都随首包或 OTA 全量携带。
  - 允许只修通用层，而不强迫所有游戏模块同步重发。

### Decision: 运行时 OTA 仅覆盖通用 runtime
- OTA 渠道只更新 `runtime`，不直接把所有游戏模块重新塞进运行时包。
- 某个游戏的功能变更应通过该游戏自己的 `module pack` 更新完成。
- 理由：
  - 把 OTA 包体积控制在“大厅 + 通用框架”级别。
  - 降低一个游戏改动引发全量用户下载的概率。

### Decision: 游戏代码包与素材包按游戏独立管理
- 每个游戏至少有两个可独立版本化的包：
  - `module pack`
  - `asset pack`
- 允许某个游戏只更新代码包、只更新素材包，或同时更新两者。
- 但进入游戏前必须检查兼容矩阵，防止“新代码吃旧图”或“旧代码读新素材结构”。

### Decision: 使用显式发布清单而非隐式推断
- 移动端包管理必须依赖单一发布清单，例如：
  - `runtimeVersion`
  - `gameId`
  - `modulePack.version`
  - `modulePack.minRuntimeVersion`
  - `assetPack.version`
  - `assetPack.minModuleVersion`
  - `checksum`
  - `size`
  - `downloadUrl`
- 理由：
  - 满足“显式 > 隐式”的项目总规范。
  - 便于回滚、灰度、错误提示与审计。

### Decision: 详情页左下角提供移动端专用安装/更新区
- 安装/更新主入口固定在移动端游戏详情页左下角。
- 该区域只承担“包管理”职责，不替换现有房间列表、更新日志、作者信息的主信息层级。
- 必须显示最小必要信息：
  - 当前是否已安装
  - 是否需要下载代码包/素材包
  - 是否存在可更新版本
  - 下载/校验/安装进行中状态
  - 失败重试入口
- 理由：
  - 用户已明确指定位置。
  - 左下角悬浮入口符合项目对辅助按钮 overlay 化的规范，不挤占核心内容流。

## Architecture

### Package Metadata
- `GameManifestEntry` 新增移动端包交付元数据，例如：
  - `mobileDelivery.mode`: `builtin` | `package-managed`
  - `mobileDelivery.modulePackId`
  - `mobileDelivery.assetPackId`
  - `mobileDelivery.runtimeChannel`
- 仅 `shellTargets` 包含 `app-webview` 的游戏允许声明这些字段。

### Release Manifest
- 运行时启动时拉取或读取发布清单。
- 清单为单一真实来源，声明：
  - 当前 runtime 版本
  - 所有游戏可用模块包/素材包版本
  - 兼容约束
  - 下载地址与校验信息

### Local Storage Layout
- 设备侧按稳定目录保存：
  - `runtime/<version>/`
  - `games/<gameId>/module/<version>/`
  - `games/<gameId>/assets/<version>/`
- 活跃版本切换必须是原子操作；切换失败时回退到上一个已验证版本。

### Load Order
1. 壳启动并装载当前激活的 runtime。
2. 用户打开某游戏详情页时，读取本地安装状态与远端最新发布状态。
3. 用户点击左下角安装/更新后，先下载并校验所需包。
4. 进入游戏前再次检查：
   - runtime 版本满足模块包需求
   - 模块包版本满足素材包需求
   - 本地校验记录完整
5. 任一条件不满足则阻止进入，并给出明确更新/重试提示。

## Risks / Trade-offs
- 分包后构建/发布链路变复杂，需要独立的包产物和清单生成流程。
- 游戏模块若与 runtime 接口耦合过深，会放大兼容矩阵成本。
- 如果未来允许更细粒度的 UGC 代码包，安全和回滚复杂度会继续上升。

## Migration Plan
1. 先建立 spec 与 manifest 结构。
2. 首批只让移动端详情页显示包状态和占位安装区。
3. 再补 runtime / module / asset 包产物生成与本地管理。
4. 最后切掉“embedded 默认内置所有游戏”的旧路径。

## Open Questions
- 首批内置在首包中的“最小可玩游戏”是否需要保留 1 个离线 demo 作为兜底？
- 游戏模块包是否允许在未联网时卸载重装，还是只在在线状态下管理？
