# SummonerWars 交互迁移复跑证据（2026-04-29）

## 范围

- 目标：复跑本轮重构后最容易受影响的三条真实链路，确认没有把“提示可见性”和“二段位置点击”打坏。
- 覆盖链路：
  - `grab_follow`
  - `frost_axe`
  - `structure_shift`

## 本轮执行

- `npm run typecheck`
- `npm run i18n:check`
- `npx vitest run src/games/summonerwars/__tests__/useGameEvents.test.ts src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts src/games/summonerwars/__tests__/entity-chain-integrity.test.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-grab-follow.e2e.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-choice-selection.e2e.ts`
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-structure-shift.e2e.ts`

## 验证结果

- `typecheck`：通过
- `i18n:check`：通过
- SummonerWars 定向 vitest：`207 passed`
- `grab_follow` E2E：通过
- `choice-selection` E2E：2 条用例通过
- `structure_shift` E2E：通过

## 截图与结论

### 1. `grab_follow` 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-prompt-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“抓附：选择跟随位置”，右侧存在“跳过”按钮。
  - 棋盘上出现两块绿色高亮候选格，不是静默自动执行。
  - 画面里能直接看到抓附手和目标区域本体，不是只拍到空棋盘或外围容器。
- 验收判断：
  - 达标。这张图证明 `grab_follow` 不只是“流程能点”，提示本体确实上屏。

### 2. `grab_follow` 处理后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-grab-follow\grab-follow-follow-position-resolved.png`
- 我实际看到：
  - 顶部已回到普通移动提示“移动最多3个单位，每个最多2格”，不再停留在抓附提示。
  - 左侧原本高亮候选格已消失，被抓附单位位置发生变化。
  - 右侧阶段条仍在移动阶段，可继续推进，没有残留遮罩或卡死横幅。
- 验收判断：
  - 达标。`grab_follow` 从提示出现到结果落地形成完整闭环。

### 3. `frost_axe` 的 after-move 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-choice-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“冰霜战斧：充能自身，或消耗充能附加友方士兵”。
  - 右侧同时存在“充能自身”和“跳过”按钮，说明这是效果选择态而不是普通移动阶段。
  - 棋盘上友方目标单位有黄色高亮边框，玩家能看到“附加到友方士兵”这条分支的落点提示。
- 验收判断：
  - 达标。`frost_axe` 的提示链路没有因为这轮收敛而丢失。

### 4. `frost_axe` 附加后的界面提示仍可见

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-icon-visible.png`
- 我实际看到：
  - 目标单位左下角出现新的黄色状态标记。
  - 顶部已经回到普通移动提示，说明效果选择态已收口。
  - 目标单位与状态标记同框可见，不是只靠日志或隐藏状态证明。
- 验收判断：
  - 达标。附加结果在玩家界面上有持续可见的提示锚点。

### 5. `frost_axe` 附加后的详情提示仍能出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-choice-selection\frost-axe-attached-buff-details-visible.png`
- 我实际看到：
  - 附加目标左下方存在一块额外的黄蓝色详情提示层，不只是单个图标。
  - 详情层与目标单位同区域出现，没有跑到棋盘无关区域。
  - 顶部仍保持普通移动提示，说明详情展示没有把流程重新锁回交互态。
- 验收判断：
  - 基本达标。当前图能看到详情提示层，但面积较小；若后续要做最终总验收，建议补一张更聚焦的局部图提升可复查性。

### 6. `structure_shift` owner prompt 仍然存在

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-owner-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“结构变换：选择3格内友方建筑”，右侧有“跳过”按钮。
  - 棋盘上能直接看到施术者、门和友方建筑本体，不是空提示。
  - 右侧仍处于移动阶段，符合 `after_move` 触发时机。
- 验收判断：
  - 达标。第一步 prompt 没被这轮重构打坏。

