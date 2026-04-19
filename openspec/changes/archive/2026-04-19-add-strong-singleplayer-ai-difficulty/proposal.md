# Change: 强单机 AI 难度体系

## Why
- 当前项目已经具备跨游戏 AI 的统一骨架，但本地 AI 仍以“合法动作枚举 + 单步启发式打分”为主，适合陪练和联调，不足以支撑“像样的单机对手”。
- 用户已经明确目标是“强单机对手，并且可以选择难度”，这与当前 `baseline scorer` 路线不是同一个产品目标。
- 如果继续在现有 scorer 上零散加权重，会很快退化成每个游戏各写一堆难维护的特判，既做不强，也无法稳定扩到更多游戏。

## What Changes
- 在现有 `game-ai-system` 骨架上新增“强度层”，把本地 AI 定位从“陪练 bot”升级为“可配置难度的强单机对手”。
- 定义统一难度档位契约，难度由搜索预算、评估精度、随机扰动和隐藏信息采样策略共同决定，而不是只改几个权重常数。
- 定义跨游戏可复用的本地搜索框架：
  - 以 `legalActions` 为根动作集合
  - 支持 shortlist、浅层 lookahead、rollout / MCTS、稳定 tie-break
  - 支持完全信息与不完全信息游戏的不同采样策略
- 定义“公共 AI 核心层”和“游戏专属适配层”的边界，避免搜索、预算、难度、调试、采样框架在每个游戏重复实现。
- 明确第一落地对象为 `Dice Throne`，`Summoner Wars` 为第二优先级，`Smash Up` 在强度层稳定后再接入。

## Impact
- Affected specs:
  - `game-ai-system`
- Affected code:
  - `src/engine/ai/`
  - `src/engine/transport/react.tsx`
  - `src/components/lobby/LocalMatchConfigModal.tsx`
  - `src/components/game/framework/widgets/GameDebugPanel.tsx`
  - `src/games/dicethrone/ai.ts`
  - 后续扩展时会涉及 `src/games/summonerwars/ai.ts` 与 `src/games/smashup/ai.ts`

## Scope Notes
- 本提案只定义“强单机 AI + 难度体系”的架构与第一阶段落地方向，不在 proposal 阶段承诺所有游戏同时达到强 AI 水平。
- 远程 provider / AstrBot 继续保留为实验与外部接入能力，但不作为强单机模式的默认执行路径。
