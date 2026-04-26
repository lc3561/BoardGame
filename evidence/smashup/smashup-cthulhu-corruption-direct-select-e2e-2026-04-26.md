# SmashUp `cthulhu_corruption` 直点回归 E2E 证据

## 目标

- 把 `cthulhu_corruption` 从 `targetType: 'generic'` 改回 `targetType: 'minion'`。
- 证明玩家可以直接点击场上随从完成选择，不再走 `PromptOverlay` 按钮/卡面弹窗。
- 证明点击后目标随从被消灭，`腐化` 进入弃牌堆，手牌拿到 1 张疯狂卡，并能收口到可继续出牌的状态。

## 执行命令

1. `npm run i18n:check`
2. `npm run typecheck`
3. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/madnessAbilities.test.ts --config vitest.config.ts --configLoader native --maxWorkers 1 -t "cthulhu_corruption"`
4. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --config vitest.config.ts --configLoader native --maxWorkers 1 -t "cthulhu_corruption"`
5. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
6. `npm run test:e2e:ci:file -- e2e/smashup/smashup-base-minion-selection.e2e.ts "随从选择：腐化 - 不弹窗，直接点击场上随从"`

## 结果

- `i18n:check`：通过；仅保留既有 `PromptOverlay.tsx` dynamic-key warning，无 missing key。
- `typecheck`：通过。
- `madnessAbilities.test.ts -t "cthulhu_corruption"`：通过。
- `newFactionAbilities.test.ts -t "cthulhu_corruption"`：通过。
- `interactionTargetTypeAudit.test.ts`：7/7 通过。
- Playwright 单用例：通过。

## 关键截图

1. 直点高亮
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-base-minion-selection.e2e\随从选择：腐化-不弹窗，直接点击场上随从\smashup-cthulhu-corruption-minion-highlight.png`
2. 结算收口
   `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-base-minion-selection.e2e\随从选择：腐化-不弹窗，直接点击场上随从\smashup-cthulhu-corruption-resolved.png`

## 肉眼验收

### 1. 高亮截图

- 我实际看到顶部只有一条“选择要消灭的随从”提示，没有出现居中的 `PromptOverlay` 卡面选择窗。
- 场上唯一目标随从 `影舞者` 本体带绿色高亮边框，说明当前链路确实走的是棋盘随从直选，而不是按钮列表。
- 手牌区还能看到 `侦察兵` 与 `疯狂`，右下角弃牌区已经有 `腐化`，说明战术已真实打出并进入“等待点击场上随从”的中间态。
- 该图达到本轮验收标准：问题位点“不能直接点场上随从”已被正面证明修复。

### 2. 收口截图

- 我实际看到左侧基地上的目标随从已经消失，基地力量回到 0，证明点击后消灭结算已生效。
- 手牌区仍保留 `侦察兵`，并新增一张 `疯狂`，说明 `腐化` 的“抽一张疯狂卡”结果也已落到权威状态。
- 画面右侧重新出现常规“结束回合”按钮，顶部不再有 `cthulhu_corruption` 选择提示，说明本牌交互已收口，回到可继续出牌的常规流程。
- 该图达到本轮验收标准：不是只出现了高亮，而是完成了“点击目标 -> 目标消失 -> UI 收口”的完整链路。

## 结论

- `cthulhu_corruption` 当前已恢复为场上随从直选。
- 本轮 E2E 已证明真实页面中可以直接点击随从完成结算，不再被 `generic` 弹窗替代。
- 2026-04-23 那条“必须改成 generic 才能用”的收敛结论已失效，后续应以本次直点链路为准。
