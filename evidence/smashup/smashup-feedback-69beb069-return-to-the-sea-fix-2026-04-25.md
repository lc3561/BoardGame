# SmashUp 反馈 69beb0691d2bf594c0c2c2d3: 重返深海 afterScoring 目标基地漂移修复

## 反馈入口

- 反馈 ID：`69beb0691d2bf594c0c2c2d3`
- 反馈摘要：`1.使用重返深海无效 2.机器人基地满了爆破点后没反应，不结算`
- 映射来源：`temp/feedback-closeout/unknown-open-mapping-2026-04-24.md`

## 历史线索

这条反馈和 SmashUp 既有的 afterScoring 基地漂移问题是同一类现象：

1. `evidence/smashup/smashup-afterscoring-base-index-mismatch.md` 里已经记录过，afterScoring 逻辑曾把“当前结算基地”错误地降格成“任意达标基地索引”，一旦基地替换或多基地同时达标，后续 special 会打到错误基地。
2. 该文档里的旧 actionLog/state snapshot 线索说明：`afterScoringTriggeredBases`/响应窗口如果只盯索引，基地替换后会把原本应该指向旧基地的 special 漂到新基地，最终表现成“用了没效果”或“目标基地已经不对了”。

## 本地复现（修前）

新增回归测试前，直接在 afterScoring 响应窗口里构造以下状态：

- `smashupReactionSession.sourceBaseIndex = 0`
- `responseWindowType = 'afterScoring'`
- `core.scoringEligibleBaseIndices = [0, 1]`
- 手牌只有 `innsmouth_return_to_the_sea`

修前定向测试失败，调试日志显示命令校验把错误基地也当成合法目标：

```text
[DEBUG] PLAY_ACTION validation: start { cardUid: 'card-1', targetBaseIndex: 1, windowType: 'afterScoring' }
[DEBUG] PLAY_ACTION validation: eligible bases { eligibleIndices: [ 0, 1 ], targetBaseIndex: 1, isEligible: true }
[DEBUG] PLAY_ACTION validation: PASSED (Me First! mode)
```

这证明 `重返深海` 在 afterScoring 响应窗口里会被错误地放行到“另一个同样达标的基地”，而不是当前正在结算的那个基地。

## 修复内容

1. `reactionSession` 生成 afterScoring 可打牌选项时，只暴露 `session.sourceBaseIndex` 对应的当前结算基地。
2. `PLAY_ACTION` 命令校验在 afterScoring 窗口中额外检查：
   - 如果 `targetBaseIndex !== smashupReactionSession.sourceBaseIndex`，直接拒绝。
   - 返回明确错误：`afterScoring 只能选择当前正在结算的基地`。

## 修后验证

执行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterscoring-response-window-execution.test.ts --configLoader native --testNamePattern "其他达标基地|重返深海|我们乃最强"
```

结果：`4 passed`

关键通过点：

1. `targetBaseIndex: 1` 现在被命令校验拒绝，并输出 `afterScoring 只能选择当前正在结算的基地`。
2. `targetBaseIndex: 0` 仍然可以正常打出 `重返深海`。
3. 原有的 `重返深海` / `我们乃最强` afterScoring 立即执行回归继续通过，没有引入回退。

## 同反馈第 2 点验证（基地达标后结算）

反馈原文还包含：`机器人基地满了爆破点后没反应，不结算`。
针对这个现象，本轮补了专门回归并复演反馈快照，结论是当前代码下可正常结算。

执行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoreBases-auto-continue.test.ts --configLoader native -t "反馈 69beb069：基地已达 breakpoint 且当前玩家仍有额外随从额度时，ADVANCE_PHASE 仍应触发基地计分"
```

结果：`1 passed`

关键通过点：

1. 即使当前玩家仍有额外随从额度，legal actions 仍包含 `advance-phase`。
2. 执行 `ADVANCE_PHASE` 后事件链包含 `SU_EVENT_TYPES.BASE_SCORED` 与 `SU_EVENT_TYPES.BASE_CLEARED`。
3. 基地被正常替换（不再卡在原基地）。
