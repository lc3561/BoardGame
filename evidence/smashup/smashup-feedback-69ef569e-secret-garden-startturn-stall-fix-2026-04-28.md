# SmashUp 反馈 69ef569e 修复证据（2026-04-28）

## 反馈来源
- 线上反馈源。
- 通过 `ssh admin@8.148.71.102` 进入生产机，再执行 `docker exec -i boardgame-mongodb mongosh --quiet boardgame` 查询 `feedbacks` 集合确认。
- 线上原始内容：`神秘花园发动效果后卡死`。

## 根因
- `SmashUp` 的 `startTurn` 交互链里，只要交互处理结果产出了 `MINION_PLAYED`，系统层就会写入 `_waitForStartTurnInteractionReduce`。
- 这枚等待标记原本用于“等本轮 reduce 完成后再自动推进到 `playCards`”，但实现里缺少下一轮 afterEvents 的清理逻辑。
- 结果是：交互已经结束、队列为空、阶段仍停在 `startTurn`，`FlowSystem` 又因为 `_waitForStartTurnInteractionReduce` 继续阻塞自动推进，于是进入纯卡死状态。
- 这和线上反馈里“发动效果后卡死”的表现一致。

## 修复
- 在 [systems.ts](D:\gongzuo\webgame\BoardGame\src\games\smashup\domain\systems.ts) 中补上 `_waitForStartTurnInteractionReduce` 的下一轮清理。
- 保留原有“交互链期间停在 `startTurn`”的语义，只修掉“交互结束后永远不继续”的死锁。

## 验证
- `npx vitest run src/games/smashup/__tests__/killer-plant-pod-verification.test.ts`
- `npm run typecheck`

## 结果
- `Sprout 交互响应打出的 Water Lily 仍应在同一个 start-turn 窗口立即抽牌` 现在在交互完成后会回到 `playCards`，不会留下 `_waitForStartTurnInteractionReduce`。
- `Sprout 连锁打出另一个 Sprout 时，阶段应保持在 startTurn 直到整条链结束` 仍然通过，说明没有破坏原有链式 `startTurn` 交互语义。

## 风险
- 本次是领域层/系统层修复，没有补 E2E 截图。
- 但该等待标记是通用 `startTurn` 交互门禁，回归已覆盖“单步收口”和“链式交互”两类路径。
