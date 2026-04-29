## ADDED Requirements

### Requirement: 移动端必须区分 runtime、游戏代码包与游戏素材包
系统 SHALL 将移动端可下载内容明确拆分为 `runtime`、`game module pack` 与 `game asset pack` 三类，而不是把所有游戏代码和素材永久固化在首包内。

#### Scenario: 首包仅提供基础运行能力
- **GIVEN** 用户首次安装 Android `embedded` App
- **WHEN** App 首次启动
- **THEN** 系统 MUST 只依赖首包内置的基础壳、通用 runtime 与包管理 UI 完成启动
- **AND** 不得要求所有官方游戏代码默认随首包内置

#### Scenario: 某个游戏按需安装模块包与素材包
- **GIVEN** 某个游戏被标记为 `package-managed`
- **WHEN** 用户首次尝试在移动端进入该游戏
- **THEN** 系统 MUST 允许仅下载该游戏对应的代码包与素材包
- **AND** 不得要求同时下载其他未游玩游戏的包

### Requirement: 运行时 OTA 只更新通用 runtime
系统 SHALL 支持通过 OTA 更新通用 runtime，而不是在每次 OTA 时强制重新下发所有游戏模块包。

#### Scenario: 通用层版本更新
- **GIVEN** 发布清单声明存在新的 `runtimeVersion`
- **WHEN** 移动端执行运行时更新检查
- **THEN** 系统 MUST 只更新通用 runtime 包
- **AND** 已安装的游戏模块包 MUST 保持原状，除非兼容规则明确要求它们升级

### Requirement: 游戏模块包与素材包必须通过单一发布清单声明兼容关系
系统 SHALL 使用单一发布清单声明 `runtime`、`module pack`、`asset pack` 的版本、兼容约束、下载地址、体积和校验信息。

#### Scenario: 进入游戏前检查兼容性
- **GIVEN** 用户已安装某个游戏的模块包与素材包
- **WHEN** 用户尝试进入该游戏
- **THEN** 系统 MUST 先校验当前 runtime、模块包与素材包版本是否满足清单中的兼容约束
- **AND** 任一约束不满足时 MUST 阻止进入并提示用户更新对应包

#### Scenario: 发布清单缺少校验信息
- **GIVEN** 某个游戏包在发布清单中缺少 `checksum` 或等价校验字段
- **WHEN** 客户端尝试下载该包
- **THEN** 系统 MUST 拒绝安装该包
- **AND** MUST 向用户展示明确失败原因

### Requirement: 本地安装、更新与激活切换必须原子化
系统 SHALL 将 runtime、模块包与素材包存储为可版本化的本地目录，并在激活版本切换时保证原子性与可回退性。

#### Scenario: 包更新校验失败
- **GIVEN** 客户端已存在某个游戏的已安装版本
- **AND** 新下载的包在校验或解包阶段失败
- **WHEN** 系统准备切换到新版本
- **THEN** 系统 MUST 保持旧版本继续可用
- **AND** 不得让该游戏进入“既不可玩也不可回退”的中间状态

### Requirement: 移动端详情页必须提供每个游戏独立的下载与更新状态
系统 SHALL 在移动端为每个游戏维护独立的安装状态、下载状态、错误状态与可更新状态，而不是只提供全局更新语义。

#### Scenario: 某个游戏未安装
- **GIVEN** 用户打开某个 `package-managed` 游戏的详情页
- **AND** 当前设备尚未安装该游戏包
- **WHEN** 包状态被读取
- **THEN** 系统 MUST 明确显示该游戏“未安装”
- **AND** MUST 提供针对该游戏的独立安装入口

#### Scenario: 某个游戏存在可更新版本
- **GIVEN** 当前设备已安装该游戏包
- **AND** 发布清单声明该游戏存在兼容的更新版本
- **WHEN** 用户打开该游戏详情页
- **THEN** 系统 MUST 明确显示“可更新”
- **AND** 更新操作 MUST 只作用于当前游戏

#### Scenario: 安装成功后退出确认态
- **GIVEN** 用户已在移动端详情页确认下载某个 `package-managed` 游戏包
- **AND** 下载、校验与本地激活已经成功完成
- **WHEN** 安装状态切换为 `installed`
- **THEN** 安装确认弹窗 MUST 退出当前确认流程
- **AND** 不得重新回退为“确认下载”预览态
