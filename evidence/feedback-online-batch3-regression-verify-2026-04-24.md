# 线上反馈批次回归与修复验证（2026-04-24 批次 3）

## 目标

- 本批按“先验证修复，再回写状态”处理以下 9 条线上人类反馈：
  - `69ce6242094b1acda250f790`（Cardia 选择目标确认按钮遮挡）
  - `69ce62f3094b1acda250f7a5`（Cardia 平局视为胜利）
  - `69c9436732bd47a7b57a6a10`（SmashUp 关门放狗连续选择）
  - `69ce86f6094b1acda250f9d3`（SmashUp 额外随从机会未兑现）
  - `69d0b99accdbf2785a55ac7f`（SmashUp 在线 AI 座位误开）
  - `69d8569740fc4706b5b878c6`（SmashUp 大副吃掉海怪后续结算）
  - `69db210f09efdb7249bd5385`（SmashUp 重复复制随从）
  - `69dbb827e92e3f88b78cec60`（SmashUp 疯人院不能选疯狂牌）
  - `69dbb91ee92e3f88b78cec62`（SmashUp 修格斯后补疯狂牌时序）

## 验证命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/cardia/__tests__/discard-pile-render.test.tsx src/games/cardia/__tests__/flow-system-auto-advance.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`2 files passed, 8 tests passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "关门放狗|gold_in_them_thar_hills 选择额外随从时会先选基地再直接打出|gold_in_them_thar_hills 选择额外无目标行动时会立刻打出该牌"`
   - 结果：`5 passed`
3. `node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchSeatValidation.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`69 passed`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "大副先结算移动后，海怪克拉肯仍应保留替换基地进场交互"`
   - 结果：`1 passed`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/architecture-duplicate-processing.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`7 passed`
6. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "修格斯打到疯人院后，自抽的疯狂卡应先进入手牌，再出现在疯人院选择里"`
   - 结果：`1 passed`

## 结论

- 上述 9 条均有对应修复行为与当前可复验测试通过证据，可回写 `resolved`。
- 本批未处理：
  - `69d71d2e932fe508b2420c25`（拖拽黑边）
  - `69d72257932fe508b2420cdb`（适者生存打不出）
- 两条均保留 `in_progress`，进入下一批“新增复现 + E2E 证据”专项修复。
