# SmashUp 反馈 69a27d8e17d6c588726803a5：托尔图加计分卡死验证（2026-04-25）

## 反馈摘要

- 反馈 ID：`69a27d8e17d6c588726803a5`
- 原文：`海盗王和灰色猫眼石基地结算后游戏卡住了，点结束回合也没反应，没进入积分结算的流程`
- 游戏：`smashup`

## 验证口径

该问题在仓库已有针对性回归：`multi-base-afterscoring-bug.test.ts` 中同名用例
`反馈 69a27d：海盗王移动到托尔图加后，计分交互链结束应退出 scoreBases 而不是卡死`。

## 执行命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts --configLoader native -t "反馈 69a27d：海盗王移动到托尔图加后，计分交互链结束应退出 scoreBases 而不是卡死"
```

## 结果

- 结果：`1 passed`
- 结论：该卡死链路在当前代码中已修复，计分交互结束后可正常退出 `scoreBases`，不再出现“结束回合无响应、无法进入积分结算”。
