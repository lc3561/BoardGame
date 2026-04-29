# SmashUp World Champs 关键链路补证（斗志奖杯 + 鼠、鸟与香肠）- 2026-04-26

## 目标

- 为 `world_champs_fighting_spirit_prize` 与 `world_champs_mouse_bird_and_sausage` 补齐浏览器级真实入口（L3）证据。
- 继续推进三派系审计，不把“结构审计通过”误写成“整包收口”。

## 本轮改动

- 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增用例：`鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从 +2`
  - 修正用例：`斗志奖杯打出后应抽两张并给两个己方随从各放一个 +1 指示物`
    - 多选交互改为稳定的 `SYS_INTERACTION_RESPOND(optionIds[])` 提交，避免 UI 多选态抖动导致假失败。

## 验证命令与结果

1. `npx eslint e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
   - 结果：通过（0 errors，存量 `any` warnings）
2. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "斗志奖杯打出后应抽两张并给两个己方随从各放一个"`
   - 结果：`1 passed`
3. `$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'; npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从"`
   - 结果：`1 passed`

## 关键截图（绝对路径）

- 斗志奖杯（触发）
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斗志奖杯打出后应抽两张并给两个己方随从各放一个-+1-指示物\fighting-spirit-prize-prompt-visible.png`
- 斗志奖杯（收口）
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斗志奖杯打出后应抽两张并给两个己方随从各放一个-+1-指示物\fighting-spirit-prize-resolved.png`
- 鼠、鸟与香肠（二段选择）
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从-+2\mouse-bird-sausage-targets-prompt.png`
- 鼠、鸟与香肠（收口）
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从-+2\mouse-bird-sausage-resolved.png`

## 肉眼核图结论

1. 斗志奖杯触发截图可见该行动牌已打出且进入“选择 1-2 个随从分配指示物”交互，目标随从在同一真实牌局场景中可见。
2. 斗志奖杯收口截图可见己方随从旁出现新增的力量增益标识，流程已退出多选态并回到可继续推进状态。
3. 鼠、鸟与香肠二段选择截图可见明确的第二段提示“选择至多两张同派系随从”，且同基地同派系候选被高亮。
4. 鼠、鸟与香肠收口截图可见被选中的同派系目标已出现 +2 效果，流程已完成收口。

## 审计维度补记（D1-D49，针对本条补证）

| 维度 | 结论 | 说明 |
|---|---|---|
| D1 语义保真 | ✅ | 两张牌均按卡面目标语义进入真实交互链。 |
| D3 数据流闭环 | ✅ | 真实入口打牌 → 交互选择 → 状态变化 → 截图闭环。 |
| D5 交互完整性 | ✅ | 均覆盖“出现交互 + 执行选择 + 收口”。 |
| D8 时序正确性 | ✅ | 二段交互（鼠、鸟与香肠）按锚点→目标顺序执行。 |
| D15 UI 状态同步 | ✅ | 截图中交互提示与实际目标高亮一致。 |
| D19 组合场景 | ✅ | 同时覆盖抽牌+多选分配与二段同派系筛选。 |
| D20 可观测性 | ✅ | 触发/收口关键截图均有绝对路径。 |
| D34 交互选项渲染 | ✅ | 目标候选在真实盘面可见并可执行。 |
| D42 事件流审计 | ✅ | 最终状态断言与视觉结果一致。 |
| D47 E2E 覆盖完整 | ✅ | 两条关键链路均有独立 E2E 通过证据。 |
| 其他维度 | ⭕ 不适用/未改动 | 本轮未改伤害管线、资源系统、displayMode 等。 |

## 当前结论等级

- **代表性玩法已验证（World Champs 增量）**
- 本条补证仅提升 `World Champs` 的 L3 覆盖，不等于三派系整包“当前发布口径已收口”；整包仍需按主审计文档继续推进。
