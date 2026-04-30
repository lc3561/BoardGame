# Smash Up《竞技场 / 名人堂 / 藏骨堂》E2E 证据（2026-04-30）

## 范围
- `World Champs / 世界冠军`
  - `竞技场 / base_arena`
  - `名人堂 / base_hall_of_fame`
- `Skeletons / 骷髅`
  - `藏骨堂 / base_ossuary`

## 触发原因
- 三新派系重审进入基地层残余清理。
- 此前三张基地都有领域实现，但缺浏览器级真实入口证据。
- 本轮目标不是补静态对照，而是确认：
  - 卡图口径对应的基地能力真实出现在 UI 出口；
  - 结算后的核心状态与棋盘表现一致；
  - 不再把“领域对 / UI错 / 证据缺”误报成“数据录错”。

## 验证命令
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionBaseAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "base_arena 在此基地首次打出随从后，应提供额外行动或抽牌交互|base_hall_of_fame 在此基地首次打出随从后，应给予该随从本回合 \+2 力量"`
   - 结果：`2 passed`
2. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "竞技场应在首次于此打出随从后提供抽牌或额外行动交互"`
   - 结果：`1 passed`
3. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "名人堂应在首次于此打出随从后给予该随从"`
   - 结果：`1 passed`
4. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "藏骨堂应在你的回合开始时允许把弃牌堆中的低力量随从埋葬到这里"`
   - 结果：`1 passed`

## 关键截图
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-arena-prompt-2026-04-30.png`
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-arena-draw-resolved-2026-04-30.png`
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-hall-of-fame-buffed-2026-04-30.png`
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-ossuary-prompt-2026-04-30.png`
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-ossuary-buried-2026-04-30.png`

## 看图结论

### 1. 竞技场 Prompt
- 我实际看到 `竞技场` 在首次打出《大副》后弹出选择框，里面有“抽一张牌 / 额外打出行动 / 跳过”。
- 这张图证明 UI 真实出口已经出现卡图对应的基地能力，不是只有领域层有事件。
- 该截图达到本轮验收标准。

### 2. 竞技场结算后
- 我实际看到结算后《大副》已留在 `竞技场`，且玩家手牌新增了抽到的行动卡。
- 这张图对应“选择抽一张牌”分支，说明 prompt 不只是出现，后续真实结算也进了浏览器态。
- 该截图达到本轮验收标准。

### 3. 名人堂 Buff 后
- 我实际看到《大副》打到 `名人堂` 后，玩家在该基地的分数徽章变成 `4`，与 `2 + 2` 一致。
- 这张图同时证明 `名人堂` 的 `+2` 不只存在于领域状态，也已经反映到棋盘分数 UI。
- 该截图达到本轮验收标准。

### 4. 藏骨堂 Prompt
- 我实际看到回合开始时 `藏骨堂` 弹出弃牌堆选择框，候选里有《轮回者》。
- 这张图证明 `藏骨堂` 的入口时机和候选过滤都已经走到真实浏览器交互。
- 该截图达到本轮验收标准。

### 5. 藏骨堂埋葬后
- 我实际看到结算后基地上出现埋葬牌堆，且权威状态中《轮回者》已离开弃牌堆并进入 `buriedCards`。
- 这张图证明 `藏骨堂` 不是只有 prompt，真实埋葬结果也已落到棋盘与状态。
- 该截图达到本轮验收标准。

## 结论
- `竞技场 / 名人堂 / 藏骨堂` 当前都已补到对象级 L3。
- 这轮没有发现新的“数据录错”问题，新增结论全部指向“基地层真实入口已补齐”。
- `Skeletons` 基地层现在只剩 `埋骨地 / base_boneyard` 的“无能力基地”冻结说明，不再有未补的基地能力入口。
- `World Champs` 基地层当前已无未补基地能力入口；对象残余收窄为《武士 陈》的正路径 L3 是否继续单独补证。
