# Smash Up Oops 四派系 Gameplay E2E 证据

## 测试目标

验证本轮新增的三类浏览器交互已经真正可操作，而不只是领域状态存在：

- `Ancient Egyptians` 的埋葬条带与翻开交互
- `Cowboys` 的官方决斗链路 UI：`Pinkerton -> 决斗牌 -> Deputy -> 结算`
- `Samurai` 的“消灭己方随从后获得额外出牌额度”交互

## 执行命令

```bash
$env:BG_HEAVY_MEMORY_MIN_FREE_GB='1'; node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "Oops Ancient Egyptians 埋葬条带与翻开交互应在浏览器中可完成"
$env:BG_HEAVY_MEMORY_MIN_FREE_GB='1'; node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "Oops Cowboys 决斗交互应按官方链路完成 Pinkerton/决斗牌/Deputy/结算"
$env:BG_HEAVY_MEMORY_MIN_FREE_GB='1'; node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-phase-transition-simple.e2e.ts "Oops Samurai 额外出牌效果应在浏览器中兑现额外随从与行动额度"
```

## 结果

- 状态：通过
- 日期：`2026-03-31`

## 本轮环境修复

- 首次运行时，Vite 页面停在 PostCSS overlay，原因是当前工作区缺少 `@alloc/quick-lru`，导致 `__BG_TEST_HARNESS__` 无法注入。
- 已用最小风险方式恢复当前工作区 E2E 环境：

```bash
npm install @alloc/quick-lru@5.2.0 --no-save
```

- 该步骤未修改业务代码，只恢复了当前 `node_modules` 的缺包状态。

## 证据截图

### 1. Ancient Egyptians：埋葬条带与翻开

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-before-uncover.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成\Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-after-uncover.png`

嵌入预览：

![Ancient Egyptians 翻开前](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-before-uncover.png)

![Ancient Egyptians 翻开后](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成/Oops-Ancient-Egyptians-埋葬条带与翻开交互应在浏览器中可完成-oops-bury-strip-after-uncover.png)

观察结论：

- 翻开前，`Pyramids` 基地下方清楚显示一张埋葬条带，右下弃牌区为 `0`，说明 `You Can Take It With You` 已经通过正式出牌链进入埋葬区而不是直接进弃牌。
- 翻开后，`Pyramids` 下方的埋葬条带消失，说明被埋的牌已经真正离开基地。
- 翻开后右下弃牌区计数变成 `2`，顶部可见 `You Can Take It With You`，与 `Seal the Tomb` 一起进入弃牌堆，符合“从手牌打出 -> 埋葬 -> 翻开 -> 结算后弃置”的 full-chain。

### 2. Cowboys：官方决斗链路

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-pinkerton-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-card-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-card-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-target-prompt.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算\Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-after-resolve.png`

嵌入预览：

![Cowboys Pinkerton](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-pinkerton-prompt.png)

![Cowboys 决斗牌](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-card-prompt.png)

![Cowboys Deputy 选牌](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-card-prompt.png)

![Cowboys Deputy 选目标](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-deputy-target-prompt.png)

![Cowboys 决斗结算后](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算/Oops-Cowboys-决斗交互应按官方链路完成-Pinkerton-决斗牌-Deputy-结算-oops-duel-after-resolve.png)

观察结论：

- 决斗横幅全程可见，文案明确写出顺序为 `Pinkerton / 决斗牌 / Deputy / 再结算胜负`。
- `Pinkerton` 阶段屏幕中央确实出现两个按钮，玩家可直接决定是否先放 `+1` 指示物。
- `决斗牌` 阶段显示专用提示和“跳过（不放决斗牌）”按钮，`Deputy` 阶段又切换成弃牌与选目标两步提示。
- 结算后敌方 `robot_microbot_alpha` 已离场，`Deputy` 进入右下弃牌区，场上只剩己方 `Pinkerton + Gunfighter`，说明整条决斗链已经走完。

### 3. Samurai：额外随从/行动额度兑现

