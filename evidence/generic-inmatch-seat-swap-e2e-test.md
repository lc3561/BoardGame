# 通用局内换位 E2E 证据（2026-04-19）

## 1) 执行命令
- `npm run typecheck`
- `npm run test:e2e:ci:file -- summonerwars/summonerwars.e2e.ts "在线 AI 阵营选择 HUD 换位：应显示入口并可与 AI 交换先手"`
- `npm run test:e2e:ci:file -- dicethrone-simple-start.e2e.ts "Online 4-player seating panel: clicking an AI portrait swaps seats immediately"`

## 2) SummonerWars（AI 对局 HUD 入口 + 换位生效）

### 截图 A
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-阵营选择-HUD-换位：应显示入口并可与-AI-交换先手\online-ai-seat-swap-entry-visible.png`
- 实际看到：
  - HUD 菜单已展开，可见换位入口（`seat-swap`）。
  - 页面处于阵营选择前置流程，未开局。
- 验收结论：达到“AI 对局可见换位入口”标准。

### 截图 B
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-阵营选择-HUD-换位：应显示入口并可与-AI-交换先手\online-ai-seat-swap-panel-before-click.png`
- 实际看到：
  - 换位面板内存在 `hud-seat-swap-seat-1`。
  - 目标座位显示 `AI` 徽章。
- 验收结论：达到“AI 座位可作为换位目标”标准。

### 截图 C
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线-AI-阵营选择-HUD-换位：应显示入口并可与-AI-交换先手\online-ai-seat-swap-after-click.png`
- 实际看到：
  - 点击 AI 座位后流程收口，面板关闭。
  - 测试断言通过：`startingPlayerId/currentPlayer` 从 `0` 切到 `1`。
- 验收结论：达到“换位主要影响先后手且立即生效”标准。

## 3) DiceThrone（四人旧换位入口回归）

### 截图 D
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-seating-panel-clicking-an-AI-portrait-swaps-seats-immediately\03-four-player-seat-swap-ai-before.png`
- 实际看到：
  - 四人旧选角换位面板存在，AI 头像可点击。
- 验收结论：旧入口仍可达。

### 截图 E
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-seating-panel-clicking-an-AI-portrait-swaps-seats-immediately\04-four-player-seat-swap-ai-after.png`
- 实际看到：
  - 点击 AI 头像后座位顺序变化，流程无审批停留。
- 验收结论：达到“四人旧换位功能保留”标准。

## 4) 结果
- `typecheck` 通过。
- 两条目标 E2E 通过（SummonerWars AI HUD 换位、DiceThrone 四人旧入口）。
- “开局后隐藏”由 `MatchRoom` 门禁逻辑收口为 `instant` 模式必须 `hostStarted === false` 才显示；本轮未单独追加稳定在线注入型截图用例，后续可在专门回归用例补齐。
