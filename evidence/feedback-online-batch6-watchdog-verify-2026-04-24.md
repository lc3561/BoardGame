# 线上反馈批次回归与修复验证（2026-04-24 批次 6）

## 目标

- `69c273101cf16183c2988fe5`（选完种族卡卡住）
- `69cc8633c3e278ba205eb020`（AI 出牌卡住）
- `69d3d590a812935931090701`（AI 结束后误跳过玩家回合）
- `69d504aad1302ee35a80262d`（AI 卡住）
- `69d6590c119046d0b061f510`（AI 回合结束不了）

以上均归入同一根因簇：在线 AI watchdog 恢复链路（active-turn / factionSelect / advance guard）。

## 验证命令与结果

1. `npm run test -- src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在 active-turn 卡死时应持续推进直到交还给真人回合（或遇到 blocker/步数上限）"`
   - 结果：`server.test.ts 61 passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "active-turn 卡死时应持续推进|factionSelect 阶段应走 legal-action recovery|fallback 到 ADVANCE_PHASE 前应校验当前仍是 AI 回合"`
   - 结果：`3 passed`

## 结论

- active-turn 卡死恢复、factionSelect legal-action recovery、human 回合误推进保护三条关键链路均通过回归。
- 本批 5 条可回写 `resolved`。