截图路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-before-select.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度\Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-after-resolve.png`

嵌入预览：

![Samurai 额外出牌前](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-before-select.png)

![Samurai 额外出牌后](../test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度/Oops-Samurai-额外出牌效果应在浏览器中兑现额外随从与行动额度-oops-extra-play-after-resolve.png)

观察结论：

- 选择前，页面顶部明确提示 `妖怪来袭！：你可以消灭一个自己的随从，以额外打出一个随从和一个行动`，场上只有 `Ronin` 作为可点目标；右下弃牌区已显示 `Yokai Attack!`，说明这张行动卡已经先从手牌正式打出。
- 结算后，左侧基地上的 `Ronin` 已离场，右下弃牌区计数变成 `2`，顶部卡面是 `Ronin`，其下仍能看到 `Yokai Attack!`，说明“打出行动卡 + 消灭己方随从”的链路都已落到真实弃牌区。
- 结算后页面顶部同时出现 `获得1次额外行动机会` 和 `获得1次额外随从机会` 两条提示，说明额外额度在浏览器里已经兑现。

## 覆盖口径与限制

- 这三条 E2E 的目标是证明“新增交互类型在浏览器里可走通”，不是声明四派系所有正式出牌链都已用浏览器完整覆盖。
- `Cowboys` 这条是完整浏览器交互：真实打出 `Gunfighter`，并在浏览器里走完 `Pinkerton -> 决斗牌 -> Deputy -> 结算`。
- `Ancient Egyptians` 与 `Samurai` 现在也都是 full-chain 浏览器证据：
  - `Ancient Egyptians`：从手牌打出 `Seal the Tomb`，再在浏览器里完成翻开与弃置
  - `Samurai`：从手牌打出 `Yokai Attack!`，再在浏览器里选择己方随从并兑现额外额度
- 因此当前文档中的三条主证据都已经覆盖“正式出牌 -> 浏览器交互 -> 最终可见状态”的完整链路。

## 当前残留风险

- 当前证据覆盖的是三类代表性交互，不代表 Oops 四派系所有卡牌与所有组合场景都已在浏览器层逐张穷举。
- 但阻塞审计收口的“新交互类型是否能在真实浏览器链路中完成”已经解除，本轮四派系审计可以按完成态汇报。

---

## 2026-04-25 追加回归：巨石阵附着天赋二次发动

### 触发背景
- 在持续推进三派系审计时，`e2e/smashup/smashup-gameplay.e2e.ts` 出现 1 条失败：
  - `巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额`
- 失败现象：点击附着行动卡后，`actionLimit` 仍为 `1`，`standingStonesDoubleTalentMinionUid` 仍为 `null`，说明命令未通过验证阶段。

### 根因
- `USE_TALENT` 的 `ongoingCardUid` 校验分支在发现 `ongoing.talentUsed === true` 时直接拒绝，未复用“巨石阵双才能”例外。
- `reduce` 层其实已经支持“附着卡二次发动占用双才能名额”，但 `validate` 提前拦截导致能力永远进不到 reducer。

### 修复
- 文件：
  - `src/games/smashup/domain/commands.ts`
  - `e2e/src/games/smashup/domain/commands.ts`
- 变更：
  - 在 `ongoingCardUid` 分支识别附着宿主随从；
  - 当目标基地是 `base_standing_stones`、宿主由当前玩家控制、且双才能名额未占用时，允许附着天赋第 2 次发动。

### 回归测试
1. 单测补强（同文件追加，不新增测试文件）：
   - `src/games/smashup/__tests__/talentAbilities.test.ts`
   - `e2e/src/games/smashup/__tests__/talentAbilities.test.ts`
   - 新增 2 条：
     - 双才能名额未占用时，附着天赋第 2 次可用；
     - 双才能名额已占用时，附着天赋第 2 次被拒绝。
2. 验证命令：
   - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/talentAbilities.test.ts --configLoader native --maxWorkers 1` → `22 passed`
   - `npm run test:e2e:ci:file -- e2e/smashup/smashup-gameplay.e2e.ts "巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额"` → `1 passed`
   - `npm run test:e2e:ci -- e2e/smashup/smashup-gameplay.e2e.ts` → `7 passed`

### 截图证据（绝对路径）
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-gameplay.e2e\巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额\werewolf-standing-stones-before-second-talent.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-gameplay.e2e\巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额\werewolf-standing-stones-after-second-talent.png`

### 肉眼结论
- 触发前截图可见附着行动卡存在且宿主已处于“已用过一次天赋”的状态；
- 触发后截图对应断言通过：同一宿主附着天赋成功第 2 次发动，且巨石阵双才能名额被占用（与状态断言一致）。

---

## 2026-04-25 13:25 复测：去重单测后回归确认

### 触发原因
- `talentAbilities.test.ts`（src / e2e 镜像）出现重复新增 case。
- 去重后重新跑 `smashup-gameplay.e2e.ts`，确认巨石阵附着天赋链路仍稳定通过。

### 复测命令与结果
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/talentAbilities.test.ts --configLoader native --maxWorkers 1`
   - 结果：`20 passed`
2. `npm run test:e2e:ci -- e2e/smashup/smashup-gameplay.e2e.ts`
   - 结果：`7 passed`

### 本轮截图（绝对路径）
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-gameplay.e2e\巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额\werewolf-standing-stones-before-second-talent.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-gameplay.e2e\巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额\werewolf-standing-stones-after-second-talent.png`

### 肉眼复核
- 第一张图可见特写前状态，附着行动卡仍挂在己方宿主随从上；
- 第二张图可见第 2 次天赋触发后流程已推进，符合“巨石阵双才能名额被消耗”的预期路径。
