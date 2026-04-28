# SmashUp 反馈 69ef083e 修复证据（2026-04-28）

- 反馈 ID：`69ef083e039f95a4fe91b5a6`
- 标题：`Becalmed Shores 转移后丢失 talentUsed，AI 可无限循环换基地`

## 根因

- 持续行动转移时，没有把当前 ongoing 实例上的 `talentUsed` 一起透传到新位置。
- `Becalmed Shores` 被移到新基地后重新变成 `talentUsed=false`。
- 结果是同回合同一张牌可重复发动，AI 会陷入无限循环换基地。

## 修复

- 转移持续行动时保留当前实例的 `talentUsed` 状态。
- 保证 `Becalmed Shores` 同回合只会按规则发动一次。

## 验证

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism --testNamePattern="mermaids_becalmed_shores 天赋会把这张持续行动移到另一个基地"`

## 结论

- 这是已定位并修复的真实 bug。
- 2026-04-28 已将线上反馈状态回写为 `resolved`。
