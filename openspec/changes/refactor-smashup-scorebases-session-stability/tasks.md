## 1. Implementation
- [ ] 1.1 设计并引入 SmashUp `scoring session` 状态结构，明确当前基地、剩余基地、session 阶段、延迟 post-scoring 事件与力量快照的唯一落点
- [ ] 1.2 重构 `onPhaseEnter/onPhaseExit/onAutoContinueCheck`，改为只通过 scoring session 推进 `scoreBases`，不再依赖分散的 `flowHalted + scoredBaseIndices + afterScoringInitialPowers` 组合补链
- [ ] 1.3 重构 `scoreOneBase()` 与 `multi_base_scoring` handler：单基地步骤执行与多基地总控解耦，handler 不再负责判断是否最后一个交互或补发 deferred events
- [ ] 1.4 从 `SmashUpEventSystem.afterEvents()` 与 `InteractionSystem.resolveInteraction()` 中移除 SmashUp 专属 `_deferredPostScoringEvents` 传播/补发逻辑，保留通用交互系统职责
- [ ] 1.5 收敛各 afterScoring handler（至少覆盖大副、海盗湾、托尔图加、刚柔流寺庙、母舰、侦察兵链）到新 session 契约，删除重复 flag/补链代码

## 2. Validation
- [ ] 2.1 补/改领域测试：单基地 afterScoring、多基地顺序选择、基地能力 + 随从 trigger 链、afterScoring response window 重算、延迟清场/换基地只触发一次
- [ ] 2.2 运行 SmashUp 相关 Vitest（至少覆盖 `scoreBases-auto-continue`、multi-base/afterscoring 回归、pirate/temple/mothership 组合测试）
- [ ] 2.3 运行相关 E2E，并在 `evidence/` 留下截图与人工验收结论，证明多基地 + afterScoring 真实链路稳定
- [ ] 2.4 运行 `npx eslint` 针对修改文件、必要时补 `npx tsc --noEmit`，并执行 `openspec validate refactor-smashup-scorebases-session-stability --strict --no-interactive`
