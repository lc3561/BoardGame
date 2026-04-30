## Context

- 用户沿用上一轮 Fairies 的 `Pretty Pretty Smash Up` 本地中文混排 atlas：
  - 卡牌 atlas：`httpssteamusercontentaakamaihdnetugc101381428395556106161738562ABCD5E1C772F2873A740E6A776975E69.png`
  - 基地 atlas：`httpssteamusercontentaakamaihdnetugc10138142839556160144CDDE640150BB5D07CEB38882ACC4389825406DD.png`
- 图片显示这两张资源仍是 `Pretty Pretty Smash Up` 的共享 atlas，而不是 Princesses 独立图；Princesses 与 `Kitty Cats / Mythic Horses / Fairies` 共用同一张 card atlas，并与扩展内其他派系共用同一张 base atlas。
- 当前主工作区缺少 `princesses` 的正式接入，但旧 worktree 中存在局部草稿：
  - `src/games/smashup/abilities/princesses.ts`
  - `src/games/smashup/data/factions/princesses.ts`
  - `Beautiful Castle / Ice Castle` 的旧 base 数据
- 旧草稿只覆盖少数牌：
  - 已见实现：`Apricot`、`Marie DeGraw`、`Direct to DVD Sequel`、`Fairy Godmother`、`Skillet`
  - 明确未完成：`Eliza`、`Griselda`、`Sleeping Beauty`、`Snow White`、`Happily Ever After`、`Tale as Old as Time`、`True Love's Kiss`、`Woodland Helpers`

## Goals / Non-Goals

- Goals:
  - 把 `Princesses / 公主` 做成可正式游玩的 Smash Up 派系
  - 明确哪些旧 Princesses 草稿可以复用，哪些必须按本轮真相源重录
  - 补齐资源、静态数据、玩法、测试、E2E、evidence 全链路
- Non-Goals:
  - 不顺带完成同 atlas 中 `Kitty Cats / Mythic Horses`
  - 不接管根目录已被其他任务占用的 planning 文件

## Decisions

- Decision: 本轮按“单派系实现”推进，但复用其所在混排 atlas。
  - Why: 用户当前只要求 Princesses；项目规范也要求玩法实施按单派系闭环推进。

- Decision: 旧 worktree 中的 Princesses 代码只视为“候选复用实现”，不是主真相源。
  - Why: 旧草稿覆盖不完整，且主工作区尚未正式接入，必须先对照本地图面与英文来源再决定保留。

- Decision: Princesses card atlas 复用 Fairies 刚建立的 `SMASHUP_ATLAS_IDS.CARDS8 -> smashup/cards/pretty_pretty`。
  - Why: Princesses 与 Fairies 同属同一张 Pretty Pretty 混排图，避免重复创建 atlas 槽位。

- Decision: Princesses bases 复用 `BASE3 -> smashup/base/base3`。
  - Why: 旧草稿与当前扩展基地方向都已指向 `BASE3`，只需重新锁定索引与名称合同。

## Risks / Trade-offs

- Risk: 混排 atlas 很容易误改邻近派系索引。
  - Mitigation: 先写清 Princesses 的 row-major 索引表，只在 `24-38` 范围内落 `previewRef`。

- Risk: 旧草稿可能把能力实现到一半，既不能完全复用，也不能完全丢弃。
  - Mitigation: 先在 intake 与 design 里显式区分“已存在草稿能力”和“必须本轮新补能力”。

- Risk: 运行时资源虽然已因 Fairies 落地 `pretty_pretty` / `base3`，但 Princesses 仍需要 locale、metadata 与预览链路正式注册。
  - Mitigation: 将资源接线、预加载与 critical image resolver 回归列为显式任务，不以“图片文件已经在仓库里”收口。

## Migration Plan

1. 先落 Princesses intake 合同与 OpenSpec proposal。
2. 获批后完成 Princesses 资源与静态数据接入。
3. 逐批实现玩法、补测试、跑 E2E、看图验收。
4. 最后完成资源上传、远端回查与 evidence 收口。

## Open Questions

- 旧 worktree 中 Princesses 的已实现能力是否能原样迁回当前主工作区，还是需要按当前域模型做适配重写？
- `Some Day My Prince Will Come` 是否需要新增或复用现有 `beforeScoring` 交互拼装；这将在实现阶段再裁定。
