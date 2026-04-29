# Smash Up 世界冠军《快如闪电 / 女主角 / 阿拉密斯》真实入口 E2E 证据（2026-04-28）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：
  - `world_champs_fast_as_lightning / 快如闪电`
  - `world_champs_diva / 女主角`
  - `world_champs_aramis / 阿拉密斯`
- 目标：
  1. 补齐《快如闪电》打到《阿拉密斯》后，真实进入 `smashup_reaction_choose` 的 L3 证据。
  2. 证明反应窗中会同时出现《女主角》《阿拉密斯》。
  3. 证明先选《女主角》后只复制出 `+2`，不会被双算成 `+4`。
  4. 证明再选《阿拉密斯》后会正确提供额外行动，并能真实用于打出《现在是闪电时间！》。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-40.png`（《快如闪电》）
  - `temp/cards7-28.png`（《女主角》）
  - `temp/cards7-32.png`（《阿拉密斯》）
- 当前实现：
  - `src/games/smashup/domain/reactionQueueHandlers.ts`
  - `src/games/smashup/domain/ongoingEffects.ts`
  - `e2e/framework/GameTestContext.ts`
- 当前回归文件：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 旧结论失效

- 旧误判：
  - 之前曾把《女主角》判成“复制标准行动效果没问题”。
- 失效原因：
  1. 当时主要看的是 `events`，没有把 `finalState` 当成硬验收项。
  2. 没有把 `triggerQueue` 和 `smashup_reaction_choose` 的收口过程纳入审计。
  3. 没有补“《快如闪电》真实打到《阿拉密斯》”这条浏览器级入口。
- 直接后果：
  - 《女主角》实际最终态会被双算到 `+4`；
  - 《阿拉密斯》会被《女主角》的复制事件错误再入队；
  - 这些都能在真实入口链路上出现，但旧审计没拦住。

## 本轮实现补丁

- `src/games/smashup/domain/reactionQueueHandlers.ts`
- `e2e/src/games/smashup/domain/reactionQueueHandlers.ts`
  - 给 `smashup_reaction_choose` 增加 `keepSysUpdatesOnly(...)`。
  - 只把 `sys` 更新交回系统层，不再把已经预先 reduce 过的 `core` 连同原事件再交给引擎二次 reduce。
- `src/games/smashup/domain/ongoingEffects.ts`
- `e2e/src/games/smashup/domain/ongoingEffects.ts`
  - 为《阿拉密斯》补 `onMinionAffected` 过滤：只有“自己被标准行动影响”才允许入队。
  - 为《女主角》补同批次目标过滤：只对原始受影响的“同基地其他己方随从”建立一次复制反应，避免同批次误回看。
- `e2e/framework/GameTestContext.ts`
  - 加强“无基地前置、直接选随从”的行动牌落点处理。
  - `selectOption()` 只要当前 interaction 中存在该 option，就优先直发 `SYS_INTERACTION_RESPOND`，避免和场上中文卡名撞点击。
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 新增 3 条定向回归：
    - `world_champs_diva 应以可选反应形式复制标准行动效果，未选择前不会自动生效，且不受“你的回合”限制`
    - `world_champs_fast_as_lightning 打到阿拉密斯后应进入包含女主角与阿拉密斯的反应窗`
    - `world_champs_fast_as_lightning 依次选择女主角与阿拉密斯后应正确收口并保留额外行动`
- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增真实入口用例：
    - `快如闪电打到阿拉密斯后应可选触发女主角复制并让阿拉密斯提供额外行动`

## 根因裁定

### 1. 《女主角》不是配置录错，是 reaction handler 双 reduce

- 真实问题：
  - `smashup_reaction_choose` handler 返回了一个已经预先 reduce 过的 `state`；
  - 系统层随后又把同一批 `events` reduce 一次；
  - 所以《女主角》复制出来的 `TEMP_POWER_ADDED(+2)` 最终落成了 `+4`。
- 这属于：
  - **实现错误 / reducer 边界错误**
- 不属于：
  - 卡图录错
  - 中文名录错
  - defId 映射错

### 2. 《阿拉密斯》不是索引错，是触发范围错误

- 真实问题：
  - 《女主角》复制《快如闪电》给自己加 `+2` 后，
  - `collectTriggers()` 仍会把《阿拉密斯》按 `onMinionAffected` 再次入队，
  - 但《阿拉密斯》语义上只该在“自己被标准行动影响”时触发。
- 这属于：
  - **触发范围错误 / trigger 过滤缺口**

### 3. 真实入口 E2E 之前还有 helper 稳定性缺口

- 真实问题：
  - 《快如闪电》这种“直接选随从、没有基地前置”的行动牌，在旧 helper 下会出现目标点击不稳。
- 这属于：
  - **测试基建缺口**
- 不是卡牌实现本体错误，但会掩盖真实入口证据。

## 执行命令

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "world_champs_diva 应以可选反应形式复制标准行动效果|world_champs_fast_as_lightning 打到阿拉密斯后应进入包含女主角与阿拉密斯的反应窗|world_champs_fast_as_lightning 依次选择女主角与阿拉密斯后应正确收口并保留额外行动"

$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "快如闪电打到阿拉密斯后应可选触发女主角复制并让阿拉密斯提供额外行动"
```

