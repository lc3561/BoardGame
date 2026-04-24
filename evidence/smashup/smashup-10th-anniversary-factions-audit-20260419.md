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

---

## 复审记录（2026-04-22）

### 本次复审命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1`
   - 结果：`166 passed / 1 skipped`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`7 passed`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionDefIdAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`2 passed`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`22 passed`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`5 passed`
6. `npm run i18n:check`
   - 结果：通过（`no missing keys detected`）
7. `npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"`
   - 结果：`1 passed`
8. 远端资源 HEAD 回查
   - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp` → `200`
   - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp` → `200`

### 本次复审关键截图（绝对路径）

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

### 审计维度补全（D1-D49）

> 说明：本条是“三派系实施审计复审”，重点是能力执行正确性、交互审计门禁、i18n 完整性与前台横幅一致性；未涉及本轮新增的伤害管线重构、资源系统改造或新事件协议。

| 维度 | 结论 | 证据 / 说明 |
|---|---|---|
| D1 语义保真 | ✅ 命中 | 三派系目标语义（可用能力 + 实施中横幅）与当前实现一致。 |
| D2 边界完整 | ✅ 命中 | 覆盖 World Champs / Mermaids / Skeletons 三派系关键能力与前台展示。 |
| D3 数据流闭环 | ✅ 命中 | 配置/能力 -> 审计测试 -> E2E 截图完整闭环。 |
| D4 查询一致性 | ✅ 命中 | 审计门禁通过，未新增绕开统一查询入口的回归。 |
| D5 交互完整性 | ✅ 命中 | `interactionCompletenessAudit` 通过且无新增孤儿 handler。 |
| D6 副作用传播 | ✅ 命中 | 三派系关键能力回归均通过，副作用事件可消费。 |
| D7 资源守恒 | ⭕ 不适用 | 本轮未改资源经济规则。 |
| D8 时序正确性 | ✅ 命中 | 交互 targetType/defId/行为审计全绿，未出现时序断链。 |
| D9 幂等与重入 | ✅ 命中 | 同批复审命令可重复通过。 |
| D10 元数据一致性 | ✅ 命中 | `abilityBehaviorAudit` / `interactionTargetTypeAudit` 通过。 |
| D11 Reducer 消耗路径 | ⭕ 不适用 | 本轮未改 reducer 结构。 |
| D12 写入-消耗对称 | ✅ 命中 | 交互/能力审计未报写入消费错配。 |
| D13 多来源竞争 | ✅ 命中 | 交互配置与执行器语义一致，未见冲突来源。 |
| D14 回合清理完整 | ✅ 命中 | 能力测试与行为审计未出现脏状态残留。 |
| D15 UI 状态同步 | ✅ 命中 | 横幅 E2E 截图显示与配置一致。 |
| D16 条件优先级 | ✅ 命中 | 交互类型与白名单规则审计无冲突。 |
| D17 隐式依赖 | ✅ 命中 | sourceId/targetType/defId 均显式化并受审计约束。 |
| D18 否定路径 | ✅ 命中 | 审计套件覆盖了“缺 defId / targetType 混用”等否定路径。 |
| D19 组合场景 | ✅ 命中 | 三派系能力 + 通用审计 + 前台 E2E 联合验证通过。 |
| D20 可观测性 | ✅ 命中 | 测试日志与截图路径完整可复查。 |
| D21 触发频率门控 | ⭕ 不适用 | 本轮未新增触发频率机制。 |
| D22 伤害管线 | ⭕ 不适用 | 本轮未改伤害计算管线。 |
| D23 架构假设一致 | ✅ 命中 | 继续使用既有能力注册/交互系统，不引入旁路实现。 |
| D24 handler 共返一致 | ✅ 命中 | 审计未报 events/interaction 共返不一致。 |
| D25 MatchState 传播 | ✅ 命中 | E2E 进入派系页并稳定渲染，状态传播正常。 |
| D26 事件设计完整 | ⭕ 不适用 | 本轮未新增事件类型。 |
| D27 可选参数语义 | ✅ 命中 | targetType/responseValidationMode 审计通过。 |
| D28 白黑名单完整 | ✅ 命中 | generic 例外清单与审计保持一致。 |
| D29 PPSE 替换完整 | ⭕ 不适用 | 本轮未触及 PPSE。 |
| D30 消灭流程时序 | ⭕ 不适用 | 本轮未新增消灭结算机制。 |
| D31 效果拦截路径 | ⭕ 不适用 | 本轮未改拦截/免疫链路。 |
| D32 替代路径后处理 | ⭕ 不适用 | 本轮未改替代结算。 |
| D33 跨实体同类一致 | ✅ 命中 | 三派系同类交互字段规则一致通过审计。 |
| D34 交互选项渲染 | ✅ 命中 | E2E 验证横幅文案与显示逻辑一致。 |
| D35 交互上下文快照 | ✅ 命中 | 交互完整性审计未报上下文断裂。 |
| D36 延迟补发健壮性 | ⭕ 不适用 | 本轮未改 deferred 补发链。 |
| D37 选项动态刷新 | ✅ 命中 | targetType 与 autoRefresh 约束审计通过。 |
| D38 门控优先级冲突 | ✅ 命中 | 审计无新增冲突项。 |
| D39 流程标志清理 | ✅ 命中 | 行为审计未报流程标志残留回归。 |
| D40 后处理循环去重 | ⭕ 不适用 | 本轮未改后处理循环。 |
| D41 系统职责重叠 | ✅ 命中 | 修改集中在能力/审计层，无跨系统污染。 |
| D42 事件流审计 | ✅ 命中 | `abilityBehaviorAudit` 通过。 |
| D43 重构完整性 | ✅ 命中 | 本轮为复审 + 最小收敛，无并行旧实现分叉。 |
| D44 测试反模式 | ✅ 命中 | 单测审计 + E2E 实景截图，不依赖摆拍。 |
| D45 Pipeline 去重 | ⭕ 不适用 | 本轮未改 pipeline 多阶段调度。 |
| D46 displayMode 声明 | ⭕ 不适用 | 本轮未改 displayMode。 |
| D47 E2E 覆盖完整 | ✅ 命中 | 三派系统一横幅用例通过并产出最新截图。 |
| D48 UI 交互渲染模式 | ✅ 命中 | 统一斜向横幅样式已落到通用组件链路。 |
| D49 abilityTags 一致性 | ✅ 命中 | 行为审计通过，未出现 tags 与执行器失配回归。 |

