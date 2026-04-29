# DiceThrone 反馈 69e33e9322d9c762518777f3 防御投掷跳过复核

## 关联反馈

- 反馈 ID：`69e33e9322d9c762518777f3`
- 原文：`ai怎么跳过了防御投掷阶段啊`
- 线上状态来源：`temp/feedback-closeout/remote-human-unresolved-latest.json` 中仍为 `open`
- 复核时间：`2026-04-22T00:06:17+08:00`

## 结论

当前 Dicethrone 相关实现已经覆盖“可防御攻击不应跳过防御投掷阶段”的核心风险，本轮未改实现代码。

复核依据：

- `src/games/dicethrone/domain/execute.ts` 的 `isDefendableAttack` 会基于技能 tags 与 `playerAbilityHasDamage` 判断是否进入防御阶段。
- `src/games/dicethrone/domain/abilityLookup.ts` 的 `playerAbilityHasDamage` 已覆盖显式 damage、rollDie conditional bonusDamage、以及 custom action categories 中的 `damage`。
- `src/games/dicethrone/__tests__/customaction-category-consistency.test.ts` 已有守卫：handler 产生 `DAMAGE_DEALT` 时必须声明 `damage` category，防止因 categories 漏标导致防御投掷被跳过。
- `src/games/dicethrone/__tests__/rule-consistency.test.ts` 已验证 `offensiveRoll` 存在可防御攻击时应进入 `defensiveRoll`。

## 本轮命令与结果

### 1. 防御触发 / damage 分类 / 可防御阶段流转

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/defense-trigger-audit.test.ts src/games/dicethrone/__tests__/customaction-category-consistency.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native --maxWorkers 1 -t "custom action categories 包含 damage|所有产生 DAMAGE_DEALT 的 handler 必须在 categories 中声明 damage|offensiveRoll 有可防御攻击 → defensiveRoll"
```

结果：

- 通过。
- `2 passed | 43 skipped`。
- 覆盖点：custom action damage 分类守卫、可防御攻击从 `offensiveRoll` 进入 `defensiveRoll`。

### 2. audit 配置下的防御触发单项

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/defense-trigger-audit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1 -t "custom action categories 包含 damage，应触发防御|custom action categories 只有 resource，不应触发防御|典型伤害技能应触发防御|典型非伤害技能不应触发防御"
```

结果：

- 通过。
- `2 passed | 27 skipped`。
- 覆盖点：`damage` custom action 应触发防御；纯 `resource` custom action 不应触发防御。

### 3. Dicethrone online AI E2E 刷新尝试

命令：

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online AI 在 off-turn defensiveRoll 也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段"
```

结果：

- 第一次未启动用例：全局 heavy-budget 命中另一个 worktree E2E 的启动冷却窗口，剩余约 8 秒。
- 第二次启动后失败在前置角色选择页，尚未进入 defensiveRoll 验证点。
- 失败原因截图显示页面白屏：`TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:6273/src/pages/MatchRoomWithAudio.tsx`。
- 该失败不是防御投掷逻辑失败；失败发生在 `waitForCharacterSelection` 等待 `[data-character-id]` 前置时。

失败截图：

- `D:\gongzuo\webgame\BoardGame\test-results\playwright-artifacts\dicethrone-dicethrone-simp-4dbe3-l-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段-chromium\test-failed-1.png`

Vite 启动日志：

- `D:\gongzuo\webgame\BoardGame\logs\vite-2026-04-21T16-03-50-533Z.log`

## 既有在线证据

已有证据文档：

- `D:\gongzuo\webgame\BoardGame\evidence\dicethrone\dicethrone-online-ai-offturn-defensive-watchdog-feedback-fix-2026-04-21.md`

既有截图证据：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05h-online-ai-offturn-defensive-before.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05i-online-ai-offturn-defensive-rolled.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-AI-在-off-turn-defensiveRoll-也应自动掷骰并收口，不应卡死在玩家回合下的防御阶段\05j-online-ai-offturn-defensive-resolved.png`

肉眼观察结论：

- `05h`：页面处于防御阶段，能看到 AI 正在处理防御投掷前置状态，说明流程没有直接跳到 `main2`。
- `05i`：仍处于 `defensiveRoll`，但 `rollCount` 已达到 1，证明 AI 已执行防御掷骰。
- `05j`：阶段已回到 `main2`，`pendingAttack` 已清空，说明防御投掷链路完成收口。

## 可回写建议

建议将反馈 `69e33e9322d9c762518777f3` 从 `open` 回写为 `resolved`，理由：

- 当前 Dicethrone 领域层已通过测试证明：可防御攻击不会被规则判定直接跳过到 `main2`。
- 已有 online AI 防御阶段截图链证明：AI 防御阶段可出现、可掷骰、可收口。
- 本轮未发现需要修改 Dicethrone 实现的新证据。

保留风险：

- 本轮 fresh E2E 未能完成刷新，阻塞点是页面动态 import 前置失败，不是 defensiveRoll 断言失败。
- 若必须在本轮用全新截图关闭该 open 反馈，需要先处理或避开当前 E2E runtime 的 `MatchRoomWithAudio.tsx` 动态导入失败。
