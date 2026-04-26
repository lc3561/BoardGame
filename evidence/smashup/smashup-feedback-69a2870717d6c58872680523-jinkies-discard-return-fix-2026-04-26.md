# SmashUp 反馈 69a2870717d6c58872680523 修复证据（2026-04-26）

- 反馈：`选择弃牌堆，然后只反回了一张`
- 关联上下文：`行动卡施放：金克丝!`（米斯卡塔尼克大学）

## 根因

`SU_EVENTS.MADNESS_RETURNED` 在 reducer 中按 `uid` 用 `filter` 全量移除。
当弃牌堆里存在同 `uid` 的疯狂卡（历史脏数据/旧链路导致），第 1 次返回事件会把同 uid 的多张一起删掉，但只给疯狂牌库 +1；第 2 次返回事件找不到对应卡，最终表现为“选了 2 张只返回 1 张”。

## 修复

- 将 `MADNESS_RETURNED` 归约改为：每个事件只移除 1 张命中的卡（手牌优先，否则弃牌堆），不再按 uid 全量过滤。
- 保持 `miskatonic_book_of_iter_the_unseen` 的“弃牌堆返回 2 张”交互与 handler 不变，修复点聚焦在事件归约一致性。

## 回归测试

### 命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/madnessPromptAbilities.test.ts --configLoader native
```

### 结果

- 通过：`1 passed, 26 passed`
- 新增断言覆盖：
  - 弃牌堆 2 张正常返回应使 `madnessDeck +2`
  - 弃牌堆同 uid 脏数据下，返回 2 张也应逐张生效（`madnessDeck +2`，剩余卡正确）

## 结论

该反馈对应的“选择弃牌堆后只返回 1 张”已完成代码修复并通过定向回归，可进入 `resolved`。
