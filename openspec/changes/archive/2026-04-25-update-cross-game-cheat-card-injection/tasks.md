## 1. Specification
- [x] 1.1 新增 `cheat-system` capability，定义 deck-only 与 stable-identity injection 的统一语义。
- [x] 1.2 在 spec 中明确 atlas 信息仅可作为展示/速查辅助，不得默认充当跨游戏稳定主键。
- [x] 1.3 在 spec 中明确不支持完整卡池注入的游戏必须显式降级说明。

## 2. Engine Contract
- [x] 2.1 审查并收敛 `CheatSystem` 现有命令契约，确保 deck-only 与 direct-add 两类命令职责清晰。
- [x] 2.2 如需补充共享 helper 或类型，限制在命令契约与共享语义层，不把游戏实例工厂上推到引擎。

## 3. Game Migrations
- [x] 3.1 将 `summonerwars` 调试发牌从“只看剩余牌库的 atlas 命令”迁移到稳定身份注入语义，并修复 atlas 歧义。
- [x] 3.2 保持 `dicethrone` 现有行为，但对齐到统一共享契约与测试口径。
- [x] 3.3 将 `smashup` 调试面板与 cheat 实现明确标记为 deck-only，不再暗示支持完整卡池注入。
- [x] 3.4 为 `cardia` 补齐当前不支持完整卡池注入的显式说明或受控接入点。

## 4. Validation
- [x] 4.1 为 `summonerwars` 补充单测，覆盖“剩余牌库耗尽后仍可按稳定标识补牌”与“atlas 冲突不再误命中”。
- [x] 4.2 复跑 `dicethrone` 相关单测与 E2E，确认共享契约未回归。
- [x] 4.3 更新受影响游戏的 E2E / 证据文档，截图证明调试工具语义与实际行为一致。
