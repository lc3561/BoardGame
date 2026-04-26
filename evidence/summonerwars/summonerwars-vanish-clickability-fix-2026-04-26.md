# Summoner Wars 神出鬼没不可点击修复（2026-04-26）

## 问题范围

- 用户反馈：`summonerwars` 里地精召唤师的“神出鬼没（Vanish）”按钮出现了，但点击后无法正常完成使用。
- 本轮核实结果：后端能力本身并没有缺失，问题出在前端交互链断了两处，导致按钮点击后没有进入正确的目标选择与响应流程。

## 根因定位

### 1. `activated_ability_target(vanish)` 没有映射回 `abilityMode`

- 文件：`src/games/summonerwars/Board.tsx`
- 位置：约 `491-499` 行
- 现象：
  - 点击“神出鬼没”后，系统实际已经创建了 `swInteraction.type === 'activated_ability_target'`
  - `meta.abilityId === 'vanish'`
  - `meta.step === 'selectUnit'`
  - 但 `Board.tsx` 之前没有把这类系统交互还原成前端 `abilityMode`
- 结果：
  - 玩家点完按钮后，UI 没有进入“选择一个 0 费友方单位”的目标选择态
  - 从玩家视角看，就像这个效果根本点不动

### 2. 目标点击走错命令，应该 `RESPOND` 却发成了 `ACTIVATE_ABILITY`

- 文件：`src/games/summonerwars/ui/useCellInteraction.ts`
- 位置：约 `773-789` 行
- 现象：
  - 即使补上 `abilityMode`，玩家点击被高亮的友军格时，旧逻辑仍会继续派发 `SW_COMMANDS.ACTIVATE_ABILITY`
  - 但这时系统交互已经挂起，正确路径应该是根据当前 `swInteraction.options` 找到对应 option，再发 `INTERACTION_COMMANDS.RESPOND`
- 结果：
  - 目标点击被交互系统挡住，没有真正把目标响应回去
  - 从玩家视角看，就是“按钮点了还是没法用”

## 修复说明

- 在 `src/games/summonerwars/Board.tsx` 中补上 `vanish` 的 `activated_ability_target -> abilityMode` 映射，让点击按钮后能进入正确的选目标模式。
- 在 `src/games/summonerwars/ui/useCellInteraction.ts` 中补上 `vanish` 交互态的分支：
  - 当当前交互是 `activated_ability_target` 且 `abilityId === 'vanish'` 时
  - 从 `swInteraction.options` 里匹配被点击的目标格
  - 派发 `INTERACTION_COMMANDS.RESPOND`
  - 不再错误地重新发一次 `ACTIVATE_ABILITY`
- 同步更新 `e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts`：
  - 用真实注入状态读取 0 费友军
  - 直接点击真实目标格
  - 通过核心状态确认交换完成
  - 补两张关键证据截图

## 验证

- 命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts "神出鬼没：与0费友方单位交换位置"`
- 结果：
  - 通过

## 截图观察

### 1. 目标选择态已正确出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-target-selection-ready.png`
- 我实际看到：
  - 顶部橙色提示明确写着“神出鬼没：选择一个0费友方单位交换位置”，说明点击技能按钮后已经进入正确的交互态。
  - 底部能同时看到思尼克斯和 0 费友军本体，不是只有提示条在变。
  - 右侧友军目标格有明显高亮边框，说明玩家已经拿到可点击的合法目标。
- 验收判断：
  - 达到“点技能后能进入真实可点击的目标选择态”的验收标准。

### 2. 交换完成且交互已收口

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-swap-complete.png`
- 我实际看到：
  - 思尼克斯与右侧 0 费友军已经完成换位，不再停留在初始位置。
  - 顶部提示恢复成普通攻击阶段提示，不再卡在“神出鬼没选目标”这一步。
  - 棋盘主态和右侧阶段操作区都还在，说明交互已经正常收口，后续流程可以继续推进。
- 验收判断：
  - 达到“目标点击后效果真正执行，且流程能回到可继续对局状态”的验收标准。