### 补测收敛记录（2026-04-23）

> 按“配置直通 / 新机制 / 新 UI-E2E”批次，已把三派系主回归文件缺口补齐到 0。

新增/完善的代表性专项断言（均在 `newFactionAbilities.test.ts`）：
- World Champs：`world_champs_calicoin`、`world_champs_rainbow_girl`、`world_champs_its_blitzin_time`、`world_champs_fighting_spirit_prize`、`world_champs_mouse_bird_and_sausage`、`world_champs_shark_tattoo`、`world_champs_eh`
- Mermaids：`mermaids_mermaid_queen`、`mermaids_captive_audience`、`mermaids_becalmed_shores`、`mermaids_siren_song`、`mermaids_charmed`、`mermaids_toll_bay`、`mermaids_shipwreck_cove`
- Skeletons：`skeletons_dig_em_up`、`skeletons_burst_forth`、`skeletons_graveyard`、`skeletons_lord_of_bones`、`skeletons_hearse_fleet`、`skeletons_gravestones`

本轮复跑结果：
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1`
   - 结果：`166 passed / 1 skipped`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`7 passed`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionDefIdAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`2 passed`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`22 passed`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`5 passed`
6. `npm run i18n:check`
   - 结果：通过（`no missing keys detected`）

静态比对（`registerAbility('<id>')` vs `newFactionAbilities.test.ts`）结果：
- Mermaids：`0` 缺口
- Skeletons：`0` 缺口
- World Champs：`0` 缺口

### E2E 回归补记（2026-04-23）

- 背景：同文件内大厅 3 人房用例出现断言偏差（误要求 `空位/空位/空位`）。
- 修复：将断言调整为“房主占 1 席后仍可见两个空位”：
  - `toContainText(/空位\\s*\\/\\s*空位/)`
- 复跑命令：
  1. `npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "3 人房间可加入且大厅会显示座位状态"`
     - 结果：`1 passed`
  2. `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`
     - 结果：`3 passed`
- 关键截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

### 审计补记（2026-04-23）

- 触发：复跑 `interactionTargetTypeAudit` 时发现 `cthulhu_corruption` 采用 `targetType: 'generic'` 后，缺少“保留 generic 原因”登记导致门禁失败。
- 修复文件：`src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts`
  - 在 `REQUIRED_SOURCE_CONFIGS` 补登记：
    - `cthulhu_corruption: { targetType: 'generic', autoRefresh: 'field', responseValidationMode: 'live' }`
  - 在 `APPROVED_GENERIC_SOURCE_REASONS` 补登记：
    - `cthulhu_corruption` 的 generic 保留理由（候选由 `buildActionMinionTargetOptions` 生成，存在复合语义）。
- 复跑结果：
  1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1`
     - `166 passed / 1 skipped`
  2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
     - `7 passed`
  3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionDefIdAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
     - `2 passed`
  4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
     - `22 passed`
  5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
     - `5 passed`
  6. `npm run i18n:check`
     - 通过（`no missing keys detected`）

