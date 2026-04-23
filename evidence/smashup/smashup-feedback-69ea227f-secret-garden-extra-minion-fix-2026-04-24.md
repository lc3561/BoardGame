# SmashUp 反馈 69ea227f 修复证据（2026-04-24）

- 反馈 ID：`69ea227fddc2605b331ed490`
- 标题：`神秘花园不能额外打出战力2的英雄`
- 线上状态来源：`temp/feedback-closeout/query-feedback-69ea227f-20260424.raw.txt`

## 根因

- 问题不是“2 战力随从不可选”，而是**选中后交互没有从当前提示弹出**。
- `smashup_immediate_extra_minion` 的后续交互（`smashup_immediate_extra_minion_base`）被入队，但旧交互未被 `resolveInteraction` 弹出，UI 看起来像“点了没反应”。
- 触发点：`src/games/smashup/domain/systems.ts` 中 `SYS_INTERACTION_RESOLVED/CANCELLED` 后的交互收口判定。

## 代码修复

- 修复文件：`src/games/smashup/domain/systems.ts`
- 修复策略：当 handler 处理后当前交互 `id` 仍与处理前一致时，强制执行一次 `resolveInteraction`，确保当前交互弹出并推进到下一步。

## 回归测试

- 新增回归用例：
  - `src/games/smashup/__tests__/afterScoring-rescoring.test.ts`
  - 用例名：`smashup_immediate_extra_minion 选牌后应推进到基地选择，不应停留在原交互`

- 执行命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterScoring-rescoring.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1`
  - `node node_modules/eslint/bin/eslint.js src/games/smashup/domain/systems.ts src/games/smashup/__tests__/afterScoring-rescoring.test.ts`

## 线上快照复现复核（修前/修后）

- 使用线上反馈快照（`69ea227f`）驱动 `GameTestRunner`：
  - 修前：选 `card-0` 后 `cur2.sourceId` 仍是 `smashup_immediate_extra_minion`（卡住）。
  - 修后：选 `card-0` 后 `cur2.sourceId` 变为 `smashup_immediate_extra_minion_base`，且队列为空（正常推进）。

## 结论

- 本次为真实 bug 修复，不是状态关闭替代修复。
- 已有代码级修复 + 回归用例 + 线上快照链路复核证据。
