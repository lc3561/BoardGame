# Engine watchdog 修复记录（69ecff249087da2a55c922a5）

- 反馈ID：`69ecff249087da2a55c922a5`
- 来源：`online-ai-watchdog`
- 原始报错：`force-end-turn-failed visible-interaction:recover-interaction:blocker_persisted`
- 日期：`2026-04-26`

## 根因

根因在 `src/engine/systems/SimpleChoiceSystem.ts` 的 `handleSimpleChoiceRespond()`。

- 当 `simple-choice` 开启 `responseValidationMode: 'live'` 时，系统会用刷新后的 `availableOptions` 做合法性校验。
- 旧实现把这份“刷新后的 options”直接塞回 `SYS_INTERACTION_RESOLVED.payload.interactionData`。
- 下游交互 handler（例如依赖原始交互快照判断“当前 blocker 是否就是刚刚消费的那个交互”的链路）会把它当成“不是同一个 blocker”，从而不弹掉旧交互，watchdog 下一拍仍看到同一 `visible-interaction`，最终落成 `blocker_persisted`。

对应代码路径：
- 旧问题入口：`src/engine/systems/SimpleChoiceSystem.ts` `handleSimpleChoiceRespond()`
- 受影响的 watchdog 收口链：`src/engine/transport/server.ts` `runOnlineAiRecoverySequence()`

## 修复

- `SimpleChoiceSystem` 现在只把 live 刷新用于“响应是否合法”的判断；
- `SYS_INTERACTION_RESOLVED.payload.interactionData` 统一保留原始交互快照 `current.data`，避免下游用变更后的 options 误判 blocker 身份。

## 修改文件

- `src/engine/systems/SimpleChoiceSystem.ts`
- `src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts`
- `src/engine/transport/__tests__/server.test.ts`
- `e2e/src/engine/systems/SimpleChoiceSystem.ts`
- `e2e/src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts`
- `e2e/src/engine/transport/__tests__/server.test.ts`

## 已运行命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts --configLoader native --maxWorkers 1`
   - 结果：`1 file passed / 24 tests passed`

2. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 处理 live 校验交互时，应沿用原始 interactionData 快照，避免下游把 blocker 重新挂回" --configLoader native --maxWorkers 1`
   - 结果：`1 passed / 69 skipped`
   - 关键日志：watchdog 成功上报 `force-end-turn-success visible-interaction:recover-interaction:steps=1`

3. `node scripts/infra/vitest-cli-safe.mjs run e2e/src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts --configLoader native --maxWorkers 1`
   - 结果：失败，`No test files found`
   - 说明：当前 Vitest include 只纳入 `src/**`，`e2e/src/**` 镜像测试文件不在默认测试入口内。

4. `node scripts/infra/vitest-cli-safe.mjs run e2e/src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 处理 live 校验交互时，应沿用原始 interactionData 快照，避免下游把 blocker 重新挂回" --configLoader native --maxWorkers 1`
   - 结果：失败，`No test files found`
   - 说明：同上，镜像测试文件未纳入默认 include。

## E2E / 截图

- 本轮未跑 E2E。
- 关键截图绝对路径：无。

## 建议回写反馈 notes 文案

```text
已定位并修复 engine 层根因：`SimpleChoiceSystem.handleSimpleChoiceRespond()` 在 `responseValidationMode=live` 时，把刷新后的 options 写回 `SYS_INTERACTION_RESOLVED.payload.interactionData`，导致下游 handler 误判“不是原 blocker”，旧 visible interaction 未被真正弹掉，watchdog 后续持续看到同一 blocker，最终报 `visible-interaction:recover-interaction:blocker_persisted`。

本次修复改为：live 刷新只用于响应合法性校验，事件里的 `interactionData` 保留原始交互快照。

已补回归：
- `src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts`
- `src/engine/transport/__tests__/server.test.ts`

已验证命令：
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/systems/__tests__/InteractionSystem-auto-injection.test.ts --configLoader native --maxWorkers 1`
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 处理 live 校验交互时，应沿用原始 interactionData 快照，避免下游把 blocker 重新挂回" --configLoader native --maxWorkers 1`
```
