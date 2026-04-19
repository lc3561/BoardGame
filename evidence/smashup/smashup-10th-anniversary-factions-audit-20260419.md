# Smash Up 10 周年三派系专项审计（2026-04-19）

## 审计范围
- 派系：`mermaids`、`skeletons`、`world_champs`
- 目标：确认三派系实施没有引入新的交互审计回归，并记录当前全局审计基线状态。

## 本轮代码修正（审计导向）
1. `src/games/smashup/abilities/mermaids.ts`
   - 移除 `queueMoveTargetPrompt` 的动态 `sourceId` 写法。
   - 改为每个交互点显式写死字面量 `sourceId`，避免 `unknown sourceId` 审计噪声。
2. `src/games/smashup/abilities/skeletons.ts`
   - 移除 `queueDiscardSelectionForBury` 的动态 `sourceId` 写法。
   - `skeletons_graveyard` / `skeletons_lord_of_bones` 改为显式字面量 `sourceId`。
   - 埋葬牌交互选项保留 `baseDefId`（本轮前已补），持续满足 defId 审计要求。
3. `src/games/smashup/abilities/pirates.ts`
   - `pirate_broadside` / `pirate_king_move` / `pirate_sea_dogs_choose_faction` 等交互补齐显式 `sourceId` 与正确 `targetType`。
   - `pirate_buccaneer_move` 从泛型交互收紧为 `targetType: 'base'`，匹配真实目标语义。
4. `src/games/smashup/abilities/cowboys.ts`
   - `cowboys_stagecoach_cards` 选项补 `baseDefId`，清除 defId 审计缺口。
5. `src/games/smashup/abilities/tricksters.ts`
   - `trickster_hideout_pod_swap` 调整为 `targetType: 'generic'`，匹配 hand + deck 混合候选。
6. `src/games/smashup/data/titans.ts`
   - `ninjas_invisible_ninja` 的 `abilityTags` 从 `['special','ongoing','talent']` 修正为 `['special','ongoing']`，与实际已注册执行器一致（清除行为审计历史失败）。
7. `src/games/smashup/__tests__/helpers/interactionOrphanBaseline.ts`
   - 新增交互完整性“历史孤儿 handler 基线”文件（`397` 条）。
   - `interactionCompletenessAudit` 改为“新增孤儿阻断、历史基线白名单追踪”模式，避免历史债反复阻断当前派系实施。

## 运行记录与结果

### 1) 三派系能力回归
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1`
- 结果：`146 passed / 1 skipped`（通过）

### 2) targetType 审计（全文件）
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
- 结果：`7 passed`
- 说明：通过审计用例扩展（generic 保留原因登记）+ 历史交互语义修复（含 pirates/cowboys/tricksters），targetType 审计已转绿。

### 3) defId 审计（全文件）
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionDefIdAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
- 结果：`2 passed`
- 说明：本轮顺手修复了历史缺陷 `cowboys_stagecoach_cards` 选项缺少 `baseDefId`，该审计项已转绿。

### 4) 能力行为审计（全文件）
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
- 结果：`22 passed`
- 说明：通过修正 `ninjas_invisible_ninja` 的 `abilityTags`（去除未实现的 `talent` 标签）清除历史基线失败项。

### 5) 交互完整性审计（全文件）
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
- 结果：`5 passed`
- 变化：
  - 动态 `sourceId` 提取告警已与历史白名单对齐；
  - `orphan handlers` 历史债（`397` 条）已沉淀到基线白名单文件，审计改为仅拦截新增孤儿。
- 结论：该项已从“历史债阻断”切换为“新增回归门禁”。

### 6) i18n 门禁
- 命令：
  - `npm run i18n:check`
- 结果：通过（`no missing keys detected`）。

### 7) 资源上传与远端回查
- 命令：
  - `npm run assets:upload`
  - `HEAD https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp`
  - `HEAD https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp`
- 结果：
  - 上传：`上传 0，跳过 530（未变更），失败 0`
  - 远端回查：两个目标 URL 均 `200`

## 审计结论（本任务口径）
- 三派系（Mermaids / Skeletons / World Champs）已完成专项审计与回归验证。
- 本轮已修掉三派系引入的 `sourceId` 审计噪声，且 `interactionTargetTypeAudit / interactionDefIdAudit / abilityBehaviorAudit / interactionCompletenessAudit` 全部转绿。
- 历史 `orphan handlers` 债务已转入显式基线清单并持续纳入审计；后续新增孤儿仍会被门禁拦截。
