# DiceThrone 枪手 Duel 双骰特写 E2E 证据（2026-04-22）

## 测试目标
- 验证 `Gunslinger` 的 `duel` 防御流程是否走 `compare-roll-choice`（双骰特写），而不是普通防御投掷链路。
- 验证选择“抵挡 1/2 进攻伤害”后交互能够收口并回到可继续推进的阶段。

## 执行命令
```bash
npm run test:e2e:ci:file -- e2e/dicethrone-defense-selection.e2e.ts "枪手 Duel 应展示双方对掷 UI，并在选择抵挡一半后结算"
```

## 结果
- 通过：`1 passed`

## 关键截图与肉眼验收

1) 触发/特写出现（达标）  
路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-defense-selection.e2e\枪手-Duel-应展示双方对掷-UI，并在选择抵挡一半后结算\gunslinger-duel-compare-roll-choice.png`
- 可见中央 `对决比骰` 浮层，且同时出现双方骰子本体，不是普通防御按钮流程。
- 可见“防御方 / 攻击方”标签与双方骰面，符合双骰对掷交互语义。
- 结论：达到“对决特写已触发”的验收标准。

2) 关键操作后状态变化（达标）  
路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-defense-selection.e2e\枪手-Duel-应展示双方对掷-UI，并在选择抵挡一半后结算\gunslinger-duel-compare-roll-after-click.png`
- 点击“抵挡 1/2 进攻伤害”后，特写层进入淡出过渡状态，说明交互确认已触发。
- 底部手牌与主棋盘重新显露，流程正在从特写态回到主对局态。
- 结论：达到“关键操作后 UI 已发生变化”的验收标准。

3) 收口后可继续推进（达标）  
路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-defense-selection.e2e\枪手-Duel-应展示双方对掷-UI，并在选择抵挡一半后结算\gunslinger-duel-compare-roll-settled.png`
- 对掷特写已关闭，不再覆盖主界面。
- 阶段列表高亮位于 `6. 主要阶段(2)`，并可见“下一阶段”按钮，链路已回到可继续推进状态。
- 结论：达到“确认/收口完成”的验收标准。

## 备注
- 本轮修正了该测试场景中历史遗留的 compare-roll 文案 key（旧 key 会显示裸 key 文本）。
- 新增 compare-roll 中间态文案键：`compareRoll.rolled`（中英）。
