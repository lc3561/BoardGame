# DiceThrone 调试发牌补牌 E2E 证据

## 范围

- 文件：`e2e/dicethrone-debug-panel-test.e2e.ts`
- 用例：`seat1 调试发牌命中剩余牌库后，仍可继续补同 atlas 到手牌`
- 目标：验证 `dicethrone` 调试面板不再受“当前剩余牌库”限制；同一张 atlas 发到手牌后，仍可继续补到手牌。

## 本轮结论

- 现在的调试工具有两条链路：
  - 目标卡仍在剩余牌库：优先从 `deck -> hand`
  - 目标卡已不在剩余牌库、但仍属于当前角色全卡池：直接补 1 张到 `hand`
- 因此不会再出现“这张牌真实存在，但因为当前不在剩余牌库所以发不了”的情况。

## 代码落点

- `src/engine/systems/CheatSystem.ts`
  - 已接入 `SYS_CHEAT_ADD_CARD_TO_HAND_BY_CARD_ID`
- `src/games/dicethrone/domain/cheatModifier.ts`
  - 新增 `addCardToHandByCardId`
  - `dealCardByAtlasIndex` 在剩余牌库无唯一命中时，会回退到角色完整卡池补牌
- `src/games/dicethrone/debug-config.tsx`
  - 发牌面板改为“优先发牌，不在牌库时补牌”
  - 速查表改为“角色全卡池速查”，不再只列剩余牌库
- `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`
  - 补充“不在剩余牌库仍可补牌”的单测

## 验证结果

- `npm run typecheck`：通过
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native`：通过
- `npm run test:e2e:ci:file -- e2e/dicethrone-debug-panel-test.e2e.ts`：通过

## 场景与观察

场景：

- 游戏：`dicethrone`
- `player0 = barbarian`
- `player1 = paladin`
- 阶段：`main1`
- 调试面板目标 seat：`1`

这次 E2E 自动选中的唯一 atlas 卡：

- `card-gods-grace`
- `atlasIndex = 11`

观察 1：第一次点击时，面板显示“牌库中存在”

- 说明这次先走的是正常 `deck -> hand`
- 发牌后：
  - `deckLength` 减 1
  - `handLength` 加 1
  - 目标卡在 `deck` 中计数变为 `0`
  - 目标卡在 `hand` 中计数变为 `1`

观察 2：再次输入同一个 atlas 后，面板不再禁用

- 面板文案变为：`当前不在剩余牌库，可直接补到手牌`
- 主按钮保持可点击
- 说明此时已经从“发牌”语义切到“补牌”语义，而不是报错或禁用

观察 3：第二次点击后，继续补到手牌

- 第二次点击后：
  - `deckLength` 保持不变
  - `handLength` 再加 1
  - 目标卡在 `hand` 中计数变为 `2`

这说明同一张 atlas 在离开剩余牌库后，仍能继续通过调试工具补牌。

## 截图

- 发牌前：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-debug-panel-test.e2e\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌-seat1-before-deal.png`
- 第一次发牌后，同 atlas 已不在剩余牌库，但按钮仍可补牌：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-debug-panel-test.e2e\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌-seat1-after-first-deal-can-add.png`
- 第二次点击后，已成功把同 atlas 再补 1 张到手牌：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-debug-panel-test.e2e\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌\seat1-调试发牌命中剩余牌库后，仍可继续补同-atlas-到手牌-seat1-after-second-deal-direct-add.png`

## 验收结论

- 这次问题已经不是“把提示文案改准确”。
- 实际行为已经改成：
  - 能从剩余牌库发，就正常发
  - 发过之后不在剩余牌库，也还能继续补
- 所以 `dicethrone` 调试工具在这条链路上，已经满足“谁都不可能出现发不了牌”的目标。
