# Smash Up 10 周年三派系选择页 E2E 证据（2026-04-19）

## 验证范围

- 派系选择页可见 `Mermaids / Skeletons / World Champs` 名称。
- 三个“实施中”横幅可见（`faction-implementation-banner-*`）。

## 执行命令

```bash
node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系及实施中横幅"
```

结果：`1 passed`

## 截图与肉眼结论

1) 总览截图（可见 10 周年卡牌与实施中角标）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
- 观察：画面中可见美人鱼卡（`Siren`）左上角“实施中”角标；同时可见世界冠军卡（`Rainbow Girl`）左上角“实施中”角标。
- 验收：达到“实施中横幅已在派系选择页渲染”的标准。

2) 派系名称截图（Mermaids）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-name.png`
- 观察：截图中可直接看到“美人鱼”名称文本。
- 验收：达到“Mermaids 名称可见”的标准。

3) 派系名称截图（Skeletons）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-name.png`
- 观察：截图中可直接看到“骷髅”名称文本。
- 验收：达到“Skeletons 名称可见”的标准。

4) 派系名称截图（World Champs）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-name.png`
- 观察：截图中可直接看到“世界冠军”名称文本。
- 验收：达到“World Champs 名称可见”的标准。

5) 三个实施中横幅截图
- Mermaids：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
- Skeletons：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
- World Champs：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`
- 观察：三张图均直接可见“实施中”角标本体。
- 验收：达到“三派系横幅分别可见”的标准。

## 结论

本次 E2E 结果与截图证据一致，满足“10 周年三派系在派系选择页可见且带实施中横幅”的验收目标。

## 复测记录（2026-04-19 晚）

- 触发原因：完成 `mermaids/skeletons` 审计导向改造后，回归确认派系选择页展示未受影响。
- 复测命令：
  - `node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系及实施中横幅"`
- 结果：`1 passed`，继续使用本文截图路径作为最新证据。

## 复测记录（2026-04-19 夜）

- 触发原因：完成 `ninjas_invisible_ninja` 能力标签审计修复后，再次确认三派系选择页与“实施中”横幅展示未回归。
- 复测命令：
  - `node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系及实施中横幅"`
- 结果：`1 passed`，截图路径沿用本文已列绝对路径。

## 复测记录（2026-04-19 深夜）

- 触发原因：完成交互完整性审计基线化（orphan baseline）后，回归确认派系选择展示与“实施中”横幅不受影响。
- 复测命令：
  - `node scripts/infra/run-e2e-command.mjs isolated e2e/smashup/smashup.e2e.ts --grep "派系选择页应显示 10 周年三派系及实施中横幅"`
- 结果：`1 passed`，关键截图仍为：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
