## Context

项目现有 AI 系统已经完成：
- 统一 `AiDecisionContext`
- 统一 `legalActions`
- seat controller / local runner / remote provider
- 训练样本采集
- 若干游戏的 baseline 启发式策略

但这些能力主要解决“怎么接 AI”，没有解决“怎么把 AI 做强”。当前 `Smash Up / Dice Throne / Summoner Wars` 仍以单步 scorer 为主，只能在当前帧挑一个看起来收益更高的动作，无法稳定体现：
- 多步规划
- 关键回合资源保留
- 对手威胁预判
- 难度可配置
- 隐藏信息下的稳健决策

用户已经将目标明确为“强单机对手”，因此本轮必须把 AI 体系从“统一接口骨架”推进到“统一强度框架 + 游戏适配层”。

## Goals / Non-Goals

- Goals:
  - 在统一 `legalActions` 契约上构建可复用的本地强度框架
  - 提供 `简单 / 普通 / 困难 / 专家` 等难度档位的正式定义
  - 让难度主要由搜索预算、评估精度、采样策略和随机扰动决定
  - 明确公共层与游戏层的边界，避免搜索和预算逻辑在每个游戏重复实现
  - 以 `Dice Throne` 作为第一落地对象验证整套框架
- Non-Goals:
  - 本轮不要求所有游戏同时达到强 AI
  - 本轮不把大模型 / 远程 provider 作为强单机默认解
  - 本轮不承诺立即引入重型神经网络训练基础设施
  - 本轮不做“全仓所有游戏 AI 全量重写”

## Decisions

### Decision: 强单机模式默认走本地确定性 AI，而不是远程大模型

强单机对手的核心要求是：
- 可复现
- 可控预算
- 可离线运行
- 可稳定回归测试
- 不受网络、额度、外部服务波动影响

因此强单机模式默认必须是本地 AI。远程 provider 只保留为实验位或未来扩展位，不能成为默认专家难度的依赖。

### Decision: 难度档位建立在统一搜索框架上，而不是每个游戏各自发明

难度不应该只靠“把某个动作权重从 50 改成 70”。  
统一难度档位至少要控制：
- `searchDepth` 或等价的 lookahead 步数
- `candidateShortlistSize`
- `rolloutCount` / `simulationBudgetMs`
- `randomness` / exploration 噪声
- `beliefSampleCount`（不完全信息游戏）
- `evaluatorProfile`

这样不同游戏才能共享“什么叫简单、什么叫困难”的总体口径。

### Decision: 公共层负责搜索与预算，游戏层负责评估与剪枝

公共层只实现一次：
- 搜索框架（shortlist、浅层 lookahead、rollout / MCTS）
- 难度档位解析
- 预算控制与超时回退
- 调试信息与评分明细
- 稳定 tie-break
- 随机扰动注入

游戏层只提供：
- `evaluateState(state, playerId, phaseContext)`
- `scoreActionHeuristic(context, action)`
- `pruneActions(context, actions)`
- `sampleHiddenInfo(context)`（必要时）
- 个别游戏专属 rollout / simulator hook（必要时）

这样可把“重复算法”收敛到公共层，而把不可避免的“游戏价值判断”留在游戏层。

### Decision: 搜索根动作集合仍然必须是 `legalActions`

无论是浅层搜索、beam search、expectimax 还是 MCTS，根动作集合都必须来自统一 `legalActions`。  
不允许另起一套“搜索专用指令构造器”，否则会破坏当前 AI 系统最重要的合法性边界。

### Decision: 第一落地对象固定为 Dice Throne

`Dice Throne` 是当前最合适的第一对象：
- 阶段结构清晰
- 动作边界比 `Smash Up` 收敛
- 有一定复杂度，足以验证搜索收益
- 已经支持 `remote-ai`，利于对比本地强 AI 与远端实验位

`Summoner Wars` 适合作为第二阶段验证战术 lookahead。
`Smash Up` 分支更大、隐藏信息更多、卡牌异质性更强，应在公共强度层稳定后再接。

## Architecture

## 1. 公共 AI 核心层

新增 `src/engine/ai/core/` 一类的公共层，负责：
- `AiDifficultyProfile`
- `AiSearchPolicy`
- `AiSearchRuntime`
- `AiSearchTrace`
- `AiBeliefSampler`
- `AiActionShortlist`

核心输入仍然是：
- `AiDecisionContext`
- 游戏适配器
- 难度档位

核心输出仍然是：
- `AiActionDecision`

## 2. 游戏适配器层

每个游戏实现统一适配接口，例如：
- `evaluateState`
- `estimateActionValue`
- `pruneActions`
- `isTerminalLike`
- `sampleHiddenInfo`

要求：
- 不得重复实现预算控制、通用 tie-break、调试 trace
- 可以提供游戏专属 feature 提取
- 可以覆盖默认 shortlist 和 rollout 规则

## 3. 难度模型

建议难度语义：

- `easy`
  - 启发式评分为主
  - 只看很浅的后继
  - 保留明显随机扰动

- `normal`
  - 启发式 + 1 层 lookahead
  - 有限 shortlist
  - 轻度随机

- `hard`
  - 启发式 + 多步 lookahead / rollout
  - 更严格 shortlist
  - 大幅减少随机

- `expert`
  - 最大预算
  - 关键阶段加深搜索
  - 不完全信息游戏启用更高 belief sample 数
  - 仅保留极小探索噪声用于防止过度机械重复

## 4. 隐藏信息策略

并非所有桌游都能把隐藏信息问题忽略掉。

- 完全信息游戏：可直接用可见状态搜索
- 不完全信息游戏：必须允许 belief sampling

最小通用方案：
- 公共层定义采样接口
- 默认可退化为“只基于 playerView 的保守估计”
- 强难度档位允许多次采样并汇总动作价值

## 5. 调试与验证

强单机 AI 必须具备可审计性。公共层应统一输出：
- 难度档位
- 预算耗时
- shortlist 规模
- 搜索深度 / rollout 次数
- 顶部候选动作与估值
- 最终 tie-break 依据

这些信息应进入 debug 面板和测试断言，而不是只存在临时日志。

## Risks / Trade-offs

- 若公共层抽象过重，会拖慢首个游戏落地。
  - 解决：第一版只支持浅层搜索 + rollout，不先做完整通用 MCTS 平台。
- 若游戏层接口过轻，会逼迫公共层知道太多游戏语义。
  - 解决：明确评估、剪枝、采样由游戏层负责。
- `Smash Up` 这类强异质卡牌游戏可能短期内仍达不到“专家很强”。
  - 解决：分阶段推进，先让 `Dice Throne` 打穿整套框架。
- 如果把强单机建立在远程 provider 上，会失去可复现和离线能力。
  - 解决：规范中明确禁止将其作为默认专家模式实现。

## Migration Plan

1. 新增 `game-ai-system` delta，补充强单机与难度档位要求
2. 在 `src/engine/ai` 引入公共难度与搜索框架
3. 扩展本地房间与调试面板，允许显式选择 AI 难度
4. 将 `Dice Throne` baseline policy 升级为“启发式 + 浅搜索”版本
5. 补充回归测试、难度配置测试和调试输出验证
6. 第二阶段再评估 `Summoner Wars`

## Open Questions

- 第一版搜索框架使用 beam search + rollout，还是直接抽象成轻量 MCTS？
- 难度选择是否需要同时暴露“预设档位”和“高级自定义预算”？
- `Smash Up` 的隐藏信息采样是否需要在第一轮框架中预留更明确接口？
