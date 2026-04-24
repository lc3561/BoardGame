# SmashUp lane A 老反馈单测复核（2026-04-24）

## 范围

- 目标：处理 SmashUp 老反馈里“可被现有单测直接证明已修”的条目。
- 排除：已回写的 batch9 / batch10。
- 说明：当前仓库内可见的 `temp/feedback-closeout/query-online-open-inprogress-final-20260423-211150.json` 与本地 `feedbacks` 集合都显示 `open/in_progress = 0`。本轮因此改用 `temp/smashup/feedback-triage-smashup.md` 中标记为“已修未回写”的老反馈候选，再筛掉无法由现有单测直接命中的项。

## 结果

### 1. `69c64529cb50687653b6fa85`

- 反馈摘要：未让选择随从，直接默认选择第一张。
- 直接命中的现有单测：
  - `src/games/smashup/__tests__/ancientEgyptiansMummyStrength.feedback-regression.test.ts`
  - 用例：`walks the real RESPOND chain with target-first selection without throwing a command exception`
- 实际运行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/ancientEgyptiansMummyStrength.feedback-regression.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "walks the real RESPOND chain with target-first selection without throwing a command exception"
```

- 结果：通过。
- 我实际看到的覆盖点：测试先断言交互源是 `ancient_egyptians_mummy_strength_target`，候选里同时存在 `empowered` 与 `other-base`，随后显式响应 `empowered` 目标并完成结算，证明链路不会默认吞掉目标选择、也不会直接落到首项。

### 2. `69cca762c3e278ba205eb08f`

- 反馈摘要：木乃伊与大副同时结算会吃掉大副计分后移动。
- 直接命中的现有单测：
  - `src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts`
- 实际运行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1
```

- 结果：通过，`6/6` 用例通过。
- 我实际看到的覆盖点：该文件专门验证 `afterScoring` 链式交互和 `pirate_first_mate` 移动链，包含“延迟事件仍能产出”“按 `baseDefId` 而不是旧索引移动”“失效 `baseDefId` 不应错误回退”等场景，符合这条老反馈在分诊表里的映射。

### 3. `69ce6ca7094b1acda250f831`

- 反馈摘要：决斗选了目标后，对方又被要求再选一次随从。
- 直接命中的现有单测：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 用例：`cowboys_deputy 可在决斗中弃牌给任意随从 +2 力量并改变胜负`
- 实际运行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "cowboys_deputy 可在决斗中弃牌给任意随从 \\+2 力量并改变胜负"
```

- 结果：通过。
- 我实际看到的覆盖点：测试完整走完 `决斗目标选择 -> Deputy 弃牌提示 -> Deputy 加成目标选择 -> 胜负结算`，最终断言 `enemy-1` 被消灭、`ally-1` 获得 `+2`、并发放基地限定随从额度；这说明旧的决斗状态没有把链路打回“重新选决斗随从”。

### 4. `69ce7167094b1acda250f8a9`

- 反馈摘要：吓跑他们移动随从应看控制者而不是别的归属。
- 直接命中的现有单测：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 用例：
    - `cowboys_run_em_off 在获胜时应由被移动随从的控制者而非 owner 选择目标基地`
    - `cowboys_run_em_off 平局时也应由各自被移动随从的控制者依次选择目标基地`
- 实际运行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "cowboys_run_em_off 在获胜时应由被移动随从的控制者而非 owner 选择目标基地|cowboys_run_em_off 平局时也应由各自被移动随从的控制者依次选择目标基地"
```

- 结果：通过，`2/2` 用例通过。
- 我实际看到的覆盖点：测试名和断言都直接绑定“由控制者选择目标基地”这个反馈点，且同时覆盖胜利分支与平局分支，不是旁证。

### 5. `69ce7ac2094b1acda250f933`

- 反馈摘要：山中自有黄金屋选的牌无法额外打出。
- 直接命中的现有单测：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 用例：
    - `cowboys_gold_in_them_thar_hills 选择额外无目标行动时会立刻打出该牌`
    - `cowboys_gold_in_them_thar_hills 选择额外随从时会先选基地再直接打出`
- 实际运行命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "cowboys_gold_in_them_thar_hills 选择额外无目标行动时会立刻打出该牌|cowboys_gold_in_them_thar_hills 选择额外随从时会先选基地再直接打出"
```

- 结果：通过，`2/2` 用例通过。
- 我实际看到的覆盖点：一条用例证明“选中的无目标行动会立即作为额外行动打出”，另一条证明“选中的随从会进入选基地交互并直接落场”，刚好对应反馈里的“选的牌无法额外打出”。

## 本轮未纳入

- `69ce7589094b1acda250f8c6`：仓库里未找到能直接只证明 “Priest of Anubis 不再给所有随从加力量” 的现有单测。
- `69ce7bbf094b1acda250f93e`：当前更多依赖 `progress.md` / `findings.md` 的实现与分诊记录，缺少足够直接的现有单测。

## 结论

- 本轮严格按“现有单测直接证明”筛选后，确认可交付的反馈共 `5` 条。
- 本轮没有修改业务代码，只新增这份证据文档。
