# Smash Up 骷髅《墓地爆发》真实入口 E2E 证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：`skeletons_burst_forth / 墓地爆发`
- 本轮目标：
  1. 把《墓地爆发》补到浏览器级真实入口；
  2. 修掉这次新暴露的实现缺口：`scoreBases` 阶段交互刚产出领域事件时，Flow 不能在事件正式 reduce 前继续自动计分。

## 本轮修复

- 实现文件：
  - `src/games/smashup/domain/systems.ts`
  - `src/games/smashup/domain/index.ts`
- 测试文件：
  - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 修复点：
  1. 新增 `scoreBases` 交互 reduce 门禁：当计分阶段的交互刚产出领域事件时，先阻塞一轮自动推进，等事件正式 reduce 完再继续。
  2. 《墓地爆发》E2E 场景改成“翻不翻出会直接改写计分归属”：
     - 翻出前：`P0 = 4`，`P1 = 9`
     - 翻出后：`P0 = 11`，`P1 = 9`
     - `base_the_jungle` 本轮应由 `P0` 拿到 `2 VP`

## 运行命令

```powershell
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
$env:NODE_OPTIONS='--max-old-space-size=4096'
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "墓地爆发应在基地计分前可挖掘你埋葬在那里的牌"
```

## 结果

- `墓地爆发` E2E：`1 passed`

## 关键截图与肉眼结论

### 1. 计分前真实进入《墓地爆发》挖掘提示，且埋葬牌已经翻正面

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-burst-forth-prompt-2026-04-29.png`
- 我实际看到：
  1. 顶部中央明确出现《墓地爆发：挖掘你埋葬在此基地的一张牌》提示。
  2. 《绿洲丛林》左上角总力量是 `13 / 12`，说明这一步发生在真实计分链路里，不是伪造的普通回合场景。
  3. 基地下方那张《雷克斯王》已经翻成正面并可点击，右侧《微型机阿尔法号》仍显示 `+1`，此时双方力量还是 `P0 = 4`、`P1 = 9`。
- 是否达到验收标准：
  - **达到。** 这张图证明《墓地爆发》不是“只在日志里有”，而是浏览器真实入口能看到计分前 prompt、翻面的埋葬牌本体和当前力量对比。

### 2. 结算后 `P0` 拿到 `2 VP`，说明翻出的随从已被本次计分纳入

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-burst-forth-resolved-2026-04-29.png`
- 我实际看到：
  1. 右上记分板明确显示 `P0 = 2`、`P1 = 0`。
  2. 原《绿洲丛林》已经被替换成新基地《天守阁》，说明计分、清场、换基地整条链路已经收口。
  3. 画面中央不再有任何 prompt 或 reaction session 残留，流程已经回到可继续推进的状态。
- 是否达到验收标准：
  - **达到。** 这张图直接证明“翻出随从后改写了本次计分归属”，不是单纯把埋葬牌从 `buriedCards` 删掉。

## 状态断言补充

- `finalState.core.bases[0].buriedCards` 中不存在 `burst-buried`
- `finalState.core.players['0'].vp === 2`
- `finalState.core.players['1'].vp === 0`

## 结论

- 《墓地爆发》当前已补齐一条浏览器级正路径 L3：`计分前反应 -> 翻正埋葬牌 -> 点击挖掘 -> 翻出的随从参与本次计分 -> 改写 VP 归属`
- 这次新暴露的问题已经确认不是数据录入错误，也不是卡面理解错误，而是 `scoreBases` 交互和自动推进之间缺少“先 reduce、再继续计分”的门禁。
- 本轮修复后，`Skeletons / 骷髅` 新增《墓地爆发》这条真实入口证据；三新派系整包仍然 **未收口**，但这张卡本身不再属于“待证明通过”的残留项。