### 7. `structure_shift` 结果落地后流程能继续

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-structure-shift.e2e\建筑转移：移动后推拉友方建筑\建筑转移：移动后推拉友方建筑-structure-shift-after-move.png`
- 我实际看到：
  - 建筑已经移动到新的右侧位置，说明二段点击结果已真正落地。
  - 顶部横幅已回到普通移动提示，不再停留在结构变换提示。
  - 棋盘上没有残留方向选择浮层或未清理高亮。
- 验收判断：
  - 达标。二段点击后的收口没有回归。

## 同日增量复跑

### 8. `withdraw` 费用提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\撤退：攻击后消耗充能移动\withdraw-cost-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“撤退：选择消耗类型”。
  - 横幅里能看到“消耗1充能”和“消耗1魔力”两个按钮，不是只剩流程日志。
  - 棋盘上攻击者与目标本体都在，属于真实攻击后场景，不是空提示。
- 验收判断：
  - 达标。这张图证明 `withdraw` 的第一段提示没有在迁移后丢失。

### 9. `withdraw` 二段位置选择与收口恢复正常

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\撤退：攻击后消耗充能移动\withdraw-position-visible.png`
- 我实际看到：
  - 顶部提示已经切到“撤退：选择移动位置”。
  - 棋盘上存在可点击的候选位置高亮，不是静默自动结算。
  - 攻击结果特写没有继续挡住棋盘，说明 overlay 已正确收口。
- 验收判断：
  - 达标。`withdraw` 的第二段提示链是可见且可操作的。

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\撤退：攻击后消耗充能移动\withdraw-after-move.png`
- 我实际看到：
  - 攻击者已经撤退到新位置，原位置不再停留在待选态。
  - 顶部横幅回到普通攻击阶段提示，没有残留“撤退”横幅卡住流程。
  - 右侧阶段条仍可继续推进，说明链路已正常收口。
- 验收判断：
  - 达标。`withdraw` 已完成真实攻击入口下的两段交互闭环。

### 10. `vanish` 提示与交换结果仍正常

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-target-selection-ready.png`
- 我实际看到：
  - 召唤师已经进入“神出鬼没”选择态。
  - 目标 0 费友军与其所在格可见，说明不是只剩按钮无目标。
  - 棋盘仍停留在攻击阶段真实场景，不是脱离业务链的单独面板。
- 验收判断：
  - 达标。`vanish` 的目标选择提示仍然存在。

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-swap-complete.png`
- 我实际看到：
  - 召唤师和 0 费友军位置已经互换。
  - 没有残留目标高亮或交互横幅。
  - 流程回到可继续推进状态。
- 验收判断：
  - 达标。`vanish` 的迁移后交互闭环保持正常。

### 11. `mind_transmission` 额外攻击状态真实落地

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-ally-selection\mind-transmission-extra-attack-granted.png`
- 我实际看到：
  - 友方目标单位本体在图中可见，不是只靠日志说明。
  - 触发后的界面已经从攻击提示链回到正常阶段 UI。
  - 该截图对应的是“额外攻击已授予”的收口场景，不是旧的骰子特写中间态。
- 验收判断：
  - 达标。`mind_transmission` 已有真实正向成功证据。

### 12. `feed_beast` 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\喂养巨食兽：攻击阶段结束吞噬相邻友方\喂养巨食兽：攻击阶段结束吞噬相邻友方-feed-beast-prompt-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“喂养巨食兽”。
  - 棋盘上的相邻友方格出现可选高亮，说明 UI 走的是位置选择链而不是静默自毁。
  - 画面里能直接看到巨食兽、被攻击目标和待吞噬友军本体。
- 验收判断：
  - 达标。`feed_beast` 的 phase-end prompt 已经真实上屏。

### 13. `feed_beast` 吞噬相邻友方后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\喂养巨食兽：攻击阶段结束吞噬相邻友方\喂养巨食兽：攻击阶段结束吞噬相邻友方-feed-beast-destroy-adjacent-complete.png`
- 我实际看到：
  - 待吞噬友军已经从棋盘上消失，巨食兽本体仍然存在。
  - 顶部已不再停留在“喂养巨食兽”提示，阶段继续推进到魔力阶段。
  - 这不是单独塞交互态的截图，而是先真实攻击、再结束攻击阶段后触发的完整链路结果。
