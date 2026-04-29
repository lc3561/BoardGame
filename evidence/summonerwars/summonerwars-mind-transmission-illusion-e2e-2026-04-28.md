# SummonerWars Mind Transmission / Illusion E2E Evidence (2026-04-28)

## 范围

- `mind_transmission`（读心传念）攻击后选择友方士兵并授予额外攻击
- `illusion`（幻化）移动阶段开始时选择 3 格内士兵并复制技能
- 顶层 `e2e/*.e2e.ts` 与维护版 `e2e/summonerwars/*.e2e.ts` 镜像链路

## 本轮修复

- 根因修复：[`src/games/summonerwars/domain/execute.ts`](D:\gongzuo\webgame\BoardGame\src\games\summonerwars\domain\execute.ts) 删除 `afterAttack` 阶段对 `telekinesis / high_telekinesis / mind_transmission` 的重复 `ABILITY_TRIGGERED` 补发。
- 结果：`mind_transmission` 不再在第一次响应后立刻弹出第二个同类 interaction，`sw-ability-prompt` 能正常退场。
- E2E 加固：两份 `ally-selection` 用例改为通过 `window.__BG_TEST_HARNESS__` 直接读取权威状态，避免攻击骰子浮层期间打开调试面板导致假性卡死。

## 运行命令

- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-ally-selection.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars-ally-selection.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-illusion.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/summonerwars-illusion.e2e.ts`

## 截图证据

### 1. 读心传念提示出现，且与攻击骰子结果浮层并存

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-ally-selection\mind-transmission-dice-overlay.png`
- 我实际看到：
  - 顶部青色提示明确显示“读心传念：选择目标”。
  - 中央仍有攻击骰子结果浮层，说明此前的真实问题不是“提示没出现”，而是提示与攻击收口 UI 并存。
  - 棋盘上友方弓箭手本体可见，问题场景是真实攻击后链路，不是大厅或伪造页面。
- 验收判断：
  - 该图只证明触发链正确进入了 `mind_transmission` 选目标步骤；
  - 还不能单独证明修复完成，必须继续验证选择后 prompt 能消失且流程回到攻击阶段。

### 2. 读心传念选择完成后，流程回到攻击阶段

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-ally-selection\mind-transmission-extra-attack-granted.png`
- 我实际看到：
  - 顶部已不再显示“读心传念：选择目标”，而是恢复为红色攻击阶段提示“用最多3个单位进行攻击”。
  - 攻击骰子浮层已关闭，画面回到可继续推进的主棋盘状态。
  - 目标友方弓箭手本体仍在棋盘上，可继续作为后续攻击单位。
- 状态断言：
  - E2E 通过 `TestHarness` 轮询确认 `core.board[6][4].unit.extraAttacks === 1`。
  - 同时确认 `sys.interaction.current.data.sw.type === null`，说明没有残留第二个 `after_attack_mind_transmission` interaction。
- 验收判断：
  - 达到本轮验收标准；“功能已执行但 prompt 不退场”的回归已收口。

### 3. 幻化提示真实出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-illusion\illusion-prompt-visible.png`
- 我实际看到：
  - 顶部橙色提示显示“幻化：选择3格内的一个士兵复制其技能”。
  - 棋盘上心灵巫女与可供复制的友方士兵本体都可见，说明该链路已从旧错误的 phase 等待切回真实交互触发点。
  - 当前处于移动阶段，右侧阶段条高亮“移动”，符合技能触发时机。
- 验收判断：
  - 该图证明 `illusion` 提示真实出现；
  - 还需验证选中目标后提示消失，且复制结果写入权威状态。

### 4. 幻化选择完成后，流程回到移动阶段

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\summonerwars-illusion\illusion-temp-abilities-applied.png`
- 我实际看到：
  - 顶部已恢复为移动阶段提示“移动最多3个单位，每个最多2格”，不再显示幻化目标选择 prompt。
  - 棋盘主体仍保持可操作状态，没有被浮层或卡死交互覆盖。
  - 被选中的友方士兵与心灵巫女本体都仍在画面中。
- 状态断言：
  - E2E 轮询确认 `core.board[6][2].unit.tempAbilities` 包含 `swift` 与 `ranged`。
- 验收判断：
  - 达到本轮验收标准；`illusion` 已从“错误等待锚点”收口到“真实选择并写回复制技能”。

## 结论

- `mind_transmission`：修复完成。根因是重复 `ABILITY_TRIGGERED` 造成同类 interaction 连续排队，不是纯 UI 提示问题。
- `illusion`：修复完成。旧测试错误依赖 `waitForPhase('move')`，现已改为真实在线对局 helper + 权威状态校验。
- 这两条链路的顶层与维护版镜像 E2E 已全部重跑通过。
