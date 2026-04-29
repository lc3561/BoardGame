# Smash Up 反馈 69f03493 排查记录（2026-04-29）

## 反馈原文

- `BUG一，出牌阶段即结算游戏结束。`
- `BUG二，显示错误，手牌多出好几张无法选中的疯狂牌。且手牌散开躲到抽牌堆和弃牌堆下边很难选中。`

线上反馈对应：

- feedbackId：`69f034939b68d90ee9836850`
- gameId：`smashup`
- matchId：`nrtpj9siqqe`

## 结论

- BUG1 不是“回合结束才检查胜负”，而是“只能在基地计分链真正收口后的结算时机写入 `gameover`”。
- BUG2 的直接根因是疯狂牌 `uid` 重复：
  - `MADNESS_DRAWN` 事件可能基于同一旧快照连续生成。
  - 旧实现信任事件里自带的 `cardUids`，`reduce` 时不再做撞号检查。
  - 两次事件落到权威态后，玩家手牌里会出现重复 `uid` 的疯狂牌实例。
  - 重复 `uid` 会进一步引发前端选中失败、手牌重叠、层级错乱，看起来像“多出几张不可选疯狂牌并散到牌堆下面”。

## 修复口径

### 1. 提前 gameover

- 终局判定保留在基地计分链的结算时机。
- 当前门禁允许计分后续的 `draw` / `endTurn` 收口，但继续阻止 `playCards` 和尚未收口的 `scoreBases` 提前写入 `gameover`。

相关代码：

- [index.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/index.ts:1676)
- [turnCycle.test.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/__tests__/turnCycle.test.ts:548)

### 2. 疯狂牌手牌损坏

- `reduce` 侧新增疯狂牌 `uid` 重新分配兜底。
- 当 `MADNESS_DRAWN` 的 `payload.cardUids` 与当前权威态已占用 `uid` 撞号时，不再盲信事件载荷，而是重新分配唯一 `uid`，并同步推进 `nextUid`。

相关代码：

- [reduce.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/reduce.ts:124)
- [reduce.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/reduce.ts:155)
- [reduce.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/reduce.ts:2754)
- [madnessDeck.test.ts](/D:/gongzuo/webgame/BoardGame/src/games/smashup/__tests__/madnessDeck.test.ts:133)

## 验证

- `npx vitest run src/games/smashup/__tests__/turnCycle.test.ts`
- `npx vitest run src/games/smashup/__tests__/madnessDeck.test.ts src/games/smashup/__tests__/madnessAbilities.test.ts`
- `npm run typecheck`

## 当前状态

- 由于线上原始对局 `nrtpj9siqqe` 只剩 `matchrecords` 摘要，没有完整权威态快照，因此这条目前仍保留为 `in_progress`。
- 本地已完成两处定向修复和回归；是否转 `resolved` 仍需更多线上复核证据。
