# SmashUp 图片加载 E2E 证据

## 范围

- 首页 `Smash Up` 入口图是否正常显示
- `SmashUp` 派系选择界面图片是否正常显示
- 本地 `giant_ants + pirates` 对局关键卡图是否正常显示
- 真实联机链路下手牌区、弃牌堆图片是否正常显示

## 执行命令

### 托管 isolated runtime

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-image-loading.e2e.ts "SmashUp Image Loading"
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-image-loading.e2e.ts "巨蚁加海盗本地对局应正常显示关键卡图"
```

## 通过情况

- 2026-04-26 已在托管 isolated runtime 下完整跑通 `SmashUp Image Loading`，结果 `6/6 passed`：
  - `首页应正常显示大杀四方入口图`
  - `应该加载带 i18n/zh-CN/ 前缀的卡牌图片`
  - `应该成功加载派系选择界面的卡牌图片`
  - `巨蚁加海盗本地对局应正常显示关键卡图`
  - `应该成功加载手牌区域的卡牌图片`
  - `应该成功加载弃牌堆的卡牌图片`

## 截图证据

### 首页

- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-image-loading.e2e\首页应正常显示大杀四方入口图\首页应正常显示大杀四方入口图-home-smashup-entry.png`
- 观察：
  - 首页游戏卡片区域已渲染，`Smash Up` 入口本体可见。
  - 该用例同时通过了入口图可见 + 预览渲染统计，不是只有文案存在。

### 派系选择

- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-image-loading.e2e\应该成功加载派系选择界面的卡牌图片\应该成功加载派系选择界面的卡牌图片-draft-faction-previews.png`
- 观察：
  - 派系选择页已进入，派系卡网格本体可见。
  - 用例通过了可见卡片数量与已渲染预览数量检查，说明不是空卡槽或纯文案兜底。

### giant_ants + pirates 本地对局

- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-image-loading.e2e\巨蚁加海盗本地对局应正常显示关键卡图\巨蚁加海盗本地对局应正常显示关键卡图-giant-ants-pirates-local-board.png`
- 观察：
  - 本地对局已进入 `playCards`，手牌区本体可见。
  - 指定的两张手牌 `giant_ant_worker` 与 `pirate_first_mate` 可见且预览渲染统计为已加载。
  - 玩家 0 派系状态断言为 `['giant_ants', 'pirates']`，不是跑错派系组合。

## 说明

- 中途确实遇到过其他后台 E2E / Android 兼容任务抢占 `heavy-task-guard` 与 CPU 预算，导致多次非业务失败。
- 最终在清理干扰任务后，托管 isolated runtime 已完成一次完整 `6/6` 跑绿，这一轮才作为最终验收依据。
- 直接挂现成开发服跑过一次，但开发服本身出现 `ERR_CONNECTION_REFUSED` 抖动，因此没有把那轮结果作为最终验收依据。
