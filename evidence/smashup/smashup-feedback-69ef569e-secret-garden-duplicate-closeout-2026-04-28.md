# SmashUp 反馈 69ef569e 收口说明（2026-04-28）

- 反馈 ID：`69ef569e039f95a4fe91d973`
- 标题：`Secret Garden 发动后卡死`

## 判断依据

- 这条新反馈只提供了简短文字描述：`神秘花园发动效果后卡死`。
- 没有新的动作包、状态快照或额外截图能证明它是另一条独立根因。
- 仓库里已经存在同基地、同症状的已定位修复：
  - `evidence/smashup/smashup-feedback-69ea227f-secret-garden-extra-minion-fix-2026-04-24.md`

## 已有修复覆盖的根因

- `Secret Garden` 触发额外打出 2 力量随从后，后续基地选择交互被入队，但旧交互没有正确弹出。
- 表现就是“效果发动后卡住/点了没反应”。
- 该修复已经补了：
  - `src/games/smashup/domain/systems.ts` 的交互收口逻辑
  - `src/games/smashup/__tests__/afterScoring-rescoring.test.ts` 的回归用例
  - 线上快照驱动的修前/修后复核

## 结论

- 在没有新现场证据显示“存在不同根因”的前提下，本条按 `69ea227f` 同链路重复反馈收口。
- 这不是新增代码修复，而是复用已存在的 `Secret Garden` 卡死修复证据。
