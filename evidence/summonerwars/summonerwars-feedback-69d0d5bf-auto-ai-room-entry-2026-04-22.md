# SummonerWars 反馈 69d0d5bfccdbf2785a55af79 验证证据（2026-04-22）

- 反馈ID：`69d0d5bfccdbf2785a55af79`
- 标题：`召唤师战争开房间自动进ai`
- 本轮结论：`当前实现下未复现，已补对位 E2E 回归证据。`

## 反馈现象

- 用户反馈：创建 SummonerWars 在线房间后，未邀请真人加入也会自动进 AI。
- 已知线上历史快照：`phase=summon`、`selectedFactions` 已被双边填充、`hostStarted=false`、`guest ready=true`。

## 本轮复验结论

- 我未在当前代码上复现“普通人类房间自动把 1 号位推进成 AI”的现象。
- 我刻意在进入房间前注入一份残留本地 AI 凭据 `match_ai_creds_<matchId>`，再进入普通人类房间。
- 实际结果：
  - 2 号位始终保持 `data-faction-id="unselected"`
  - 2 号位始终保持 `data-ready="false"`
  - 房主选完阵营后，“开始游戏”仍处于等待全员就绪态，没有被自动启用
- 说明：当前 SummonerWars 房间入口链路已经不会因为残留本地 AI 凭据而把空座自动当成 AI 推进。

## 历史根因定位

- 这条问题的根因不在 `summonerwars` 游戏规则或阵营选择 UI 本身，而在通用在线座位识别链路：
  - `src/pages/onlineAiSeats.ts`
- 关键判定点：在线房间是否信任 `seatControllers` / 本地 AI 凭据，由 `loadOnlineAiSeatState()` 决定。
- 仓库中已有对应回归门禁：
  - `src/pages/__tests__/matchSeatValidation.test.ts`
  - 用例：`显式 enableAi=false 时，应忽略残留的 AI seatControllers 与本地旧凭据`
- 这说明历史问题本质上是“普通人类房间被旧 AI 座位配置/旧本地凭据误识别成 AI 房”，不是 SummonerWars 领域逻辑自己把 guest 自动 ready。

## 本轮新增对位 E2E

- 文件：`e2e/summonerwars/summonerwars-selection.e2e.ts`
- 用例：`human room must not auto-promote seat 1 into AI during faction selection`
- 覆盖点：
  - 普通房间创建后空闲等待
  - 注入残留 `match_ai_creds_<matchId>`
  - 房主手动选阵营后再次等待
  - 双阶段都验证 2 号位仍是 `unselected / false`

## 测试命令与结果

- 命令：
  - `node scripts/infra/run-e2e-single.mjs ci e2e/summonerwars/summonerwars-selection.e2e.ts "human room must not auto-promote seat 1 into AI during faction selection"`
- 结果：`passed (1/1)`

## 关键截图与观察

1. 空闲等待态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\human-room-must-not-auto-promote-seat-1-into-AI-during-faction-selection\selection-human-room-no-auto-ai-idle.png`
- 我实际看到：右下玩家状态里 `P2` 仍是“未选择”，顶部提示是“等待对手加入...”，没有出现 AI 名称或自动 ready 的勾选态。
- 验收判定：达标。普通房间空闲阶段没有自动进 AI。

2. 房主选阵营后的等待态
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-selection.e2e\human-room-must-not-auto-promote-seat-1-into-AI-during-faction-selection\selection-human-room-no-auto-ai-after-host-pick.png`
- 我实际看到：`P1` 已选亡者王国，但 `P2` 仍是“未选择”；下方按钮文案为“等待全员就绪”，没有被自动放开到可开始游戏。
- 验收判定：达标。房主完成选阵营后，空座也没有被自动推进成 AI。

## 修改文件

- `e2e/summonerwars/summonerwars-selection.e2e.ts`
- `evidence/summonerwars/summonerwars-feedback-69d0d5bf-auto-ai-room-entry-2026-04-22.md`
