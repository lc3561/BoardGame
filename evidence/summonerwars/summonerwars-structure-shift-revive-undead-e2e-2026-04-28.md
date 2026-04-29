# SummonerWars Structure Shift / Revive Undead E2E Evidence (2026-04-28)

## 范围

- `structure_shift`（结构变换）：移动后选择 3 格内友方建筑，再选择新位置完成转移
- `revive_undead`（复活死灵）：召唤阶段点击召唤师后直接打开弃牌堆卡牌选择器，再选择召唤位置
- `grab_follow`（抓附跟随）：友方单位移动后选择相邻空位跟随
- 本轮额外收口：`Board.tsx` 的 `activated_ability_target + selectCard` 本地白名单已收敛到 `systemInteractionAdapter`

## 本轮修复

- 代码重构：[`src/games/summonerwars/ui/systemInteractionAdapter.ts`](D:\gongzuo\webgame\BoardGame\src\games\summonerwars\ui\systemInteractionAdapter.ts) 新增 `SYSTEM_CARD_SELECTOR_ABILITY_IDS / getSystemCardSelectorAbilityId / getSystemCardSelectorTitleKey`，把 `card-selector` 的能力集合与标题 key 变成单一真相源。
- UI 收口：[`src/games/summonerwars/Board.tsx`](D:\gongzuo\webgame\BoardGame\src\games\summonerwars\Board.tsx) 不再手写 `revive_undead / fortress_power` 双白名单，而是直接消费 adapter 导出的 card-selector 配置。
- 门禁补强：[`src/games/summonerwars/__tests__/useGameEvents.test.ts`](D:\gongzuo\webgame\BoardGame\src\games\summonerwars\__tests__\useGameEvents.test.ts) 新增断言，锁住 `Board` 卡牌选择器能力集合必须与 UI 路由矩阵一致。
- 证据补强：[`e2e/summonerwars/summonerwars.e2e.ts`](D:\gongzuo\webgame\BoardGame\e2e\summonerwars\summonerwars.e2e.ts) 的“主动技能：复活死灵 UI 流程”补了真实截图，避免再次只靠断言收口。

## 运行命令

- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-grab-follow.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars-grab-follow.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-structure-shift.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars-structure-shift.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "主动技能：复活死灵 UI 流程"`
- `npx vitest run src/games/summonerwars/__tests__/useGameEvents.test.ts src/games/summonerwars/__tests__/entity-chain-integrity.test.ts src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts`
- `npm run typecheck`

## 截图证据

### 1. 结构变换提示只对 owner 可见，且明确显示“选择 3 格内友方建筑”

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-owner-visible.png`
- 我实际看到：
  - 顶部橙色横幅显示“结构变换：选择3格内友方建筑”，右侧有“跳过”按钮。
  - 棋盘中央可直接看到施术者和可选建筑本体，不是空白容器或伪造浮层。
  - 右侧阶段条仍停在“移动”，与 `after_move` 触发时机一致。
- 验收判断：
  - 该图证明 `structure_shift` 的 owner prompt 真实出现，而且是可交互状态；
  - 还需继续证明 guest 侧没有串显，且建筑转移完成后流程能收口。

### 2. 结构变换不会把 owner prompt 串给 guest

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-guest-hidden.png`
- 我实际看到：
  - guest 侧顶部显示的是“等待对手行动...”，没有 owner 端的结构变换提示和跳过按钮。
  - 棋盘本体仍正常同步显示双方单位与建筑，不是因为 guest 画面卡死才没显示 prompt。
- 验收判断：
  - 达到“提示只应在当前操作者视图出现”的验收要求；
  - 说明这条交互没有因为系统迁移把 prompt 广播成双端同时可操作。

### 3. 结构变换完成后，建筑已移动到新位置且流程回到移动阶段

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-after-move.png`
- 我实际看到：
  - 原本位于施术者右下区域的友方建筑已经移动到新的相邻格子。
  - 顶部横幅不再是“结构变换：选择3格内友方建筑”，而是恢复为普通移动阶段提示。
  - 棋盘上没有残留方向面板、额外交互浮层或卡死遮罩。
