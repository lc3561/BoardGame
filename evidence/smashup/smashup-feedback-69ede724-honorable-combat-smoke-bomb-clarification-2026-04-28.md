# SmashUp 反馈 69ede724 复核结论（2026-04-28）

- 反馈 ID：`69ede7249087da2a55c927cc`
- 标题：`Honorable Combat 候选基地缺失`
- 反馈截图：`D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69ede7249087da2a55c927cc-screenshot.jpg`

## 复核结论

- 这条不是新的规则 bug。
- 截图里被红框选中的 `Pyramids` 基地上，敌方可见随从带有 `Smoke Bomb`（烟幕弹）附着。
- 项目现有规则实现是：`Smoke Bomb` 保护被附着随从，不受对手行动牌影响；`Honorable Combat` 在“只有被烟幕弹保护的敌方目标”时，不会启动决斗交互。

## 代码与测试依据

- 保护实现：`src/games/smashup/abilities/ninjas.ts`
  - 注释与实现都写明：`ninja_smoke_bomb` 会保护被附着的随从，不受对手 action 影响。
- 现有回归：`src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 用例：`samurai_honorable_combat 面对仅有烟雾弹目标时不会启动决斗交互`
  - 断言：无交互启动，并产生 `ABILITY_FEEDBACK`

## 截图观察

- `Pyramids` 上玩家自己的随从战力为 `5`，对手一侧总战力为 `6`，满足“对手战力更高”的基地筛选前提。
- 但该基地内唯一可见敌方随从带有 `Smoke Bomb`，因此不构成 `Honorable Combat` 的合法敌方目标。
- 所以界面提示“没有符合条件的基地/目标”与当前规则实现一致。

## 结论

- 本条反馈可按“规则正常，用户误判为 bug”收口。
- 不需要新增代码修复；现有实现与测试已经覆盖该分支。
