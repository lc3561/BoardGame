# 线上反馈批次 11 跨游戏验证（2026-04-24）

## 范围
- lane B 仅处理非 `smashup` 人类反馈。
- 本轮按“优先找可快速验证并回写 resolved”的口径，只认领 5 条 `unknown -> dicethrone` 语义映射反馈。
- 额外交接 1 条 `summonerwars` blocker。
- 远端状态以 Mongo 实查为准：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt`
  - `temp/feedback-closeout/query-batch11-crossgame-already-resolved-20260424.raw.txt`

## 已验证并确认远端为 resolved 的 5 条

### 1. `699d9ebbc3c4e02a164a6dab`
- 原反馈：`暗影贼的大招计算伤害时会把超出 cp 上限的 cp 也加了`
- 归属：`unknown -> dicethrone`
- 映射说明：对应暗影贼高 CP 场景下的大招伤害钳制回归。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "CP=8时造成13点伤害"`
- 通过结果：
  - `1 file passed`
  - `1 passed, 46 skipped`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示该反馈当前为 `resolved`
  - `updatedAt: 2026-04-24T13:54:44.991Z`
- 结论：可按 bug 修复口径收口，本轮复核通过。

### 2. `69b175ff57a311c84a8fdd79`
- 原反馈：`转移的伏击没增伤`
- 归属：`unknown -> dicethrone`
- 映射说明：对应伏击 Token 响应窗口到最终增伤结算的端到端链路。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/shadow-thief-abilities.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "伏击 Token 端到端：攻击 → Token响应窗口 → 使用伏击 → 掷骰加伤 → 伤害结算"`
- 通过结果：
  - `1 file passed`
  - `1 passed, 46 skipped`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示该反馈当前为 `resolved`
  - `updatedAt: 2026-04-24T13:54:45.027Z`
- 结论：当前版本已覆盖该回归点，本轮复核通过。

### 3. `69a153c5a0195987f1428595`
- 原反馈：`月精灵防御不减半`
- 归属：`unknown -> dicethrone`
- 映射说明：对应月精灵防御足面达标后授予 50% 减伤护盾且向上取整。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/moon_elf-behavior.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "足面≥2：授予50%减伤护盾（伤害计算时向上取整）"`
- 通过结果：
  - `1 file passed`
  - `1 passed, 36 skipped`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示该反馈当前为 `resolved`
  - `updatedAt: 2026-04-24T13:54:45.021Z`
- 结论：当前版本已证明减伤逻辑存在且通过回归。

### 4. `699f098e25c2319ea7b5f281`
- 原反馈：`波纹造成伤害但没有掉血`
- 归属：`unknown -> dicethrone`
- 映射说明：对应 `ATTACK_RESOLVED` 记账时应使用防御方净掉血，而不是未扣盾前伤害。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/damage-tracking-regression.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "ATTACK_RESOLVED 使用防御方净掉血而非未扣盾伤害"`
- 通过结果：
  - `1 file passed`
  - `1 passed, 1 skipped`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示该反馈当前为 `resolved`
  - `updatedAt: 2026-04-24T13:54:45.013Z`
- 结论：净掉血回归点已被当前测试命中并通过。

### 5. `699f039025c2319ea7b5f0cf`
- 原反馈：`没出灼烧`
- 归属：`unknown -> dicethrone`
- 映射说明：对应 `rollDie conditionalEffects` 中 debuff/burn 应正确施加给对手。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/bug-fixes-heal-and-burn.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 --testNamePattern "rollDie conditionalEffects 中的 debuff 应该施加给对手"`
- 通过结果：
  - `1 file passed`
  - `1 passed, 3 skipped`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示该反馈当前为 `resolved`
  - `updatedAt: 2026-04-24T13:54:44.999Z`
- 结论：状态施加链路通过，本轮可作为 resolved 复核证据。

## blocker

### `69a277a317d6c588726802fe`
- 原反馈：`撤回特别慢，另外没有了原来放大镜的功能`
- 归属：`unknown -> summonerwars`
- 远端结果：
  - `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt` 显示当前仍为 `in_progress`
  - `updatedAt: 2026-04-22T00:43:41.439Z`
- 当前能确认的部分：
  - 已有历史证据 `evidence/summonerwars-hand-magnify-click-e2e-test.md` 证明“放大镜可打开”的链路曾经通过。
  - 该证据只能覆盖“放大镜功能存在”，不能证明“撤回特别慢”已经修复。
- 为什么本轮不能收口：
  - 没有可复现的撤回性能基线。
  - 没有对应 packet / room / 操作录像去确认“慢”发生在什么阶段。
  - 现有证据不包含撤回前后耗时对比，也不包含收口后的性能断言。
- 所需证据：
  - 一份可稳定复现的对局包或房间号，能精确复现“撤回特别慢”的操作链。
  - 至少 1 份录像或时间戳记录，标明点击撤回到 UI/状态稳定完成的实际耗时。
  - 若要证明“放大镜缺失”仍存在，需要同一版本下的现行截图或 E2E 失败证据，而不是旧证据。
- 结论：本轮仅能标记 `blocker`，不能按 bug 修复口径回写 `resolved`。

## 已在前批解决，本轮未占 5 条额度
- `69d26b8f6e60b2aef078d89d`（`dicethrone`，`骰面看不见`）
- `69ce6242094b1acda250f790`（`cardia`，`选择目标卡牌确认键被手牌栏挡住`）
- `69ce62f3094b1acda250f7a5`（`cardia`，`平局视为胜利` 被动疑似无效）
- 说明：
  - `temp/feedback-closeout/query-batch11-crossgame-already-resolved-20260424.raw.txt` 已确认这 3 条远端当前也是 `resolved`。
  - 因用户要求“最多 5 条”，本轮不重复把它们计入已验证 resolved 名额。

## 本轮改动文件
- `evidence/feedback-online-batch11-crossgame-verify-2026-04-24.md`
- `temp/feedback-closeout/status-board.json`
- `temp/feedback-closeout/query-batch11-crossgame-status-20260424.js`
- `temp/feedback-closeout/query-batch11-crossgame-status-20260424.raw.txt`
- `temp/feedback-closeout/query-batch11-crossgame-already-resolved-20260424.js`
- `temp/feedback-closeout/query-batch11-crossgame-already-resolved-20260424.raw.txt`
