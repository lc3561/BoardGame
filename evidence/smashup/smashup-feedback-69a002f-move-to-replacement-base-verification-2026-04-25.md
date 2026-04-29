# SmashUp 反馈 69a002f34366b2c03b21f585：移动到新基地效果验证（2026-04-25）

## 反馈摘要

- 反馈 ID：`69a002f34366b2c03b21f585`
- 原文：`基地移动新随从到新基地效果不触发`
- 游戏：`smashup`

## 场景匹配

反馈 actionLog 显示链路集中在 `托尔图加（base_tortuga）` 计分后的“移动随从到替换基地”阶段。
该问题已在仓库存在针对性回归：`afterscoring-window-skip-base-clear.test.ts` 的
`base_tortuga: 应先换基地，再把亚军随从移到新基地`。

## 执行命令

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/afterscoring-window-skip-base-clear.test.ts --configLoader native -t "base_tortuga: 应先换基地，再把亚军随从移到新基地"
```

## 结果

- 结果：`1 passed`
- 结论：当前实现已满足“先替换基地，再把亚军随从移动到新基地”的正确顺序，反馈所述“移动后效果不触发”在当前代码下已被修复覆盖。
