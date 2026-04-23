# SmashUp 人类 Critical 反馈批次修复证据（2026-04-23）

- 批次目标：处理线上 `in_progress` 的 5 条人类 `critical` 反馈，按 bug 口径验证后回写 `resolved`。
- 反馈 ID：
  - `69a2f12717d6c5887268128e`
  - `69b3ea7657a311c84a8fe433`
  - `69a297c817d6c588726807b8`
  - `69a2975717d6c588726807a4`
  - `69a283b717d6c588726804b9`

## 执行命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/zombieInteractionChain.test.ts src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`2 files / 29 tests passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/alienAuditFixes.test.ts --config vitest.config.audit.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 -t "外星人关键行动卡数量应锁定"`
   - 结果：目标用例 `1 passed`
3. `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-local-gameplay.e2e.ts "本地模式：手机横屏保留常驻放大按钮，点击按钮只放大不触发出牌"`
   - 结果：`1 passed`

## 逐条结论

### 1) `69a2f12717d6c5887268128e`（外星人卡组数量映射）
- 对应修复：补回归门禁，锁定 `alien_crop_circles=1`、`alien_disintegrator=2`、`alien_beam_up=2`，并校验 `buildDeck(['aliens','pirates'])` 实际展开数量一致。
- 涉及文件：
  - `src/games/smashup/__tests__/alienAuditFixes.test.ts`
  - `e2e/src/games/smashup/__tests__/alienAuditFixes.test.ts`
- 我实际看到什么：新用例执行通过，且断言同时覆盖“卡定义数量”和“发牌展开数量”两层。
- 是否达到验收标准：达到。

### 2) `69b3ea7657a311c84a8fe433`（它们为你而来可无限从弃牌堆打随从）
- 对应验证：`zombieInteractionChain` 里的 `没有额外随从额度时，第二次从弃牌堆打出会被拒绝` 已通过。
- 我实际看到什么：第一张从弃牌堆打出后 `minionsPlayed=1`，第二次 `fromDiscard` 命令被拒绝（额度耗尽）。
- 参考截图（原反馈）：
  - `D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69b3ea7657a311c84a8fe433-screenshot.jpg`
- 是否达到验收标准：达到。

### 3) `69a297c817d6c588726807b8`（基地有问题）
- 对应验证：`multi-base-afterscoring-bug` 复核 through；计分后多交互链可收口，不再卡死在 `scoreBases`。
- 我实际看到什么：托尔图加（`base_tortuga`）相关链路从 `beforeScoring` 到 `afterScoring` 可完整结束，状态可继续推进。
- 参考截图（原反馈）：
  - `D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69a297c817d6c588726807b8-screenshot.jpg`
- 是否达到验收标准：达到。

### 4) `69a2975717d6c588726807a4`（莫名卡住）
- 对应验证：同根因复核（托尔图加 afterScoring 卡链），与上条共同由 `multi-base-afterscoring-bug` 回归覆盖。
- 我实际看到什么：反馈截图场景显示托尔图加计分态；当前回归中交互链可退出，不再“卡住无响应”。
- 参考截图（原反馈）：
  - `D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69a2975717d6c588726807a4-screenshot.jpg`
- 是否达到验收标准：达到。

### 5) `69a283b717d6c588726804b9`（经常看不见卡牌放大镜）
- 对应验证：真实移动横屏 E2E 已通过，放大镜按钮常驻可见，点击后仅打开放大层、不触发出牌。
- 关键截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-local-gameplay.e2e\本地模式：手机横屏保留常驻放大按钮，点击按钮只放大不触发出牌\smashup-mobile-inspect-button-preview.png`
- 我实际看到什么：中央出现卡牌放大层，手牌区仍保留原牌；右侧回合按钮和底部弃牌区正常，未发生误打出。
- 是否达到验收标准：达到。

