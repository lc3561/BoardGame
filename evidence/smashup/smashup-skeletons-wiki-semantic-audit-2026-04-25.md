# Smash Up Skeletons Wiki 语义复审（2026-04-25）

## 2026-04-26 第七轮回写：旧“12/12 全错配”结论失效

- **结论等级更新**：`旧结论失效` + `仍有残余范围`。
- **失效结论**：本文旧版把 `Skeletons` 记成“**12/12 张牌能力语义与 Wiki / 卡图不一致**”。这条结论现在已经失效，不能继续当作当前真相。
- **失效原因**：后续按**卡图优先**逐张重录与复审后，`墓碑 / 墓地爆发 / 他们出来了 / 往下埋 / 墓园 / 灵车队伍 / 诡异。可怕。 / 轮回者 / 守墓人` 已确认与当前实现一致或已被修正到一致，不再属于“整派系全错”。
- **本轮新确认并已修复**：
  1. `骸骨之王 / Lord of Bones`：卡图 `temp/skeletons-card-18.png` 写的是“**挖掘这里的一张牌**”，旧实现却只允许挖掘“你的埋葬牌”；现已改为可挖掘该基地任意埋葬牌，并补行为测试。
  2. `殉葬品 / Grave Goods`：卡图 `temp/skeletons-card-20.png` 写的是“**弃一张牌来额外埋葬另一张牌**”，旧实现却把“弃掉”和“额外埋葬”错误并到同一张牌；现已拆成“先选弃牌，再选另一张额外埋葬牌”，并收紧为**首埋后至少还要有两张手牌**才允许走额外埋葬分支。
- **当前残余范围**：`复仇者 / Revenant` 仍不能写成已收口。它现在已不只是 `onTurnStart`，还挂了 `onActionPlayed / onMinionPlayed / onCardsDiscarded`，但这仍只是对“你的回合中”的近似实现，缺完整 during-turn 窗口建模与新的真实入口 L3 证据。
- **本轮验证**：
  - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts --testNamePattern "skeletons_(lord_of_bones|grave_goods|revenant)"` → `8 passed`
  - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts --testNamePattern "Skeletons abilities"` → `18 passed`
  - `npx eslint src/games/smashup/abilities/skeletons.ts e2e/src/games/smashup/abilities/skeletons.ts src/games/smashup/__tests__/newFactionAbilities.test.ts e2e/src/games/smashup/__tests__/newFactionAbilities.test.ts` → `0 errors`（仅仓库既有 warnings）
- **如何阅读本文旧内容**：下文 2026-04-25 的“12/12 错配”“整派系全错录”部分，现只保留为**当时的历史诊断记录**，不得再引用为当前骷髅派系的审计结论。


## 2026-04-25 补充：按用户要求改为“卡图优先”

- 真相源调整：
  - **主真相源**：`public/assets/i18n/zh-CN/smashup/cards/compressed/wangling.webp`
  - **辅助对照源**：`https://smashup.fandom.com/wiki/Skeletons`
- 现场切片：
  - `temp/skeletons-card-12.png`
  - `temp/skeletons-card-13.png`
  - `temp/skeletons-card-14.png`
  - `temp/skeletons-card-15.png`
  - `temp/skeletons-card-16.png`
  - `temp/skeletons-card-17.png`
  - `temp/skeletons-card-18.png`
  - `temp/skeletons-card-19.png`
  - `temp/skeletons-card-20.png`
  - `temp/skeletons-card-21.png`
  - `temp/skeletons-card-22.png`
  - `temp/skeletons-card-23.png`
- 说明：
  - 以上切片来自 `cards7 / wangling.webp` 的 `5 x 9` 网格，分别对应当前代码里 `Skeletons` 使用的 `previewRef.index 12-23`。
  - 已对这些切片执行本机 OCR。OCR 个别字有噪声，但卡名、关键词与核心语义可辨认，足以用于本轮“卡图优先”审计。
- 结论：
  - 卡图复核**没有推翻**本文件此前“`Skeletons` 整派系语义错录”的结论，反而直接确认了该结论。
  - 其中 `陪葬品` 图面明确写的是“从手中埋葬 / 挖掘埋葬牌 / 若为仆从则放两枚 +1 指示物”，不是“从弃牌堆回收力量 3 或以下随从”。

## 审计范围

