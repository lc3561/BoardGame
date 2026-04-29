# Smash Up 反馈 69ef5996039f95a4fe91dab1 修复记录（2026-04-27）

## 反馈来源

- 来源类别：线上反馈源
- 反馈 ID：`69ef5996039f95a4fe91dab1`
- 游戏：`smashup`
- 路由：`/play/smashup/match/gdwDXYyme9s?playerID=2`
- 原始文本：`可以一回合多次发动`
- 反馈截图：`D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69ef5996039f95a4fe91dab1-screenshot.jpg`

## 我实际看到什么

- 截图里的卡牌本体是 `High-Speed Chase / 高速追逐`。
- 这张牌的中文牌面明确是 `天赋`，按 Smash Up 通用规则应受“每回合一次”限制。
- 用户反馈不是泛指“能多动一次”，而是这张持续行动在同一回合里可重复点天赋。

## 根因

- `world_champs_high_speed_chase` 的天赋会在结算时先把自己从原基地 `ONGOING_DETACHED`，再 `ONGOING_ATTACHED` 到目标基地。
- `SU_EVENTS.TALENT_USED` 已经先把这张持续行动的 `talentUsed` 设为 `true`。
- 但 `reduce.ts` 处理 `SU_EVENTS.ONGOING_ATTACHED` 时，会无条件把持续行动重建成 `talentUsed: false`。
- 结果是：`High-Speed Chase` 每次发动并转移后，都会把“本回合已使用”状态洗掉，导致同回合可再次发动。

## 本轮修复

- `src/games/smashup/abilities/world_champs.ts`
  - `High-Speed Chase` 在“发动天赋后把自己转移到新基地”的 `ONGOING_ATTACHED` 事件里显式透传 `talentUsed: true`。
- `src/games/smashup/domain/types.ts`
  - 为 `OngoingAttachedEvent` 增加可选字段 `talentUsed?: boolean`。
- `src/games/smashup/domain/reduce.ts`
  - `ONGOING_ATTACHED` 现在优先保留事件透传的 `talentUsed`。
  - 若事件未显式透传，也会尽量沿用旧实例的 `talentUsed` / `metadata`，避免重挂持续行动时把状态误清零。
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 补回归：`High-Speed Chase` 转移后，新基地上的持续行动仍应保持 `talentUsed: true`。
  - 同回合再次 `USE_TALENT` 必须返回 `本回合天赋已使用`。

## 验证

- 定向回归：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism --testNamePattern="world_champs_high_speed_chase 天赋可转移行动并移动随从且\+3"`
- 同文件回归：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism`
- 类型检查：
  - `npm run typecheck`

## 当前收口口径

- 本地工作区已修复，并通过针对性单测与同文件回归。
- 这条反馈**尚未部署到线上，也尚未回写线上反馈状态**。
- 因此当前应标记为：`in_progress`，待上线验证后再改为 `resolved`。
