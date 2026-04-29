# 冲突解决汇报：origin-main-2026-04-11

## 1. 背景
- base: main
- head: origin/main
- 触发命令: `git pull`（合并 origin/main 到本地 main）

## 2. 冲突文件
- src/games/smashup/__tests__/baseAbilitiesPrompt.test.ts
- src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts
- src/games/smashup/__tests__/tortuga-pirate-king-flowhalted-fix.test.ts

## 3. 解决策略
### src/games/smashup/__tests__/baseAbilitiesPrompt.test.ts
- 策略：保留延迟补发逻辑的断言（不直接发出 BASE_CLEARED/BASE_REPLACED/MINION_MOVED）。
- 合并要点：继续断言 pendingPostScoringActions 队列，避免在交互阶段直接结算。
- 原因：符合 afterScoring 延迟事件链路约束，交互结束后统一补发。

### src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts
- 策略：合并两侧逻辑：保留 origin/main 对 pirate_king_move 连续出现的兜底处理，保留本地对 reaction_queue_choose_next 的排队顺序处理。
- 合并要点：
  - 在 pirate_king_move 连续出现时先快速选择“否”清理。
  - multi_base_scoring 路径继续走 reaction_queue_choose_next 的优先顺序。
- 原因：同时覆盖“多基地计分 + 触发排序 + 交互链不断裂”的真实链路。

### src/games/smashup/__tests__/tortuga-pirate-king-flowhalted-fix.test.ts
- 策略：合并断言。
- 合并要点：先断言 updatedState 存在，再校验 phase/interaction 仍停留在 scoreBases。
- 原因：兼容不同返回结构，同时保留关键行为验证。

## 4. 风险与验证
- 风险点：afterScoring 延迟事件与交互链顺序耦合，若行为变更可能影响相关测试期望。
- 验证命令：
  - `npm run i18n:check`（仅动态 key 警告）
  - `openspec validate --all --strict --no-interactive`
  - `npx eslint src/games/dicethrone/ui/BonusDieOverlay.tsx src/games/smashup/Board.tsx src/games/smashup/__tests__/baseAbilitiesPrompt.test.ts src/games/smashup/__tests__/factionAbilities.test.ts src/games/smashup/__tests__/madnessPromptAbilities.test.ts src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts src/games/smashup/__tests__/tortuga-pirate-king-flowhalted-fix.test.ts src/games/summonerwars/Board.tsx`（仅 warnings）
  - `npm run merge:audit -- 4101a435`（11 个文件均为“混合结果”）
  - `npm run merge:audit:strict -- 4101a435`（通过，未出现单边覆盖）
  - `npm run check:prod-deps`（失败：脚本 CRLF 导致 `set: pipefail` 报错）
- 未运行：单元/集成/E2E 测试（用户要求仅静态检查）

## 5. 回归与行为变化登记
- 原 PR 目标问题：合并 origin/main 的最新变更并保留 afterScoring 延迟事件的测试口径。
- 本次额外发现的真实回归：无。
- 仅业务口径 / 规则变化：无。

## 6. 结果
- 提交：4101a435
- 推送：origin/main
