# 线上反馈 unknown 批次 - Dicethrone lane 验证（2026-04-24）

## 范围
- 本文仅覆盖以下 8 个 unknown -> Dicethrone 语义映射反馈：
  - `69b021ab36c755b464b0f49c`
  - `69b0211b36c755b464b0f49a`
  - `699efc4c25c2319ea7b5efce`
  - `699d9ebbc3c4e02a164a6dab`
  - `699f039025c2319ea7b5f0cf`
  - `699f098e25c2319ea7b5f281`
  - `69a153c5a0195987f1428595`
  - `69b175ff57a311c84a8fdd79`
- 执行约束：只核对 Dicethrone 相关实现/测试与证据，不做数据库写操作。

## 结论
- 本轮先按 `temp/feedback-closeout/unknown-open-mapping-2026-04-24.md` 跑映射测试。
- 首轮 8 条映射命令全部通过，但发现映射文档里的 `npm run test -- ... -t "..."` 在当前脚本下没有把 `-t` 传给 Vitest，实际跑成了整文件。
- 随后全部改用 `node scripts/infra/vitest-cli-safe.mjs run <file> -t "<case>" --configLoader native --maxWorkers 1` 做精确命中复核。
- 8 条精确命中用例全部通过；本轮未出现失败测试，因此无需新增 Dicethrone 实现/测试修复 diff。
- 判定：当前 `HEAD` 上这 8 条反馈对应的问题均可视为 **fixed**，建议回写 `resolved`；本轮无 `blocked`。

## 执行命令与结果摘要

### A. 映射文档原始命令（按要求优先执行）
1. `npm run test -- src/games/dicethrone/__tests__/crit-token-custom-action-damage.test.ts -t "暗影贼用 kidney-shot + 暴击：选择使用后 +4 伤害"`
   - 结果：`1 file passed / 6 tests passed`
   - 备注：`npm` 将 `-t` 识别为未知 cli config，实际跑了整文件。
2. `npm run test -- src/games/dicethrone/__tests__/bonus-damage-collection.test.ts -t "应该自动收集 pendingAttack.bonusDamage 并记录到 breakdown"`
   - 结果：`1 file passed / 6 tests passed`
   - 备注：同上，实际跑整文件。
3. `npm run test -- src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts -t "复仇 I - 接近上限时只应钳制到 CP_MAX，不应异常回满/溢出"`
   - 结果：`1 file passed / 5 tests passed`
   - 备注：同上，实际跑整文件。
4. `npm run test -- src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts -t "CP=8时造成13点伤害"`
   - 结果：`1 file passed / 47 tests passed`
   - 备注：同上，实际跑整文件。
5. `npm run test -- src/games/dicethrone/__tests__/bug-fixes-heal-and-burn.test.ts -t "rollDie conditionalEffects 中的 debuff 应该施加给对手"`
   - 结果：`1 file passed / 4 tests passed`
   - 备注：同上，实际跑整文件。
6. `npm run test -- src/games/dicethrone/__tests__/damage-tracking-regression.test.ts -t "ATTACK_RESOLVED 使用防御方净掉血而非未扣盾伤害"`
   - 结果：`1 file passed / 2 tests passed`
   - 备注：同上，实际跑整文件。
7. `npm run test -- src/games/dicethrone/__tests__/moon_elf-behavior.test.ts -t "足面≥2：授予50%减伤护盾（伤害计算时向上取整）"`
   - 结果：`1 file passed / 37 tests passed`
   - 备注：同上，实际跑整文件。
8. `npm run test -- src/games/dicethrone/__tests__/shadow-thief-abilities.test.ts -t "伏击 Token 端到端：攻击 → Token响应窗口 → 使用伏击 → 掷骰加伤 → 伤害结算"`
   - 结果：`1 file passed / 47 tests passed`
   - 备注：同上，实际跑整文件。

