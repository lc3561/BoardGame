## 1. Spec
- [x] 1.1 为 `game-ai-system` 增加强单机 AI 与难度档位 delta spec
- [x] 1.2 明确公共搜索层与游戏适配层的职责边界
- [x] 1.3 明确强单机默认不得依赖远程 provider

## 2. Engine AI Core
- [x] 2.1 在 `src/engine/ai` 新增统一难度档位类型与归一化逻辑
- [x] 2.2 新增本地搜索/rollout 公共执行层，根动作集合保持为 `legalActions`
- [x] 2.3 新增公共 shortlist、稳定 tie-break、预算控制与调试 trace
- [x] 2.4 为不完全信息游戏预留 belief sampling 接口，但允许第一版以保守默认实现落地

## 3. Local UX / Debug
- [x] 3.1 扩展本地房间 AI 配置，允许为 `local-ai` 选择难度档位
- [x] 3.2 扩展 debug 面板，展示难度、预算、候选动作和最终估值摘要
- [x] 3.3 补充座位控制器序列化与反序列化测试，确保难度配置能稳定传递

## 4. Dice Throne First Rollout
- [x] 4.1 为 `Dice Throne` 实现游戏 AI 适配器：评估、剪枝、阶段特征与必要 rollout hook
- [x] 4.2 将 `Dice Throne` baseline local policy 升级为“启发式 + 浅搜索”强单机版本
- [x] 4.3 定义 `easy / normal / hard / expert` 在 `Dice Throne` 中的预算映射
- [x] 4.4 在现有测试文件补充不同难度下的代表性决策断言

## 5. Verification
- [x] 5.1 运行相关 Vitest，覆盖 seat controller、local runner、Dice Throne AI 决策
- [x] 5.2 验证本地房间 UI 与 debug 信息能正确反映难度档位
- [x] 5.3 为强单机 AI 的第一阶段效果、限制与后续接入顺序补充 evidence / 文档说明
