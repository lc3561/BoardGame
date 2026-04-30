# Smash Up 公主派系开局在线 E2E 证据

## 范围

- 游戏：`smashup`
- 关注派系：`princesses`（公主）
- 验证链路：真实 `online` 房间，不使用 `/play/:gameId/local`，也不使用 `/play/smashup` 单页测试入口
- 对应用例：
  - `e2e/smashup/smashup-card-display-mode.e2e.ts`
  - `在线对局：公主派系开局后不应少牌或出现整批空白手牌`
  - `在线对局：公主派系在英文环境开局后也不应少牌或出现空白手牌`

## 运行命令

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-card-display-mode.e2e.ts "在线对局：公主派系开局后不应少牌或出现整批空白手牌"
npm run test:e2e:ci:file -- e2e/smashup/smashup-card-display-mode.e2e.ts "在线对局：公主派系在英文环境开局后也不应少牌或出现空白手牌"
```

## 结论

- 当前分支在真实 online 房间里，`princesses + aliens` 开局**未复现**“牌库少一半”。
- 中文环境与英文环境两条开局链路都满足：
  - `hand.length = 5`
  - `deck.length = 35`
  - 手牌区 5 张牌都能直接看到卡面，不是空白占位。
- 因此，至少在当前代码与这条真实房间链路下，用户描述的“选公主后所有牌像没通过校验一样消失”**不成立**。

## 关键截图

- 中文开局手牌：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-card-display-mode.e2e\在线对局：公主派系开局后不应少牌或出现整批空白手牌\princesses-online-opening-hand.png`
- 中文开局牌库：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-card-display-mode.e2e\在线对局：公主派系开局后不应少牌或出现整批空白手牌\princesses-online-opening-deck.png`
- 英文开局手牌：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-card-display-mode.e2e\在线对局：公主派系在英文环境开局后也不应少牌或出现空白手牌\princesses-online-opening-hand-en.png`
- 英文开局牌库：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-card-display-mode.e2e\在线对局：公主派系在英文环境开局后也不应少牌或出现空白手牌\princesses-online-opening-deck-en.png`

## 肉眼观察

- 中文手牌截图里，能直接看到 5 张起手牌本体；其中同时混有公主卡和外星人卡，不存在“只剩一半能看见”的现象。
- 中文牌库截图里，左下角牌库角标清楚显示 `35`，与 `40 - 5 = 35` 一致。
- 英文手牌截图里，5 张卡也都直接可见；卡图不是白块，也不是只剩卡名按钮。
- 英文截图里，公主卡仍走中文覆盖文案，但卡面本体正常存在；这说明“整批空白手牌”在当前 online 链路下未出现。

## 验收判断

- 已完成对“公主派系开局少牌/空白手牌”的真实 online 复核。
- 当前代码下没有拿到支持该 bug 仍存在的证据；相反，两条真实 online E2E 都给出了反证。
- 若后续用户在线上包或特定端继续复现，应优先补充：
  - 复现端类型（Web / Android / iOS）
  - 语言环境
  - 具体配对派系
  - 进入路径（创建房间 / AI 房 / 重连）
