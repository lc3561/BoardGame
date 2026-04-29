# Lane B：AI 卡住同根因核验（2026-04-23）

## 范围
- 反馈：`69d775bc932fe508b2420ffb`
- 反馈：`69d725b1932fe508b2420d7e`
- open 系统单：`69e99d08ddc2605b331ecf1e`
- 允许范围：`src/engine/transport/**`、`e2e/src/engine/transport/**`、`evidence/**`

## 核验结论
当前 watchdog 修复已能覆盖这组场景，未发现需要再追加的新实现缺口。

这组反馈可以收敛为同一条 `online-ai-watchdog` 收口链问题，细分为两类：

1. `visible/hidden interaction` 恢复阶段缺失 `interaction.id`
   - 旧行为：无法构造稳定 suffix / attempt key，容易直接落入不该发的 `ADVANCE_PHASE` 或收口失败。
   - 当前修复：允许 `interaction.id` 缺失时回退到 `${playerId}:unknown-interaction`，并优先执行 `SYS_INTERACTION_CANCEL`。

2. 交互恢复后，同一 AI 仅剩“自然过阶段”
   - 旧行为：watchdog 把 follow-up 阶段限制成 `legalActionOnly`，但该时刻已经没有可执行 legal action，于是会报
     `force-end-turn-failed active-turn:follow-up-advance:command_failed` 或等价失败。
   - 当前修复：在特定安全场景放开“legal action 耗尽后允许回退到强制命令”：
     - `dicethrone` 的 `defensiveRoll`
     - `smashup` 的 `scoreBases`
   - 这样会在 legal action 已经把交互收口后，再补最后一步 `ADVANCE_PHASE`，避免 AI 卡在“已经没交互但还没真正交班”的半收口状态。

## 与三条反馈的对应关系

### 69d725b1932fe508b2420d7e
- 用户描述：`电脑对手经常不让过`
- 现场特征：SmashUp 在线对局，AI 卡在自己 `playCards` / `active-turn`，表现为该让过时不让过。
- 判定：属于 watchdog 的 `active-turn/follow-up-advance` 收口链问题。
- 覆盖判断：已被现有 active-turn watchdog 用例覆盖，且当前修复不会回退该基础能力。

### 69d775bc932fe508b2420ffb
- 用户描述：`AI的巫师似乎经常在打完泰坦之后卡死`
- 现场特征：SmashUp 巫师 AI 行动后停在自己回合，不会自然交班。
- 判定：高概率属于“交互已恢复，但只剩自然过阶段”的 follow-up 收口缺口；与系统单错误文案一致。
- 覆盖判断：已被新增 `scoreBases -> follow-up ADVANCE_PHASE` 用例直接覆盖。

### 69e99d08ddc2605b331ecf1e
- 系统单文案：`[system][online-ai-watchdog] force-end-turn-failed active-turn:follow-up-advance:command_failed`
- 判定：这是第二类缺口的直接系统侧症状。
- 覆盖判断：已被新增 follow-up 用例命中并转绿。

## 代码侧核验点
- `src/engine/transport/onlineAiRecovery.ts`
  - `buildForceEndTurnFromInteractionState()` 不再要求 `current.id` 必须存在；缺失时用 fallback interaction id。
  - `ForceEndTurnStalledAiResolution` 新增 `allowForceCommandAfterLegalActionExhausted`。
- `src/engine/transport/server.ts`
  - `tryRecoverOnlineAiWithLegalAction()` 显式返回 `outcome`，区分：
    - `applied`
    - `blocked`
    - `no-legal-action`
    - `legal-action-command-failed`
  - follow-up 链在 `dicethrone:defensiveRoll` / `smashup:scoreBases` 下，允许 legal action 耗尽后回退到 `ADVANCE_PHASE`。
- `src/engine/transport/__tests__/server.test.ts`
  - 已有基础 active-turn 卡死收口用例。
  - 新增“缺失 interaction id 时先 cancel”用例。
  - 新增“交互恢复后只剩自然过阶段时补最后一步 ADVANCE_PHASE”用例。

## 验证
已执行：

```powershell
npm test -- src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在 active-turn 卡死时应持续推进直到交还给真人回合（或遇到 blocker/步数上限）"
npm test -- src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在缺失 interaction id 的 AI 交互上应先取消交互，避免误发 ADVANCE_PHASE"
npm test -- src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE 而不是把 legal-only 当失败"
git diff --no-index -- src/engine/transport/server.ts e2e/src/engine/transport/server.ts
git diff --no-index -- src/engine/transport/onlineAiRecovery.ts e2e/src/engine/transport/onlineAiRecovery.ts
git diff --no-index -- src/engine/transport/__tests__/server.test.ts e2e/src/engine/transport/__tests__/server.test.ts
```

结果：
- 3 次 `npm test` 都通过；当前 `server.test.ts` 总计 `57 passed`。
- 虽然 `-t` 被 npm 当普通参数处理，实际运行了整个 `src/engine/transport/__tests__/server.test.ts`，因此验证范围更大，不是更小。
- 3 组 `src` / `e2e/src` no-index diff 无正文输出，仅有 CRLF warning；视为镜像一致。

## 本轮结论
- 当前 watchdog 修复已经完整覆盖这组三条反馈所指向的同根因场景。
- 本轮不需要再追加新的实现修复；现有 transport 脏改已经把缺口补齐。
- 由于本轮只做核验，没有再叠加新的 transport 代码改动。
