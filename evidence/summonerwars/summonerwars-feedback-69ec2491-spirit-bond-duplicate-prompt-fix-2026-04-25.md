# SummonerWars 反馈修复证据（69ec24919087da2a55c91021）

- 反馈 ID：`69ec24919087da2a55c91021`
- 游戏：`summonerwars`
- 原始反馈包：`D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\query-feedback-69ec2491-20260425.raw.txt`
- 反馈现象：祖灵法师在一次移动后的祖灵交流中，先给队友充能，再弹出“只能充能自身”并再次充能。

## 复现线索

来自反馈包中的 `abilityUsageCount`：

- `barbaric-spirit-mage-2-0-17#7:afterMove:spirit_bond = 1`
- `barbaric-spirit-mage-2-0-17#7:spirit_bond = 2`

这说明同一回合同一单位的 `spirit_bond` 被执行了两次，符合用户反馈。

## 修复内容

1. 收敛 afterMove 触发入口，移除本地 `abilityMode` 补路，统一由 `swInteraction(systemAbilityMode)` 驱动，避免双通道并发：
   - `src/games/summonerwars/ui/useGameEvents.ts`
   - `e2e/src/games/summonerwars/ui/useGameEvents.ts`
2. 给 `spirit_bond` 增加每回合一次硬门禁，防止同回合二次执行：
   - `src/games/summonerwars/domain/abilities-barbaric.ts`
   - `e2e/src/games/summonerwars/domain/abilities-barbaric.ts`
   - 变更：`usesPerTurn: 1`
3. 新增回归测试（并清理重复插入，只保留一份）：
   - `src/games/summonerwars/__tests__/abilities-barbaric.test.ts`
   - `e2e/src/games/summonerwars/__tests__/abilities-barbaric.test.ts`
   - 用例：`同回合二次祖灵交流应被拒绝，避免重复弹窗导致再次充能`

## 验证记录

1. 定向回归：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/summonerwars/__tests__/abilities-barbaric.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism -t "祖灵法师 - 祖灵交流|同回合二次祖灵交流应被拒绝"
```

结果：`1 file passed`，`6 passed`，`50 skipped`。

2. 整文件回归：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/summonerwars/__tests__/abilities-barbaric.test.ts --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism
```

结果：`1 file passed`，`57 passed`。

3. E2E 复核（2026-04-25 14:20，Asia/Shanghai）：

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-barbaric-abilities.e2e.ts "祖灵交流：转移充能后不应再次弹出“只能充能自身”"
```

结果：`1 passed`。

关键截图与观察：

- 触发前：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：转移充能后不应再次弹出“只能充能自身”\spirit-bond-transfer-before-target.png`
  - 我实际看到：祖灵交流横幅出现，顶部有“充能自身 / 跳过”，说明移动后交互已正常弹出。
  - 我实际看到：棋盘上可点击友方目标本体存在，不是空白容器或假高亮。
  - 验收判断：达到“转移前交互入口真实存在”的要求。

- 收口后：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：转移充能后不应再次弹出“只能充能自身”\spirit-bond-transfer-after-resolve.png`
  - 我实际看到：转移完成后顶部横幅已经收口，不再显示“充能自身 / 跳过”。
  - 我实际看到：页面停留在可继续推进的移动阶段，没有再次弹出“只能充能自身”的第二轮提示。
  - 验收判断：达到“转移收口后不重复弹出第二轮 spirit_bond 选择”的要求。

## 结论

- 该反馈已形成“触发入口收敛 + 每回合次数门禁 + 回归测试”三层防护。
- 当前版本下，同回合第二次 `spirit_bond` 会在校验阶段被拒绝，且本轮 E2E 复核已证明转移收口后不会再次弹出“只能充能自身”。
