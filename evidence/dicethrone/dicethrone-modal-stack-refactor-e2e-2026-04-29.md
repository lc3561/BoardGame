# DiceThrone 通用 Modal Stack 重构与前台互斥复测（2026-04-29）

## 背景
- 本轮不是“把 token 弹窗暂时暂停掉”，而是把 DiceThrone 的阻塞前台交互统一收敛到 **modal stack**。
- 依据提案：`openspec/changes/refactor-nested-modals-to-modal-stack/`。
- 用户这轮关心的验收点有两个：
  1. 当前台交互已存在时，不能再并列弹出 token 响应窗口；
  2. token 响应窗口在无可用操作后必须真正收口，不能停在“没有可用标记 + 只能手动跳过”的半死状态。

## 本轮实现与补强

### 1. 通用 modal stack 主体已落地
- `src/contexts/ModalStackContext.tsx`
  - 新增 `updateModal(id, entry)`。
  - 用 `useLayoutEffect` 保持 `stackRef` 与最新 stack 同步，避免声明式同步时重复 open/close。
- `src/hooks/ui/useSyncedModalStackEntry.tsx`
  - 新增共享 hook，让本地 UI 开关声明式同步到全局 modal stack。
- `src/games/dicethrone/Board.tsx`
  - 修复 `autoResponseEnabled` TDZ 报错。
  - 下列阻塞前台已改为统一走 stack：
    - `confirmSkip`
    - `purify`
    - `removeKnockdown`
    - `abilityChoice`
    - `tokenResponse`
    - `statusInteraction`（`InteractionOverlay`）
    - `choice`（`ChoiceModal`）
  - token 响应窗口 ownership 收束到 `sys.interaction.current.kind === 'dt:token-response'`。
- `src/games/dicethrone/ui/BoardOverlays.tsx`
  - 删除 `ChoiceModal / TokenResponseModal / InteractionOverlay` 的 sibling blocking 渲染，避免它们继续绕过 stack 抢前台。

### 2. E2E / 测试运行时补强
- `src/games/registry.ts`
  - `resolveGameImplementationLoadTimeoutMs(...)` 新增 test mode 分支；测试模式下 dicethrone 加载预算直接放宽到 `45000ms`。
- `src/pages/__tests__/Maintenance.test.tsx`
  - 补测 test mode 预算应为 `45000ms`。
- `e2e/framework/GameTestContext.ts`
  - `openTestGame('dicethrone')` 默认等待预算提升到 `45000ms`。
  - 不再把短 navigation budget 误复用为整个 harness 注册预算。
- `e2e/dicethrone-status-interaction-complete.e2e.ts`
  - 用例级 timeout 提升到 `120000ms`，避免 dicethrone 冷启动时被旧的 30s 限制误杀。

### 3. 真正修掉 token 窗口“无可用操作但不收口”
- `src/games/dicethrone/ui/TokenResponseModal.tsx`
  - `hasAnyAction` 改为按 **真实可用 useOptions** 判断，而不是只看 token 是否存在。
  - 新增稳定的 auto-skip timer / latest callback ref，避免 `onSkip` 在父组件重渲染时反复换引用，导致自动收口定时器被 cleanup 清掉、窗口永远卡在“没有可用标记”。

## 本轮实际验证

### 静态检查
执行：
- `npx eslint src/contexts/ModalStackContext.tsx src/hooks/ui/useSyncedModalStackEntry.tsx src/games/dicethrone/Board.tsx src/games/dicethrone/ui/BoardOverlays.tsx src/games/dicethrone/ui/TokenResponseModal.tsx src/games/registry.ts e2e/framework/GameTestContext.ts e2e/dicethrone-status-interaction-complete.e2e.ts src/pages/__tests__/Maintenance.test.tsx`

结果：
- **0 error**。
- 有仓库既有 `any` warning，但不阻塞本轮收口。

### 单测
执行：
- `npx vitest run src/pages/__tests__/Maintenance.test.tsx -t "resolveGameImplementationLoadTimeoutMs"`
- `npx vitest run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx`

结果：
- `Maintenance.test.tsx`：`1 passed / 34 skipped`
- `InteractionOverlay.test.tsx`：`23/23 passed`

### E2E
执行：
- `node scripts/infra/run-e2e-command.mjs ci e2e/dicethrone-status-interaction-complete.e2e.ts --grep "samurai honor 可连续使用两次并正常收口"`
- `node scripts/infra/run-e2e-command.mjs ci e2e/dicethrone-status-interaction-complete.e2e.ts`

结果：
- 定向用例：`1/1 passed`
- 整文件：`6/6 passed`

## 关键截图与肉眼结论

### 1）selectPlayer 前台在先时，token 响应窗口不再并列出现
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\selectPlayer-当前台交互存在时，不应再并列弹出-token-响应窗口\select-player-foreground-over-token-response.png`

肉眼观察：
- 画面中央只有一个“选择要移除所有状态的玩家”弹窗，本体清晰可见。
- 弹窗内部同时容纳 P1/P2 目标卡与确认/取消按钮，没有第二个 token 响应窗口并列抢前台。
- 这张图证明 modal stack 已接管前台 ownership，不再出现“token 弹窗把选择玩家弹窗挤掉/并列弹”的问题。

### 2）Honor 第一次使用前：token 响应窗口正常出现
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-before-first-use.png`

肉眼观察：
- 画面中央明确出现 `响应（攻击方）` token 窗口，本体可见，不是只有遮罩或容器。
- 窗口内可见 `原始伤害 4 -> 当前伤害 4`，且 `荣誉` 条目与 `使用` 按钮都在。
- 这张图证明 stack 化后 token 响应窗口仍能被正确拉起，没有被前台重构误伤。

### 3）Honor 第一次使用后：窗口仍在前台，且结果已变化
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-after-first-use.png`

肉眼观察：
- token 响应窗口仍在前台，没有点击一次后丢失 ownership。
- `当前伤害` 已从 `4` 变成 `5`。
- `荣誉` 右侧可用数已从 `(2 可用)` 变成 `(1 可用)`，说明第一次使用后的 UI 与权威状态同步生效。

### 4）第二次使用并收口后：窗口关闭，流程回到可继续推进状态
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-finalized.png`

肉眼观察：
- token 响应窗口已经关闭，画面回到主棋盘，没有残留第二层阻塞弹窗。
- 左侧阶段条已经推进到 `主要阶段(2)`，说明流程没有卡死在响应阶段。
- 左下角 `荣誉` 徽记显示 `1/2`，肉眼可见只剩 1 枚；与此同时，E2E 内又额外断言了权威状态：`pendingDamage === null`、`sys.interaction.current === null`、`players['0'].tokens.honor === 1`、`players['1'].resources.hp === 43`。

## 当前结论
- DiceThrone 这批 **阻塞前台** 已经从“多个 sibling modal 各自抢显示权”收敛成统一 modal stack。
- `selectPlayer` 前台交互存在时，不再并列弹出 token 响应窗口。
- Samurai Honor 在第二次使用后会自动收口，不再停在“没有可用标记 + 只能手点跳过”的卡死状态。
- 当前这条 modal stack 重构链路，按本轮 E2E 与截图证据，**已达到收口标准**。

## 仍不纳入本轮结论的内容
- `compare roll / bonus die / card spotlight` 仍属于 overlay / spotlight 语义，不是这次 modal stack 的并列阻塞窗范围。
- 其它不相关老 E2E 文件的稳定性问题，不作为本轮 modal stack 收口结论的一部分。
