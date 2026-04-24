# DiceThrone 线上反馈修复：69a440ea（教程弃牌堆方向写反）

## 反馈信息
- feedbackId: `69a440ea1eb921c6091f1231`
- gameId: `dicethrone`
- 原始反馈：教程把“右侧弃牌堆”写成了“左侧弃牌堆”。

## 根因
- 中文教程文案已是“右侧弃牌堆”，但英文教程仍保留旧方向描述，导致多语言下口径不一致：
  - `tutorial.steps.sellCardIntro` 使用了 `on the left`
  - `tutorial.steps.undoSellIntro` 使用了 `on the left`

## 修复内容
- 文件：`public/locales/en/game-dicethrone.json`
- 变更：
  - `sellCardIntro`: `on the left` -> `on the right`
  - `undoSellIntro`: `on the left` -> `on the right`

## 验证
- `npm run i18n:check` 通过（`no missing keys detected`）。
- 关键词复核：
  - `public/locales/en/game-dicethrone.json` 中 `sellCardIntro`、`undoSellIntro` 均为 `on the right`
  - `public/locales/zh-CN/game-dicethrone.json` 对应项保持“右侧弃牌堆”

## 结论
- 本条反馈对应的教程方向文案已修正，英文与中文口径一致为“右侧弃牌堆”。
