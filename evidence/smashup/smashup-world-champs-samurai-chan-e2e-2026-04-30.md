# Smash Up《武士 陈》正路径 E2E 证据（2026-04-30）

## 范围
- `World Champs / 世界冠军`
  - `武士 陈 / world_champs_samurai_chan`

## 触发原因
- `World Champs` 在 2026-04-30 收口前，只剩《武士 陈》还缺一条正路径浏览器级证据。
- 这张牌此前已经有：
  - 负路径 L3：打出时不会误触发《海龟阿凯》交牌抽二；
  - 领域正路径：因离开基地进入弃牌链路时会抽 1。
- 本轮补的是最后一条真实入口证据：
  - 基地达到断点并计分后，《武士 陈》跟随离场链路让控制者抽 1。

## 验证命令
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "world_champs_samurai_chan 打出时不应触发海龟阿凯式 onPlay 交互|world_champs_samurai_chan 因基地计分从场上进入弃牌堆后会抽一张牌"`
   - 结果：`2 passed`
2. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "武士 陈在基地计分进入弃牌堆后应抽一张牌"`
   - 结果：`1 passed`

## 关键截图
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-samurai-chan-before-scoring-2026-04-30.png`
- `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-samurai-chan-draw-after-scoring-2026-04-30.png`

## 看图结论

### 1. 计分前
- 我实际看到《武士 陈》与《激光三角龙》同侧站在《绿洲丛林》，基地总力量已经到 `13 / 12`。
- 这张图证明场景满足真实计分前提，不是靠伪造 prompt 或直接塞结果。
- 该截图达到本轮验收标准。

### 2. 计分后
- 我实际看到原《绿洲丛林》已经被新基地替换，说明计分链路已经真实跑完。
- 这张图本身不直接展开手牌，但对应同轮权威状态断言已经确认：`P0` 手牌新增了抽到的《微型机器人阿尔法》。
- 该截图达到本轮验收标准。

## 结论
- 《武士 陈》现在同时具备：
  - 负路径 L3：不会误串成《海龟阿凯》；
  - 正路径 L3：基地计分离场后控制者真实抽 1。
- 至此，`World Champs` 在本批三派系重审里的最后一个对象级冻结点已消除。
- 同时也确认了本轮验收口径：
  - 不是每张卡都机械要求 E2E；
  - 但历史投诉对象、真实入口链路、reaction session、阶段切换、UI 出口对象必须补到 L3。
