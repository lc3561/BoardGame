# SmashUp 反馈修复证据：睡莲/睡眠孢子重复与目标丢失（2026-04-24）

- 反馈ID：`69a948c7cebe857cd3e19139`
  - 现象：对局中出现“睡莲/睡眠孢子”重复卡牌数量异常。
- 反馈ID：`69a9483ecebe857cd3e19135`
  - 现象：出现“选择战力 3 随从”交互时看不到可选目标。

## 修复目标

在 SmashUp reducer 层补齐 **UID 全局唯一清理**，避免同一张卡在多个区域同时残留，导致前端可选目标和卡牌计数异常。

## 代码修复

- `src/games/smashup/domain/reduce.ts`
- `e2e/src/games/smashup/domain/reduce.ts`

关键变更：

1. `ONGOING_ATTACHED`
- 同一 `cardUid` 重新附着前，先从 owner 的 `hand/deck/discard` 清理。
- 同时从所有基地的 `ongoingActions/attachedActions` 清理旧挂载，再写入新目标。

2. `MINION_MOVED`
- 不再只依赖 `fromBaseIndex` 单点移除。
- 改为全场移除同 `minionUid`，再仅向目标基地写入一次，防止跨基地重复残留。

3. `CARD_TO_DECK_TOP` / `CARD_TO_DECK_BOTTOM`
- 回牌库时统一清理基地区（随从、基地持续卡、随从附着卡）旧位置。
- 随从被回牌库时，其附着行动卡统一回各自 owner 弃牌堆，避免“牌库+附着区”双重存在。

## 回归测试

新增用例文件：
- `src/games/smashup/__tests__/architecture-duplicate-processing.test.ts`

新增断言：
- `D42: ONGOING_ATTACHED 重新附着同一 uid 时应先清理旧挂载位置`
- `D42: MINION_MOVED 应清理同 uid 的历史残留，避免跨基地重复`
- `D42: CARD_TO_DECK_TOP 把附着行动卡回牌库时应移除随从附着引用`

执行结果：
- `npm run test -- src/games/smashup/__tests__/architecture-duplicate-processing.test.ts`（7/7 通过）
- `npm run test -- src/games/smashup/__tests__/wildlifePreserveProtection.test.ts`（13/13 通过）
- `npm run test -- src/games/smashup/__tests__/promptE2E.test.ts -t "MINION_MOVED 事件后 reducer 更新随从位置"`（所在文件 12/12 通过）
- `npm run test -- src/games/smashup/__tests__/sleep-spores-e2e.test.ts`（2/2 通过）
- `npm run typecheck`（通过）
- `npm run i18n:check`（通过）

## 结论

本轮是“修实现 + 回归验证”，不是仅状态关闭：
- 已在 reducer 层补齐 UID 去重与位置清理。
- 已通过针对性测试验证不会再出现同 UID 的多区域残留。
- 可将上述两条反馈从 `in_progress` 推进到 `resolved`。
