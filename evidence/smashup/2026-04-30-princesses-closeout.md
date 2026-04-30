# Princesses Closeout (2026-04-30)

## Scope

- Game: `smashup`
- Faction: `Princesses / 公主`
- Delivery target: `正式可玩`
- Titan scope: 本轮未纳入

## Runtime Wiring Completed

- 已新增 `princesses` faction id 与 UI metadata。
- 已接入 Princesses card/base 静态数据、`previewRef`、中英文 locale。
- 已复用 `Pretty Pretty` 混排 card atlas 与 `BASE3` base atlas。

## Gameplay Completed

- 已实现并注册 Princesses 主要能力：
  - `Happily Ever After`
  - `Direct to DVD Sequel`
  - `Woodland Helpers`
  - `Fairy Godmother`
  - `Skillet`
  - `True Love's Kiss`
  - `Some Day My Prince Will Come`
  - `Tale as Old as Time`
  - `Marie DeGraw`
  - `Eliza`
  - `Snow White`
  - `Apricot`
  - `Griselda`
  - `Sleeping Beauty`
  - `Heirloom`
- 已补 Eliza 对“每回合至多一张额外牌”的共享门禁，并把额外牌计数接入 reducer。

## Verification Run

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native -t "Princesses abilities"`：`9 passed`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts -t "base_greenhouse: 应先换基地，再把牌库随从打到新基地" --configLoader native --maxWorkers 1`：通过
- `npm run typecheck`：通过
- `npx tsx scripts/verify/i18n-check.ts`：通过
- `openspec validate add-smashup-princesses-faction --strict --no-interactive`：通过

## Resource Delivery

- 已执行 `npm run assets:check` / `npm run assets:upload`，补齐 Pretty Pretty 运行时资源上传。
- 远端 `HEAD 200` 回查已通过：
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/pretty_pretty.webp`
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/base3.webp`

## Gate Notes

- 原 PR 红灯 `src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts` 已修复并单测复跑通过。
- 修复点：`postProcessSystemEvents(...)` 返回的 `matchState.core` 属于预览态；测试断言需要从原始 `state.core` 重放补发事件，避免把 `BASE_CLEARED / BASE_REPLACED / MINION_PLAYED` 二次叠加到预览态。

## Remaining Gaps

- 还未补 Princesses 真实入口 E2E 与人工看图证据。
