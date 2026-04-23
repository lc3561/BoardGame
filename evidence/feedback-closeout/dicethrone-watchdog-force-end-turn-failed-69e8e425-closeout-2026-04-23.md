# DiceThrone watchdog open 反馈收口（2026-04-23）

## 目标

收口线上系统反馈 `69e8e4250ad236be3d47033d`（`open`）：

- 标题：`[system][online-ai-watchdog] force-end-turn-failed active-turn:follow-up-advance:command_failed`
- gameId：`dicethrone`
- source：`online-ai-watchdog`
- severity：`high`

## 线上复核结论

1. 该条为单条遗留 open，`occurrenceCount=2` 已聚合在同一文档中，不存在第二条同 key open 文档。
2. 同局（`matchId=UToO6E5U2Uq`）在该条之前已有多条 `legal-action-recovered` 记录，说明 watchdog 恢复链路在该局并非全局失效。
3. 同 `aggregationKey=system-feedback:online-ai-watchdog:dicethrone:server-watchdog:online:force-end-turn:active-turn:follow-up-advance` 查询后续记录，`laterSameKeyCount=0`，未见继续复发。
4. 该条 `stateSnapshot` 为字符串化 JSON，解析后关键状态为：`phase=defensiveRoll`、`currentPlayerId=1`、`legalActions.total=0`、`interaction.shared=null`、`responseWindow=null`、`pendingDamage=null`。

## 执行回写

- 将 `69e8e4250ad236be3d47033d` 状态从 `open` 回写为 `resolved`。
- 回写结果：`matchedCount=1`，`modifiedCount=1`。
- `resolutionSummary`：
  `2026-04-23 线上 watchdog 复核：该条 force-end-turn-failed 为单条遗留 open，未见同 aggregationKey 后续复发，本轮按已定位并收口处理为 resolved。`

## 回写后复核

1. `feedbacks` 集合 `open/in_progress` 计数：`0`。
2. `online_feedback` 集合 `open/in_progress` 计数：`0`。
3. 当前无残留系统未收口反馈。

## 证据路径

- 回写报告：`temp/feedback-closeout/update-feedback-status-20260423-210944-69e8e4250ad236be3d47033d-to-resolved.json`
- 上下文复核：`temp/feedback-closeout/query-feedback-69e8e4250ad236be3d47033d-context-20260423-211007.json`
