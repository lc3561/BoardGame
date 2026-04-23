# SmashUp 反馈 69a797fe 修复记录

## 反馈信息

- 反馈 ID: `69a797feb832e79689a36ba4`
- 游戏: `smashup`
- 原始描述: `克苏鲁的随从这套牌中的腐化根本不能消灭其他随从`
- 来源导出:
  - `D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\query-human-critical-inprogress-details-20260422-231244.raw.txt`
  - `D:\gongzuo\webgame\BoardGame\temp\feedback-closeout\query-human-critical-inprogress-short-20260422-231315.raw.txt`

## 线上证据

- 反馈详情导出里能定位到该条反馈的 `stateSnapshot` 与 `actionLog`。
- `stateSnapshot.sys.eventStream.entries` 已记录一次 `cthulhu_corruption` 的实际触发链：
  - 先出现 `su:action_played`
  - 然后出现 `su:madness_drawn`
  - 随后出现 `SYS_INTERACTION_CANCELLED`
- 被取消的 `interactionData.options` 中同时存在敌方与己方随从目标，说明服务端已经成功创建了“选择要消灭的随从”交互，不是“后端没出目标”。

## 根因判断

- 这条线上问题更像是 `cthulhu_corruption` 依赖 SmashUp 棋盘上的 `targetType: 'minion'` 直点交互。
- 服务端会正确产出敌方目标，但实际流程最后停在 `SYS_INTERACTION_CANCELLED`，说明用户没有完成有效选中并提交。
- 因为这张牌的业务语义只是“从候选随从中选 1 个并消灭”，不必强依赖棋盘直点，所以把它继续绑在板面点选上会放大现有 UI 交互链的不稳定性。

## 修复方案

### 代码改动

- 将 `cthulhu_corruption` 的目标选择从棋盘直点改为通用弹窗选择：
  - `targetType: 'minion'` -> `targetType: 'generic'`
- 给目标选项补 `displayMode: 'card'`，让弹窗直接展示随从卡面，避免退化成纯文本列表。
- 给交互补充：
  - `autoRefresh: 'field'`
  - `responseValidationMode: 'live'`

### 影响

- `腐化` 不再依赖用户去点棋盘上的敌方随从，改为在弹窗里直接选目标，规避线上“敌方随从无法完成选择”的路径。
- 如果目标在交互期间离场，`field/live` 会按最新场面校验，避免旧快照误选。

## 改动文件

- `src/games/smashup/abilities/cthulhu.ts`
- `e2e/src/games/smashup/abilities/cthulhu.ts`
- `src/games/smashup/__tests__/madnessAbilities.test.ts`
- `e2e/src/games/smashup/__tests__/madnessAbilities.test.ts`

## 验证

### 已执行

1. `npm run i18n:check`
   - 结果: 通过
2. `npm run typecheck`
   - 结果: 通过
3. `npx vitest run src/games/smashup/__tests__/madnessAbilities.test.ts -t "cthulhu_corruption"`
   - 结果: 通过
   - 验证点:
     - `cthulhu_corruption` prompt 现在是 `targetType: 'generic'`
     - prompt 使用 `responseValidationMode: 'live'`
     - 目标选项使用 `displayMode: 'card'`
     - 响应目标后仍会产出 `MINION_DESTROYED`

### 未执行

- 未跑 E2E。
- 无截图产出。
- 尝试直接运行 `e2e/src/games/smashup/__tests__/madnessAbilities.test.ts` 时，当前根 vitest 配置不包含 `e2e/src/**`，因此返回 `No test files found`；本轮以源码侧用例 + `typecheck` 覆盖镜像同步风险。

## 残余风险

- 本次修复是针对 `腐化` 这张牌的目标选择路径做收敛，没有顺带改动 SmashUp 全局 `targetType: 'minion'` 棋盘直点机制。
- 如果其它牌也依赖相同的板面点敌方随从链路，仍可能存在同类 UX 风险，需要单独排查。
