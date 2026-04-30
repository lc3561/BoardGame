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

- 代表性真实入口已验证

说明：
- 本轮已完成 L1 结构审计 + L2 行为验证 + 1 条代表性 L3 真实入口 E2E。
- 已命中的新增漏点 `gunslinger / card-eat-my-lead` 现在同时具备执行层回归与浏览器级真实入口证据。
- 但本轮仍不是 9 张卡逐张 L3 全覆盖，结论口径保持为“共享家族代表性收口”，不冒充“全家族逐卡浏览器级穷尽”。

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
- 追加修复 `gunslinger` 的执行层漏点：
  - `card-eat-my-lead` 在自动目标窗口里原本仍直接读取 `state.pendingAttack.defenderId`
  - 导致该卡虽然已能打出，但“击倒”附加效果与奖励骰特写目标仍可能在 `defenderId` 写回前失真
  - 现已改为统一跟随 effect context 中“已确定或可推导”的对手
- 额外加固 `gunslinger` 的 `Loaded` 链：
  - 虽然当前时序下它会在 `targetingRoll` 自动目标已写回后才打开 token 选择，不属于本次已命中的同类 bug
  - 但为避免后续时序调整再次踩中同类问题，`Loaded` 奖励骰上下文也已切到同一套“已确定或可推导目标”解析

## 验证证据

### L1 结构证据

- `requiresSelectedDefender: true` 的攻击修正家族已静态列出并统一收敛到共享门禁
- 新共享 helper `getSelectedCombatOpponentId()` 同时被规则校验与卡牌执行复用，避免“验证层修了、执行层仍错”的双轨分叉

### L2 行为证据

执行命令：

```bash
npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts
npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "攻击修正卡可在 defenderId 写回前直接结算到自动目标"
npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "4 人模式 targetingRoll 自动目标后，Loaded token 的奖励骰特写应命中自动目标"
npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/cross-hero.test.ts -t "gunslinger|吃我子弹|Loaded|wild-west|eat-my-lead"
```

结果：

- `red-hot-meteor-integration.test.ts`: `32 passed`
- `flow.test.ts` 指定用例: `1 passed`
- `flow.test.ts` Loaded 指定用例: `1 passed`
- `red-hot-meteor-integration.test.ts + cross-hero.test.ts` 枪手相关回归筛选: `45 passed`

本轮新增/强化断言：

- 4 人 `targetingRoll` 下，自动目标窗口允许上述 9 张攻击修正卡打出
- 4 人 `targetingRoll` 下，手选目标窗口（`5/6`）仍禁止提前打出，避免误放宽
- 代表性共享执行链确认：
  - `More Please` 在 `targetingRoll + value=2 + defenderId 未写回` 时可以直接结算
  - 效果实际落到左侧自动目标 `player 3`
  - 不会错误落到另一名敌方，也不会弹出额外选人交互
  - `Eat My Lead` 在同一窗口下不仅允许打出，还会：
    - 把奖励骰特写目标写到自动目标
    - 在加伤 > 4 时把 `Knockdown` 立即施加到自动目标，而不是因为 `defenderId` 尚未写回而丢失
- 扩审补充结论：
  - 本轮对这 9 张 `requiresSelectedDefender: true` 攻击修正卡再次静态复扫后，新增命中的执行层同类遗漏只发现 `gunslinger/card-eat-my-lead`
  - 其余 8 张在当前实现中已经通过 effect context / 共享 helper 跟随“已确定或可推导的目标”，未再发现同类直接绑死 `pendingAttack.defenderId` 的执行路径
  - 另外对最像的边界链 `Loaded` 做了单独行为验证，确认它在 4 人 `targetingRoll` 自动目标场景下会把奖励骰特写正确落到自动目标 `player 3`

### L3 真实入口证据

执行命令：

```bash
node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online 4-player Eat My Lead: real hand play in targetingRoll auto-target window keeps spotlight and defense on inferred enemy"
```

结果：

- `1 passed`

关键截图与肉眼观察：