## 结果

- 定向单测：`3 passed`
- 真实入口 E2E：`1 passed`

## 关键截图与肉眼结论

> 本轮稳定截图落在 `e2e/evidence/screenshots/`，以下均为绝对路径。

### 1. 反应窗同时出现《女主角》《阿拉密斯》

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-diva-aramis-reaction-prompt-2026-04-28.png`
- 我实际看到：
  1. 《快如闪电》已经真实打到《阿拉密斯》，不是只停在手牌或日志。
  2. 当前反应窗里同时出现《女主角》和《阿拉密斯》两张可选牌，不是只出现其中一张。
  3. 这张图直接证明 `smashup_reaction_choose` 入口已被真实拉起。
- 是否达到验收标准：
  - **达到。** 这张图证明《快如闪电》真实触发了“女主角复制 + 阿拉密斯额外行动”的联合反应窗。

### 2. 最终已收口，额外行动已被真实消费

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-diva-aramis-resolved-2026-04-28.png`
- 我实际看到：
  1. 《女主角》最终显示为 `+5`，对应“先复制《快如闪电》得 `+2`，再吃《现在是闪电时间！》得 `+3`”。
  2. 《阿拉密斯》显示为 `+2`，说明《快如闪电》本体对它的影响还在，且没有出现异常重复再加。
  3. 反应窗已经关闭，后续行动已真实打出，说明《阿拉密斯》给出的额外行动不是虚额度。
- 是否达到验收标准：
  - **达到。** 这张图证明整条链已经从“联合反应”收口到“额外行动真实被用掉”。

## 状态断言补充

- 单测明确断言：
  - 进入 `smashup_reaction_choose` 后，选 `pass` 时《女主角》不会自动生效。
  - 选择《女主角》后，`resolved.finalState` 中《女主角》最终只应为 `+2`，不是 `+4`。
  - 选择《女主角》后，当前反应窗只剩《阿拉密斯》。
  - 再选《阿拉密斯》后，reaction session 正确关闭，且 `actionLimit >= 2`。
- E2E 明确断言：
  - 反应窗 `sourceId === 'smashup_reaction_choose'`
  - 选项中同时存在 `world_champs_diva` 与 `world_champs_aramis`
  - 选完《女主角》后：
    - `diva-1.tempPowerModifier === 2`
    - 当前 options 只剩 `world_champs_aramis`
  - 选完《阿拉密斯》后：
    - `aramis-1.tempPowerModifier === 2`
    - `players['0'].actionsPlayed === 1`
    - `players['0'].actionLimit >= 2`
  - 再打出《现在是闪电时间！》并选《女主角》后：
    - `players['0'].actionsPlayed === 2`
    - `finalDiva.tempPowerModifier === 5`
    - `finalAramis.tempPowerModifier === 2`

## 这次暴露的审计维度缺口

- 旧审计主要覆盖了：
  - 卡图
  - 中文名
  - defId
  - 静态注册
  - 单条 `events`
- 但还不够，必须补进：
  1. `finalState`
  2. `triggerQueue`
  3. `reaction session` 收口
  4. 真实入口 L3 E2E
- 这次之所以会漏，不是因为“审计根本没做”，而是因为**审计维度没有深入到实现级状态边界**。

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- 《快如闪电》《女主角》《阿拉密斯》当前均已补到浏览器级对象证据：
  - 《快如闪电》：真实打出并打到《阿拉密斯》，拉起联合反应窗
  - 《女主角》：真实以可选反应复制标准行动，最终只得 `+2`
  - 《阿拉密斯》：真实在自己被标准行动影响后提供额外行动，并被实际消费
- 这 3 张牌本轮确认都不是数据录入问题。
- 截至本轮，`World Champs / 世界冠军` 已累计补到 `19` 条正路径对象级 L3 证据；但三新派系整包仍保持 **仍有残余范围**。