- 派系：`skeletons`
- 代码范围：
  - `src/games/smashup/data/factions/skeletons.ts`
  - `src/games/smashup/abilities/skeletons.ts`
  - `public/locales/en/game-smashup.json`
  - `public/locales/zh-CN/game-smashup.json`
- 对照源：
  - `https://smashup.fandom.com/wiki/Skeletons` 的 MediaWiki API 原始 wikitext

## 结论等级

- **旧结论失效**
- **仍有残余范围**

## 核心结论

- `Skeletons` 不是“个别卡提示文案不清”，而是**整派系语义录入错误**。
- 当前本地 `skeletons` 的 `name / nameEn / count / previewRef` 基本仍对应骷髅派系卡面，但 **12/12 张牌的能力语义与 Wiki 不一致**。
- 当前用户反馈的 `陪葬品` 只是这批错误里最先暴露的一张；它不是“条件判断写错一点”，而是**整张牌被录成了另一套效果**。
- 以上结论现已由**卡图主真相源**直接确认，不再只是 Wiki 对照结论。

## 权威来源

### A. Wiki 原始语义（2026-04-25 现场抓取）

从 `Skeletons` 页面抓到的卡牌文本要点：

| 卡牌 | Wiki 语义摘要 |
| --- | --- |
| Lord of Bones | 另一张随从被翻开后，可在其上放置 1 个 +1 力量指示物；天赋：埋葬手牌 1 张或翻开此处你埋葬的 1 张牌 |
| Gravetender | 每回合一次，在你的另一张牌被埋葬或翻开后，抽 1 张牌 |
| Revenant | 在你的回合中，可将此牌从弃牌堆埋葬；每回合只能用 1 次 Revenant 能力 |
| Returned One | 你可以将此随从埋葬在此处；特技：此牌被翻开后，可再翻开此处你埋葬的另一张牌 |
| Burst Forth | 特技：基地计分前，翻开此处你埋葬的 1 张牌 |
| Dig ’em Up | 选择 1 个基地，翻开你埋葬在那里的至多 3 张牌 |
| Grave Goods | 埋葬手牌 1 张，并且你可以弃 1 张牌再埋葬 1 张；或者翻开你埋葬的 1 张牌，若它是随从则放 2 个 +1 指示物 |
| Gravestones | 贴基地；持续：此处随从被翻开后，可在其上放 1 个 +1 指示物；特技：该基地计分后，把此牌埋葬到另一个基地 |
| Graveyard | 贴基地；天赋：翻开此处你埋葬的 1 张牌；若它是随从，可放 1 个 +1 指示物 |
| Hearse Fleet | 将你埋葬的任意数量牌从一个基地移动到另一个基地；特技：基地计分前可改为最多移动 2 张到/离该基地 |
| Place ‘em Down | 从你的弃牌堆埋葬至多 3 张随从，总力量不大于 6 |
| Spooky, Scary... | 从你的弃牌堆埋葬 1 张力量 3 或以下的随从，然后抽 1 张牌 |

### A1. 卡图主真相源复核（2026-04-25）

以下为图面直接可读出的关键信息：

| 切片 | 图面关键信息 | 判定 |
| --- | --- | --- |
| `temp/skeletons-card-15.png` | `往下埋`：从你的弃牌堆埋葬至多三个力量总和 6 或更少的仆从 | 与当前实现不符 |
| `temp/skeletons-card-16.png` | `墓园`：天赋为挖掘这里的埋葬牌；若为仆从则可放 +1 指示物 | 与当前实现不符 |
| `temp/skeletons-card-17.png` | `灵车队伍`：移动埋葬牌；特殊为计分前移动最多两张到/离该基地 | 与当前实现不符 |
| `temp/skeletons-card-18.png` | `骸骨之王`：其他仆从被挖掘后放 +1；天赋为手牌埋葬 1 张或挖掘这里 1 张 | 与当前实现不符 |
| `temp/skeletons-card-19.png` | `诡异，可怕...`：从弃牌堆埋葬 1 张力量 3 或更少的仆从并抽 1 张牌 | 与当前实现不符 |
| `temp/skeletons-card-20.png` | `殉葬品`：从手中埋葬 1 张牌并可弃 1 再埋 1；或挖掘 1 张埋葬牌，若是仆从则放 2 个 +1 | 与当前实现不符 |
| `temp/skeletons-card-21.png` | `轮回者`：你可以将这个仆从埋葬到这里；挖掘后可再挖 1 张其他埋葬牌 | 与当前实现不符 |
| `temp/skeletons-card-22.png` | `复仇者`：你的回合可从弃牌堆埋葬这张牌；每回合只能用一次 | 与当前实现不符 |
| `temp/skeletons-card-23.png` | `守墓人`：每回合一次，你的其他牌被埋葬或挖掘后抽 1 张牌 | 与当前实现不符 |

