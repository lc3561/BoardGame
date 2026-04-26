# Cardia 反馈 69b969147315ab3a43c33f79 顶部单位裁剪修复证据

## 范围

- 反馈 ID：`69b969147315ab3a43c33f79`
- 问题描述：部分电脑的短高桌面窗口下，Cardia 顶部一排单位会被裁剪。
- 本轮目标：定位根因，做最小修复，补回归测试，并给出真实运行证据。

## 根因结论

- 根因不是单一 `overflow: hidden`。
- 真正问题在于 Cardia 的短高桌面断点只部分缩小了内容尺寸，但顶部/底部外围区仍占用较多垂直空间，导致中间 `cardia-battlefield` 的可用高度预算不足。
- 当战场区被挤短后，上下叠放的遭遇单位在短高桌面里继续采用居中布局，顶部那张单位会先贴近上边界并发生裁剪。

## 最小修复

### 样式修复

- 文件：[compactLayout.css](D:\gongzuo\webgame\BoardGame\src\games\cardia\ui\compactLayout.css)
- 关键改动：
  - 在 `max-height: 700px` 下同步收紧小卡、弃牌堆、主容器 padding/gap、顶部/底部信息区 gap、战场 padding、遭遇序列 gap。
  - 在 `max-height: 700px and min-width: 1024px` 的短高桌面场景，将 `cardia-battlefield` 改为 `align-items: flex-start`，避免战场内容继续垂直居中把顶部单位顶到裁剪边界。
  - 在 `max-height: 640px` 下继续做更激进但局部的尺寸收紧，保证极短高度桌面也能容纳上下两张单位。

### 回归测试

- 文件：[cardia-test-scenario-api.e2e.ts](D:\gongzuo\webgame\BoardGame\e2e\cardia\cardia-test-scenario-api.e2e.ts)
- 关键改动：
  - 复用现有用例 `窄高视口下顶部对手卡应完整显示在战场内`，不新建测试文件。
  - 扩成两个真实短高桌面视口：
    - `1280x640`
    - `1366x700`
  - 对每个视口断言：
    - 顶部单位完整落在 `cardia-battlefield` 内
    - 底部单位仍完整落在 `cardia-battlefield` 内
    - 顶部单位不被裁到视口外
  - 增加 `layoutTolerancePx = 2`，兼容浏览器半像素布局误差。

## 实跑验证

- 执行命令：

```powershell
npm run test:e2e:ci:file -- e2e/cardia/cardia-test-scenario-api.e2e.ts "窄高视口下顶部对手卡应完整显示在战场内"
```

- 实跑结果：

```text
1 passed (35.6s)
```

## 关键截图与肉眼结论

### 1280x640

- 截图路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\cardia\cardia-test-scenario-api.e2e\窄高视口下顶部对手卡应完整显示在战场内\窄高视口下顶部对手卡应完整显示在战场内-cardia-top-row-layout-1280x640.png`
- 肉眼观察：
  - 顶部遭遇单位本体完整可见，卡面顶部没有被视口上边缘或战场容器上边缘切掉。
  - 底部遭遇单位仍完整保留在战场区内，没有因为顶部单位回退而把底部单位挤出战场。
  - 画面仍然保持桌面宽屏布局，只是在短高断点下局部收紧尺寸与间距，不是把整套桌面布局粗暴缩成移动端或窄列布局。
- 验收判断：
  - 达到本轮“顶部单位不再被裁剪，同时底部单位不被回归挤出”的验收标准。

### 1366x700

- 截图路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\cardia\cardia-test-scenario-api.e2e\窄高视口下顶部对手卡应完整显示在战场内\窄高视口下顶部对手卡应完整显示在战场内-cardia-top-row-layout-1366x700.png`
- 肉眼观察：
  - 顶部遭遇单位在更常见的笔记本短高宽屏下同样完整可见，顶部边缘未发生裁剪。
  - 上下两张遭遇单位之间仍保持正常间距，说明这次修复不是靠重叠卡面来规避裁剪。
  - 顶部与底部玩家区仍保留完整信息栏，说明问题收敛点是短高桌面的垂直预算与战场对齐方式，而不是通过砍掉其他主要 UI 模块来“让出空间”。
- 验收判断：
  - 达到本轮验收标准，可作为短高桌面回归截图证据。

## 关联文件

- [compactLayout.css](D:\gongzuo\webgame\BoardGame\src\games\cardia\ui\compactLayout.css)
- [cardia-test-scenario-api.e2e.ts](D:\gongzuo\webgame\BoardGame\e2e\cardia\cardia-test-scenario-api.e2e.ts)

## 结论

- 本轮已确认：问题根因是短高桌面下战场高度预算不足叠加战场内容垂直居中，而不是单独的 `overflow` 配置错误。
- 已做最小范围修复，并补上对 `1280x640` 与 `1366x700` 的现有 E2E 回归覆盖。
- 已实跑通过，当前证据足以支持回写该反馈为已修复。
