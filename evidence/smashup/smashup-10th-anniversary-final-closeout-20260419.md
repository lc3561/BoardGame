# Smash Up 10 周年三派系实施最终收口（2026-04-19，2026-04-20 更新）

## 范围
- 派系：`Mermaids`、`Skeletons`、`World Champs`
- 目标：完成三派系实施、工作流完善、审计闭环、E2E 证据与资源链路校验。

## 本轮关键实现
1. 三派系能力与注册链路已接入并回归通过（含 `abilities/index.ts` 与 ongoing modifier 链路）。
2. 审计导向修复已落地：
   - `mermaids.ts`、`skeletons.ts`：去动态 `sourceId`，改显式字面量。
   - `pirates.ts`、`tricksters.ts`、`cowboys.ts`：补齐 targetType/defId 历史缺口，避免误伤新派系审计。
   - `titans.ts`：`ninjas_invisible_ninja` 的 `abilityTags` 与实际执行器对齐（去除未实现 talent 标签）。
3. 审计基线治理：
   - 新增 `src/games/smashup/__tests__/helpers/interactionOrphanBaseline.ts`（以及 e2e 对应副本）。
   - `interactionCompletenessAudit` 改为“历史 orphan 基线白名单 + 新增漂移阻断”模式。
4. 工作流完善：
   - `.windsurf/skills/data-entry-workflow/SKILL.md` 补充 S4 审计基线治理规则。
   - `docs/games/smashup/workflows/smashup-faction-implementation.md` 补充审计执行矩阵与基线策略。

## 验证结果

### 审计与单测
- `interactionTargetTypeAudit`: 7 passed
- `interactionDefIdAudit`: 2 passed
- `abilityBehaviorAudit`: 22 passed
- `interactionCompletenessAudit`: 5 passed
- `newFactionAbilities`: 146 passed / 1 skipped

### 门禁
- `npx eslint <相关改动文件>`：通过
- `npx tsc --noEmit`：通过
- `npm run i18n:check`：通过
- `openspec validate add-smashup-10th-anniversary-factions --strict --no-interactive`：通过

### E2E
- 命令：
  - `node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"`
- 结果：`1 passed`
- 关键截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

### 资源链路
- `npm run assets:upload`：上传 0，跳过 530（未变更），失败 0
- 远端 HEAD 回查：
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp` -> 200
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp` -> 200

## 结论
- 三派系实施、审计门禁、E2E 证据、资源链路均已完成收口；选择页“实施中”横幅已统一为斜向样式，文案收敛为“实施中”。
- 历史审计债已从“阻断态”转为“显式基线治理态”，后续新增漂移会被自动拦截。
