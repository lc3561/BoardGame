# SmashUp 线上 AI 自动反馈复核（2026-04-30）

- 时间：2026-04-30
- 范围：生产库中仍为 `open` 的 Smash Up watchdog 自动反馈
- 来源口径：生产 Mongo `feedbacks` 集合（`source=online-ai-watchdog` / `contactInfo=system:online-ai-watchdog`）
- 生产机：`admin@8.148.71.102`
- 生产仓库 HEAD：`2d1b8bf8b3fea80a536dd5ff3008b5e032752027`

## 生产中仍开的两条 Smash Up 自动反馈

1. `69ef240e039f95a4fe91c293`
   - 内容：`[system][online-ai-watchdog] force-end-turn-failed visible-interaction:recover-interaction:blocker_persisted`
   - 关键快照：
     - `phase=scoreBases`
     - `sourceId=smashup_reaction_choose`
     - 选项包含 **重复** `activate_special:titan:titan_2_wizards_arcane_protector:1`
     - `legalActions.total=3`，其中前两项 actionId 也重复
   - 结论：这是“计分基地索引重复 → 反应选项重复 → watchdog 反复看到同一 blocker”的历史链路。

2. `69ef22c6039f95a4fe91c1c7`
   - 内容：`[system][online-ai-watchdog] force-end-turn-failed visible-interaction:recover-interaction:blocker_persisted`
   - 关键快照：
     - `phase=scoreBases`
     - `sourceId=smashup_reaction_choose`
     - 选项为 `activate_special:titan:titan_1_wizards_arcane_protector:0` + `pass`，**无重复选项**
   - 结论：更像 live 校验交互把刷新后的 options 写回 resolved 事件，导致下游误判“不是原 blocker”的历史链路。

## 当前本地代码对应证据

### A. 重复计分基地索引/重复反应选项已在本地修过

- 本地代码：`src/games/smashup/domain/ongoingModifiers.ts:720-760`
  - `getScoringEligibleBaseIndices()` 已统一走 `normalizeScoringEligibleBaseIndices()`
- 回归测试：`src/games/smashup/__tests__/scoringEligibleLock.test.ts:180-208`
  - 覆盖“锁定列表包含重复索引时应保序去重”
  - 覆盖 `SCORING_ELIGIBLE_BASES_LOCKED` 写入时去重
- 历史证据：`evidence/smashup/smashup-feedback-69eb3924-reaction-recover-blocker-fix-2026-04-24.md`

### B. live 校验交互快照污染已在本地修过

- 本地代码：`src/engine/systems/SimpleChoiceSystem.ts:276-299`
  - live 校验只用于合法性判断
  - `SYS_INTERACTION_RESOLVED.payload.interactionData` 保留原始 `current.data`
- watchdog 回归：`src/engine/transport/__tests__/server.test.ts:3780-3905`
  - 覆盖“沿用原始 interactionData 快照，避免下游把 blocker 重新挂回”
- 历史证据：`evidence/_shared/engine-watchdog-69ecff249087da2a55c922a5-fix-2026-04-26.md`

### C. Smash Up 计分交互恢复后的 follow-up 收口也已被本地门禁覆盖

- 回归测试：`src/engine/transport/__tests__/server.test.ts:5849-6000`
  - 覆盖“交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE”

## 生产代码与本地代码差异证据

### 生产 `SimpleChoiceSystem` 仍是旧实现

生产机 `src/engine/systems/SimpleChoiceSystem.ts` 仍可见：

```ts
const interactionDataForEvent = responseValidationMode === 'live'
    ? { ...current.data, options: availableOptions }
    : current.data;
```

这正是已在本地修掉的旧逻辑。

### 生产 Smash Up ongoingModifiers 中未检出 `normalizeScoringEligibleBaseIndices`

生产机 `src/games/smashup/domain/ongoingModifiers.ts` 中未检出 `normalizeScoringEligibleBaseIndices`，说明重复索引去重修复也尚未上生产。

## 本轮实际验证命令

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoringEligibleLock.test.ts --configLoader native --maxWorkers 1`
   - 结果：`12 passed`

2. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --maxWorkers 1 -t "online AI watchdog 处理 live 校验交互时，应沿用原始 interactionData 快照，避免下游把 blocker 重新挂回"`
   - 结果：`1 passed`

3. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --maxWorkers 1 -t "online AI watchdog 在交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE 而不是把 legal-only 当失败"`
   - 结果：`1 passed`

## 结论

- 这两条 Smash Up `open` 自动反馈更像**生产环境仍停留在旧代码**导致的历史单，不是当前本地 HEAD 新发现的未修根因。
- 对应根因在本地已经分别被：
  - `scoringEligibleBaseIndices` 去重修复
  - `SimpleChoiceSystem` live 校验快照修复
  - `scoreBases` follow-up 收口回归
  覆盖。
- 下一步若要真正清线上单，应该优先：
  1. 把含上述修复的版本部署到生产；
  2. 再按线上复核/替代复核决定是否将这两条反馈回写为 `resolved`。