### B. 精确命中复核命令
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/crit-token-custom-action-damage.test.ts -t "选择使用后" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 5 skipped`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/bonus-damage-collection.test.ts -t "应该自动收集 pendingAttack.bonusDamage 并记录到 breakdown" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 5 skipped`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts -t "复仇 I - 接近上限时只应钳制到 CP_MAX，不应异常回满/溢出" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 4 skipped`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts -t "CP=8时造成13点伤害" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 46 skipped`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/bug-fixes-heal-and-burn.test.ts -t "rollDie conditionalEffects 中的 debuff 应该施加给对手" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 3 skipped`
6. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/damage-tracking-regression.test.ts -t "ATTACK_RESOLVED 使用防御方净掉血而非未扣盾伤害" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 1 skipped`
7. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/moon_elf-behavior.test.ts -t "足面≥2：授予50%减伤护盾（伤害计算时向上取整）" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 36 skipped`
8. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/shadow-thief-abilities.test.ts -t "伏击 Token 端到端：攻击 → Token响应窗口 → 使用伏击 → 掷骰加伤 → 伤害结算" --configLoader native --maxWorkers 1`
   - 结果：`1 passed, 46 skipped`

## 逐 ID 判定

### `69b021ab36c755b464b0f49c`
- 反馈：`暴击是不是算了两次啊，有两个+4`
- 映射：暴击 token + custom action 伤害链路
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/crit-token-custom-action-damage.test.ts`
  - 精确命中通过：`暗影贼用 kidney-shot + 暴击：选择使用后 +4 伤害`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `69b0211b36c755b464b0f49a`
- 反馈：`有加四点伤害的描述，哪来的`
- 映射：`pendingAttack.bonusDamage` 自动收集与伤害 breakdown 展示
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/bonus-damage-collection.test.ts`
  - 精确命中通过：`应该自动收集 pendingAttack.bonusDamage 并记录到 breakdown`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `699efc4c25c2319ea7b5efce`
- 反馈：`dicethrone大顺子怎么获得cp后计算伤害怎么还加了4，检查一下`
- 映射：CP 接近上限时的钳制与伤害计算不应异常溢出
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts`
  - 精确命中通过：`复仇 I - 接近上限时只应钳制到 CP_MAX，不应异常回满/溢出`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `699d9ebbc3c4e02a164a6dab`
- 反馈：`暗影贼的大招计算伤害时会把超出cp上限的cp也加了`
- 映射：暗影贼高 CP 场景的最终伤害计算
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts`
  - 精确命中通过：`CP=8时造成13点伤害`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `699f039025c2319ea7b5f0cf`
- 反馈：`没出灼烧`
- 映射：条件效果中的 debuff/burn 应正确施加给对手
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/bug-fixes-heal-and-burn.test.ts`
  - 精确命中通过：`rollDie conditionalEffects 中的 debuff 应该施加给对手`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `699f098e25c2319ea7b5f281`
- 反馈：`波纹造成伤害但没有掉血`
- 映射：`ATTACK_RESOLVED` 应按防御方净掉血记账，而不是未扣盾前的伤害
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/damage-tracking-regression.test.ts`
  - 精确命中通过：`ATTACK_RESOLVED 使用防御方净掉血而非未扣盾伤害`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `69a153c5a0195987f1428595`
- 反馈：`月精灵防御不减半`
- 映射：月精灵防御足面达到阈值后应授予 50% 减伤护盾，且向上取整
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/moon_elf-behavior.test.ts`
  - 精确命中通过：`足面≥2：授予50%减伤护盾（伤害计算时向上取整）`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

### `69b175ff57a311c84a8fdd79`
- 反馈：`转移的伏击没增伤`
- 映射：伏击 Token 响应窗口内使用后，应经掷骰/增伤链路写入最终伤害
- 证据：
  - 首轮映射文件级通过：`src/games/dicethrone/__tests__/shadow-thief-abilities.test.ts`
  - 精确命中通过：`伏击 Token 端到端：攻击 → Token响应窗口 → 使用伏击 → 掷骰加伤 → 伤害结算`
- 判定：`fixed`
- 回写建议：可回写 `resolved`

## 可回写 / 阻塞清单
- 可回写 `resolved`：
  - `69b021ab36c755b464b0f49c`
  - `69b0211b36c755b464b0f49a`
  - `699efc4c25c2319ea7b5efce`
  - `699d9ebbc3c4e02a164a6dab`
  - `699f039025c2319ea7b5f0cf`
  - `699f098e25c2319ea7b5f281`
  - `69a153c5a0195987f1428595`
  - `69b175ff57a311c84a8fdd79`
- 不能回写的 `blocked`：无

## 备注
- 本轮未修改 Dicethrone 实现/测试代码，因为按用户指定优先级执行后，映射测试与精确命中复核均未暴露失败点。
- 当前根工作区存在其他开发者的非 Dicethrone 改动；本轮未触碰。
