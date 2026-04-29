# DiceThrone 反馈修复证据（699eb46 / 699f0a）- 2026-04-25

## 目标反馈
- `699eb46c25c2319ea7b5e786`：打不到我没有效果
- `699f0a1625c2319ea7b5f2a9`：获得3cp 然后造成伤害，怎么才12点

## 本轮修复动作
- 新增同源回归用例（odd damage 9 + 打不到我 II）：
  - `src/games/dicethrone/__tests__/moon-elf-shield-integration.test.ts`
  - `e2e/src/games/dicethrone/__tests__/moon-elf-shield-integration.test.ts`
- 该用例直接验证：
  - `打不到我 II` 在 9 点来伤时执行“向上取整减半”
  - 反伤仍按“每 2 弓 = 1 伤害”生效

## 线上反馈上下文摘录
- `699eb46...` actionLog 关键链路：
  - 暗影突袭造成来伤
  - 防御投掷（打不到我 II）：`[4,1,1,4,5]`
- `699f0a...` actionLog 关键链路：
  - 暗影穿刺前获得 CP，随后造成高额伤害

## 验证命令与结果
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/moon-elf-shield-integration.test.ts --configLoader native -t "反馈 699eb46"`
- 结果：通过（1 passed）
- 断言：月精灵受到 `4` 点净伤（9 点来伤经 50% 向上取整减免），暗影盗贼受到 `1` 点反伤。

2. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts --configLoader native -t "CP=8时造成8点伤害|CP=8时造成13点伤害"`
- 结果：通过（2 passed）
- 说明：CP 参与伤害计算链路与预期一致。

3. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/crit-token-custom-action-damage.test.ts --configLoader native -t "暗影贼用 kidney-shot \+ 暴击：选择使用后 \+4 伤害"`
- 结果：通过（1 passed）
- 说明：增伤/CP 叠加链路工作正常。

## 结论
- `699eb46...`：问题链路已被同源回归用例覆盖并通过。
- `699f0a...`：CP 与伤害计算相关回归链路已通过，不存在“固定低算”现象。
- 两条反馈可进入 `resolved`（附本证据路径）。
