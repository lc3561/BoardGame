# 线上 AI 自动反馈保留策略与清理记录（2026-04-30）

## 范围

- 来源：生产 Mongo `feedbacks` 集合中的 watchdog 自动反馈
- 识别口径：
  - `source = online-ai-watchdog`
  - 或 `contactInfo = system:online-ai-watchdog`
  - 或 `errorContext.source = online-ai-watchdog`
  - 或 `content` 以 `[system][online-ai-watchdog]` 开头

## 生产库清理前现状

- 时间：`2026-04-30`
- 总量：`19645`
- `open/in_progress`：`10`
- 最近保留窗口预览：
  - 最新 100 条中 `open/in_progress = 0`
  - 最新 100 条时间范围：
    - 最早：`2026-04-30T02:43:32.351Z`
    - 最新：`2026-04-30T09:10:58.490Z`

结论：

- 仍然 `open` 的 10 条自动反馈都已落在“最新 100 条”之外，属于旧历史噪音。
- 用户已明确授权“确认已修复的可以直接关闭或者删除”，因此本轮直接按保留策略裁剪旧数据。

## 已确认的历史根因

### Dice Throne targetingRoll 卡死类

- 现象：`force-end-turn-failed active-turn:follow-up-advance:command_failed`
- 共同快照特征：
  - `phase=targetingRoll`
  - `legalActions.total=0`
  - `shared/seatUnsatisfiableReason=empty-options`
- 对应本地修复与验证：
  - `src/engine/transport/onlineAiRecovery.ts`
  - `src/engine/transport/__tests__/server.test.ts`
  - 验证：`node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --maxWorkers 1`

### Smash Up scoreBases / reaction recover-interaction 类

- 现象：`force-end-turn-failed visible-interaction:recover-interaction:blocker_persisted`
- 对应本地修复：
  - `src/games/smashup/domain/ongoingModifiers.ts`
  - `src/engine/systems/SimpleChoiceSystem.ts`
- 已有证据：
  - `evidence/smashup/smashup-online-ai-watchdog-open-feedback-triage-2026-04-30.md`
  - `evidence/_shared/engine-watchdog-69ecff249087da2a55c922a5-fix-2026-04-26.md`

## 本轮代码改动

### 新保留策略

- 文件：`apps/api/src/modules/feedback/feedback.service.ts`
- 调整：
  - watchdog 自动反馈不再保留 30 天 closed archive
  - 改为：
    - **仅保留最近 3 天窗口内的最新 100 条**
    - **超过 100 条时，直接删除更旧 watchdog 自动反馈**

### 新去重策略

- 文件：`src/engine/transport/server.ts`
- 调整：
  - `force-end-turn-success`
  - `legal-action-recovered`
  - 这两类“已经自愈/已经恢复成功”的 watchdog 事件，**不再默认写入 feedback 库**
  - 仍保留服务端日志；真正会入库的自动反馈聚焦：
    - 恢复失败
    - 无解交互自动跳过
    - 其他仍需人工关注的异常

- 文件：`apps/api/src/modules/feedback/feedback.service.ts`
- 调整：
  - 新增按 `aggregationKey` 的进程内串行锁
  - 避免同一 watchdog key 并发写入时短暂产生多个 canonical 记录

### 回归测试

- 文件：`apps/api/test/feedback.e2e-spec.ts`
- 新增覆盖：
  - 超过 3 天的旧归档会被自动清理
  - 近 3 天内未超 100 条不会误删
  - 近 3 天内超过 100 条时，只保留最近 100 条

## 本地验证

- `npx eslint apps/api/src/modules/feedback/feedback.service.ts apps/api/test/feedback.e2e-spec.ts`
- `node scripts/infra/vitest-cli-safe.mjs run apps/api/test/feedback.e2e-spec.ts --config vitest.config.api.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
- `npx eslint src/engine/transport/server.ts src/engine/transport/__tests__/server.test.ts`
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --maxWorkers 1`

结果：通过。

## 生产库已执行清理

执行结果：

- 清理前总量：`19645`
- 清理前 `open/in_progress`：`10`
- 保留：`100`
- 删除：`19545`
- 清理后总量：`100`
- 清理后 `open/in_progress`：`0`

说明：

- 本轮直接删除了所有不在“最新 100 条”中的 watchdog 自动反馈。
- 因为 10 条 `open` 自动反馈本就都不在最新 100 条里，已随裁剪一并删除。

## 生产库已继续去重

- 对清理后剩余的自动反馈，再按 `gameName + content` 做了一次“只保留最新一条”的去重
- 删除重复项：`11`
- 当前剩余总量：`89`
- 当前重复组：`0`

说明：

- 这一步是针对“你不需要重复反馈”的口径做的二次裁剪。
- 由于当前剩余自动反馈全部是历史成功/恢复类记录，按内容去重删除风险可接受。

## 风险与后续

- **代码层保留策略已在本地补齐，但还未部署到生产。**
- 当前生产库已经人工裁剪到 100 条；若不部署新 API 代码，后续 watchdog 自动反馈仍可能重新积累。
- 下一步应在合适时机把本轮 API 改动部署到生产，使“最近 100 条”策略自动生效。
