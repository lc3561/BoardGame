# DiceThrone 反馈 69a6dc6484ff8ed02e45adeb 修复证据

## 反馈信息
- 反馈 ID：`69a6dc6484ff8ed02e45adeb`
- 游戏：`dicethrone`
- 描述：`骑士可以自己无限加cp`
- 线上状态：`in_progress`
- 创建时间：`2026-03-03T13:04:36.108Z`

## Mongo 定位结果
线上反馈记录仅包含基础字段，没有附带 `actionLog`、`stateSnapshot`、`clientContext`、`errorContext` 等可直接回放的上下文。
本次根因定位因此依赖两部分：
1. 本地审查圣骑士 `Vengeance II` 结算链路。
2. 修正并运行对应的专项测试，确认真实链路只结算一次 CP。

## 运行时链路核对
### 当前实现中的真实 `Vengeance II` 链路
- 升级后基础技能 `vengeance` 会被替换成 `VENGEANCE_2`。
- `3 Helm + 1 Pray` 命中的真实可选技能 id 是 `vengeance-2-main`，不是 `vengeance`。
- 该技能先在 `preDefense` 阶段发出 `INTERACTION_REQUESTED`，因此不是点技能瞬间直接完成结算。
- 正确命令链路是：
  1. `SELECT_ABILITY('vengeance-2-main')`
  2. `ADVANCE_PHASE`
  3. `RESOLVE_INTERACTION({ selectedPlayerIds: ['0'] })`
- 当前运行时按这条真实链路执行时，只会结算一次 `+4 CP`；交互完成后再次执行会命中 `no_pending_interaction`，没有复现“无限加 CP”。

## 原测试为什么是假覆盖
原 `paladin-vengeance-2-cp.test.ts` 存在三处关键偏差：
1. 没有真正把圣骑士技能升级到 `VENGEANCE_2`。
2. 错把升级后的技能 id 当成 `vengeance`，没有走真实的 `vengeance-2-main` 变体。
3. 错把交互结算时机写成“选技能后立刻 `RESOLVE_INTERACTION`”，跳过了真实的 `ADVANCE_PHASE -> preDefense -> INTERACTION_REQUESTED` 链路。

这会造成一个问题：测试看起来在覆盖“复仇 II”，实际上没有覆盖线上反馈所对应的真实升级路径。

## 本次修复
### 代码改动
只改了本反馈范围内的测试与镜像：
- `src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts`
- `e2e/src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts`

### 修复点
1. 新增 `createVengeance2Setup(startingCp)`：
   - 显式克隆 `player.abilities`，避免测试把角色静态配置污染到后续用例。
   - 将 `vengeance` 替换为 `structuredClone(VENGEANCE_2)`。
   - 设置 `abilityLevels['vengeance'] = 2`。
2. 把“复仇 II 获得 4 CP”改成真实覆盖：
   - 使用 `SELECT_ABILITY('vengeance-2-main')`
   - 使用 `ADVANCE_PHASE` 触发交互
   - 再使用 `RESOLVE_INTERACTION`
3. 补强断言：
   - 对正常路径显式断言 `actualErrors` 为空。
   - 对重复点击路径分别断言 `attack_already_initiated` 与 `no_pending_interaction`。
4. 同步 `e2e/src` 镜像文件，保持内容一致。

## 额外发现：测试污染
在全文件复跑时，原新增的升级测试会污染后续基础版测试，表现为基础版 `vengeance` 被错误替换成升级版，从而出现 `ability_not_available`。

根因是测试 setup 直接改写了玩家的 `abilities` 引用，可能命中角色静态配置共享引用。为此本次在 `createVengeance2Setup` 里先执行：

```ts
player.abilities = player.abilities.map((ability) => structuredClone(ability));
```

这样升级版测试不再串改后续基础版用例，专项测试可稳定顺序通过。

## 验证命令与结果
### 通过
1. `npm run i18n:check`
   - 结果：`i18n-check: no missing keys detected.`
2. `npm run typecheck`
   - 结果：`tsc --noEmit` 通过。
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/paladin-vengeance-2-cp.test.ts --configLoader native --maxWorkers 1`
   - 结果：`1 file, 5 tests passed`

### 排查过程中的中间现象
- 在未补 `player.abilities` 深拷贝前，全文件 vitest 曾出现 1 个失败：
  - 用例：`复仇 I - 接近上限时只应钳制到 CP_MAX，不应异常回满/溢出`
  - 现象：`SELECT_ABILITY('vengeance')` 命中 `ability_not_available`
- 单测单独跑该用例可以通过，说明问题不是运行时逻辑，而是测试顺序污染。
- 补上深拷贝后，全文件复跑稳定通过。

## E2E / 截图
- 本次未新增或执行 E2E。
- 因此没有关键截图路径。

## 结论
当前仓库代码下，圣骑士 `Vengeance II` 真实升级链路没有复现“自己无限加 CP”；本次修复的是这条线上反馈对应的假覆盖测试与测试污染问题，确保后续不会再把未覆盖真实链路误判成“已修复”。
