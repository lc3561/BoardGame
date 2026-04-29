# SmashUp 反馈批次修复证据（2026-04-24）

## 范围

- 69b02e9936c755b464b0f504（巫师学院“回合结束就计分/重复换基地”）
- 69b0ebbe57a311c84a8fd590（“20分基地未达标却计分”）
- 69b0274836c755b464b0f4ba（雄蜂/实验工坊加成触发疑问）
- 69a595a4bd494244e5a2a00f（本地人在伦格高原打同名随从触发疑问）

## 本轮实现

- 在 `BASE_SCORED` 事件补充计分上下文字段：
  - `totalPower`
  - `baseBreakpoint`
  - `effectiveBreakpoint`
  - `scoredByLockedEligibility`
- 在 ActionLog 的“基地结算”日志补充：
  - `总力量/有效破坏点`（当有效破坏点与卡面不同，显示“原始破坏点”）
  - `锁定计分`提示（进入计分阶段已达标，后续窗口被移走/减力仍计分）

## 验证命令与结果

1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/actionLogFormat.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1`
   - 结果：`10 passed`
   - 覆盖新增断言：`BASE_SCORED` 显示 `总力量/有效破坏点` 与 `锁定计分`提示。

2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts src/games/smashup/__tests__/expansionBaseAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "base_plateau_of_leng|base_wizard_academy|base_laboratorium|base_haunted_house"`
   - 结果：`19 passed`
   - 覆盖规则点：
     - `base_plateau_of_leng`（伦格高原同名随从）
     - `base_wizard_academy`（巫师学院 afterScoring 链路）
     - `base_laboratorium`（实验工坊“本回合该基地首次随从”）
     - `base_haunted_house`（伊万斯堡城镇公墓相关计分链）

## 我实际看到的结论

- 69b0ebbe：结算“看似未达标”主要是可见性问题。有效破坏点可被持续效果下调（例如从 20 变为 18）；本轮已在日志中显式展示。
- 69b02e99：出现“后续仍计分”属于锁定计分规则（进入 `scoreBases` 时已达标即锁定），本轮已在日志显式标注，避免误判。
- 69b02748：实验工坊加成是“当前玩家回合内该基地首次随从+1”，并非每个后续随从都加；本轮对应规则回归用例通过。
- 69a595a4：伦格高原“同名随从追加打出”链路用例通过，本地人相关触发未复现回归。

## 涉及文件

- `src/games/smashup/domain/types.ts`
- `src/games/smashup/domain/index.ts`
- `src/games/smashup/actionLog.ts`
- `src/games/smashup/__tests__/actionLogFormat.test.ts`
- （镜像同步）`e2e/src/games/smashup/**` 对应同名文件