说明：

- 图面 `12 / 13 / 14` 三张动作与 `24` 之前的 OCR 结论一致，分别对应 `墓碑 / 墓地爆发 / 他们出来了（Dig 'em Up）`，其语义也与当前本地实现不符。
- 因为本轮用户要求“卡图优先”，所以这里把图面复核提升为主证据；Wiki 仅用于交叉验证英文名与英文文本。

### B. 本地当前语义（2026-04-25）

来自 `public/locales/en/game-smashup.json` 与 `src/games/smashup/abilities/skeletons.ts` 的实际实现口径：

| 卡牌 | 本地当前语义摘要 | 判定 |
| --- | --- | --- |
| Lord of Bones | 力量随此处低费随从数量增长；天赋从弃牌堆埋力量 3 或以下随从 | ❌ 与 Wiki 不符 |
| Gravetender | 力量随此处埋葬牌数量增长 | ❌ 与 Wiki 不符 |
| Revenant | 你的低费随从从别的基地进入弃牌堆后，可埋到任意基地 | ❌ 与 Wiki 不符 |
| Returned One | 打出时可把自己或手里力量 3 或以下随从埋到此基地 | ❌ 与 Wiki 不符 |
| Burst Forth | 计分前翻开并打出此处你埋葬的 1 张牌/随从 | ❌ 与 Wiki 不符 |
| Dig ’em Up | 从任意基地翻开并打出你埋葬的 1 张牌 | ❌ 与 Wiki 不符 |
| Grave Goods | 从弃牌堆把力量 3 或以下随从回到手牌 | ❌ 与 Wiki 不符 |
| Gravestones | 计分后可把弃牌堆中力量 3 或以下随从埋到替换基地 | ❌ 与 Wiki 不符 |
| Graveyard | 贴基地；天赋把弃牌堆中力量 3 或以下随从埋到这里 | ❌ 与 Wiki 不符 |
| Hearse Fleet | 在你有随从的基地埋最多 2 张弃牌堆中力量 3 或以下随从 | ❌ 与 Wiki 不符 |
| Place ‘em Down | 从手牌把力量 3 或以下随从埋到基地 | ❌ 与 Wiki 不符 |
| Spooky, Scary... | 消灭另一位玩家力量 3 或以下随从 | ❌ 与 Wiki 不符 |

## 关键发现

### Finding 1：`陪葬品` 当前实现是整张卡语义错配，不是单点提示问题

- 图面：`殉葬品` 明确写着“从手中埋葬一张牌……OR 挖掘一张你的埋葬牌；如若它是仆从，则放两枚 +1 力量指示器”。
- Wiki：`Grave Goods` 也是“埋葬/翻开埋葬牌”的二选一效果。
- 当前实现：`skeletonsGraveGoodsOnPlay` 读取 `getLowPowerDiscardCards(ctx.state, ctx.playerId, 3)`，把弃牌堆力量 3 或以下随从回手。
- 当前文案与实现一致，但**文案本身也错**。

影响：

- 玩家打出 `陪葬品` 时看到“弃牌堆没有符合条件的卡牌”并不是 UI 幻觉，而是底层把这张牌实现成了另一张效果。

命中维度：

- `D1 语义保真`：卡牌语义与权威来源不一致
- `D3 数据流闭环`：静态数据、i18n、实现三层自洽，但共同偏离真相源

### Finding 2：旧 Wiki 对比脚本没有覆盖 `skeletons`

- `scripts/scrape-wiki-with-descriptions.mjs` 的 `FACTION_WIKI_NAMES` 不包含 `skeletons`。
- `wiki-cards-with-descriptions.json` 与 `WIKI-CODE-FINAL-COMPARISON.md` 现场结果只覆盖 `robots / samurai / cthulhu` 三个派系。
- 因此旧“Wiki 对比全绿”结论**天然漏审**了 `Skeletons`。

