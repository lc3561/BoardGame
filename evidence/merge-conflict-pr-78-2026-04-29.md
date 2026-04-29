# 冲突解决汇报：PR #78

## 1. 背景
- base: `7b8ccd5e`（本地 `main` 当前提交）
- head: `3febe8b6`（`deathcats4/codex/first-mate-afterscoring-fix`）
- 触发命令: `git merge --no-commit --no-ff deathcats4/codex/first-mate-afterscoring-fix`

## 2. 冲突文件
- `src/games/smashup/__tests__/newOngoingAbilities.test.ts`

## 3. 解决策略
### `src/games/smashup/__tests__/newOngoingAbilities.test.ts`
- 策略：保留双方内容，手工合并。
- 冲突块裁决：
  - 保留 PR 新增的回归测试“只会为当前计分基地上的大副创建触发，不会把其他基地上的大副一起加入队列”。
  - 保留主线后续新增的“已取得触发资格后，即使先被其他 afterScoring 效果移走，仍可继续结算自己的移动”测试。
  - 删除旧位置上的提前 `});`，让两条测试继续位于同一个 `describe('pirate_first_mate afterScoring')` 中。
- 原因：
  - 这不是语义互斥，而是 PR 基于旧文件位置插入测试；主线后来继续往同一 `describe` 追加了其他回归。
  - 若直接取单边，会丢掉另一侧已存在的有效测试覆盖。

## 4. 风险与验证
- 风险点：
  - `pirate_first_mate` 的 `afterScoring` 触发器是否只在当前计分基地收集实例。
  - 修复后是否破坏 `Temple of Goju` 与 `pirate_first_mate` 的链式结算。
  - 修复后是否影响现有 Smash Up smoke 链路。
- 验证命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newOngoingAbilities.test.ts src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
  - `npx tsc --noEmit`
  - `npx eslint src/ --ext .ts,.tsx`
- 验证结果：
  - `vitest`：通过，`3` 个文件、`260` 个测试全部通过。
  - `tsc`：通过。
  - `eslint`：无 error，存在仓库既有 warnings（本次改动未新增 lint error）。

## 5. 回归与行为变化登记
- 原 PR 目标问题：
  - 为 `pirate_first_mate` 补一条回归测试，锁定“只应响应当前计分基地”的行为。
- 本次额外发现的真实回归：
  - 当前主线实际未满足该行为，`pirate_first_mate` 的 `afterScoring` 注册缺少 `sourceScope: 'triggerBase'`，导致全场其他基地上的大副也会被收集进触发队列。
  - 已在合并过程中补修 `src/games/smashup/abilities/pirates.ts`。
- 仅业务口径 / 规则变化：
  - 无新增业务口径变化；本次是实现回归修复，不是规则改口。

## 6. 结果
- 提交：`ad8088455585453e54890d9e83671c74ac14ebe2`
- 推送：`origin/main`
