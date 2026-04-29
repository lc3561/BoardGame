## 范围

- 目标：确认 `DiceThrone` 本地 AI 的 `0.4s` 延迟是否被去掉，并修复技能选择/技能发动不再吃延迟的问题。
- 相关文件：
  - `src/games/dicethrone/ai.ts`
  - `e2e/src/games/dicethrone/ai.ts`
  - `src/games/dicethrone/hooks/useAttackShowcase.ts`
  - `src/games/dicethrone/ui/AttackShowcaseOverlay.tsx`
  - `src/games/dicethrone/Board.tsx`

## 本轮结论

- `0.4s` 没有被全局删掉，运行时仍然只对白名单里的可见动作生效。
- 之前 `DiceThrone` 的白名单漏掉了 `select-ability` 和 `use-passive-ability`，所以技能选择/技能发动会被判成 `hidden`，体感上像“0.4 秒没了”。
- 现在已把这两个动作补回 `src` 与 `e2e/src` 的白名单。

## 我实际看到什么

- 真人 + `local-ai` 的真实链路日志里，`roll-dice` 明确出现 `minimumDelayMs: 400`。
- 同一条链路里，隐藏动作 `toggle-die-lock` 的 `minimumDelayMs: 0`，说明“只有可见动作延迟”的门控仍然在工作。
- 现有通过的防御技能 E2E 仍能正常进入 `DiceThrone` 棋盘并高亮可选技能，没有被这轮改动打崩。

## 证据

- 真人 + `local-ai` 延迟链路前态截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-online-local-ai-delay-before.png`
- 真人 + `local-ai` 延迟链路后态截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-online-local-ai-delay-after.png`
- 真人 + `local-ai` 控制台日志：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-online-local-ai-delay-console.json`
- 现有防御技能 E2E 通过截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-defense-selection.e2e\影贼防御选择场景应高亮可选技能\shadow-thief-defense-selectable-abilities.png`

## 验证

- `npm run typecheck`
- `npm run test:e2e:ci:file -- e2e/dicethrone-defense-selection.e2e.ts "影贼防御选择场景应高亮可选技能"`

## 未完全打实的点

- “不可防御攻击在 `offensiveRoll` 也要弹技能特写” 这条新链路，代码已经补了，但我还没有拿到稳定通过的专用 E2E 证据。
- 因此这轮可以确认的是“延迟门控已恢复到你要的白名单语义”；技能特写的新入口还需要单独继续钉证据。
