# SmashUp 线上反馈批次10（UI/E2E 三条）验证证据（2026-04-24）

- 目标反馈：
  1. `69d71d2e932fe508b2420c25`（拖拽时黑屏）
  2. `69d8834670d52ddbd0c190a8`（pinch 后无法拖动）
  3. `69dbb726e92e3f88b78cec52`（POD 基地文案不匹配）

## 执行命令（全部通过）

- `npm run test:e2e:ci:file -- e2e/smashup/smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌与战场拖拽放大"`
- `npm run test:e2e:ci:file -- e2e/smashup/smashup-4p-layout-test.e2e.ts "移动端横屏 pinch 后仍可拖拽战场，避免 pan 锁死回归"`
- `npm run test:e2e:ci:file -- e2e/smashup/smashup-base-minion-selection.e2e.ts "POD 版米斯卡塔尼克大学：基地悬浮文案和放大预览都应跟随 POD 版本文本"`

## 关键截图与肉眼观察

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌与战场拖拽放大\04-mobile-landscape-layout.png`
- 我实际看到：横屏主战场完整显示，没有出现“被拖出后半屏黑块”现象；右侧结束回合按钮、左下牌库、底部手牌都在可视区。
- 验收判定：达到 `69d71d2e...` 修复标准。

2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-4p-layout-test.e2e\移动端横屏-pinch-后仍可拖拽战场，避免-pan-锁死回归\04f-mobile-battlefield-pan-still-works-after-pinch.png`
- 我实际看到：缩放后战场可继续平移，卡面位置发生位移且 UI 仍稳定，没有出现 pan 锁死。
- 验收判定：达到 `69d88346...` 修复标准。

3. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-base-minion-selection.e2e\POD-版米斯卡塔尼克大学：基地悬浮文案和放大预览都应跟随-POD-版本文本\smashup-miskatonic-pod-base-hover-text.png`
- 我实际看到：悬浮文本为“每回合一次，在你于此打出一个随从后……”，内容与 POD 版本规则一致。
- 验收判定：达到 `69dbb726...` 悬浮文案一致性标准。

4. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-base-minion-selection.e2e\POD-版米斯卡塔尼克大学：基地悬浮文案和放大预览都应跟随-POD-版本文本\smashup-miskatonic-pod-base-magnify-text.png`
- 我实际看到：放大预览文本与悬浮文本一致，同样为 POD 口径，不存在中英文或新旧版本错配。
- 验收判定：达到 `69dbb726...` 放大预览一致性标准。

## 结论

- 三条 UI 类线上反馈均通过真实 E2E 链路验证，可回写 `resolved`。
