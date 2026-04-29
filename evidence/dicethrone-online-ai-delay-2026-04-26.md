# DiceThrone 在线 AI 延迟排查证据（2026-04-26）

## 范围
- 游戏：DiceThrone（王权骰铸）
- 场景：真人 + AI 在线房间
- 目标：确认“AI 有时几秒不动”是否来自 1s 可见动作延迟，还是来自在线同步/重试链路

## 关键产物
- 最新成功链路截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\40-online-ai-real-timeline-host-main1.png`
- 最新成功链路截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\41-online-ai-real-timeline-ai-turn-start.png`
- 最新成功链路截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\42-online-ai-real-timeline-after-attack-chain.png`
- 最新时间线日志：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\online-ai-real-timeline-console.json`
- 最新时间线摘要：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到攻击链时间线应可区分动作延迟与传输重试\online-ai-real-timeline-summary.json`
- 旧成功链路（保留用于对照）：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-simple-start.e2e\Online-AI-真人房间：主阶段到两次投骰的在线时间线应可区分动作延迟与传输重试\online-ai-real-timeline-summary.json`
- 最新失败截图：`D:\gongzuo\webgame\BoardGame\test-results\playwright-artifacts\dicethrone-simple-start.e2-0675c-主阶段到两次投骰的在线时间线应可区分动作延迟与传输重试-chromium\test-failed-1.png`

## 截图观察

### 40-online-ai-real-timeline-host-main1.png
- 我实际看到房主已经在主阶段，页面已进入真实棋盘，不是角色选择页。
- 这张图只能证明在线房间开局成功并进入 host 主阶段，达到“入口真实”标准。

### 41-online-ai-real-timeline-ai-turn-start.png
- 我实际看到顶部高亮是 `AI 2 号位`，中央出现“AI 2 号位正在思考中...”，说明已经轮到 AI 执行动作前的真实在线状态。
- 这张图证明问题不是“AI 根本没启用”，达到“AI 已接管回合”标准。

### 42-online-ai-real-timeline-after-attack-chain.png
- 我实际看到画面已经进入“那耶攻击阶段”，中央有卡牌特写，右侧骰列能看到至少两次投骰后的结果和锁骰痕迹。
- 这张图证明最新成功链路里，AI 已从主阶段推进到攻击链后续节点，达到“AI 可继续执行可见动作”标准。

### test-failed-1.png
- 我实际看到页面停在 host 主阶段(1)，右下角有 `可以响应 / 略过` 浮层，说明最新失败不是 AI 自己静默，而是测试在房主回合被响应窗口打断。
- 这张图不满足“已经进入 AI 回合”的验收标准，不能用它证明 AI 延迟已完全消失。

## 日志结论
- 最新成功链路的 `online-ai-real-timeline-summary.json` 结论是：
  - `handoffGapMs = 780`，即 host 弃牌阶段到 AI 主阶段接管只有 780ms。
  - `patchApplyFailedCount = 0`，本轮没有再出现 `patch-apply-failed -> sync`。
  - `submittedVisibleActionCount = 6`，AI 主阶段到攻击链之间实际发生了 6 个可见动作，不是“完全没动”。
  - `submittedRollCount = 2`，最新这轮确实走到了两次 `roll-dice`。
  - `firstToSecondRollGapMs = 1007`，第一次和第二次投骰之间约 1 秒，和当前 `minimumActionDelayMs = 1000` 基本一致。
- 同一份摘要里，6 个可见动作序列是 4 次 `play-card`，然后 2 次 `roll-dice`。这些动作之间的提交间隔都在约 0.74s 到 1.01s 之间，没有出现“无动作静默好几秒后才第一下”的现象。
- 成功链路仍然能看到 `stale-private-overlay -> resync-requested -> sync-requested -> sync-received`，但这次只发生在 turn handoff 边界，`resyncElapsedMs = 18`，不足以解释多秒卡顿。
- 旧成功链路里曾出现“一投后锁骰/选技/确认”的合法路径，因此“AI 必须发生第二次 `roll-dice`”不是稳定真相，只能作为部分路径；这也是旧 E2E 断言会误判的原因。
- 修复前，代码在 effect cleanup 时只 `clearTimeout(delayTimer)`，没有让等待中的可见动作延迟显式完成或取消。这会把一次计划中的 visible step 静默悬空，后续 effect 再从新状态继续推进，造成“第一下卡很久且中间没日志”的现象。

## 当前结论
- 已定位到一个真实代码缺陷：AI 可见动作延迟在 cleanup 中会被静默清掉，导致等待 promise 悬空。
- 这个缺陷已按通用方式修到本地和在线两条 AI 链路。
- 在线 patch baseline 污染导致的 `patch-apply-failed -> sync` 也已修复；最新真人+AI 在线 E2E 没再复现该错误。
- 以今天这次真人+AI 在线成功链路为准，当前主阶段到攻击链之间的可见节奏已经回到“每个可见动作约 1 秒”的预算，不能再把“主要阶段到投骰有几秒”直接归因到 1 秒延迟本身。
- 最新 E2E 仍有另一条独立不稳定项：host 回合有时会被响应窗口打断，导致测试还没进入 AI 回合就提前失败；这不等同于前述 AI 静默根因。
