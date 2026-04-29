# 召唤师战争：魔力阶段事件卡弃置回归修复 E2E 证据

## 任务目标

- 修复回归：魔力阶段点击“攻击阶段事件卡”时，不应弹“该事件只能在攻击施放”，应进入弃牌获得魔力流程。
- 同时保持：魔力阶段点击可在魔力阶段施放的事件卡，仍显示“打出 / 弃牌 / 取消”选择横幅。

## 测试命令

- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-magic-event-choice.e2e.ts`
- 结果：4 passed

## 截图与验收判断

### 1) 魔力阶段事件卡可进入选择横幅

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-magic-event-choice.e2e\魔力阶段点击事件卡应弹出选择横幅\magic-event-choice-banner-visible.png`
- 肉眼观察：手牌点击后出现横幅，且横幅内可见 `Play/打出`、`Discard/弃牌`、`Cancel/取消` 三个动作。
- 验收判断：达到预期，主路径行为未被回归破坏。

### 2) 正常事件卡可选择“打出”并正确结算

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-magic-event-choice.e2e\魔力阶段选择打出事件卡应正确结算\magic-event-choice-play-resolved.png`
- 肉眼观察：点击 `Play/打出` 后，流程已收口到普通对局态；测试校验玩家魔力从 `1` 变为 `0`，手牌移除该事件卡且弃牌堆出现该卡。
- 验收判断：达到预期，正常事件卡“打出”路径可用。

### 3) 正常事件卡可选择“弃牌”并正确结算

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-magic-event-choice.e2e\魔力阶段选择弃牌事件卡应获得魔力并弃置\magic-event-choice-discard-resolved.png`
- 肉眼观察：点击 `Discard/弃牌` 后，流程已收口到普通对局态；测试校验玩家魔力从 `1` 变为 `2`，手牌移除该事件卡且弃牌堆出现该卡。
- 验收判断：达到预期，正常事件卡“弃牌换魔力”路径可用。

### 4) 攻击阶段事件卡在魔力阶段可进入弃牌确认

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-magic-event-choice.e2e\魔力阶段点击攻击阶段事件卡应进入弃牌流程而不是报阶段错误\magic-attack-only-event-discard-ready.png`
- 肉眼观察：点击攻击阶段事件卡后出现弃牌确认按钮（`sw-confirm-discard`），未出现“该事件只能在攻击施放”阻断提示。
- 验收判断：达到预期，兜底路径（不可施放但可弃置）已恢复可达。

### 5) 攻击阶段事件卡弃牌确认后完成收口并产出魔力

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-magic-event-choice.e2e\魔力阶段点击攻击阶段事件卡应进入弃牌流程而不是报阶段错误\magic-attack-only-event-discard-resolved.png`
- 肉眼观察：流程从“可确认弃牌”进入“已完成弃牌”状态，测试同时校验玩家魔力变为 `1` 且该卡已不在手牌。
- 验收判断：达到预期，流程收口正确，无“只出现中间态但未结算”的残缺。
