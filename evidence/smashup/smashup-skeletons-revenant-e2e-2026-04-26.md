# Smash Up Skeletons《复仇者》真实入口 E2E 证据（2026-04-26）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Skeletons / 骷髅`
- 对象：`复仇者`
- 目标：
  1. 证明《复仇者》现在走的是**弃牌堆主动特殊能力**链路，而不是旧的伪 trigger prompt。
  2. 证明同一回合第一次可从弃牌堆埋葬，第二次不会重复触发。

## 运行命令

1. `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "复仇者应可在回合中触发埋葬且同回合不重复触发"`

## 结论等级

- **代表性玩法已验证**

## 关键截图与肉眼结论

### 1. 复仇者：弃牌堆主动特殊能力已出现并被选中

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\复仇者应可在回合中触发埋葬且同回合不重复触发\skeletons-revenant-discard-panel-selected.png`
- 我实际看到：
  1. 画面底部弃牌堆面板已经展开，中央能直接看到《复仇者》卡面本体，不是纯文字或空容器。
  2. 《复仇者》卡面外圈是高亮选中态，下方明确出现提示 `点击基地埋葬这张牌`。
  3. 画面中没有额外弹出的 interaction prompt；说明这里走的是**弃牌堆选牌 → 直接点基地**的新链路。
- 是否达到验收标准：
  - **达到。** 这张图直接证明《复仇者》已不再依赖旧 `onTurnStart` 式 prompt，而是以弃牌堆主动特殊能力的形态暴露给玩家。

### 2. 复仇者：埋葬后已真实落到目标基地

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\复仇者应可在回合中触发埋葬且同回合不重复触发\skeletons-revenant-buried-resolved.png`
- 我实际看到：
  1. 中间第二个基地下方已经出现 1 张埋葬牌本体。
  2. 右下角弃牌堆重新变成 `弃牌堆(0)`，说明《复仇者》已离开弃牌堆。
  3. 当前交互已经收口，画面回到可继续推进状态，没有残留弹窗或待确认 prompt。
- 是否达到验收标准：
  - **达到。** 这张图和状态断言一起证明《复仇者》第一次触发后，确实从弃牌堆埋葬到了目标基地。

### 3. 复仇者：同回合第二次不会再出现

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\复仇者应可在回合中触发埋葬且同回合不重复触发\skeletons-revenant-second-card-no-repeat.png`
- 我实际看到：
  1. 第二次打出随从后，棋盘上只新增了第二张正常随从；没有重新出现《复仇者》卡面选择条，也没有新的基地选择 prompt。
  2. 右下角弃牌堆仍是空的，说明同回合没有再把《复仇者》重新放回可用入口。
  3. 画面保持在同一回合的出牌阶段，说明这是**同回合负路径**，不是跨回合自然重置。
- 是否达到验收标准：
  - **达到。** 这张图与状态断言共同证明“每回合一次”已经生效，不会在同一回合第二次重开。

## 状态断言补充

- 首次选中《复仇者》但尚未点基地前：
  - `sys.interaction.current === null`
  - `usedDiscardPlayAbilities` 尚未包含 `skeletons_revenant`
  - 目标基地的 `buriedCards` 尚未包含 `skeletons_revenant`
- 首次埋葬完成后：
  - `core.bases[1].buriedCards` 包含 `skeletons_revenant`
  - `core.players['0'].usedDiscardPlayAbilities` 包含 `skeletons_revenant`
- 同回合第二次打牌后：
  - `sys.interaction.current?.data?.sourceId` 不是 `skeletons_revenant_base`
  - `usedDiscardPlayAbilities` 仍只记录 1 次 `skeletons_revenant`

## 当前残余范围

- 本文只证明了《复仇者》这张牌的真实入口链路已经补到 **L3**，不等于整个 `Skeletons / 骷髅` 派系已经达到“当前发布口径已收口”。
- `Skeletons` 与三新派系整包结论，仍需继续以总审计文档里的残余范围为准。
