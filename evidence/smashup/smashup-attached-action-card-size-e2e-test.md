# 大杀四方附加行动卡尺寸放大 E2E 证据

## 范围

- 需求：大杀四方中附加在随从上的行动卡，在移动端和 PC 端统一调整到 `3vw`，不做端侧差异化处理。
- 代码位点：`src/games/smashup/ui/BaseZone.tsx`
- 验证目标：
  - PC 端 hover 随从后，附加行动卡本体明显变大，不再过小。
  - 移动端展开附加行动卡后，附加行动卡本体明显变大，不再只是细条小卡。
  - 移动端点击附加行动卡后的放大预览链路仍正常。

## 执行命令

```powershell
npm run test:e2e:ci:file -- e2e/smashup/smashup-gameplay.e2e.ts "PC 端 hover 随从时，附着行动卡应至少放大到宿主随从宽度的一半"
npm run test:e2e:ci:file -- e2e/smashup/smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌与战场拖拽放大"
```

## 截图与观察

### 1. PC hover 展开态

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-gameplay.e2e\PC-端-hover-随从时，附着行动卡应至少放大到宿主随从宽度的一半\smashup-pc-attached-action-size.png`

实际看到：
- 左侧 `Standing Stones` 基地下方，宿主随从右侧的附加行动卡本体清晰可见，不再是之前那种难以辨认的极窄小条。
- 附加行动卡的视觉宽度已经接近宿主随从宽度的一半，肉眼能直接识别出独立卡面与边框。
- 截图里能同时看到宿主随从与附加行动卡本体，问题位点明确，没有被别的浮层遮住。

验收结论：
- 达到 PC 端验收标准。

### 2. 移动端展开态

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌与战场拖拽放大\05-mobile-single-tap-expands-attached-actions.png`

实际看到：
- 左侧高亮宿主随从下方，附加行动卡本体已经和周围随从卡保持接近的可辨认尺寸，不再缩成一条很细的小卡。
- 附加行动卡在横屏移动端展开后仍完整显示在真实战场链路里，没有跑出屏幕，也没有被 HUD 或其它面板遮挡。
- 宿主随从、附加行动卡、右侧操作区仍在同一真实页面里，截图不是摆拍图。

验收结论：
- 达到移动端展开态验收标准。

### 3. 移动端点击后的放大预览

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌与战场拖拽放大\06b-mobile-attached-action-single-tap-magnify.png`

实际看到：
- 点击附加行动卡后，中央大图预览正常出现，卡面主体和文字都清晰可见。
- 背景里仍能看到原来的宿主随从区域，说明是从真实附加行动卡入口触发的放大预览，不是绕过链路的替代截图。
- 本轮放大尺寸调整没有把移动端单击查看链路打坏。

验收结论：
- 达到移动端交互链路验收标准。

## 总结

- 本轮已确认：附加在随从上的行动卡在 PC 和移动端都统一调整为 `3vw`。
- 本轮已确认：移动端展开与点击放大链路正常，未因尺寸增加出现明显遮挡、出屏或入口失效。
