# SmashUp 反馈验证：69daf84d / 69d91c4f（2026-04-24）

- 口径：线上反馈（Mongo 真实库），本次先做“是否已被代码修复”的定向回归验证。
- 反馈：
  - `69daf84d469c37573d131c18`：武士的攻击力在 5 以上离场得 1 分没效果。
  - `69d91c4f70d52ddbd0c19613`：尸体商店消灭己方随从时，若选择雄蜂移除指示物代替消灭，仍被错误消灭。

## 验证命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --testNamePattern "samurai_bushi 在被消灭时应使用离场前有效力量判定"
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --testNamePattern "尸体商店"
```

## 实际结果

1. `samurai_bushi 在被消灭时应使用离场前有效力量判定 5 力量奖励 VP`
   - 结果：`1 passed, 168 skipped`（目标用例通过）。
   - 结论：当武士离场前有效力量达到 5 时，VP 奖励触发链正常。

2. `尸体商店+雄蜂` 两个用例
   - 结果：`2 passed, 167 skipped`（目标用例通过）。
   - 结论：选择“防止消灭”时，会先结算雄蜂替代，不会继续错误消灭；选择“不防止消灭”时会按正常链路进入后续分配。

## 收口判定

- 这两条反馈在当前主干实现中已具备回归保护并验证通过；可按“已修复”回写 `resolved`。
- 本次为“验证收口”，不新增业务代码改动。
