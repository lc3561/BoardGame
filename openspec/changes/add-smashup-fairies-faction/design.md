## Context

- 用户提供了本地中文混排 atlas：
  - 卡牌 atlas：`httpssteamusercontentaakamaihdnetugc101381428395556106161738562ABCD5E1C772F2873A740E6A776975E69.png`
  - 基地 atlas：`httpssteamusercontentaakamaihdnetugc10138142839556160144CDDE640150BB5D07CEB38882ACC4389825406DD.png`
- 图片显示这是 `Pretty Pretty Smash Up` 的混排资源，而不是单独的 Fairies 图；Fairies 与 `Kitty Cats / Princesses / Mythic Horses` 共用同一张 card/base atlas。
- 仓库已存在 `fairies` 的局部残留：
  - `SMASHUP_FACTION_IDS.FAIRIES`
  - `base_enchanted_glade` / `base_fairy_ring`
  - 两条基地能力及测试
  - Titan 相关录入草稿
- 当前仓库缺少 `public/assets/i18n/zh-CN/smashup/**` 正式资源树，Fairies 资源不能假设已经在运行时可用。

## Goals / Non-Goals

- Goals:
  - 把 Fairies 做成可正式游玩的 Smash Up 派系
  - 把 `Spirit of the Forest / 丛林之灵` 做成与 Fairies 主派系同轮交付的正式 Titan
  - 明确哪些现有半成品可以复用，哪些必须以本轮真相源重录
  - 补齐资源、静态数据、玩法、测试、E2E、evidence 全链路
- Non-Goals:
  - 不顺带完成同 atlas 中其他三个派系
  - 不接管根目录已被其他任务占用的 planning 文件

## Decisions

- Decision: 本轮按“单派系实现”推进，但允许复用其所在混排 atlas。
  - Why: 用户当前只要求 Fairies；项目规范也要求玩法实施按单派系闭环推进。

- Decision: 现有 `BASE3` 仙灵基地与基地能力不直接视为真相，而是视为“候选复用实现”。
  - Why: 当前仓库存在半成品残留，必须先对照图片/Wiki 再决定是否原样保留。

- Decision: 资源 contract 先锁“几何与索引”，再决定 card atlas 在运行时是复用现有槽位还是分配新 atlas id。
  - Why: 当前仓库只有 `CARDS1..CARDS7`，而 Fairies card atlas 是否已有对应正式槽位尚未被证实；实现阶段应以合同裁定后再落具体接线。

- Decision: `Spirit of the Forest` 在用户批准后纳入本轮 Fairies 闭环交付。
  - Why: 用户已显式要求继续实现该 Titan，且仓库已有 Titan schema 与录入草稿，适合在当前变更内完成闭环，而不是另开分支任务。

## Risks / Trade-offs

- Risk: 混排 atlas 很容易误改邻近派系索引。
  - Mitigation: 先写清 Fairies 的 row-major 索引表，只在该范围内落 `previewRef`。

- Risk: 仓库缺失中文 Smash Up 正式资源树，后续运行时可能本地有图但线上 404。
  - Mitigation: 把压缩、上传、远端回查列为显式任务，不以“本地能打开图片”收口。

- Risk: 现有基地方向的残留实现可能造成“以旧带新”的误判。
  - Mitigation: 在合同文档里显式区分“来源真相”与“现有代码现状”。

## Migration Plan

1. 先落 intake 合同与 OpenSpec proposal。
2. 获批后完成 Fairies 资源与静态数据接入。
3. 逐批实现玩法、补测试、跑 E2E、看图验收。
4. 最后完成 Titan 在内的资源上传与 evidence 收口。

## Open Questions

- Fairies 的 card atlas 在运行时是否复用已有某张内建中文图集，还是需要新增一张正式 atlas 槽位？
- `Spirit of the Forest` 已纳入本轮；剩余仅需决定是否在后续补做专门的真实入口 E2E 与远端资源回查。
