# Smash Up 骷髅《守墓人》真实入口 E2E 证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：`skeletons_gravetender / 守墓人`
- 本轮目标：
  1. 证明《守墓人》在真实浏览器对局里，会在“你的其他牌被埋葬后”立即抽 1 张；
  2. 证明这条触发不是只停留在 L2 事件断言，而是真实改变手牌与牌库。

## 运行命令

```powershell
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
$env:NODE_OPTIONS='--max-old-space-size=4096'
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "守墓人应在你的其他牌被埋葬后抽一张牌"
```

## 结果

- 浏览器级真实入口 E2E：`1 passed`

## 关键截图与肉眼结论

### 1. 结算后，《守墓人》仍在场，《轮回者》已埋葬，手里新增 1 张牌

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-gravetender-bury-draw-resolved-2026-04-29.png`
- 我实际看到：
  1. 左侧基地下方还能直接看到《守墓人》随从本体，说明触发源没有离场。
  2. 《守墓人》上方有 1 张背面埋葬牌，表示《轮回者》已经成功自埋。
  3. 画面底部手牌区出现了《微型机档案号》本体，说明埋葬结算后确实抽到了 1 张牌。
- 是否达到验收标准：
  - **达到。** 这张图把《守墓人》的真实入口正路径串起来了：`其他牌埋葬 -> 守墓人触发 -> 手牌增加 1 张`。

## 状态断言补充

- `finalState.core.players['0'].hand` 中存在 `robot_microbot_archive`
- `finalState.core.players['0'].deck` 中不存在 `robot_microbot_archive`
- `finalState.core.bases[0].buriedCards` 中存在 `skeletons_returned_one`
- `finalState.core.bases[0].minions` 中《守墓人》的 `metadata.skeletonsGravetenderTriggeredTurn === finalState.core.turnNumber`

## 结论

- 《守墓人》当前已补齐 1 条浏览器级 L3 正路径：`你的其他牌被埋葬 -> 抽 1 张`
- 本轮没有新增实现修复，主要是把既有 L2 逻辑补到真实入口。
- `Skeletons` 整派系与三新派系整包仍然 **未收口**。
