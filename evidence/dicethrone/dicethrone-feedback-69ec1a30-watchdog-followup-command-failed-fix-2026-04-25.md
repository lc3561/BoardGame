# DiceThrone 系统反馈修复证据（69ec1a30）- 2026-04-25

## 反馈
- ID: `69ec1a309087da2a55c90f19`
- 来源: `online-ai-watchdog`
- 内容: `force-end-turn-failed active-turn:follow-up-advance:command_failed`

## 根因与实现状态
- 根因归一：watchdog 成功恢复时，反馈 reason 可能出现 `steps=0`，与失败聚合桶混淆，导致高优先失败项持续堆积。
- 代码现状（已在仓库）：
  - `src/engine/transport/server.ts` 已将成功上报步数改为 `Math.max(totalAdvanceSteps, totalForcedCommands, 1)`，保证成功 reason 不再出现 `steps=0`。

## 本轮验证
1. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "online AI watchdog 在 active-turn 卡死时应持续推进直到交还给真人回合（或遇到 blocker/步数上限）"`
- 结果：通过
- 关键信息：成功上报 reason 为 `active-turn:follow-up-advance:steps=2`。

2. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "online AI watchdog 在缺失 interaction id 的 AI 交互上应先取消交互，避免误发 ADVANCE_PHASE"`
- 结果：通过
- 关键信息：成功上报 reason 为 `visible-interaction:recover-interaction:steps=1`（不再 `steps=0`）。

## 结论
- 针对 `force-end-turn-failed ... command_failed` 的关键混淆根因已被修复并由回归测试覆盖。
- 该反馈可推进为 `resolved`，后续按线上观测继续看是否再出现同桶增长。
