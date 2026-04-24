# SmashUp 线上反馈修复记录（69eb392453c8e640a4475d6b）

- 反馈ID：`69eb392453c8e640a4475d6b`
- 游戏：`smashup`
- 来源：`online-ai-watchdog`
- 原始内容：`[system][online-ai-watchdog] force-end-turn-failed visible-interaction:recover-interaction:blocker_persisted`
- 处理时间：`2026-04-24`

## 问题结论
在 `scoreBases` 阶段，`scoringEligibleBaseIndices` 出现重复索引时，会让 `smashup_reaction_choose` 生成重复交互选项（同一 `optionId` 重复出现）。
watchdog 在 `visible-interaction` 恢复路径中会反复看到“仍有可选项但流程未收口”，最终触发 `blocker_persisted` 失败反馈。

## 代码修复
1. `src/games/smashup/domain/ongoingModifiers.ts`
- 新增 `normalizeScoringEligibleBaseIndices`，对锁定基地索引做保序去重与基础合法性过滤。
- `getScoringEligibleBaseIndices` 统一返回规范化后的索引列表。

2. `src/games/smashup/domain/reduce.ts`
- `SCORING_ELIGIBLE_BASES_LOCKED` 事件写入时改为先规范化，避免脏数据再次落入权威状态。

3. `src/games/smashup/domain/index.ts`
- `getLockedScoringBaseIndices` 改为统一走 `getScoringEligibleBaseIndices`，避免绕过规范化逻辑。

4. `src/games/smashup/__tests__/scoringEligibleLock.test.ts`
- 新增回归：锁定列表出现重复索引时必须保序去重。
- 新增回归：`SCORING_ELIGIBLE_BASES_LOCKED` 事件 payload 含重复索引时写入应去重。

## 验证
执行：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoringEligibleLock.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism
```

结果：`1 passed`，`12 tests passed`。

## 状态回写
- 已将反馈 `69eb392453c8e640a4475d6b` 从 `open` 更新为 `resolved`。
