# 线上反馈回归验证批次二（2026-04-24）

- 口径：线上反馈（SSH + 生产 Mongo 真实库）。
- 批次目标：确认历史“已修实现”在当前主干仍有效，并对仍处于 `in_progress` 的条目做 `resolved` 回写。

## 覆盖反馈

- `69d26b8f6e60b2aef078d89d`（DiceThrone：骰面看不见）
- `69d65dca119046d0b061f5b1`（SmashUp：齐柏林飞艇跨基地错误移动）
- `69d9a62970d52ddbd0c196ce`（SmashUp：嫩芽多实例触发异常）
- `69d3d7bfa81293593109072b`（SmashUp：武士酱在樱花公园只抽 1）
- `69d3d908a812935931090779`（SmashUp：武士酱计分后不抽牌）
- `69db0d5009efdb7249bd5329`（SmashUp：恐龙泰坦未随加攻战术触发）
- `69daf7bb469c37573d131c14`（SmashUp：终曲俳句 POD 离场后 +2 未生效）

## 实际执行验证命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/StatusEffectsIcons.test.tsx --configLoader native
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/ongoingTalent.test.ts --configLoader native -t "steampunk_zeppelin"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionOngoing.test.ts --configLoader native -t "多个嫩芽在不同基地会分别消灭自身"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --testNamePattern "samurai_samurai_chan_pod 在自己因基地结算进入弃牌堆后也会抽一张牌"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native -t "Fort Titanosaurus"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --testNamePattern "samurai_final_haiku_pod"
```

## 结果

- 上述命令全部通过（无失败用例）。
- 对应反馈现象在当前主干已被回归保护覆盖，可按“已修复”回写 `resolved`。

## 收口说明

- 本批以“回归验证 + 线上状态回写”为主，不新增业务代码改动。
- 每条状态已附本批证据路径，便于后续审计追溯。
