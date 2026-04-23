# 线上反馈四条高优收口（2026-04-22）

## 目标

对以下 4 条 `human + high + in_progress` 的已知游戏反馈执行当前基线复核与状态回写：

- `69daa34c469c37573d131bf7`（smashup）
- `69d0d5bfccdbf2785a55af79`（summonerwars）
- `69c8f2f432bd47a7b57a66f8`（dicethrone）
- `69c7e7bc32bd47a7b57a61fc`（dicethrone）

## 本地改动与验证

1. SmashUp 根因修复（`69daa34c`）
- 文件：`src/games/smashup/abilities/zombies.ts`
- 修复：`zombie_lord_pick` 在缺失 `baseIndex` 时回退可用基地并做语义校验，避免写入脏 `MINION_PLAYED`。

2. 回归测试
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/zombieInteractionChain.test.ts --configLoader native --maxWorkers 1`
- `npm run test:e2e:ci:file -- e2e/smashup/smashup-zombie-lord.e2e.ts "僵尸领主：弃牌堆选随从后直接点击基地部署"`

3. 关键截图
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-zombie-lord.e2e\僵尸领主：弃牌堆选随从后直接点击基地部署\zombie-lord-discard-panel.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-zombie-lord.e2e\僵尸领主：弃牌堆选随从后直接点击基地部署\zombie-lord-card-selected.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-zombie-lord.e2e\僵尸领主：弃牌堆选随从后直接点击基地部署\zombie-lord-after-deploy.png`

## 生产 Mongo 回写

- 脚本：`temp/feedback-closeout/update-feedback-target4-status-20260422-2328.js`
- 回写报告：`temp/feedback-closeout/update-feedback-target4-status-20260422-2328.raw.txt`

回写结果（all matched=1 & modified=1）：

- `69daa34c469c37573d131bf7`：`in_progress -> resolved`
- `69d0d5bfccdbf2785a55af79`：`in_progress -> resolved`
- `69c8f2f432bd47a7b57a66f8`：`in_progress -> resolved`
- `69c7e7bc32bd47a7b57a61fc`：`in_progress -> closed`

## 回写后复核

- 复核脚本结果：`temp/feedback-closeout/query-feedback-target4-after-20260422-2328.raw.txt`
- 结果：已知游戏范围内 `human + high/critical + in_progress` 条目计数为 `0`。
