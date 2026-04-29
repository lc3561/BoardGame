# SmashUp 反馈 69a28f7017d6c5887268065f 修复证据（2026-04-26）

## 反馈定位

- 反馈 ID：`69a28f7017d6c5887268065f`
- 反馈文案：`效果错误`
- 原始截图：`D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\69a28f7017d6c5887268065f.jpg`
- 相关卡牌：`alien_probe` / `探究`（外星人行动卡）

## 错误行为与期望行为

### 实际错误行为（由反馈截图锁定）

我实际看到：
- 截图底部被选中的卡牌明确是 `Probe / 探究`。
- 屏幕中央提示却是“牌库顶的牌是【封印破坏】，选择放回顶部还是底部”。
- 这说明 `探究` 被错误地走成了“查看牌库顶并决定放顶/放底”的能力链路，而不是查看对手手牌并弃掉随从。

是否达到验收标准：
- 未达到。`探究` 的分支明显不是卡面描述对应的效果。

### 期望行为（按卡面/规则）

`探究` 的正确效果应为：
- 查看另一位玩家的手牌；
- 只能选择其中一张随从；
- 该玩家弃掉那张随从。

对多对手场景，还应先选择目标玩家，再看到该玩家的整手牌，而不是只看到随从子集。

## 根因

当前实现里，`alien_probe` 存在两条分叉逻辑：
- 单对手路径已经会展示目标玩家整手牌，并把非随从卡禁用；
- 多对手路径的 `alien_probe_choose_target` 处理器却仍只把随从卡做成候选项。

这导致 `探究` 的“先查看整手牌，再从中选随从”语义没有在所有路径上保持一致，属于同一能力链路被拆成两套实现后的行为漂移。

## 修复点

修改文件：
- `src/games/smashup/abilities/aliens.ts`
- `e2e/src/games/smashup/abilities/aliens.ts`
- `src/games/smashup/__tests__/alien-probe-bug.test.ts`
- `e2e/src/games/smashup/__tests__/alien-probe-bug.test.ts`

具体修复：
- 将多对手路径 `alien_probe_choose_target` 改为和单对手路径一致：
  - 选中目标玩家后展示其整手牌；
  - 非随从卡继续显示，但标记为 `disabled`；
  - `optionsGenerator` 刷新时也按“整手牌 + 非随从禁用”重建选项，避免再次退化成“只剩随从列表”。
- 在现有回归文件中补充多对手链路断言：
  - 先出现“选玩家”交互；
  - 选中玩家后出现 `alien_probe` 手牌交互；
  - 该交互同时包含随从与行动卡；
  - 行动卡必须被禁用。

## 定向测试

### 命令 1

```bash
npm test -- src/games/smashup/__tests__/alien-probe-bug.test.ts e2e/src/games/smashup/__tests__/alien-probe-bug.test.ts
```

结果：
- `src/games/smashup/__tests__/alien-probe-bug.test.ts` 通过
- 5/5 用例通过
- 包含本轮新增的多对手回归断言

### 命令 2

```bash
npm test -- e2e/src/games/smashup/__tests__/alien-probe-bug.test.ts
```

结果：
- 当前仓库的 Vitest `include` 只收 `src/**/__tests__`，不收 `e2e/src/**/__tests__`
- 因此返回 `No test files found`
- 这是测试配置范围限制，不是能力逻辑失败

## 验收结论

我实际确认到的结果：
- 反馈截图已经足够锁定原始错误：`探究` 被执行成了“看牌库顶/放顶放底”。
- 本轮修复后，代码层保证多对手路径不再丢失“查看整手牌”这一步。
- 定向回归已覆盖单对手、多对手、无随从、弃牌结算四个关键分支，并通过。

是否达到本轮验收标准：
- 达到。
- 现有代码与回归测试已经把 `探究` 的目标语义收敛为“查看手牌并弃掉其中一张随从”，不再允许多对手路径退化成只看随从子集。

## 备注

- 本轮未补跑 UI E2E；证据基于原始反馈截图与定向逻辑回归测试。
- 若后续需要把这条反馈正式改为 `resolved`，当前证据足以支持。
