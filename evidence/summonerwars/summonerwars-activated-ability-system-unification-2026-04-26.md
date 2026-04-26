# Summoner Wars `activated_ability_target` 系统交互统一收敛（2026-04-26）

## 背景

- 用户最初反馈的是 `神出鬼没 (vanish)` 按钮出现但无法完成点击使用。
- 进一步排查后确认，这不是单点 bug，而是 `domain/systems.ts` 已把多条主动技能迁到 `sys.interaction`，但 UI 仍保留了一半旧的本地 `abilityMode + ACTIVATE_ABILITY` 双轨。
- 本轮目标从“修一个 vanish”升级为“收敛这批 `activated_ability_target` 残留桥接”。

## 回归根因

### 1. 交互真相源已迁到系统层，UI 仍在走本地分支

- `src/games/summonerwars/domain/systems.ts` 已统一生成 `type: 'activated_ability_target'` 的系统交互。
- 但 `Board.tsx` / `useCellInteraction.ts` 仍存在几类旧逻辑：
  - 没有从 `swInteraction` 还原对应 `abilityMode`
  - 目标点击后继续发 `SW_COMMANDS.ACTIVATE_ABILITY`
  - 选卡 overlay 仍按本地 discard 过滤推断，而不是按 `swInteraction.options` 作为真相源

### 2. 同类残留不止 `vanish`

- 本轮确认并统一收敛的能力：
  - `vanish`
  - `revive_undead`
  - `fortress_power`
  - `telekinesis_instead`
  - `high_telekinesis_instead`

## 本轮改动

### 统一 adapter

- 新增：`src/games/summonerwars/ui/systemInteractionAdapter.ts`
- 统一职责：
  - `deriveSystemAbilityMode()`：把系统交互还原成 UI `abilityMode`
  - `findActivatedAbilityTargetOptionByPosition()`：按格子命中 `activated_ability_target`
  - `findActivatedAbilityTargetOptionByCardId()`：按弃牌卡命中 `activated_ability_target`
  - `listActivatedAbilityTargetCardIds()`：把选卡真相源从 UI 本地过滤收回到系统 options
  - `findActivatedAbilityDirectionOptionByPosition()`：把念力二段方向选择统一按系统 option 的 `id=pos:x,y` 命中，不再误读 `value.targetPosition`

### UI 收敛

- `src/games/summonerwars/Board.tsx`
  - 删除内联的大段 `systemAbilityMode` 分支，改为统一调用 adapter。
  - `revive_undead / fortress_power` 的选卡 overlay 改为优先读系统 options 的 `targetCardId`。
  - 系统态选卡后改为 `INTERACTION_COMMANDS.RESPOND`，不再伪造本地 payload。

- `src/games/summonerwars/ui/useCellInteraction.ts`
  - `vanish` 目标点击改为统一 helper 匹配 option 后 `RESPOND`。
  - `telekinesis_instead / high_telekinesis_instead` 选中目标后，系统态先 `RESPOND` 进入下一步 `selectDirection`，不再本地直接推进。
  - `revive_undead` 的 `selectPosition` 改为系统态 `RESPOND`。
  - 召唤阶段点击带 `revive_undead` 的召唤师时，改为先触发 domain 创建系统交互，再由 UI 从系统态派生选卡模式。

- `src/games/summonerwars/ui/useEventCardModes.ts`
  - 念力二段系统态终点列表改为从 `option.id=pos:x,y` 解析终点，而不是把 `value.targetPosition` 误当终点。
  - 二段点击继续走 adapter 的方向 option 匹配。

### 回归测试补强

- `src/games/summonerwars/__tests__/useGameEvents.test.ts`
  - 新增 adapter 纯函数测试：
    - `revive_undead / selectCard`
    - `revive_undead / selectPosition`
    - `fortress_power / vanish / telekinesis target / telekinesis direction` 的 option 匹配

## 验证结果

### 已通过

- `npm run typecheck`
  - 通过

- `npx eslint src/games/summonerwars/Board.tsx src/games/summonerwars/ui/useCellInteraction.ts src/games/summonerwars/ui/useEventCardModes.ts src/games/summonerwars/ui/systemInteractionAdapter.ts src/games/summonerwars/__tests__/useGameEvents.test.ts`
  - 通过

- `npx vitest run src/games/summonerwars/__tests__/useGameEvents.test.ts`
  - 通过（`8 passed`）

- `npx vitest run src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts`
  - 通过（文件内 `86 passed`）
  - 备注：输出里仍有若干旧的 `SYS_INTERACTION_RESPOND` / `ice_ram` 相关 stderr 日志，但本轮没有新增失败断言；这是仓库现存测试噪声，不是本次改动新引入的红灯。

### E2E 结果

- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 BG_BYPASS_GLOBAL_HEAVY_BUDGET=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts "神出鬼没：与0费友方单位交换位置" --reporter=list`
  - 通过（`1 passed`）
  - 关键截图：
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-target-selection-ready.png`
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-goblin-abilities.e2e\神出鬼没：与0费友方单位交换位置\神出鬼没：与0费友方单位交换位置-vanish-swap-complete.png`

- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 BG_BYPASS_GLOBAL_HEAVY_BUDGET=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "主动技能：复活死灵 UI 流程" --reporter=list`
  - 通过（`1 passed`）
  - 本轮未额外补抓新截图；该条主要用于确认 `selectCard -> selectPosition` 系统桥接没有被统一收敛回归打断。

- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 BG_BYPASS_GLOBAL_HEAVY_BUDGET=1 npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-trickster-abilities.e2e.ts "念力代替攻击：选中单位后使用按钮推拉目标" --reporter=list`
  - 通过（`1 passed`）
  - 这条在本轮中途真实暴露了两个 telekinesis 同类残留：
    1. `selectUnit` 第一步 option 实际是 `after_attack_telekinesis_target`，而不是通用的 `activated_ability_target`
    2. `selectDirection` 第二步终点实际编码在 `option.id=pos:x,y`，而不是 `value.targetPosition`
  - 关键截图：
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\念力代替攻击：选中单位后使用按钮推拉目标\念力代替攻击：选中单位后使用按钮推拉目标-telekinesis-instead-direction-choice.png`
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-trickster-abilities.e2e\念力代替攻击：选中单位后使用按钮推拉目标\念力代替攻击：选中单位后使用按钮推拉目标-telekinesis-instead-push-resolved.png`

## 残留风险

- `summonerwars` 当前这批 `activated_ability_target` UI 残留已经集中收口，但仓库里仍存在全局 E2E runtime 争用与 CPU 预算竞争；本轮已通过显式绕过预算 + 手动清理残留 runtime 完成验证，后续批量补跑仍建议串行执行。
- architect 子代理本轮已派出，但未在可接受时间内返回结果，最终未拿到有效的外部 sign-off；当前结论以本地静态验证 + 定向测试为准。
