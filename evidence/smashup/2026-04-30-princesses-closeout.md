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
- `npm run typecheck`：通过
- `npx tsx scripts/verify/i18n-check.ts`：通过
- `openspec validate add-smashup-princesses-faction --strict --no-interactive`：通过

## Manual Regression Notes

- `npm run test:smashup` 本轮结果：
  - `2066 passed`
  - `19 skipped`
  - `1 failed`
- 失败项为：
  - `src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts`
  - 用例：`base_greenhouse: 应先换基地，再把牌库随从打到新基地`
- 该红点位于 `base_greenhouse / afterScoring / base replace` 链路，和 Princesses 本轮改动面不重叠；本轮未顺手改动该链。

## Remaining Gaps

- 还未补 Princesses 真实入口 E2E 与人工看图证据。
- 还未做 Pretty Pretty 资源远端上传 / `HEAD 200` 回查。
