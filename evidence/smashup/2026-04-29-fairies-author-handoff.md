# Smash Up Fairies Author Handoff (2026-04-29)

## Scope

- Game: `smashup`
- Expansion: `Pretty Pretty Smash Up`
- Faction: `Fairies / 仙灵`
- Titan: `Spirit of the Forest / 丛林之灵`
- Delivery status: `主派系 + Titan 已接入并通过本地验证`

## Ready-to-Forward Summary

下面这段可以直接转给作者：

```md
这轮已整理并接入 Smash Up 的 `Fairies / 仙灵`，包含 `Spirit of the Forest / 丛林之灵`。

已完成内容：
- Fairies 主派系卡牌、基地、locale、预览链路接入
- Spirit of the Forest Titan 接入
- Titan 特殊召唤条件、相关联动能力、titan clash 例外交互
- 中文运行时卡图 / 基地图 / 泰坦图资源链整理
- 本地类型检查、i18n 检查、Smash Up 相关回归测试通过

关键资源：
- `smashup/cards/pretty_pretty`
- `smashup/base/base3`
- `smashup/taitan/taitan1`

说明：
- `zh-CN` 的 Titan 远端资源已可访问（HEAD 200）
- `en` 的 Titan 远端资源当前未确认存在（HEAD 404）
```

## Truth Sources

- 英文名称与原版效果主对照：[`https://smashup.fandom.com/wiki/Fairies`](https://smashup.fandom.com/wiki/Fairies)
- POD 官方对照页：[`https://smashup-rulebook.alderac.com/wiki/Fairies`](https://smashup-rulebook.alderac.com/wiki/Fairies)
  - 用途：`compare-only`
- 用户提供的本地图集原图：
  - Card atlas:
    - `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc101381428395556106161738562ABCD5E1C772F2873A740E6A776975E69.png`
  - Base atlas:
    - `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc10138142839556160144CDDE640150BB5D07CEB38882ACC4389825406DD.png`
  - Titan atlas:
    - `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc17873602896357179238C94C46F97554D53D42E3FEFAEC5EA120A22109B.png`

## Runtime Assets

### Fairies Card Atlas

- [`pretty_pretty.png`](../../public/assets/i18n/zh-CN/smashup/cards/pretty_pretty.png)
- [`pretty_pretty.webp`](../../public/assets/i18n/zh-CN/smashup/cards/compressed/pretty_pretty.webp)

### Fairies Base Atlas

- [`base3.png`](../../public/assets/i18n/zh-CN/smashup/base/base3.png)
- [`base3.webp`](../../public/assets/i18n/zh-CN/smashup/base/compressed/base3.webp)

### Fairies Titan Atlas

- [`taitan1.png`](../../public/assets/i18n/zh-CN/smashup/taitan/taitan1.png)
- [`taitan1.webp`](../../public/assets/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp)

## Code Touchpoints

### Core Fairies / Titan Wiring

- [`fairies.ts`](../../src/games/smashup/abilities/fairies.ts)
- [`titans.ts`](../../src/games/smashup/abilities/titans.ts)
- [`abilityHelpers.ts`](../../src/games/smashup/domain/abilityHelpers.ts)
- [`baseAbilities_expansion.ts`](../../src/games/smashup/domain/baseAbilities_expansion.ts)
- [`index.ts`](../../src/games/smashup/domain/index.ts)
- [`titans.ts`](../../src/games/smashup/data/titans.ts)

### Locale

- [`game-smashup.json` en](../../public/locales/en/game-smashup.json)
- [`game-smashup.json` zh-CN](../../public/locales/zh-CN/game-smashup.json)

### Verification

- [`commandsValidation.test.ts`](../../src/games/smashup/__tests__/commandsValidation.test.ts)
- [`criticalImageResolver.test.ts`](../../src/games/smashup/__tests__/criticalImageResolver.test.ts)
- [`factionSelection.test.ts`](../../src/games/smashup/__tests__/factionSelection.test.ts)
- [`newFactionAbilities.test.ts`](../../src/games/smashup/__tests__/newFactionAbilities.test.ts)
- [`smashup.smoke.test.ts`](../../src/games/smashup/__tests__/smashup.smoke.test.ts)

## What Was Implemented

- Fairies 主派系能力闭环
- `Spirit of the Forest / 丛林之灵` 正式 Titan 定义
- Titan 特殊召唤条件：
  - 需要同时保留通常随从与通常行动额度
- Titan 相关联动：
  - `Titania`
  - `Puck`
  - `Magic Acorns`
  - `Playful Tricks`
  - `Enchantment`
  - `Fairy Circle`
  - `Fairy Ballet`
- Titan clash 例外交互：
  - 输掉 clash 时可改为移动到另一个基地，而不是直接移除

## Verification Summary

- `npm run typecheck`
  - 结果：通过
- `npx tsx scripts/verify/i18n-check.ts`
  - 结果：通过
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/commandsValidation.test.ts src/games/smashup/__tests__/factionSelection.test.ts src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts src/games/smashup/__tests__/criticalImageResolver.test.ts --configLoader native`
  - 结果：`399 passed, 1 skipped`
- `npx openspec validate add-smashup-fairies-faction --strict --no-interactive`
  - 结果：通过

## Remote Asset Check

- Titan zh-CN:
  - [`official/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp`](https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp)
  - `HEAD 200`
- Titan en:
  - [`official/i18n/en/smashup/taitan/compressed/taitan1.webp`](https://assets.easyboardgame.top/official/i18n/en/smashup/taitan/compressed/taitan1.webp)
  - `HEAD 404`

## Non-Blocking Notes

- 当前目录 `D:\GA\BoardGame-upstream-main-20260428` 不是 git 仓库，所以不能直接在这里执行 commit。
- 如果要正式提交到 git，需要把这些改动落到真实 git worktree 后再执行 `git add/commit`。
