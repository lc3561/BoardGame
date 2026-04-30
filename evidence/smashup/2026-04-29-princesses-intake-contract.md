# Princesses Intake Contract (2026-04-29)

## Scope

- Game: `smashup`
- Expansion: `Pretty Pretty Smash Up`
- Requested faction this round: `Princesses / 公主`
- Requested delivery level: `正式可玩`
- Titan scope: 本轮未声明 Princesses Titan，默认不纳入

## Truth Sources

| Type | Source | Role |
| --- | --- | --- |
| 图片真相源 | `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc101381428395556106161738562ABCD5E1C772F2873A740E6A776975E69.png` | Princesses 所在 card atlas 几何、中文图面、中文卡名、图中文字 |
| 图片真相源 | `C:\Users\Dqm\Downloads\Smash Up! by Mervil (2833984701)-汉化版\Smash Up! by Mervil (2833984701)-汉化图\Mods\Images\httpssteamusercontentaakamaihdnetugc10138142839556160144CDDE640150BB5D07CEB38882ACC4389825406DD.png` | Princesses 所在 base atlas 几何、中文基地图面、中文基地名 |
| 英文名称/效果主对照源 | `https://smashup.fandom.com/wiki/Princesses` | Princesses 的 canonical 英文名称、英文效果文本主对照源 |
| 英文名称/效果补充对照源 | `https://smashup-rulebook.alderac.com/wiki/Princesses` | POD 官方 wiki，对本轮 original Princesses 仅作 compare-only 对照，不作为主真相源 |
| 基地 canonical 名称对照源 | `https://smashup.fandom.com/wiki/Princesses` | Princesses 基地 canonical 英文名 |

## Geometry Findings

| Asset | Size | Observed structure | Runtime landing |
| --- | --- | --- | --- |
| Card atlas | `3332 x 4096` | `7 x 8` 网格，Pretty Pretty 四派系混排 | 复用 `SMASHUP_ATLAS_IDS.CARDS8` -> `smashup/cards/pretty_pretty` |
| Base atlas | `4096 x 1458` | `2 x 4` 网格 | 复用 `BASE3` -> `smashup/base/base3` |

## Mixed Atlas Findings

- card atlas 第 `0-15` 格为 `Kitty Cats`
- card atlas 第 `16-23` 格为 `Mythic Horses`
- card atlas 第 `24-38` 格与第 `39` 格左邻共同构成 `Princesses`；其中 `Princesses` 本体为 `24-38`，`39` 已确认为 `Fairies / Playful Tricks`
- card atlas 第 `39-50` 格为 `Fairies`
- card atlas 第 `51-55` 格为标题卡 / logo 尾格

## Confirmed Princesses Row-Major Index Table

| Index | Card | Chinese on image |
| --- | --- | --- |
| `24` | `Happily Ever After` | `幸福地生活下去` |
| `25` | `True Love's Kiss` | `真爱之吻` |
| `26` | `Direct to DVD Sequel` | `拍成DVD续集` |
| `27` | `Woodland Helpers` | `森林里的帮手` |
| `28` | `Some Day My Prince Will Come` | `总有一天，我的王子会来到` |
| `29` | `Fairy Godmother` | `仙女教母` |
| `30` | `Skillet` | `平底锅` |
| `31` | `Heirloom` | `传家宝` |
| `32` | `Tale as Old as Time` | `古老的传说` |
| `33` | `Marie DeGraw` | `玛丽·德格劳` |
| `34` | `Eliza` | `伊莱札` |
| `35` | `Snow White` | `白雪公主` |
| `36` | `Apricot` | `杏子公主` |
| `37` | `Griselda` | `格丽泽尔达` |
| `38` | `Sleeping Beauty` | `睡美人` |

## Confirmed Base Index Table

| Index | Base | Chinese on image |
| --- | --- | --- |
| `4` | `Beautiful Castle` | `漂亮城堡` |
| `5` | `Ice Castle` | `冰雪城堡` |

## Card-Type Decisions

- minion counts:
  - `Apricot x1`
  - `Eliza x1`
  - `Griselda x1`
  - `Marie DeGraw x1`
  - `Sleeping Beauty x1`
  - `Snow White x1`
- action counts:
  - `Direct to DVD Sequel x2`
  - `Fairy Godmother x1`
  - `Happily Ever After x1`
  - `Heirloom x3`
  - `Skillet x2`
  - `Some Day My Prince Will Come x1`
  - `Tale as Old as Time x1`
  - `True Love's Kiss x2`
  - `Woodland Helpers x1`

## Runtime Resource Decisions

- Princesses card atlas 复用 Fairies 新建的正式 atlas id：
  - `SMASHUP_ATLAS_IDS.CARDS8 = 'smashup:cards8'`
  - image path: `smashup/cards/pretty_pretty`
- Princesses bases 复用现有 `BASE3`：
  - image path: `smashup/base/base3`
- 本轮原则上复用 Fairies 已落地的 Pretty Pretty 图集资源，不重复新增同文件：
  - `public/assets/i18n/en/smashup/cards/pretty_pretty.png`
  - `public/assets/i18n/en/smashup/cards/compressed/pretty_pretty.webp`
  - `public/assets/i18n/en/smashup/base/base3.png`
  - `public/assets/i18n/en/smashup/base/compressed/base3.webp`
  - `public/assets/i18n/zh-CN/smashup/cards/pretty_pretty.png`
  - `public/assets/i18n/zh-CN/smashup/cards/compressed/pretty_pretty.webp`
  - `public/assets/i18n/zh-CN/smashup/base/base3.png`
  - `public/assets/i18n/zh-CN/smashup/base/compressed/base3.webp`

## Baseline Findings vs Existing Repo

- 当前主工作区尚未正式注册 `princesses` faction id、UI metadata 与 locale
- 旧 worktree 中存在 Princesses 草稿，但只覆盖部分能力实现
- 旧 worktree 中已见的 base 候选数据为：
  - `Beautiful Castle`：`breakpoint 22`，`vp [4,2,1]`
  - `Ice Castle`：`breakpoint 15`，`vp [3,2,2]`
- 旧草稿中 `Ice Castle` 带有 `play_minion` 限制；实现阶段必须再与英文真相源核对后决定是否原样保留

## Source-Conflict Resolution Rules

- 原则 1：本地图片优先于 Fandom / POD wiki
- 原则 2：若 Fandom 与 POD wiki 对 original Princesses 文本有冲突，本轮以 Fandom + 本地图面为准
- 原则 3：`smashup-rulebook.alderac.com/wiki/Princesses` 因为是 POD 官方 wiki，本轮只用于 compare-only，不自动覆盖 original Princesses 录入
- 原则 4：中文图面中保留的英文专名如 `Apricot / Eliza / Griselda / Marie DeGraw`，按图面记录 locale

## Current Decision Summary

- 本轮只做 `Princesses / 公主` 单派系闭环
- 不顺带实现同图集上的 `Kitty Cats / Mythic Horses`
- Princesses 复用 Fairies 已建立的 `pretty_pretty` / `base3` 资源链，但玩法和 locale 独立接入