- [07-four-player-eat-my-lead-before-play](D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/dicethrone/dicethrone-simple-start.e2e/Online-4-player-Eat-My-Lead-real-hand-play-in-targetingRoll-auto-target-window-keeps-spotlight-and-defense-on-inferred-e/07-four-player-eat-my-lead-before-play.png)
  - 实际看到 4 人 `2v2` 在线房间里，当前视角是枪手，已停在 `4. 掷骰攻击阶段` 对应的 `targetingRoll` 窗口。
  - 肉眼可见手牌中的《吃我的铅弹！》本体已被真实抬起准备打出，不是 harness 直接发命令伪造的结果。
  - 此时右侧“确认目标”仍处于当前窗口流程中，达到了“在 `defenderId` 写回前真实从手牌出牌”的验收前提。

- [08-four-player-eat-my-lead-overlay-on-auto-target](D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/dicethrone/dicethrone-simple-start.e2e/Online-4-player-Eat-My-Lead-real-hand-play-in-targetingRoll-auto-target-window-keeps-spotlight-and-defense-on-inferred-e/08-four-player-eat-my-lead-overlay-on-auto-target.png)
  - 实际看到 5 颗奖励骰本体出现在“投掷结果”特写里，没有冒出额外的手选目标面板。
  - 右上角“攻击修正”已经从 0 变成 `+2`，说明这张攻击修正卡已在真实 UI 链路里生效。
  - 同步状态断言确认 `pendingBonusDiceSettlement.targetId = '3'`，因此该截图对应的特写对象已正确挂到自动目标敌方 `player 3`，达到本轮核心验收标准。

- [09-four-player-eat-my-lead-overlay-closed](D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/dicethrone/dicethrone-simple-start.e2e/Online-4-player-Eat-My-Lead-real-hand-play-in-targetingRoll-auto-target-window-keeps-spotlight-and-defense-on-inferred-e/09-four-player-eat-my-lead-overlay-closed.png)
  - 实际看到 5 骰特写已收口，画面回到正常棋盘，不再有奖励骰覆盖层遮挡。
  - 《吃我的铅弹！》已回到右下角弃牌/已打出区域，说明真实出牌动作已经收口，不是半途卡在特写里。
  - 收口后仍留在可继续推进的攻击窗口，满足“特写关闭后流程可继续”的验收标准。

- [10-four-player-eat-my-lead-correct-defender](D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/dicethrone/dicethrone-simple-start.e2e/Online-4-player-Eat-My-Lead-real-hand-play-in-targetingRoll-auto-target-window-keeps-spotlight-and-defense-on-inferred-e/10-four-player-eat-my-lead-correct-defender.png)
  - 实际看到敌方圣骑士页面进入 `5. 掷骰防御阶段`，对应防御技能高亮为“神圣防御”，右侧出现防御投掷按钮。
  - 这张图直接说明后续防守链落到了 `player 3`，而不是另一名敌方或队友。
  - 结合状态断言 `pendingAttack.defenderId = '3'`，可以确认“真实手牌打出攻击修正 → 自动目标敌方进入防守”整条链路已达到验收标准。

## 未覆盖风险

- 本轮只补了 1 条代表性真实入口 E2E，尚未把其余 8 张同家族攻击修正逐张做浏览器级覆盖。
- 在线房间的权威随机数不便在这条 E2E 中强行固定，因此“`Eat My Lead` 掷出 >4 子弹时立刻施加 `Knockdown`”仍主要由执行层/集成测试证明；本轮浏览器级重点验证的是“特写目标 + 防守链目标”。
- 因此当前最准确口径是：这次实际命中的根因链已具备 L3 收口，但该家族仍未做逐卡 L4 穷尽。

## 审计维度修订

- 本轮确认现有审计维度确实少了一条“阶段中间态 / 瞬时窗口行为矩阵”。
- 这次漏项并不是静态定义错误，也不是阶段最终状态错误，而是：
  - 自动目标在业务上已经确定
  - 但权威字段尚未持久化
  - 导致验证层和执行层分别在这个短窗口里出现误禁用/半结算
- 已将该类问题上升为 `D50`，要求以后至少区分：
  - 进入前
  - 窗口中（未写回）
  - 写回后
  - 收口后

## 后续建议

- 现有这条 `Eat My Lead` 真实入口 E2E 可以作为该家族的共享 L3 门禁保留。
- 若后续再命中同家族新问题，优先补执行层/flow 回归；只有确认入口形态明显不同，再决定是否追加第二条浏览器级代表用例，而不是把 9 张卡逐张铺满 E2E。
