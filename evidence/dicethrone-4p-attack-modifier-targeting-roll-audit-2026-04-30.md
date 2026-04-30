# DiceThrone 四人模式攻击修正 targetingRoll 扩审 2026-04-30

## 审计范围

- 共享规则：
  - `src/games/dicethrone/domain/rules.ts`
  - `src/games/dicethrone/domain/executeCards.ts`
- 共享测试：
  - `src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts`
  - `src/games/dicethrone/__tests__/flow.test.ts`
- 关注范围：
  - 4 人 `2v2` 中，攻击进入 `targetingRoll` 后，目标骰 `1/2/3/4` 已自动决定敌方，但 `pendingAttack.defenderId` 尚未写回 core 的窗口
  - 所有 `isAttackModifier: true` 且通过 custom action 标记 `requiresSelectedDefender: true` 的攻击修正卡家族

## 结论等级

- 代表性玩法已验证

说明：
- 本轮已完成 L1 结构审计 + L2 行为验证。
- 本轮没有补新的 L3 真实入口 E2E，因此不把结论提升为“当前发布口径已收口”。

## 权威来源

- 线上真实反馈：`2026-04-30T09:10:01.709Z`，内容为“再来点这张卡自己整个回合都用不了”
- 项目现有四人模式目标流程测试与 E2E：
  - `src/games/dicethrone/__tests__/flow.test.ts`
  - `e2e/dicethrone-simple-start.e2e.ts`
- 当前实现真相源：
  - `src/games/dicethrone/domain/rules.ts`
  - `src/games/dicethrone/domain/executeCards.ts`
  - `src/games/dicethrone/domain/customActions/*.ts`

## 根因结论

- 旧实现把“是否已有单一 defender”严格绑定到 `pendingAttack.defenderId` 是否已写回。
- 但 4 人 `targetingRoll` 的 `1/2/3/4` 分支里，目标其实在骰面出来后就已由方向规则自动决定，只是 `defenderId` 要到 `ADVANCE_PHASE` 退出 `targetingRoll` 时才写回。
- 结果是：
  - `checkPlayCard()` 在这个窗口把攻击修正误判为“还没选目标，不能打”；
  - 即使放开门禁，`executeCardCommand()` 旧逻辑也会因为拿不到有效 `defenderId`，继续走错目标解析分支。

## 为什么之前漏掉

- `card-playCondition-audit.test.ts` 只审元数据/条件声明，不覆盖 `targetingRoll` 的瞬时行为窗口。
- `flow.test.ts` 之前覆盖的是：
  - 会进入 `targetingRoll`
  - `1/2`、`3/4` 最终会在 `defensiveRoll` 前把 `defenderId` 写回
  - 但没覆盖“仍停留在 `targetingRoll` 时立即打攻击修正卡”
- `e2e/dicethrone-simple-start.e2e.ts` 之前也是：
  - 先等 `targetingRoll`
  - 再 `ADVANCE_PHASE`
  - 再断言 `defenderId` 已写回
  - 没覆盖“写回前窗口的真实出牌”

## 命中的同类家族

本轮静态扫到的同类攻击修正卡共 9 张：

- `barbarian`: `card-more-please`
- `pyromancer`: `card-red-hot`, `card-get-fired-up`
- `moon_elf`: `volley`, `watch-out`
- `gunslinger`: `card-wild-west`, `card-eat-my-lead`
- `samurai`: `card-righteousness`, `card-zanshin`

这些卡的共同特征是：

- 卡定义 `isAttackModifier: true`
- effect 走 custom action
- custom action 元数据带 `requiresSelectedDefender: true`

## 本轮修复

- 在 `rules.ts` 新增 `getSelectedCombatOpponentId()`：
  - 常规阶段沿用已写回的 `pendingAttack.attackerId/defenderId`
  - `targetingRoll` 下若目标骰为 `1/2/3/4`，允许直接根据方向规则推导出自动目标
- `checkPlayCard()` 改为基于“已确定或可推导的当前战斗对手”做攻击修正门禁，不再死等 `defenderId` 持久化
- `executeCardCommand()` 改为优先使用该有效目标，保证攻击修正在该窗口能把效果真正结算到自动目标，而不是只放开门禁

## 验证证据

### L1 结构证据

- `requiresSelectedDefender: true` 的攻击修正家族已静态列出并统一收敛到共享门禁
- 新共享 helper `getSelectedCombatOpponentId()` 同时被规则校验与卡牌执行复用，避免“验证层修了、执行层仍错”的双轨分叉

### L2 行为证据

执行命令：

```bash
npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts
npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "攻击修正卡可在 defenderId 写回前直接结算到自动目标"
```

结果：

- `red-hot-meteor-integration.test.ts`: `31 passed`
- `flow.test.ts` 指定用例: `1 passed`

本轮新增/强化断言：

- 4 人 `targetingRoll` 下，自动目标窗口允许上述 9 张攻击修正卡打出
- 4 人 `targetingRoll` 下，手选目标窗口（`5/6`）仍禁止提前打出，避免误放宽
- 代表性共享执行链确认：
  - `More Please` 在 `targetingRoll + value=2 + defenderId 未写回` 时可以直接结算
  - 效果实际落到左侧自动目标 `player 3`
  - 不会错误落到另一名敌方，也不会弹出额外选人交互

## 未覆盖风险

- 本轮没有新跑 L3 真实入口 E2E 去证明“在真实 UI 中，玩家停留在 `targetingRoll` 窗口时立刻从手牌打出这 9 张中的任一张”。
- 当前 `e2e/dicethrone-simple-start.e2e.ts` 对 `targetingRoll` 的覆盖仍偏向“推进后 defenderId 最终写回”，不是这个瞬时窗口。
- 因此本轮结论停在“代表性玩法已验证”，不宣称整条 4 人攻击修正链路已完成 L3/L4 收口。

## 后续建议

- 若要把该专项提升到“当前发布口径已收口”，建议补 1 条代表性真实入口 E2E：
  - 4 人 `2v2`
  - 注入 `targetingRoll value=2` 或 `4`
  - 在未 `ADVANCE_PHASE` 前直接从手牌打出 1 张攻击修正卡
  - 核对目标只命中自动目标敌方
- 之后可把这条 E2E 作为该家族共享回归门禁，而不是再为 9 张卡逐张铺 E2E
