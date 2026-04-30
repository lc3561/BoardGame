# 在线 AI watchdog：DiceThrone targetingRoll 自动反馈修复（2026-04-30）

## 来源
- 来源类别：线上反馈源（生产 Mongo `feedbacks`）
- 重点反馈：
  - `69f041c79b68d90ee98368f5`
  - 类型：`force-end-turn-failed`
  - 内容：`[system][online-ai-watchdog] force-end-turn-failed active-turn:follow-up-advance:command_failed`
- 同类高频聚合：
  ```
  gameId=dicethrone
  phase=targetingRoll
  occurrenceCount=990
  firstOccurredAt=2026-04-28T05:12:39.313Z
  lastOccurredAt=2026-04-29T00:52:46.062Z
  ```

## 现象
- watchdog 在 AI 当前回合的 `targetingRoll` 阶段卡住时，会先尝试 legal-action recovery。
- 当 legal action 因 private overlay / hidden blocker / 空候选链路拿不到动作时，旧逻辑会 fallback 到裸 `ADVANCE_PHASE`。
- 对 DiceThrone 的 roll 阶段，这个 fallback 不安全；若当前并不满足合法推进条件，就会命中 `command_failed`，从而反复制造自动反馈。

## 根因
1. `src/engine/transport/onlineAiRecovery.ts`
   - 旧逻辑只把 `factionSelect` 视为 `active-turn-legal-only`。
   - AI 当前回合的 `offensiveRoll / targetingRoll / defensiveRoll` 仍会走通用 `active-turn`，允许 fallback 到裸 `ADVANCE_PHASE`。
2. `src/engine/transport/server.ts`
   - 当 legal-action recovery 无法拿到动作时，会在 candidate 仍带 recovery command 的情况下继续尝试裸命令。
   - 对本批 DiceThrone targetingRoll 卡死，这条裸命令就是 `ADVANCE_PHASE`，从而落到 `command_failed`。
3. 诊断噪音
   - `resolveUnsatisfiableReasonFromInteraction(undefined)` 之前会返回 `empty-options`，导致“其实没有 interaction”时的自动反馈快照仍像“空选项 prompt”，误导排查。

## 修复
### 1. roll 阶段改为 legal-action-only
- 文件：`src/engine/transport/onlineAiRecovery.ts`
- 调整：把 AI 当前回合的 `offensiveRoll / targetingRoll / defensiveRoll` 一并归入 `active-turn-legal-only`。
- 结果：
  - watchdog 仍会先走 legal-action recovery；
  - 若拿不到合法动作，只会上报 `legal_action_unavailable` / overlay 阻塞类原因；
  - 不再对 roll 阶段强发不安全的裸 `ADVANCE_PHASE`。

### 2. 修正无 interaction 时的 unsat 诊断
- 文件：`src/engine/transport/onlineAiRecovery.ts`
- 调整：`resolveUnsatisfiableReasonFromInteraction` 在 `interaction` 缺失时返回 `null`，不再伪造 `empty-options`。

## 验证
### 静态检查
- 命令：
  ```bash
  npx eslint src/engine/transport/onlineAiRecovery.ts src/engine/transport/__tests__/onlineAiRecovery-gameover.test.ts src/engine/transport/__tests__/server.test.ts
  ```
- 结果：通过

### 定向测试 1：unit
- 命令：
  ```bash
  node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/onlineAiRecovery-gameover.test.ts --configLoader native --maxWorkers 1
  ```
- 结果：`13 passed`
- 证明点：
  - AI active 的 `targetingRoll` 现在会返回 `active-turn-legal-only`
  - 缺失 interaction 时，unsat reason 不再误报 `empty-options`

### 定向测试 2：server integration
- 命令：
  ```bash
  node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在 AI active 的 targetingRoll 且 legalActions 为空时，不得 fallback 到裸 ADVANCE_PHASE" --configLoader native --maxWorkers 1
  ```
- 结果：`1 passed`
- 证明点：
  - watchdog 不会调用 `executeCommandInternal(..., 'ADVANCE_PHASE', ...)`
  - 自动反馈原因从旧的 `command_failed` 转成 `active-turn-legal-only:follow-up-advance:legal_action_unavailable`

## 影响范围
- 直接命中：DiceThrone 在线 AI 的 `offensiveRoll / targetingRoll / defensiveRoll` 自动兜底
- 间接受益：自动反馈的诊断语义更干净，不再把“没有 interaction”误写成 `empty-options`

## 未覆盖风险
- 这次修的是 watchdog 兜底策略，不是 DiceThrone 某条具体业务链为什么会把 legal actions 清空。
- 若后续仍持续出现 `legal_action_unavailable`，下一步要继续追 seat overlay freshness / hidden blocker 暴露链，而不是再把 fallback 放宽回裸 `ADVANCE_PHASE`。