影响：

- 旧审计链路只能发现“名字/数量/文件存在性”的问题，既没覆盖 `Skeletons`，也没覆盖文本/语义差异。

命中维度：

- `D2 边界完整`：审计范围漏掉整派系
- `D47 测试/审计口径一致性`：对外口径把未覆盖对象误写为已覆盖

### Finding 3：旧 10 周年审计文档中关于 `Skeletons` 的“已收口”结论已被推翻

- 旧文档曾把 `Mermaids / Skeletons / World Champs` 统一写成“已完成专项审计与回归验证”。
- 但当前 `Skeletons` 已确认存在 12/12 卡语义错配，说明旧结论不能再作为有效收口证据。

命中维度：

- `L4 治理证据`
- `旧结论失效回写`

## 验证记录

### 现场执行

1. 读取本地 `skeletons` 静态数据、实现、i18n：
   - `src/games/smashup/data/factions/skeletons.ts`
   - `src/games/smashup/abilities/skeletons.ts`
   - `public/locales/en/game-smashup.json`
   - `public/locales/zh-CN/game-smashup.json`
2. 从 `public/assets/i18n/zh-CN/smashup/cards/compressed/wangling.webp` 按 `5 x 9` 网格切出 `index 12-23` 的 `Skeletons` 图面。
3. 对切片执行本机 OCR，核对卡名与效果关键句。
4. 直接抓取 Wiki：
   - `https://smashup.fandom.com/api.php?action=parse&page=Skeletons&prop=wikitext&format=json`
5. 对照现有脚本输出：
   - `WIKI-CODE-FINAL-COMPARISON.md`
   - `wiki-cards-with-descriptions.json`

### 结果

- `Skeletons` 的名字与数量没有明显错位。
- `Skeletons` 的 12 张牌能力语义已由**卡图主真相源**直接确认与当前本地实现不一致。
- 旧 Wiki 对比脚本未纳入 `Skeletons`，不能再引用其“全绿”结果为本派系背书。

## 当前残余范围

- 本文只完成了 `Skeletons` 的 Wiki 语义复审，还没有开始重录 `Skeletons` 的静态数据 / i18n / ability handler / 回归测试。
- `Mermaids / World Champs` 是否也存在类似“名字对、语义错”的整组问题，需独立重审；不能再沿用旧“10 周年三派系已收口”口径。

## 修复建议

- 不要再按“修 `陪葬品` 一张卡”推进。
- 应按 `Skeletons` 整派系做一次重新 intake / 重新实现：
  - 先锁 Wiki / 官方来源语义
  - 重录 12 张卡的 i18n 与静态数据
  - 重写 `src/games/smashup/abilities/skeletons.ts`
  - 补整派系行为回归与真实入口验证
  - 修复 Wiki 对比脚本，把 `skeletons` 纳入正式审计范围

---

## 2026-04-25 14:20 工具链补丁（基操）

### 变更
- `scripts/scrape-wiki-with-descriptions.mjs`
  - `FACTION_WIKI_NAMES` 新增：
    - `skeletons: 'Skeletons'`
    - `mermaids: 'Mermaids'`
    - `world_champs: 'World_Champions'`
- `scripts/final-wiki-code-comparison.mjs`
  - `nameEn` 解析从“仅单引号”改为“单双引号都支持”，避免 `Dig 'em Up / Place 'em Down` 被漏抓；
  - 名称对比增加归一化（直引号/弯引号统一），避免标点差异造成假缺失；
  - 报告头新增硬提示：该脚本仅校验 `name/count`，不校验语义。

### 复核命令与结果
1. `node scripts/scrape-wiki-with-descriptions.mjs skeletons`
   - 结果：`12 种卡牌，共 20 张`
2. `node scripts/final-wiki-code-comparison.mjs`
   - 结果：`skeletons name/count 对齐（1 正确 / 0 问题）`
3. `npx eslint scripts/scrape-wiki-with-descriptions.mjs scripts/final-wiki-code-comparison.mjs`
   - 结果：0 errors

### 审计结论更新
- 基础脚本已纳入 `skeletons`，并消除 `'` / `’` 造成的假缺失。
- 但该脚本仍不覆盖“效果语义”比对；`Skeletons` 的 12/12 语义错配结论不变，仍需整派系重录与实现。
