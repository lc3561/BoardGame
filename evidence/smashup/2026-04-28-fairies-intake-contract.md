# Fairies Intake Contract (2026-04-28)

## Scope

- Game: `smashup`
- Expansion: `Pretty Pretty Smash Up`
- Requested faction this round: `Fairies / 仙灵`
- Requested delivery level: `正式可玩`
- Titan scope: 本轮默认不纳入 `Spirit of the Forest`

## Truth Sources

| Type | Source | Role |
| --- | --- | --- |
| 图片真相源 | `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc101381428395556106161738562ABCD5E1C772F2873A740E6A776975E69.png` | Fairies 所在 card atlas 几何、中文图面、中文卡名、图中文字 |
| 图片真相源 | `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc10138142839556160144CDDE640150BB5D07CEB38882ACC4389825406DD.png` | Fairies 所在 base atlas 几何、中文基地图面、中文基地名 |
| 英文名称/效果主对照源 | `https://smashup.fandom.com/wiki/Fairies` | original Fairies 的 canonical 英文名称、英文效果文本主对照源 |
| 英文名称/效果补充对照源 | `https://smashup-rulebook.alderac.com/wiki/Fairies` | POD 官方 wiki，对本轮 original Fairies 仅作 compare-only 对照，不作为主真相源 |
| 基地 canonical 名称对照源 | `https://smashup.fandom.com/wiki/Fairies` | Fairies 基地 canonical 英文名 |

## Geometry Findings

| Asset | Size | Observed structure | Runtime landing |
| --- | --- | --- | --- |
| Card atlas | `3332 x 4096` | `7 x 8` 网格，Pretty Pretty 四派系混排 | 新增 `SMASHUP_ATLAS_IDS.CARDS8` -> `smashup/cards/pretty_pretty` |
| Base atlas | `4096 x 1458` | `2 x 4` 网格 | 复用 `BASE3` -> `smashup/base/base3` |

## Mixed Atlas Findings

- card atlas 第 `0-15` 格为 `Kitty Cats`
- card atlas 第 `16-23` 格为 `Mythic Horses`
- card atlas 第 `24-38` 格为 `Princesses`
- card atlas 第 `39-50` 格为 `Fairies`
- card atlas 第 `51-55` 格为标题卡 / logo 尾格

## Confirmed Fairies Row-Major Index Table

| Index | Card | Chinese on image |
| --- | --- | --- |
| `39` | `Playful Tricks` | `有趣的把戏` |
| `40` | `Ladybug` | `甲虫夫人` |
| `41` | `Titania` | `Titania` |
| `42` | `Magic Ward` | `魔法守护` |
| `43` | `Leaf Armor` | `叶之甲` |
| `44` | `Magic Acorns` | `魔法橡子` |
| `45` | `Tinx` | `tinx` |
| `46` | `Puck` | `Puck` |
| `47` | `Daisy Chain` | `雏菊花环` |
| `48` | `Enchantment` | `结果` |
| `49` | `Glymmer` | `Glymmer` |
| `50` | `Fairy Ballet` | `精灵芭蕾` |

## Confirmed Base Index Table

| Index | Base | Chinese on image |
| --- | --- | --- |
| `2` | `Enchanted Glen` | `结界谷` |
| `3` | `Fairy Circle` | `精灵之环` |

## Card-Type Decisions

- `Ladybug` 是行动卡，不是随从
- `Daisy Chain` 是行动卡，不是随从
- minion counts:
  - `Titania x1`
  - `Glymmer x2`
  - `Puck x3`
  - `Tinx x4`
- action counts:
  - `Playful Tricks x1`
  - `Ladybug x1`
  - `Magic Ward x1`
  - `Leaf Armor x2`
  - `Magic Acorns x1`
  - `Daisy Chain x2`
  - `Enchantment x1`
  - `Fairy Ballet x1`

## Runtime Resource Decisions

- `Fairies` card atlas 新增正式 atlas id：
  - `SMASHUP_ATLAS_IDS.CARDS8 = 'smashup:cards8'`
  - image path: `smashup/cards/pretty_pretty`
- Fairies bases 复用现有 `BASE3`：
  - image path: `smashup/base/base3`
- 已落地运行时资源：
  - `public/assets/i18n/en/smashup/cards/pretty_pretty.png`
  - `public/assets/i18n/en/smashup/cards/compressed/pretty_pretty.webp`
  - `public/assets/i18n/en/smashup/base/base3.png`
  - `public/assets/i18n/en/smashup/base/compressed/base3.webp`
  - `public/assets/i18n/zh-CN/smashup/cards/pretty_pretty.png`
  - `public/assets/i18n/zh-CN/smashup/cards/compressed/pretty_pretty.webp`
  - `public/assets/i18n/zh-CN/smashup/base/base3.png`
  - `public/assets/i18n/zh-CN/smashup/base/compressed/base3.webp`

## Baseline Corrections vs Existing Repo

- 仓库已有 `fairies` faction id，但此前缺失完整主派系卡牌数据与 card atlas 接入
- 仓库已有两张 Fairies 基地，但英文 canonical 名称需要校正为：
  - `base_enchanted_glade` -> `Enchanted Glen`
  - `base_fairy_ring` -> `Fairy Circle`
- 仓库原 `base_fairy_ring` 实现错误地同时授予额外随从与额外行动；本轮改回官方二选一

## Source-Conflict Resolution Rules

- 原则 1：本地图片优先于 Fandom / POD wiki
- 原则 2：若 Fandom 与 POD wiki 对 original Fairies 文本有冲突，本轮以 Fandom + 本地图面为准
- 原则 3：`smashup-rulebook.alderac.com/wiki/Fairies` 因为是 POD 官方 wiki，本轮只用于 compare-only，不自动覆盖 original Fairies 录入
- 原则 4：中文图面中保留的英文专名如 `Titania / Puck / Glymmer / tinx`，按图面记录 locale

## Current Decision Summary

- 本轮只做 `Fairies / 仙灵` 单派系闭环
- 不顺带实现同图集上的 `Kitty Cats / Princesses / Mythic Horses`
- 不把泰坦 `Spirit of the Forest` 混入本轮主任务
