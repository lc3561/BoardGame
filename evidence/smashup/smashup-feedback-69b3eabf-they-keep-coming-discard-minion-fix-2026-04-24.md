# SmashUp 反馈 69b3eabf57a311c84a8fe435 复核证据（2026-04-24）

- 反馈 ID：`69b3eabf57a311c84a8fe435`
- 严重级别：`medium`
- 类型：`bug`
- 反馈原文：打出“它们不断来临”后，出现“从弃牌堆拿回手牌并返还随从位”的异常。

## 问题定位

- 反馈截图对应卡牌为僵尸行动卡 `zombie_they_keep_coming`（`They Keep Coming` / `它们不断来临`）。
- 规则语义：应“从弃牌堆额外打出一个随从”，不是“回手牌+返还随从额度”。

## 代码核对

- `src/games/smashup/abilities/zombies.ts`
  - `zombieTheyKeepComing` 创建 `targetType: 'discard_minion'` 交互。
  - `zombie_they_keep_coming` 交互 handler 直接发出 `MINION_PLAYED`，并显式带 `fromDiscard: true`、`consumesNormalLimit: false`。
  - 未走 `recoverCardsFromDiscard`（不会回手牌），也不会发 `LIMIT_MODIFIED`（不会返还随从位）。

## 回归验证

1. 命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionChainE2E.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "P2: zombie_they_keep_coming"
```

2. 结果
- 通过：`3 passed`
- 覆盖关键断言：
  - 选择弃牌堆随从并指定基地后，随从直接进入基地；
  - 不会进入手牌；
  - 不会返还/新增随从额度；
  - 被 `zombie_overrun` 封锁的基地会拒绝该次弃牌堆打出。

## 结论

- 该反馈描述的问题在当前实现中已修复并且可复测通过。
- 本轮无需再改业务逻辑代码，进入线上状态回写 `resolved`。
