# PR79 Merge Conflict Resolution (2026-04-30)

## Scope

- PR: `#79 feat(smashup): finish fairies titan handoff`
- Merge target: `origin/main`
- Working copy: `temp/pr79-merge-clone`

## Conflict Files

- `public/locales/en/game-smashup.json`
- `public/locales/zh-CN/game-smashup.json`
- `src/games/smashup/__tests__/commandsValidation.test.ts`
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
- `src/games/smashup/__tests__/smashup.smoke.test.ts`
- `src/games/smashup/abilities/titans.ts`
- `src/games/smashup/criticalImageResolver.ts`
- `src/games/smashup/domain/abilityHelpers.ts`
- `src/games/smashup/domain/baseAbilities_expansion.ts`
- `src/games/smashup/domain/index.ts`

## Resolution Summary

- 保留 `main` 上新增的 Smash Up 基础设施文件与测试基线，避免 PR 因长期落后而缺模块。
- 保留 PR79 的 Fairies Titan 交互链：
  - `Spirit of the Forest` 的特殊召唤条件
  - `Titania` / `Playful Tricks` / `Enchantment` / `Fairy Circle` 等 Titan 联动
  - Titan clash 失败后改为移动到别的基地的例外交互
- `criticalImageResolver` 最终采用运行时 resolver 路线，并补齐 `pretty_pretty` 图集与 `init` 空加载口径。
- `newFactionAbilities.test.ts` 冲突块按“保留 main 的较新 World Champs / Mermaids 用例 + 保留 PR 的 Fairies 用例”裁决。

## Post-Merge Follow-up Fixes

合并完成后，发现 PR 原始提交仍缺 3 类 Fairies 接线，因此追加补齐：

1. `Fairies` 主派系静态卡牌数据未正式注册
2. `Pretty Pretty` card atlas (`smashup/cards/pretty_pretty`) 未接入 atlas catalog
3. `fairies_enchantment` / `fairies_leaf_armor` / `fairies_daisy_chain` 的持续力量修正未注册

补齐文件：

- `src/games/smashup/data/factions/fairies.ts`
- `src/games/smashup/data/cards.ts`
- `src/games/smashup/domain/ids.ts`
- `src/games/smashup/domain/atlasCatalog.ts`
- `src/games/smashup/runtimeCriticalImageResolver.ts`
- `src/games/smashup/abilities/ongoing_modifiers.ts`

## Verification

- `npm run typecheck`
- `npx tsx scripts/verify/i18n-check.ts`
- `npx openspec validate add-smashup-fairies-faction --type change --strict --no-interactive`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/commandsValidation.test.ts src/games/smashup/__tests__/criticalImageResolver.test.ts src/games/smashup/__tests__/factionSelection.test.ts src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native`

## Result

- 验证结果：`402 passed, 1 skipped`
- 当前结论：PR79 已具备推回原分支并继续 GitHub merge 流程的条件
