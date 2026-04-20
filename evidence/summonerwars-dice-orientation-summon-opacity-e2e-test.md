# SummonerWars 敌方骰子倒置 + 召唤单位半透明 修复验证

- 日期：2026-04-20
- 用例：`e2e/summonerwars/summonerwars.e2e.ts` / `在线对局流程：召唤、移动、建造、攻击与弃牌`
- 执行命令：`npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线对局流程：召唤、移动、建造、攻击与弃牌"`
- 结果：通过（1 passed）

## 关键截图与肉眼结论

### 1) 召唤后单位不应半透明
- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\online-flow-after-summon.png`
- 我实际看到：棋盘下半区新出现的我方单位卡面是完整实体卡面，不是淡灰占位块，也没有“卡面发白/透出背景”的半透明感。
- 自动断言：召唤后读取该单位 `data-card-sprite` 的 `opacity`，要求 `> 0.95`。
- 是否达到本轮验收标准：达到。

### 2) 敌方攻击时骰子特写不应倒置
- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\online-flow-guest-dice-overlay.png`
- 我实际看到：被动侧画面中央攻击提示与骰子特写是正向阅读方向，没有出现整块 UI 上下倒置。
- 自动断言：对 `sw-dice-result-overlay` 的内容面板读取 `transform`，断言不包含 `180deg`。
- 是否达到本轮验收标准：达到。

## 备注
- 本次仅验证并修复“敌方骰子特写倒置”和“召唤后单位偶发半透明”两项，不包含其他平衡或技能逻辑变更。
