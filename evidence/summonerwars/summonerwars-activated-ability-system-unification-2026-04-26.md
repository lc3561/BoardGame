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
  - `findActivatedAbilityDirectionOptionByPosition()`：把念力二段方向选择从 `pos:x,y` 隐式字符串匹配收回到系统 option value

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
  - 念力二段方向选择在系统态不再依赖 `option.id === pos:x,y`，改为走 adapter 的方向 option 匹配。

### 回归测试补强

- `src/games/summonerwars/__tests__/useGameEvents.test.ts`
  - 新增 adapter 纯函数测试：
    - `revive_undead / selectCard`
    - `revive_undead / selectPosition`
    - `fortress_power / vanish / telekinesis direction` 的 option 匹配

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

### E2E 现状

- 目标命令：
  - `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-goblin-abilities.e2e.ts "神出鬼没：与0费友方单位交换位置"`

- 本轮未拿到可用于收口的新 E2E 结果，原因是环境门禁，不是代码断言失败：
  1. 第一次尝试被 `heavy-task-guard` 拒绝。
     - 当时同仓库已有重任务：
       - `e2e/smashup/smashup-image-loading.e2e.ts`
  2. 等待后第二次尝试又被 `global-heavy-budget` 拒绝。
     - 同时检测到另一条正在运行的 runtime：
       - `e2e/dicethrone-defense-selection.e2e.ts`
     - 直接报错：
       - `CPU 过高：100.0% >= 85%`

- 结论：
  - 本轮不能宣称“E2E 已通过”，因为真实环境没有给出新的可复查通行结果。
  - 旧的 `evidence/summonerwars/summonerwars-vanish-clickability-fix-2026-04-26.md` 仍可证明单点 vanish 在先前跑通过，但不能替代本轮“统一 adapter 收敛”的新验证。

## 残留风险

- `summonerwars` 当前这批 `activated_ability_target` UI 残留已经集中收口，但仓库里仍存在全局 E2E runtime 争用与 CPU 预算竞争；如果后续要补真正的端到端截图证据，必须等重任务预算空闲后再串行补跑。
- architect 子代理本轮已派出，但未在可接受时间内返回结果，最终未拿到有效的外部 sign-off；当前结论以本地静态验证 + 定向测试为准。
