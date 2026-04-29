# SmashUp 世界冠军 斯坦福 真实入口 E2E 证据（2026-04-26）

## 范围

- 对象：`world_champs_stoneford / 斯坦福`
- 目标：补齐“真实对局入口打出后，检索行动卡 -> 选择 -> 入手”的 L3 玩法证据

## 权威来源

- 本地卡图标题切片：`temp/cards7-title-31.png`
- 10 周年重录合同：`evidence/smashup/smashup-10th-anniversary-reintake-2026-04-25.md`
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "斯坦福打出后应显示牌库行动卡并在选择后加入手牌"
```

## 结果

- 结果：`1 passed`
- 说明：本机全局重任务门禁在默认模式下因瞬时可用内存低于 `1.5GB` 拒跑；本次使用脚本自带的 `BG_BYPASS_GLOBAL_HEAVY_BUDGET=1` 受控旁路，仅为补当前斯坦福真实入口证据，没有改测试实现。

## 关键截图

1. 提示出现
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斯坦福打出后应显示牌库行动卡并在选择后加入手牌\stoneford-prompt-visible.png`
   - 肉眼观察：
     - 左侧棋盘上已经能看到 `斯坦福` 本体，说明是真实打出后触发，不是凭空注入 prompt。
     - 中央提示文案明确写着“从牌库选择一张行动卡加入手牌”。
     - 画面中可见两张可选行动卡 `召唤` 与 `掠夺`，不是空提示，也不是错误卡面。

2. 选择后入手
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斯坦福打出后应显示牌库行动卡并在选择后加入手牌\stoneford-selected-action-added-to-hand.png`
   - 肉眼观察：
     - 中央检索提示已经关闭，链路正常收口，没有卡在交互态。
     - `斯坦福` 仍留在左侧基地，说明只是完成 onPlay 检索，不是错误替换成别的效果。
     - 选中的 `掠夺` 已出现在底部手牌区，符合“加入手牌”的卡面结果。

## 状态断言

- E2E 断言了 `interactionMeta.sourceId === 'world_champs_stoneford'`
- E2E 断言了候选行动卡来自牌库中的 `wizard_summon` 与 `vikings_pillage`
- E2E 断言了选择后：
  - `finalState.core.players['0'].hand` 包含 `vikings_pillage`
  - `finalState.core.players['0'].deck` 不再包含 `vikings_pillage`

## 结论等级

- **代表性玩法已验证**

## 影响到总审计的修订

- 旧“`斯坦福` 缺 L3 真实入口玩法证据”的结论在当前基线上已失效。
- 这只补齐了 `斯坦福` 单卡的 L3 证据，不等于 `World Champs` 或“三派系整包”已经收口。
