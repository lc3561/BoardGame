# DiceThrone 四人 2v2 防御锁骰回归复测（2026-04-29）

## 背景
- 用户反馈：`dicethrone` 四人模式中，有一队在进入防御后“总是不能防御，进去后 6 个锁定的骰子”。
- 本轮重点不是泛泛验证四人 targeting，而是专门复测 `targetingRoll -> defensiveRoll` 这条链路在唯一防御技能自动选中后，是否还会把防御骰重新锁死。

## 本轮实现
- `src/games/dicethrone/domain/flowHooks.ts`
  - 不再在 `targetingRoll` 退出时提前塞自动防御技事件。
  - 改为在进入 `defensiveRoll` 时，根据已应用 `exitEvents` 后的状态自动选择唯一防御技，避免被后续 `SYS_PHASE_CHANGED` 重置成全锁骰。
- `src/games/dicethrone/domain/reducer.ts`
  - 同一防御技重复选择时，仅在已经投过骰后才 early return。
  - 允许“已卡坏成全锁骰”的旧状态，通过再次点同一防御技恢复 `rollDiceCount` 和解锁状态。
- `src/games/dicethrone/__tests__/flow.test.ts`
  - 补了 4 人进入 `defensiveRoll` 时不应全锁骰的领域回归。
  - 补了“已卡坏后再次选择同一防御技可恢复”的回归。
- `e2e/dicethrone/dicethrone-simple-start.e2e.ts`
  - 在现有四人在线 targeting 用例中，新增 defender 视角校验：
    - 自动选中唯一防御技；
    - `rollDiceCount === 3`；
    - 前 3 颗未锁、后 2 颗锁定；
    - 关闭“开始防御”特写后，防御投掷按钮可用。

## 验证
### 领域测试
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts --configLoader native --maxWorkers 1`
- 结果：`115/115 passed`

### E2E
- `BG_ALLOW_HEAVY_TASK_CONCURRENCY=1 node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-simple-start.e2e.ts "Online 4-player targeting roll: auto targets and choice owners stay correct in 2v2"`
- 结果：`1/1 passed`

## 截图观察
### 1) 圣骑视角：进入 defensiveRoll 后不再出现“全锁骰”
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-targeting-roll-auto-targets-and-choice-owners-stay-correct-in-2v2\04-four-player-paladin-defense-unlocked.png`

肉眼观察：
- 画面已经进入真实防御掷骰界面，不是停留在“开始防御”提示层。
- 前 3 颗骰子没有锁定遮罩，后 2 颗带有锁定文案，符合 `holy-defense` 的 3 骰防御语义，不再是“进去后整排都锁住”。
- 防御投掷按钮可用，达到本轮“这一队不再无法防御”的验收标准。

### 2) 野蛮人视角：另一侧队伍进入 defensiveRoll 后也保持 3 骰可防御
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-simple-start.e2e\Online-4-player-targeting-roll-auto-targets-and-choice-owners-stay-correct-in-2v2\05-four-player-barbarian-defense-unlocked.png`

肉眼观察：
- 画面同样处于真实防御掷骰界面，未被前台提示层卡住。
- 前 3 颗骰子可用于防御投掷，后 2 颗保留锁定，符合 `thick-skin` 的 3 骰防御配置。
- 这张图说明问题不是只修好某一个目标方向，而是 4 人 2v2 两个自动选中防御方都不再退化成全锁骰。

## 结论
- 本轮问题的根因是四人 `targetingRoll -> defensiveRoll` 链路里，自动防御技事件触发得太早，后续阶段切换把防御骰配置覆盖掉了。
- 修复后，四人模式进入 `defensiveRoll` 时会正确保留唯一防御技对应的 3 颗可投骰子，旧的“全锁骰导致不能防御”回归已在领域测试和真实界面 E2E 中复现并验证修复。
