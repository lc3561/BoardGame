# Smash Up 反馈 69e9c39f 修复记录

## 基本信息

- 反馈 ID: `69e9c39fddc2605b331ed0a0`
- 模块: `smashup`
- 卡牌: `归来者 / Returned One`
- 记录日期: `2026-04-23`

## 是否复现

- 可复现。
- 复现场景 1: 只在手牌中保留 `归来者`，将其打到基地后，旧实现不会给出“埋葬自己”的可选项。
- 复现场景 2: 旧实现的交互描述是“你可以将一张力量 3 或以下的随从埋葬到此基地”，但候选集合只来自手牌低力量随从，和描述不一致。

## 根因

- `src/games/smashup/abilities/skeletons.ts` 中 `skeletonsReturnedOneOnPlay` 只调用 `getLowPowerHandCards(...)` 生成候选。
- 同函数创建交互时把选项源固定为手牌，`handleSkeletonsReturnedOne` 结算时也把 `buriedFrom` 固定写死为 `'hand'`。
- 结果是:
  - 已经进入场上的 `归来者` 自己从未进入可选目标集合。
  - 交互文案声称可埋葬“一个力量 3 或以下的随从”，但真实实现只能埋手牌里的别的随从。

## 修复点

1. 给 `归来者` 交互补入“当前打出的自己”这一项，标记 `buriedFrom: 'play'`。
2. 手牌候选保留原有能力，并显式附带 `buriedFrom: 'hand'`。
3. `handleSkeletonsReturnedOne` 改为按所选项的 `buriedFrom` 结算，不再硬编码为手牌来源。
4. 在现有测试文件 `newFactionAbilities.test.ts` 及 `e2e/src` 镜像中补回归:
   - 断言无其他目标时仍会出现 `归来者` 自身选项。
   - 断言选择自己后会从基地随从区移除，并进入同基地 `buriedCards`。

## 验证命令

1. `npm test -- src/games/smashup/__tests__/newFactionAbilities.test.ts -t "skeletons_returned_one"`
2. 镜像一致性校验:
   - `src/games/smashup/abilities/skeletons.ts` vs `e2e/src/games/smashup/abilities/skeletons.ts`
   - `src/games/smashup/__tests__/newFactionAbilities.test.ts` vs `e2e/src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 验证结果

- 命令 1: 通过。`src/games/smashup/__tests__/newFactionAbilities.test.ts` 全文件通过，包含新增 `skeletons_returned_one 在没有其他目标时也可埋葬自己` 回归。
- 说明: 仓库默认 vitest include 只覆盖 `src/**`，直接把 `e2e/src/**` 当测试入口执行会报 `No test files found`，因此镜像侧使用文件哈希校验一致性。
- 命令 2: 通过。两组镜像文件哈希一致。

## E2E / 截图

- 本次未跑 E2E。
- 关键截图绝对路径: 无。
- 原因: 问题位于 Smash Up 领域规则实现，现有单测已覆盖真实能力触发与埋葬结果，最小验证不需要额外 UI 链路。

## 结论

- 可回写 `resolved`。
- 理由: 已复现、已定位到具体实现缺口、已做最小增量修复、已补回归、`src/e2e` 镜像已校验一致。
