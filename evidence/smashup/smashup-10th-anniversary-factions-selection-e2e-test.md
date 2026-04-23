# Smash Up 10 周年三派系选择页 E2E 证据（更新于 2026-04-22）

## 验证范围

- 派系选择页可见 `Mermaids / Skeletons / World Champs` 名称。
- 三个派系均使用统一的**斜向“实施中”横幅**（与 DiceThrone 同源样式链路）。
- 横幅文案仅为“实施中”，不再附带额外长文案。

## 执行命令

```bash
node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"
```

结果：`1 passed`

## 截图与肉眼结论

1) 总览截图
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
- 观察：三派系卡面在同一页可见，卡面上出现统一斜向横幅。

2) Mermaids 斜向横幅
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
- 观察：横幅为黑黄斜向样式，文案为“实施中”。

3) Skeletons 斜向横幅
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
- 观察：样式与 Mermaids 一致，文案为“实施中”。

4) World Champs 斜向横幅
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`
- 观察：样式与前两者一致，文案为“实施中”。

## 结论

三派系“实施中”展示已统一为斜向横幅样式，且文案已收敛为单一“实施中”。

## 复测记录（2026-04-20）

- 触发原因：你反馈“看不到横幅”，我改了 `openSmashUpModal` 的入口打开逻辑后重新跑端到端。
- 复测命令：
  - `node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"`
- 复测结果：`1 passed`
- 复测截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

## 复测记录（2026-04-22）

- 触发原因：继续收敛“只保留统一实施中样式/文案”。
- 代码收敛：
  - 删除 `public/locales/zh-CN/game-smashup.json` 与 `public/locales/en/game-smashup.json` 中 `faction_implementation_in_progress_hint`。
  - E2E 增加“横幅文案必须仅为 `实施中/Implementation in Progress` 且页面不存在 `分批实施/持续完善` 长文案”的断言。
- 校验命令：
  - `npm run i18n:check`
  - `npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"`
- 结果：`i18n-check 通过`，E2E `1 passed`。
- 本次复测截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`
