# DiceThrone Monk 太极可用量反馈修复证据

## 反馈范围
- 反馈 ID：`69b965477315ab3a43c33f36`
  - 反馈内容：`6点满太极，获得两点，结果只能用4点，是不是被获得的污染了`
- 反馈 ID：`69b963af7315ab3a43c33f19`
  - 反馈内容：`有旧太极但无法使用，检查判断逻辑`

## 线上日志与现象
### 69b965477315ab3a43c33f36
- 生产 Mongo 记录显示，僧侣在历史链路里曾出现：满太极后仍被当作“本回合新增太极污染”，导致攻击方增伤窗口里只能继续使用 `4` 点太极，而不是旧有的 `6` 点。
- 该问题不只是日志展示，UI 里的 Token 响应弹窗本来就基于 `total - taijiGainedThisTurn` 自己单算可用量；一旦追踪字段残留或污染，前端会直接把可用太极压少。

### 69b963af7315ab3a43c33f19
- 生产 Mongo 记录显示，用户明确反馈“有旧太极但无法使用”。
- 日志快照里曾保留 `taijiGainedThisTurn`，而旧实现的 UI 层和命令校验层没有共享同一套“可用太极数量”计算，存在把历史旧太极也扣进“本回合新增不可用”里的风险。

## 根因
根因不是太极 token 本身的减伤/增伤效果错误，而是“攻击方本回合新增太极不可用于本回合增伤”这条规则被分散实现了：
1. 领域层 `getUsableTokensForTiming` 只做了布尔级别的“能不能用”判断，没有输出统一的“还能用几层”。
2. UI `Board.tsx` 又单独用 `total - taijiGainedThisTurn` 推导可用量，形成第二套口径。
3. `USE_TOKEN` 校验层没有复用统一的“可用数量”计算，只在命令进入时按当前 token 总量和窗口上限校验。

结果是：
- 满太极后新增但实际未增加成功时，容易出现“污染后被少扣可用量”的怀疑。
- 旧太极跨阶段/跨回合恢复可用时，UI 与校验层可能不同步，用户会看到“明明有旧太极但不能用”。

## 修复点
本次把“指定响应时机下某个 token 还能用几层”统一收敛到领域层：
- 新增 `getUsableTokenAmountForTiming(...)`
- 统一被以下位置复用：
  - `domain/tokenResponse.ts`：作为 token 可见性的单一来源
  - `domain/commandValidation.ts`：作为 `USE_TOKEN` 数量校验来源
  - `Board.tsx`：作为 Token 响应弹窗里的数量展示/按钮可用量来源
- 同步更新 `e2e/src` 镜像实现，避免测试镜像与主实现偏离

## 测试补充
本次没有新建测试文件，只补现有 `boundaryEdgeCases.test.ts`：
1. `太极满值时再次获得不会污染本回合可增伤数量`
   - 补成带 `pendingDamage(beforeDamageDealt)` 的真实反馈场景
   - 断言满太极溢出获得后 `taijiGainedThisTurn` 不会错误增加
   - 断言攻击方窗口里太极可用数量仍是 `6`
2. `TURN_CHANGED 后旧太极应恢复为全量可用于加伤`
   - 先构造 `taijiGainedThisTurn = 2` 的旧追踪态
   - 断言当前窗口仅可用 `4`
   - 再触发 `TURN_CHANGED`
   - 断言追踪被清空，旧太极恢复为可用 `6`

这两条测试分别覆盖了两条反馈：
- `69b965477315ab3a43c33f36`：满太极后新增不应污染可用量
- `69b963af7315ab3a43c33f19`：回合切换后旧太极必须恢复可用

## 验证命令与结果
1. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native --maxWorkers 1`
   - 结果：`34 tests passed`
2. `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-response-window.test.ts --configLoader native --maxWorkers 1`
   - 结果：`8 tests passed`
3. `npm run typecheck`
   - 结果：通过（`tsc --noEmit`）

## 结论
- `69b965477315ab3a43c33f36`：已修。现在满太极后未实际增加成功的新增量不会再污染本回合可用太极数量。
- `69b963af7315ab3a43c33f19`：已修。旧太极的可用量判断已统一到领域层，回合切换后恢复为全量可用，不再依赖 UI 私算。
