## ADDED Requirements

### Requirement: 强单机模式 SHALL 建立在本地确定性 AI 之上
系统 SHALL 将“强单机对手”定义为本地可复现、可预算控制、可离线运行的 AI 模式，而不是默认依赖远程 provider 或外部大模型服务。

#### Scenario: 专家难度默认使用本地 AI
- **GIVEN** 某个游戏启用了强单机 AI 模式
- **WHEN** 玩家选择 `hard` 或 `expert` 等高难度档位
- **THEN** 系统 MUST 使用本地 AI 执行路径完成决策
- **AND** 不得把远程 provider 作为该档位的默认实现

#### Scenario: 远程 provider 仍可作为实验模式存在
- **GIVEN** 某个游戏已接入远程 provider
- **WHEN** 项目启用远程 AI 试验入口
- **THEN** 系统 MAY 允许其作为独立模式运行
- **AND** 不得把该模式冒充为正式强单机档位

### Requirement: 难度档位 SHALL 由统一预算模型驱动
系统 SHALL 为本地强单机 AI 提供统一难度档位，并要求难度差异主要由搜索预算、评估精度、随机扰动和隐藏信息采样策略共同决定，而不是仅靠动作权重常数的松散修改。

#### Scenario: 难度档位映射到统一参数
- **GIVEN** 某个本地 AI 座位配置了难度
- **WHEN** 系统归一化该座位的 AI 设置
- **THEN** 系统 MUST 将该难度映射到统一参数集
- **AND** 参数集 MUST 至少覆盖搜索预算、候选 shortlist 规模、随机扰动强度与评估配置

#### Scenario: 同一档位在不同游戏保持总体语义一致
- **GIVEN** 两个不同游戏都声明支持强单机 AI
- **WHEN** 玩家分别选择 `normal` 或 `hard`
- **THEN** 系统 MUST 保持这些档位在总体强度语义上的一致性
- **AND** 允许游戏在同一语义下覆盖具体预算数值

### Requirement: 公共搜索框架 SHALL 复用 legalActions 根动作集合
系统 SHALL 提供跨游戏可复用的本地搜索框架，并要求所有浅层搜索、rollout 或 MCTS 增强逻辑都以当前 `legalActions` 作为根动作集合。

#### Scenario: 搜索从合法动作出发
- **GIVEN** 本地 AI 进入搜索模式
- **WHEN** 系统准备展开候选动作
- **THEN** 搜索根节点 MUST 仅包含当前 `AiDecisionContext.legalActions`
- **AND** 不得另起一套绕过统一合法性边界的专用动作构造器

#### Scenario: 搜索结果仍返回统一决策对象
- **GIVEN** 搜索流程已经完成候选动作评估
- **WHEN** 系统输出最终决策
- **THEN** 系统 MUST 仍返回统一 `AiActionDecision`
- **AND** 后续执行链 MUST 继续走既有 validate / execute / reduce / systems

### Requirement: 公共层与游戏层 SHALL 明确分工
系统 SHALL 将强单机 AI 的通用算法能力收敛到公共层，并要求游戏层仅提供局面评估、动作剪枝、隐藏信息采样和少量专属 rollout hook，而不是在每个游戏中重复实现整套搜索、预算和调试逻辑。

#### Scenario: 游戏层提供评估与剪枝
- **GIVEN** 某个游戏接入强单机 AI
- **WHEN** 该游戏实现自己的 AI 适配器
- **THEN** 适配器 MUST 至少能够提供局面评估或动作估值能力
- **AND** 适配器 MAY 提供动作剪枝与隐藏信息采样逻辑

#### Scenario: 公共层统一控制预算与 trace
- **GIVEN** 本地 AI 在任意游戏中运行搜索
- **WHEN** 系统记录本次决策过程
- **THEN** 搜索预算、候选 shortlist、tie-break 与调试 trace MUST 由公共层统一生成
- **AND** 游戏层不得各自维护第二套预算与 trace 协议

### Requirement: 不完全信息游戏 SHALL 支持 belief sampling 扩展点
系统 SHALL 为存在隐藏信息的桌游提供统一的 belief sampling 扩展点，使高难度本地 AI 可以在 `playerView` 边界内进行保守采样，而不是直接读取对手隐藏信息。

#### Scenario: 高难度使用采样而不是透视
- **GIVEN** 某个游戏存在隐藏手牌、牌堆顺序或其他隐藏信息
- **WHEN** `hard` 或 `expert` 难度需要估计后续局面
- **THEN** 系统 MUST 通过采样或保守估计生成搜索用状态
- **AND** 不得把真实隐藏信息直接暴露给 AI

#### Scenario: 未实现采样时允许保守降级
- **GIVEN** 某个游戏尚未实现专属 belief sampling
- **WHEN** 该游戏先接入第一版强单机框架
- **THEN** 系统 MAY 退化为基于可见信息的保守估计
- **AND** 必须保持统一 `playerView` 边界不被突破