- 状态断言：
  - 用例轮询确认 `sw-structure-5-4[data-owner="0"]` 已真实出现。
- 验收判断：
  - 达到本轮验收标准；`structure_shift` 不只是“流程能点”，而是提示出现、对端隐藏、转移完成后流程收口都成立。

### 4. 复活死灵点击召唤师后，真实进入卡牌选择器

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\主动技能：复活死灵-UI-流程\主动技能：复活死灵-UI-流程-revive-undead-card-selector-visible.png`
- 我实际看到：
  - 中央黑色浮层标题是“复活死灵：选择弃牌堆中的亡灵单位”。
  - 浮层里真实出现了弃牌堆中的亡灵卡牌本体，不是空列表。
  - 底部有取消按钮，说明这条 `card-selector` 交互仍保留可收口出口。
- 验收判断：
  - 这张图直接命中本轮重构的 `activated_ability_target + selectCard` 链路，证明 `Board` 不再靠旧白名单也能正确渲染现役卡牌选择器。

### 5. 复活死灵完成后，召唤单位已落地且卡牌选择器关闭

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\主动技能：复活死灵-UI-流程\主动技能：复活死灵-UI-流程-revive-undead-summoned-unit-visible.png`
- 我实际看到：
  - 棋盘上新增了从弃牌堆召回的亡灵单位本体，卡牌选择器已经关闭。
  - 顶部横幅已回到普通召唤阶段提示，说明交互没有残留在 card-selector 或 position selector。
  - 召唤师本体仍在原位，流程回到了可继续召唤的主棋盘状态。
- 状态断言：
  - 用例轮询确认目标格 `sw-unit-{row}-{col}` 可见，且召唤师伤害值增加 `2`。
- 验收判断：
  - 达到本轮验收标准；`revive_undead` 现役 `selectCard -> selectPosition` 双步链路在这次重构后仍完整可用。

## 额外验证

- `grab_follow` 两份 E2E 本轮都已重跑通过：
  - `e2e/summonerwars/summonerwars-grab-follow.e2e.ts`
  - `e2e/summonerwars-grab-follow.e2e.ts`
- 这两条用例本轮没有新增截图产物，但运行结果确认“友方移动 -> 跟随位置提示 -> 选择空位 -> 抓附手落位”链路仍能真实完成。

## 结论

- `activated_ability_target + selectCard` 的 `Board` 本地白名单已收口到 adapter 单一真相源，半迁移残留少了一层未来回归入口。
- `handleCancelTelekinesis` 已缩窄为真正的 telekinesis 方向取消 owner，不再宽口吞掉所有 `activated_ability_target`。
- `structure_shift/selectNewPosition` 与 `ice_ram/selectPushDirection` 已从“点击命中高亮但 option 失配时静默 return”改为 helper + 显式 `console.warn`，并补了 helper 级测试门禁。
- `structure_shift`：owner 可见、guest 隐藏、建筑已移动、流程已收口，验收通过。
- `revive_undead`：卡牌选择器真实出现、选牌后继续选格、召回单位落地、流程已收口，验收通过。
- `grab_follow`：本轮复跑通过，目前没有发现和这波交互迁移直接相关的新回归。

## 2026-04-28 补充验证

- `npx vitest run src/games/summonerwars/__tests__/useGameEvents.test.ts src/games/summonerwars/__tests__/entity-chain-integrity.test.ts src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts`
  - 结果：`204 passed`
- `npm run typecheck`
  - 结果：通过
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-structure-shift.e2e.ts`
  - 结果：通过
  - 继续使用并复核的关键截图：
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-owner-visible.png`
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-after-move.png`
