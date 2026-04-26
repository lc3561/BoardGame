# SmashUp 线上反馈修复证据

- 反馈 ID: `69a2d72517d6c5887268104f`
- 游戏: `smashup`
- 问题摘要: 发动“便衣忍者”后，只能选择手中影武者，不能选择其他随从。
- 结论: 可标记为 `resolved`

## 根因

`ninja_hidden_ninja` 的能力层并没有只过滤影武者。它会把当前手牌里的全部随从都放进 `targetType: 'hand'` 交互。

真正的限制条件错误在 SmashUp 前端 UI：

1. `currentPrompt.playerId !== playerID` 被用于判断 prompt 是否属于当前玩家。
2. 线上现场里 `currentPrompt.playerId` 会出现数字 `0`，而前端 `playerID` 是字符串 `'0'`。
3. 严格比较失败后，这个手牌交互没有被识别成当前玩家的 direct hand prompt。
4. 手牌点击于是退回响应窗口默认限制，只允许 `beforeScoringPlayable` 的牌，现场就表现成“只能点影武者，不能点其他随从”。

## 修复

1. 在 `src/games/smashup/ui/interactionMode.ts` 新增 `isSmashUpPromptOwnedByPlayer(...)`，统一使用字符串化后的 `playerId` 比较。
2. `resolveSmashUpHandPromptUiMode(...)` 改为复用该 helper，保证数字/字符串 `playerId` 都能识别为当前玩家手牌交互。
3. `src/games/smashup/Board.tsx` 所有依赖“当前 prompt 是否属于玩家”的棋盘/手牌/overlay 分流逻辑，统一改走该 helper，避免 hand/base/minion/ongoing/discard_minion prompt 被误判成非本人交互。
4. `src/games/smashup/ui/PromptOverlay.tsx` 也改为复用同一归属判断，避免同类问题在 overlay prompt 上重复出现。

## 回归测试

### 单元测试

命令 1:

```powershell
npx vitest run src/games/smashup/__tests__/baseFactionOngoing.test.ts -t "会把手牌中所有随从都放入选择交互" --configLoader native
```

结果:

- `1 passed`
- 证明 `ninja_hidden_ninja` 交互候选本来就包含 `ninja_acolyte`、`ninja_shinobi`、`pirate_first_mate`，能力层没有把选择限制成影武者。

命令 2:

```powershell
npx vitest run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native -t "hand targetType 的交互必须先按 direct / overlay 分流，再决定是否允许拖拽"
```

结果:

- `1 passed`
- 新增断言覆盖 `currentPrompt.playerId = 0`、`playerID = '0'` 时，仍会识别为当前玩家的 direct hand prompt。

### E2E

命令:

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/ninja-hidden-ninja-ui-debug.e2e.ts "便衣忍者交互应允许选择非影舞者的其他随从"
```

结果:

- `1 passed`
- 用真实手牌点击非影武者随从 `pirate_first_mate`
- `ninja_hidden_ninja` 交互被成功消费，并进入后续基地选择交互，说明点击没有再被“只能选影武者”的错误限制拦住。

## 截图验收

### 截图 1: 交互出现

- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\ninja-hidden-ninja-ui-debug.e2e\便衣忍者交互应允许选择非影舞者的其他随从\hidden-ninja-other-minion-prompt.png`
- 我实际看到的现象:
  - 顶部提示为“选择要打出到该基地的随从（可跳过）”。
  - 手牌区同时能看到 `Ninja Acolyte` 和 `First Mate` 两张随从本体。
  - 这张图直接证明“非影武者随从仍在候选交互里”，不是只剩影武者可选。
- 是否达到验收标准: 是。它证明了 prompt 本体存在，且非影武者就在真实候选手牌里。

### 截图 2: 选择非影武者后成功推进

- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\ninja-hidden-ninja-ui-debug.e2e\便衣忍者交互应允许选择非影舞者的其他随从\hidden-ninja-other-minion-after.png`
- 我实际看到的现象:
  - 顶部提示已经切换成“选择先得分的基地”，不再是 `ninja_hidden_ninja` 的手牌选择 prompt。
  - 左侧 `托尔图加` 基地上出现第三个随从，总战力从 `8` 变成 `10`，并显示绿色 `+2`。
  - 手牌区只剩 `Ninja Acolyte`，`First Mate` 已不在手牌中。
- 是否达到验收标准: 是。它证明点击的非影武者随从已经成功从手牌打出并推进到后续交互，问题链路已修复。

## 改动文件

- `src/games/smashup/ui/interactionMode.ts`
- `src/games/smashup/Board.tsx`
- `src/games/smashup/ui/PromptOverlay.tsx`
- `src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts`
- `src/games/smashup/__tests__/baseFactionOngoing.test.ts`
- `e2e/smashup/ninja-hidden-ninja-ui-debug.e2e.ts`
- `evidence/smashup/smashup-feedback-69a2d72517d6c5887268104f-hidden-ninja-selection-fix-2026-04-26.md`