- 验收判断：
  - 达标。`feed_beast` 已补齐真实成功 E2E。

### 14. `rapid_fire` 提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\连续射击：攻击后确认消耗充能并完成额外攻击\rapid-fire-prompt-visible.png`
- 我实际看到：
  - 顶部橙色横幅明确写着“连续射击：消耗1充能进行额外攻击？”，右侧同时存在“确认射击”和“跳过”按钮。
  - 棋盘上攻击者边境弓箭手和两个敌方亡灵战士本体都可见，不是只拍到空提示层。
  - 提示出现时仍处于真实攻击阶段场景，右侧阶段条显示攻击剩余次数，不是脱离链路的独立 UI。
- 验收判断：
  - 达标。`rapid_fire` 的 after-attack prompt 已在真实攻击入口下重新证明可见。

### 15. `rapid_fire` 额外攻击执行后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\连续射击：攻击后确认消耗充能并完成额外攻击\rapid-fire-extra-attack-complete.png`
- 我实际看到：
  - 顶部已回到普通攻击提示“用最多3个单位进行攻击”，不再停留在连续射击横幅。
  - 右下角第二个亡灵战士本体仍在图中，生命显示已从满血变成 `2/4`，说明额外攻击结果已经写回真实棋盘态。
  - 调试面板没有遮住业务画面，截图能同时看到攻击者、第二个受击目标和阶段 HUD，属于真实收口状态。
- 验收判断：
  - 达标。`rapid_fire` 已完成“提示出现 -> 确认额外攻击 -> 第二击落地 -> 横幅收口”的完整正向闭环。

### 16. `mind_capture` 控制/伤害分支提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\心灵捕获：攻击命中后选择控制目标\mind-capture-prompt-visible.png`
- 我实际看到：
  - 顶部紫色横幅明确写着“心灵捕获”，并同时给出“控制”和“伤害”两个决策按钮。
  - 泰珂露本体与残血敌方亡灵战士本体都直接出现在棋盘上，不是只剩一条横幅。
  - 右侧阶段条仍处于攻击阶段，说明这是“真实攻击命中后”的决策态，不是绕过攻击链的假 prompt。
- 验收判断：
  - 达标。`mind_capture` 最关键的“命中后弹出控制/伤害决策”链已经有真实上屏证据。

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\心灵捕获：攻击命中后选择造成伤害\mind-capture-damage-prompt-visible.png`
- 我实际看到：
  - 同样能看到“心灵捕获”横幅和“控制/伤害”双按钮，证明伤害分支不是单独补的快捷路径。
  - 目标单位在图中仍保留残血状态，说明决策发生在真正结算前。
  - 这一分支的 prompt 画面与控制分支一致，说明交互适配层没有因 choice 不同而分叉丢 UI。
- 验收判断：
  - 达标。`mind_capture` 的共用 prompt 在两个决策用例里都已证明可见。

### 17. `mind_capture` 控制/伤害结算后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\心灵捕获：攻击命中后选择控制目标\mind-capture-control-complete.png`
- 我实际看到：
  - 顶部已经回到普通攻击提示“用最多3个单位进行攻击”，不再停留在心灵捕获决策横幅。
  - 原右下角敌方亡灵战士仍留在原位，但卡牌底色/归属已变成我方红色样式，说明控制权已经真正转移。
  - 右侧攻击剩余次数从 3 变成 2，符合“完成一次真实攻击后收口”的阶段状态。
