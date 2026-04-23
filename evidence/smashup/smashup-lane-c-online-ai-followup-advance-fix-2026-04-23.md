# SmashUp lane C 在线 AI 收口修复（2026-04-23）

## 范围
- 反馈 `69d775bc932fe508b2420ffb`：AI 打完泰坦后卡死，不会强制结束
- 反馈 `69d725b1932fe508b2420d7e`：电脑对手经常不让过
- 反馈 `69d71fc0932fe508b2420ca9`：大图书馆基地效果执行命令异常（本轮只做关联分诊，未单独修）

## 同根因判断
- 前两条是同根因。
- 共同问题不在 SmashUp 牌面数据，而在在线 AI watchdog 的“交互恢复后收口”逻辑：
  - 当 watchdog 先用 legal action 解决一个 AI 交互后，后续 `active-turn` 会被临时收紧成 `legalActionOnly`。
  - 现有实现把这个状态当成“只允许再找 legal action，绝不允许 fallback 命令”。
  - 一旦 legal action 已耗尽、只剩自然 `ADVANCE_PHASE` 收口时，watchdog 会直接判失败，不会补最后一步过阶段。
- 这会表现成：
  - AI 处理完泰坦/反应/隐藏交互后停在自己的回合里不动。
  - 电脑对手“经常不让过”，尤其是在各种交互链之后。

## 修复点
- `src/engine/transport/server.ts`
  - 给 legal-action 尝试结果补 `outcome`，区分：`blocked`、`no-legal-action`、`legal-action-command-failed`。
  - 对“交互恢复后的 follow-up active-turn”保留 `legalActionOnly` 保护，但允许在 **明确已经没有 legal action** 时，执行原本的 fallback `ADVANCE_PHASE` 收口。
- `src/engine/transport/onlineAiRecovery.ts`
  - 给恢复 candidate 增加 `allowForceCommandAfterLegalActionExhausted` 标记，专门用于上述 follow-up 分支。
- `src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
  - 补回归，锁住 SmashUp 计分阶段的真实契约：泰坦已落地、后续 special 已耗尽时，AI 必须重新暴露 `advance-phase`。
- 已同步 `e2e/src` 镜像：
  - `e2e/src/engine/transport/onlineAiRecovery.ts`
  - `e2e/src/engine/transport/server.ts`
  - `e2e/src/engine/transport/__tests__/server.test.ts`
  - `e2e/src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`

## 反馈逐条结论

### 1) `69d775bc932fe508b2420ffb`
- 是否复现：是，按当前逻辑可由“交互恢复后 legal action 用尽，只剩过阶段”这条链稳定解释。
- 根因：watchdog 在交互恢复后的 `active-turn legal-only` 分支里，把“没有更多 legal action”直接当失败，不再补 `ADVANCE_PHASE`。
- 修复点：允许该分支在 `outcome === no-legal-action` 时执行 fallback `ADVANCE_PHASE`。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE 而不是把 legal-only 当失败" --configLoader native --maxWorkers 1`
- 结果：通过（1 passed）。
- 关键截图绝对路径：未跑 E2E，本轮无截图。
- 建议状态：`resolved`

### 2) `69d725b1932fe508b2420d7e`
- 是否复现：是，与第 1 条同根因；它是更泛化的“交互后 AI 不会自然让过/过阶段”。
- 根因：同上，watchdog 把 follow-up `active-turn` 锁成 `legal-only` 后，没有“legal action 耗尽 -> 继续收口”的出口。
- 修复点：同上；一次修复同时覆盖。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE 而不是把 legal-only 当失败" --configLoader native --maxWorkers 1`
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoreBases-auto-continue.test.ts -t "AI 在计分阶段打出泰坦后，若已无后续 special，应恢复暴露 advance-phase 收口" --configLoader native --maxWorkers 1`
- 结果：两条都通过（各 1 passed）。
- 关键截图绝对路径：未跑 E2E，本轮无截图。
- 建议状态：`resolved`

### 3) `69d71fc0932fe508b2420ca9`
- 是否复现：本轮未重新单独复现。
- 当前判断：旧 evidence 与反馈快照都指向它更像“afterScoring / hidden interaction 的 AI 收口异常”，不是 `base_great_library` 描述实现本身错误。
- 与本轮关系：本轮修的是同一类在线 AI 收口逻辑，但我没有在这次提交里追加大图书馆专属复现链和专属回归。
- 验证命令：无专属新命令；本轮未追加专属验证。
- 关键截图绝对路径：未跑 E2E，本轮无截图。
- 建议状态：`in_progress`
  - 理由：有较强迹象受同类修复影响，但缺本轮专属复现与专属回归，不够直接回写 `resolved`。

## 测试结果
1. `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts -t "online AI watchdog 在交互恢复后若同一 AI 只剩自然过阶段，应补最后一步 ADVANCE_PHASE 而不是把 legal-only 当失败" --configLoader native --maxWorkers 1`
   - 结果：`1 passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoreBases-auto-continue.test.ts -t "AI 在计分阶段打出泰坦后，若已无后续 special，应恢复暴露 advance-phase 收口" --configLoader native --maxWorkers 1`
   - 结果：`1 passed`

## 备注
- 本轮未跑 E2E，因此没有截图证据。
- 这是最小增量修复；未回滚工作区内他人的既有改动。
