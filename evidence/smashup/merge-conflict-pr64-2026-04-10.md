# 冲突解决汇报：PR64 官方计分流程

## 1. 背景
- base: `origin/main`
- head: `deathcats4/codex/smashup-base-scoring-official-rules`
- 执行位置：`D:\gongzuo\webgame\BoardGame\.worktrees\merge-open-prs-20260410`
- 触发命令：`git merge -X patience origin/main --no-commit --no-ff`

## 2. 冲突文件
- `src/games/smashup/__tests__/afterScoring-rescoring.test.ts`
- `src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts`
- `src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts`
- `src/games/smashup/domain/baseAbilities.ts`
- `src/games/smashup/domain/index.ts`
- `src/games/smashup/domain/ongoingEffects.ts`
- `src/games/smashup/domain/reactionQueue.ts`
- `src/games/smashup/domain/reduce.ts`
- `src/games/smashup/domain/scoringSession.ts`

## 3. 解决策略

### `afterScoring-rescoring.test.ts`
- 策略：以 PR64 版本为主
- 合并要点：保留 `smashupScoring.currentBaseRef` 断言，不退回旧字段口径。
- 原因：PR64 的核心目标就是把计分阶段收拢到 scoring session。

### `afterscoring-window-skip-base-clear.test.ts`
- 策略：以 `origin/main` 为主
- 合并要点：保留 `base_ninja_dojo`、`base_the_mothership` 与 `pendingPostScoringActions` 清理回归。
- 原因：main 已包含 PR64 覆盖意图，并额外补了后续热修回归面。

### `multi-base-afterscoring-bug.test.ts`
- 策略：以 `origin/main` 为主
- 合并要点：保留更完整的海盗王 / 托尔图加 / 大副多交互链覆盖。
- 原因：main 版本覆盖面更广，能直接约束本次冲突最容易漏掉的多基地链式时序。

### `baseAbilities.ts`
- 策略：混合
- 合并要点：
  - 保留 PR64 的 `whenScoring` 体系与官方计分主链；
  - 带入 main 的 `mergeDeferredPostScoringCompatibility` / `appendPendingPostScoringActions`；
  - 在 `base_ninja_dojo`、`base_pirate_cove`、`base_temple_of_goju_tiebreak` 等交互收尾上统一走 scoring session。
- 原因：PR64 提供官方计分时机，main 提供后续补发/兼容热修，两边都不能整份丢。

### `index.ts`
- 策略：混合
- 合并要点：
  - 保留 PR64 的 `whenScoring` / scoring session 主流程；
  - 带入 main 的 `afterScoringInitialPowers`、`buildRescoredBaseEvent`、`pendingPostScoringActions` session 化、startTurn 清理与 `countMadnessCardsForPlayer`。
- 原因：PR64 决定主架构，main 负责后续补丁和兼容字段，必须合并。

### `ongoingEffects.ts`
- 策略：以 PR64 版本为主
- 合并要点：保留 `TitanAwareTriggerTiming` 对 `whenScoring` 的支持。
- 原因：否则 `whenScoring` 会被静默抹掉，PR64 主功能失效。

### `reactionQueue.ts`
- 策略：以 PR64 版本为主
- 合并要点：保留 `whenScoring` 标签映射。
- 原因：反应队列需要识别新时机，否则 UI/日志口径不完整。

### `reduce.ts`
- 策略：混合
- 合并要点：
  - 保留 PR64 的 scoring / reducer 变更；
  - 带入 main 的 `greatWolfSpiritDoubleTalentCardUids` 清理与 Great Wolf Spirit 双才能消费逻辑。
- 原因：这是 PR61 之后的真实回归修复，不能在合并 PR64 时回退掉。

### `scoringSession.ts`
- 策略：以 `origin/main` 为主
- 合并要点：保留 `pendingPostScoringActions`、`afterScoringInitialPowers`、`mergeDeferredPostScoringCompatibility`。
- 原因：main 版本是 PR64 session 模型上的后续补强，覆盖面更完整。

## 4. 风险与验证
- 风险点：
  - `whenScoring` 与 main 的 afterScoring 热修并存，最容易在 response window / 交互链收尾处重复清场或漏补发。
  - `pendingPostScoringActions` 已从 core 迁到 scoring session，若仍有旧调用点直读 core，可能出现跨基地串状态。
  - Great Wolf Spirit 双才能修复被重新带入后，需要确认未破坏 PR64 的 reducer 路径。
- 已跑命令：
  - `npx eslint src/games/smashup/__tests__/afterScoring-rescoring.test.ts src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts src/games/smashup/domain/baseAbilities.ts src/games/smashup/domain/index.ts src/games/smashup/domain/reduce.ts src/games/smashup/domain/scoringSession.ts`
  - `node .\\scripts\\infra\\vitest-cli-safe.mjs run src\\games\\smashup\\__tests__\\afterScoring-rescoring.test.ts src\\games\\smashup\\__tests__\\afterscoring-window-skip-base-clear.test.ts src\\games\\smashup\\__tests__\\multi-base-afterscoring-bug.test.ts src\\games\\smashup\\__tests__\\baseAbilityIntegration.test.ts --configLoader native`
  - `npm run typecheck`
  - `npm run i18n:check`
- 结果：
  - ESLint：0 error，存在仓库既有 warning
  - Vitest：4 文件 53 用例通过
  - TypeScript：通过
  - i18n：通过（仅 existing dynamic-key warning）

## 5. 回归与行为变化登记
- 原 PR 目标问题：
  - 官方计分流程补齐 `whenScoring`
  - afterScoring 响应窗口与多基地计分时序修正
- 本次额外发现的真实回归：
  - Great Wolf Spirit 双才能消费修复若不带入，会在合并 PR64 时被覆盖回退
  - `pendingPostScoringActions` 若继续停留在 core，会与 current main 的 scoring session 热修口径冲突
- 仅业务口径 / 规则变化：
  - `whenScoring` 成为正式基地能力时机，相关测试/审计应以此为准，不再继续沿用“beforeScoring 模拟官方中间时机”的旧说法
  - 建议同步落点：`src/games/smashup/rule/`、相关审计测试注释、`evidence/` 中的 afterScoring/计分流程文档

## 6. 结果
- merge commit：`dac8b685 合并 main 到 PR64 并解决官方计分流程冲突`
- merge audit：
  - `npm run merge:audit -- HEAD` → 9 个冲突文件全部为“混合结果”
  - `npm run merge:audit:strict -- HEAD` → 通过；`完全等于父1/父2` 均为 0
- push：目标分支 `deathcats4/codex/smashup-base-scoring-official-rules`