- 验收判断：
  - 达标。控制分支已完成“攻击命中 -> 选择控制 -> 目标归属转移 -> 横幅收口”的完整闭环。

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\心灵捕获：攻击命中后选择造成伤害\mind-capture-damage-complete.png`
- 我实际看到：
  - 顶部同样已回到普通攻击提示，不再残留心灵捕获横幅。
  - 原本右下角的敌方亡灵战士已经从棋盘上消失，说明“造成伤害并击杀”结果已落到真实棋盘态。
  - 这次 kill 分支没有触发 headless browser disconnect，说明 `mind_capture` 的伤害结算至少在这条最小真实链下可以稳定跑通。
- 验收判断：
  - 达标。伤害分支已完成“攻击命中 -> 选择伤害 -> 目标死亡 -> 横幅收口”的完整闭环。

### 18. `fortress_power` 选卡提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\城塞之力：攻击后从弃牌堆拿取城塞单位\城塞之力：攻击阶段选择弃牌堆城塞单位回手-fortress-power-card-selector-visible.png`
- 我实际看到：
  - 棋盘中央已经弹出弃牌堆卡牌选择浮层，不是只剩按钮无内容。
  - 浮层里能直接看到城塞单位卡本体，属于真实 `card-selector` 路线，不是日志或隐藏状态。
  - 画面里仍能看到先锋召唤师本体与攻击阶段 HUD，说明这条链发生在真实对局上下文内。
- 验收判断：
  - 达标。`fortress_power` 的系统选卡提示已经在真实在线 E2E 中重新证明可见。

### 19. `fortress_power` 选卡回手后正常收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-paladin-discard.e2e\城塞之力：攻击后从弃牌堆拿取城塞单位\城塞之力：攻击阶段选择弃牌堆城塞单位回手-fortress-power-retrieve-complete.png`
- 我实际看到：
  - 弃牌堆选卡浮层已经关闭，没有残留 selector 或卡死遮罩。
  - 被选择的城塞单位卡已经回到我方手牌区域，说明 `CARD_RETRIEVED` 的结果写回了真实 UI。
  - 棋盘与阶段 HUD 仍保持正常显示，流程没有因为系统交互而卡在半完成状态。
- 验收判断：
  - 达标。`fortress_power` 已形成“进入选卡 -> 选择弃牌堆城塞单位 -> 回手收口”的完整正向闭环。

## 本轮未完全补齐的证据缺口

- `structure_shift` 当前仍缺一张“第二步位置高亮已经出现”的专门截图；现有证据是“第一步 prompt 可见”直接跳到“结果已落地”。
- `soul_transfer / infection / funeral_pyre / fire_sacrifice_summon / life_drain` 仍缺真实成功 E2E 证据链，不能据此宣称 SummonerWars 交互迁移已全面验收。
- `StatusBanners.tsx` 的主要横幅分支现已统一挂上 `data-testid="sw-ability-prompt"`；后续新增 interaction 若继续扩展到新横幅分支，仍需保持这条约束，避免再次退回“按文案找横幅”的脆弱断言。
- 英文 locale 下的真实提示截图仍缺；现阶段更多是中英双语断言，不是英文界面肉眼证据。
- 已确认一个独立残留风险：当测试场景把目标设成会被攻击直接击杀时，headless Chromium 可能在 destroy/shatter 特效链后整 browser 断开；当前 `withdraw / mind_transmission` 的正向证据通过“非致死目标”绕开以验证交互链，产品级根因仍未正式修复。

## 结论

- 本轮重构后的高风险回归面已补到以下真实成功证据：
  - `grab_follow`
  - `frost_axe`
  - `structure_shift`
  - `withdraw`
  - `vanish`
  - `mind_transmission`
  - `feed_beast`
  - `rapid_fire`
  - `mind_capture`
  - `fortress_power`
- 这说明交互迁移主链已经不只是“流程可点”，而是多条真实 prompt 与二段点击链都已重新打通。
- 但从“全面验收”口径看，任务仍未结束；剩余 blockers 已经收敛成两类：
  - 仍缺正向 E2E 证据的 interaction 分支。
  - 击杀 destroy/shatter 特效在 headless 环境下的浏览器断开问题。
