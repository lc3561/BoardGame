# DiceThrone 弹窗栈重构与 Token 响应前台复测（2026-04-29）

## 背景
- 本轮目标不是“暂停 token 弹窗”止血，而是把 DiceThrone 的阻塞前台语义收敛到统一来源。
- 依据现有 OpenSpec：`openspec/changes/refactor-nested-modals-to-modal-stack/`。
- 这次把本地业务 modal 改成统一走全局 modal stack，同时把 token 响应窗口的显示条件收敛到 `sys.interaction.current.kind === 'dt:token-response'`。

## 本轮实现范围
- `src/contexts/ModalStackContext.tsx`
  - 新增 `updateModal(id, entry)`。
  - 用 `useLayoutEffect` 同步 `stackRef`，避免声明式同步 modal 时重复 open。
- `src/hooks/ui/useSyncedModalStackEntry.tsx`
  - 新增共享 hook，用于把本地开关状态同步到全局 modal stack。
- `src/games/dicethrone/Board.tsx`
  - 修复 `autoResponseEnabled` 在声明前被引用导致的 TDZ 报错。
  - `confirmSkip / purify / removeKnockdown / abilityChoice` 全部改成走 modal stack。
  - 新增 `isTokenResponseInteraction`，token 响应前台只认 `dt:token-response`。
- `src/games/dicethrone/ui/BoardOverlays.tsx`
  - 删除 confirm / purify / removeKnockdown 的 sibling modal 渲染。
  - TokenResponseModal 的显示条件改为“token 前台交互存在 + pendingDamage 存在 + 当前玩家是 responder”。
- `src/games/dicethrone/ui/TokenResponseModal.tsx`
  - 新增 `data-testid="token-response-modal"` 供 E2E 直接验证。
- `src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx`
  - 补了 `useSyncedModalStackEntry` 的更新/关闭同步测试。
- `e2e/dicethrone-status-interaction-complete.e2e.ts`
  - 新增 `samurai honor` 成功链路 E2E。
  - 保留并复测“selectPlayer 前台时不能并列弹 token 响应窗口”的前台互斥 E2E。

## 验证结果
### 静态检查
- `npx eslint src/contexts/ModalStackContext.tsx src/hooks/ui/useSyncedModalStackEntry.tsx src/games/dicethrone/Board.tsx src/games/dicethrone/ui/BoardOverlays.tsx src/games/dicethrone/ui/TokenResponseModal.tsx src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx e2e/dicethrone-status-interaction-complete.e2e.ts e2e/dicethrone-watch-out-spotlight.e2e.ts`
- 结果：0 error，只有仓库既有 warning。

### 单测
- `npx vitest run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx`
- 结果：23/23 通过。

### E2E
执行：
- `node scripts/infra/run-e2e-command.mjs ci e2e/dicethrone-status-interaction-complete.e2e.ts`

结果：
- 最终重跑结果：`e2e/dicethrone-status-interaction-complete.e2e.ts` **6/6 全部通过**。
- 与本轮问题直接相关的关键用例：
  1. `selectPlayer 当前台交互存在时，不应再并列弹出 token 响应窗口`
  2. `token 响应窗口在前台时，samurai honor 可连续使用两次并正常收口`
- 顺手修正了同文件里一条旧断言：`interaction.noStatus` 的真实文案已变为“没有状态效果 / No status effects”，因此 E2E 断言同步更新，整份状态交互文件现已全绿。

## 截图观察

### 1) 前台互斥：selectPlayer 在前，token 响应窗口不再并列出现
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\selectPlayer-当前台交互存在时，不应再并列弹出-token-响应窗口\select-player-foreground-over-token-response.png`

肉眼观察：
- 画面中央只有“选择要移除所有状态的玩家”弹窗，没有第二个 token 响应弹窗并列抢前台。
- P1/P2 目标卡片都在同一个选择弹窗内，确认按钮仍按该交互自身状态控制，说明前台 ownership 已归位。
- 这张图达到本轮“不要再出现枪手/token 弹窗挤掉选择玩家弹窗”的验收标准。

### 2) token 成功链路：Honor 第一次使用前
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-before-first-use.png`

肉眼观察：
- 画面中央明确出现 `响应（攻击方）` token 弹窗，本体可见，不是外围遮罩或伪造快照。
- 弹窗内能看到 `原始伤害 4 -> 当前伤害 4`，同时 `荣誉` token 卡片与 `使用` 按钮可见，说明 token 前台窗口已被正常拉起。
- 这张图证明重构后 token 响应窗口仍能正常出现，没有被 modal stack 改坏。

### 3) token 成功链路：Honor 第一次使用后
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-after-first-use.png`

肉眼观察：
- 同一前台 token 弹窗仍在，说明第一次点击后没有把前台 ownership 弄丢。
- `当前伤害` 已从 4 变成 5，`荣誉` 可用数量从 2 降到 1，说明第一次 use 的 UI 与权威状态同步生效。
- 这张图达到“关键操作后 UI/结果发生变化”的验收要求。

### 4) token 成功链路：第二次使用并收口后
截图：
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-status-interaction-complete.e2e\token-响应窗口在前台时，samurai-honor-可连续使用两次并正常收口\samurai-honor-token-response-finalized.png`

肉眼观察：
- token 响应弹窗已经关闭，画面回到正常棋盘主界面，没有残留第二层阻塞弹窗。
- 左下角荣誉 token 显示为 `1/2`，对应 E2E 断言中的“连续使用两次后还剩 1 枚”。
- 这张图证明流程已经真正收口，而不是停留在半关闭/卡思考状态。

## 未覆盖风险
- `e2e/dicethrone-token-response-window.e2e.ts` 里的旧“真实攻防流”用例仍不稳定，当前未把它作为本轮收口证据。
- `e2e/dicethrone-watch-out-spotlight.e2e.ts` 里旧的 Samurai Honor 试验性场景仍未作为最终收口依据；当前收口证据以 `dicethrone-status-interaction-complete.e2e.ts` 为准。
