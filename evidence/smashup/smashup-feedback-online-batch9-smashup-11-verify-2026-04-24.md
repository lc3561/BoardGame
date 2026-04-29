# SmashUp 线上反馈批次9（11条）修复验证证据（2026-04-24）

- 批次目标：对 11 条 `in_progress` 的 SmashUp 历史反馈做定向回归验证，确认当前实现已覆盖问题位点。
- 验证日期：2026-04-24（Asia/Shanghai）

## 覆盖反馈 ID

1. `69bfabb9c22fb28875c81428`（反应结算卡死）
2. `69c280be1cf16183c2989026`（洗牌后牌数异常）
3. `69c64b20cb50687653b6faae`（微型机额外随从未生效）
4. `69c93d9832bd47a7b57a6978`（基地效果没用）
5. `69d66115119046d0b061f5f7`（大法师+占卜链路异常）
6. `69d8587f40fc4706b5b878c8`（Full Sail 直接打出）
7. `69da3c84469c37573d1319e1`（学徒触发行动无法埋葬）
8. `69da6b50469c37573d131b30`（斯芬克斯一回合多次）
9. `69da765b469c37573d131b96`（墓地选择交互一闪而过）
10. `69dbc5b0e92e3f88b78cecc3`（科学巨人泰坦选项链路）
11. `69dbc80ce92e3f88b78cecd9`（本地人泰坦额外随从额度）

## 实际执行命令（全部通过）

- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/response-window-skip.test.ts --configLoader native -t "所有玩家都没有可响应内容时，session 会直接关闭"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/cthulhuExpansionAbilities.test.ts --configLoader native -t "innsmouth_the_locals 翻牌后弃牌堆卡不消失（回归测试）"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/audit-d8-robot-microbot-reclaimer.test.ts --config vitest.config.audit.ts --configLoader native`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/archmageE2E.test.ts --configLoader native -t "打出大法师当回合仍可获得 banked 额外行动"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/wizard-neophyte-ongoing.test.ts --configLoader native -t "学徒打出 zombie_overrun（泛滥横行）时应该先选择目标基地"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native -t "全速航行POD可直接打出|大衮天赋额外随从额度|硕大圆石触发链|狮身人面像"`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionBaseAbilities.test.ts --configLoader native -t "跨玩家回合：每个玩家首次打出时都应触发"`

## ID 到验证点映射

- `69bfabb9c22fb28875c81428` -> `response-window-skip.test.ts`（会话在无人可响应时自动收口，不再卡死）
- `69c280be1cf16183c2989026` -> `cthulhuExpansionAbilities.test.ts`（`innsmouth_the_locals` 翻牌后弃牌堆卡不消失）
- `69c64b20cb50687653b6faae` -> `audit-d8-robot-microbot-reclaimer.test.ts`（微型机/回收者额度链路）
- `69c93d9832bd47a7b57a6978` -> `expansionBaseAbilities.test.ts`（基地首次触发语义跨玩家稳定）
- `69d66115119046d0b061f5f7` -> `archmageE2E.test.ts`（大法师 banked 额外行动保持）
- `69d8587f40fc4706b5b878c8` -> `smashup.smoke.test.ts`（`全速航行POD` 普通出牌可直接打出）
- `69da3c84469c37573d1319e1` -> `wizard-neophyte-ongoing.test.ts`（学徒触发时先选基地，交互不吞）
- `69da6b50469c37573d131b30` -> `smashup.smoke.test.ts`（狮身人面像一次限制语义）
- `69da765b469c37573d131b96` -> `wizard-neophyte-ongoing.test.ts`（ongoing 目标选择链保持可操作）
- `69dbc5b0e92e3f88b78cecc3` -> `smashup.smoke.test.ts`（硕大圆石/科学巨人相关交互链）
- `69dbc80ce92e3f88b78cecd9` -> `smashup.smoke.test.ts`（大衮天赋额外随从额度）

## 结论

- 本批 11 条反馈在当前实现下均有对应回归点且本次复跑通过，可回写为 `resolved`。
- 本文档用于线上回写与状态板证据绑定。
