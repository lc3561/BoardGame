## ADDED Requirements

### Requirement: AI Repo Workbench SHALL 以官方 Chatbot 路由作为内部主入口

系统 MUST 将 `AI Repo Workbench` 的内部使用入口固定为 Flowise 官方聊天页路由，而不是继续维护外部自定义工作台页面作为主任务表面。

#### Scenario: 侧边栏入口直达官方聊天页
- **WHEN** 用户在 Flowise 左侧菜单点击 `AI 仓库工作台`
- **THEN** 系统 MUST 直接进入固定 `flowId` 的 `/chatbot/:flowId` 官方页面
- **AND** 该页面 MUST 作为当前主任务的默认使用入口

#### Scenario: 外部自定义工作台页面被撤下
- **WHEN** 当前任务已经收口到官方聊天页
- **THEN** 系统 MUST 不再保留与之平级的外部自定义 `AIRepoWorkbench` 主页面入口
- **AND** 不得继续把旧外部壳作为主任务线程容器维护

#### Scenario: 内部仍可进入 Flowise 配置与编辑
- **WHEN** 开发者需要查看或修改节点配置
- **THEN** 系统 MAY 保留进入 Flowise 官方配置页、画布页或模块列表的内部入口
- **AND** 这些入口 MUST 作为配置/调试入口存在
- **AND** 不得重新升级为主任务表面

### Requirement: 官方聊天页 reset SHALL 真正清除 external 会话

当官方聊天页被用作当前主入口时，`Reset Chat` MUST 同时清掉前端 local session 与服务端 external chat history，避免旧会话在刷新或重挂后复活。

#### Scenario: reset 删除 external chat history
- **WHEN** 用户在官方聊天页点击 `Reset Chat`
- **THEN** 系统 MUST 删除当前 `chatId` 对应的 external chat history
- **AND** 清除本地 external session 存储
- **AND** 重新挂载聊天组件，避免旧实例把脏状态写回

#### Scenario: reset 后恢复欢迎态
- **WHEN** reset 完成
- **THEN** 页面 MUST 恢复欢迎文案、空输入框与默认 placeholder
- **AND** 旧消息不得继续显示在页面中

### Requirement: Flowise SHALL 只负责编排与会话壳，五个业务阶段 MUST 由专业执行器承载

系统 MUST 将 `数据录入 / 旧派系参考 / 实施 / 审计 / 上传验收` 五个阶段视为真实业务执行步骤，并通过外部专业执行器完成，而不是继续使用 `llmAgentflow` 只生成阶段性文本摘要。

#### Scenario: 五个阶段通过外部执行器调用
- **WHEN** 主总控 flow 进入上述五个阶段
- **THEN** 系统 MUST 通过 HTTP Node、MCP、Custom Tool 或等价官方扩展能力调用外部执行器
- **AND** 每个阶段 MUST 有可观测的执行边界与返回结构
- **AND** 不得仅用 `llmAgentflow` 输出一段摘要文本来冒充已执行

#### Scenario: 本项目默认采用 HTTP executor 边界
- **WHEN** 当前项目实现上述五个阶段
- **THEN** 系统 SHOULD 默认采用 `Flowise HTTP Node -> 本地 Nest API` 这条执行边界
- **AND** 让 Flowise 继续只承担聊天入口、状态编排与子流组织

#### Scenario: 子流仍保留官方编排语义
- **WHEN** 系统将阶段执行切到外部专业执行器
- **THEN** 总控流与子流的组织方式 MUST 继续保留在 Flowise 官方节点编排中
- **AND** 不得因为执行器外移就重新回到自定义外部线程式工作台

### Requirement: 编码执行器 SHALL 可替换，Codex CLI 不是强制前提

系统 MUST 以可替换执行器契约来承载编码或其他仓库操作能力；`Codex CLI` MAY 作为其中一种实现，但系统不得将其写成唯一前提。

#### Scenario: 使用 Codex CLI 作为某阶段执行器
- **WHEN** 当前环境存在 `Codex CLI` 且该项目选择使用它
- **THEN** 系统 MAY 通过统一执行器边界调用该 CLI
- **AND** Flowise 侧只感知阶段输入、输出、状态与失败信息

#### Scenario: 使用其他 CLI 或本地服务替代 Codex
- **WHEN** 当前环境未使用 `Codex CLI`
- **THEN** 系统 MUST 允许使用其他 CLI、本地服务或 MCP adapter 承担同一执行阶段
- **AND** 不得因为缺少 `Codex CLI` 就阻断整个工作流主链路

### Requirement: 工作流运行上下文 SHALL 支持显式 `projectPath`

系统 MUST 允许工作流启动入口、阶段执行端点与运行时显式接收 `projectPath`，以便工具仓库与目标项目仓库平级放置；不得把当前工具仓库路径硬编码为唯一执行上下文。

#### Scenario: 启动工作流时指定目标项目目录
- **WHEN** 用户或上层调用方启动一次 AI Repo Workbench workflow run
- **THEN** 系统 MUST 允许请求体显式传入 `projectPath`
- **AND** 后续 active worktree / repo context MUST 绑定到该目录而不是默认写死路径

#### Scenario: 未显式传入时可使用环境默认值
- **WHEN** 调用方未显式传入 `projectPath`
- **THEN** 系统 MAY 使用部署环境提供的默认项目目录配置
- **AND** 该默认值 MUST 可通过环境变量覆盖
- **AND** 不得要求改代码才能切换到另一目标项目

#### Scenario: 阶段执行器透传目标项目目录
- **WHEN** 总控流调用 `data-entry / reference-faction / implementation / audit / upload` 等阶段执行端点
- **THEN** 系统 MUST 将当前 `projectPath` 透传到对应执行器
- **AND** 执行器内的文档查找、素材检查、CLI cwd 与产物定位 MUST 基于该目录解析

#### Scenario: 前端语义使用 projectPath 而非 worktreePath
- **WHEN** 前端或 API client 暴露目标目录输入
- **THEN** 对外语义 SHOULD 使用 `projectPath`
- **AND** 如需兼容旧字段 `worktreePath`，兼容层 MUST 只作为过渡实现存在
- **AND** 不得继续把“任意项目目录”误建模成只能登记 git worktree 的专用路径字段