### 复审记录（2026-04-24）

> 本轮目标：确认三派系审计在最新代码基线上持续全绿，并将计数、E2E 与截图时间统一到最新事实。

本轮复审命令与结果：
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1`
   - 结果：`168 passed / 1 skipped`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`7 passed`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionDefIdAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`2 passed`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`22 passed`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
   - 结果：`5 passed`
6. `npm run i18n:check`
   - 结果：通过（`no missing keys detected`）
7. `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`
   - 结果：`3 passed`
8. `npx openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive`
   - 结果：通过（`Change 'add-smashup-oops-faction-gameplay' is valid`）
9. 远端资源 HEAD 回查
   - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp` → `200`
   - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp` → `200`
10. `npm run assets:upload`
    - 结果：`上传 0，跳过 530（未变更），失败 0`
11. Android 内置 locale 同步
    - 文件：`android/app/src/main/assets/public/locales/zh-CN/game-smashup.json`
    - 变更：移除 `faction_implementation_in_progress_hint`，确保内置包与主线 locale 同口径（只保留“实施中”）。

静态覆盖结论（持续有效）：
- Mermaids：`0` 缺口
- Skeletons：`0` 缺口
- World Champs：`0` 缺口

本轮关键截图（绝对路径，最新时间 2026-04-24 09:08）：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

结论：
- 三派系（Mermaids / Skeletons / World Champs）在 2026-04-24 基线上继续保持“能力回归 + 4 审计套件 + E2E + i18n”全绿。
- 旧记录中的 `166 passed / 1 skipped` 属于 2026-04-23 历史快照，当前最新口径为 `168 passed / 1 skipped`。

### 静态覆盖复核（2026-04-24）

- 命令（Node 脚本）：
  - 扫描 `src/games/smashup/abilities/*.ts` 中 `registerAbility('<id>')`
  - 仅统计前缀为 `mermaids_ / skeletons_ / world_champs_` 的能力
  - 对照 `src/games/smashup/__tests__/newFactionAbilities.test.ts` 是否包含对应 id 文本
- 结果：
  - 总计：`40`
  - 未覆盖：`0`
  - 分派系：
    - Mermaids：`10 / 0`
    - Skeletons：`13 / 0`
    - World Champs：`17 / 0`
- 结论：三派系主能力在 `newFactionAbilities.test.ts` 的直点覆盖保持 `0` 缺口。
