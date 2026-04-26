# Smash Up 10 周年三派系卡图优先重录合同（2026-04-25）

## 审计范围

- 派系：`Mermaids / Skeletons / World Champs`
- 基地：`Mermaid Reef / Mermaid Pool / Boneyard / Ossuary / Arena / Hall of Fame`
- 代码范围：
  - `src/games/smashup/data/factions/mermaids.ts`
  - `src/games/smashup/data/factions/skeletons.ts`
  - `src/games/smashup/data/factions/world_champs.ts`
  - `src/games/smashup/data/cards.ts`
  - `public/locales/en/game-smashup.json`
  - `public/locales/zh-CN/game-smashup.json`
  - 后续会继续回写 `abilities/*` 与测试

## 真相源优先级

1. **主真相源：本地卡图 / 基地图**
   - `public/assets/i18n/zh-CN/smashup/cards/compressed/wangling.webp`
   - `public/assets/i18n/zh-CN/smashup/base/compressed/wangling_base.webp`
2. **辅助对照：Smash Up Fandom**
   - `https://smashup.fandom.com/wiki/Mermaids`
   - `https://smashup.fandom.com/wiki/Skeletons`
   - `https://smashup.fandom.com/wiki/World_Champs`
   - `https://smashup.fandom.com/wiki/Bases`

## 现场证据

- 卡图切片：
  - `temp/cards7-00.png` - `temp/cards7-43.png`
- 基地图切片：
  - `temp/wangling-base-0.png` - `temp/wangling-base-5.png`
- OCR：
  - `temp/cards7-ocr-mermaids.json`
  - `temp/cards7-ocr-skeletons.json`
  - `temp/cards7-ocr-world_champs_minions.json`
  - `temp/cards7-ocr-world_champs_actions.json`
  - `temp/wangling-base-ocr.json`

## 卡图合同

### Mermaids

| index | 英文名 | 图面中文名 | 关键结论 |
| --- | --- | --- | --- |
| 0 | Ultimate Song | 最后的歌声 | 不是移动己方随从；是强制其他玩家额外打出 3 力或以下仆从到目标基地，否则展示无符合手牌，并取消这些仆从能力；你可额外打仆从和/或行动 |
| 1 | Captive Audience | 迷倒观众 | 不是移动对手仆从；是按目标基地上“不属于你”的仆从数量给你的一个仆从 +1 力量，并额外打行动 |
| 2 | Becalmed Shores | 安静的海岸 | 持续为“其他玩家仆从 -1 力量”，天赋是“转移这个行动到另一个基地” |
| 3 | Siren Song | 塞壬的歌声 | 选择一个基地，把每位其他玩家在那里的一张仆从移动到同一个、且你有仆从的另一个基地 |
| 4 | Toll Bay | 死亡海湾 | 选择基地，按其他玩家在那里仆从数抽牌 |
| 5 | Shipwreck Cove | 沉船湾 | 持续：你在这里的仆从各 +1；特殊：计分后把这张牌转移到另一个基地 |
| 6 | Siren | 塞壬 | 其他玩家在这里的仆从在其控制者总力量中少算 1，不是仅你回合生效 |
| 7 | Temptress | 诱惑者 | 若本回合有其他玩家仆从移动到这里，则该仆从本回合 +2 |
| 8 | Charmer | 迷人的人 | 天赋：先可移动自己，再可把另一个玩家 3 力或以下仆从移动到它所在基地 |
| 9 | Mermaid Queen | 人鱼女王 | 把其他玩家 1 个仆从移到这里，或选择这里 1 个 3 力或以下仆从，直到回合结束获得其控制权 |
| 10 | Charmed | 魅惑 | 选择 3 力或以下仆从，可移到你有仆从的另一基地；其力量到回合结束不计入控制者总力量；额外打行动 |
| 11 | Desert Island | 无人岛 | 持续：这里每个仆从都不能把自己的力量加到其控制者的总力量中；你的回合开始前移除这张牌 |

### Skeletons

| index | 英文名 | 图面中文名 | 关键结论 |
| --- | --- | --- | --- |
| 12 | Gravestones | 墓碑 | 持续：此处仆从被挖掘后可放 1 个 +1；特殊：计分后把此牌埋到另一个基地 |
| 13 | Burst Forth | 墓地爆发 | 特殊：基地计分前挖掘 1 张你埋葬在那里的牌 |
| 14 | Dig 'em Up | 他们出来了 | 选择 1 个基地，挖掘至多 3 张你埋葬在那里的牌 |
| 15 | Place 'em Down | 往下埋 | 从弃牌堆埋葬至多 3 个仆从，总力量 6 或更少 |
| 16 | Graveyard | 墓园 | 天赋：挖掘这里 1 张你的埋葬牌；若是仆从可放 1 个 +1 |
| 17 | Hearse Fleet | 灵车队伍 | 卡图优先口径：普通效果为“移动任意数量的埋葬牌”；特殊才限定“你埋葬的牌” |
| 18 | Lord of Bones | 骸骨之王 | 其他仆从被挖掘后可放 1 个 +1；天赋：从手中埋 1 张到这里或挖掘这里 1 张 |
| 19 | Spooky, Scary... | 诡异。可怕。 | 从弃牌堆埋葬 1 张 3 力或以下仆从，然后抽 1 张 |
| 20 | Grave Goods | 殉葬品 | 先从手中埋 1 张牌；之后可弃 1 张来额外埋 1 张，或挖掘 1 张你的埋葬牌；若它是仆从则放 2 个 +1 |
| 21 | Returned One | 轮回者 | 可将此仆从埋葬到这里；被挖掘后可再挖掘这里 1 张其他牌 |
| 22 | Revenant | 复仇者 | 你的回合中可把这张牌从弃牌堆埋葬；每回合一次 |
| 23 | Gravetender | 守墓人 | 每回合一次，你的其他牌被埋葬或挖掘后抽 1 |

### World Champs

| index | 英文名 | 图面中文名 | 关键结论 |
| --- | --- | --- | --- |
| 24 | Rainbow Girl | 彩虹女孩 | 现实现大体正确 |
| 25 | Mummy | 木乃伊 | 现实现大体正确 |
| 26 | Calicoin | 金币猫 | 2026-04-26 已按卡图优先重录中文名 |
| 27 | Samurai-Chan | 武士 陈 | 2026-04-26 已按卡图优先重录中文名 |
| 28 | Diva | 女主角 | 2026-04-26 已按卡图优先重录中文名 |
| 29 | Akye the Turtle | 海龟阿凯 | 2026-04-26 已补真实入口 E2E 证据 |
| 30 | Shield Maiden | 盾牌少女 | 2026-04-26 已补真实入口 E2E 证据 |
| 31 | Stoneford | 斯坦福 | 2026-04-26 已按卡图优先重录中文名，并修正为不额外洗牌 |
| 32 | Aramis | 阿拉密斯 | 2026-04-26 已按卡图优先重录中文名 |
| 33 | Sheriff | 警长 | 2026-04-26 已按卡图优先重录中文名 |
| 34 | Fighting Spirit Prize | 战斗精神奖 | 2026-04-26 已按卡图优先重录中文名 |
| 35 | Smart Set-Up | 聪明Set-Up | 2026-04-26 已按卡图优先重录中文名 |
| 36 | Shark Tattoo | 鲨鱼纹身 | 2026-04-26 当前静态数据与 locale 已一致 |
| 37 | It's Blitzin' Time! | 现在是闪电时间！ | 2026-04-26 已按卡图优先重录中文名 |
| 38 | Kaiju Conflict | 怪兽冲击 | 2026-04-26 已按卡图优先重录中文名 |
| 39 | Eh? | 嗯？ | 2026-04-26 当前静态数据与 locale 已一致 |
| 40 | Fast as Lightning | 快如闪电 | 2026-04-26 当前静态数据与 locale 已一致 |
| 41 | Bewitched | 着魔 | 2026-04-26 已按卡图优先重录中文名 |
| 42 | Mouse, Bird and Sausage | 老鼠、鸟和香肠 | 2026-04-26 已按卡图优先重录中文名 |
| 43 | High-Speed Chase | 高速追逐 | 2026-04-26 当前静态数据与 locale 已一致 |

### 2026-04-26 补记：世界冠军中文名与 6 个新基地复核

- 世界冠军静态数据、`public/locales/zh-CN/game-smashup.json`、Android 内置 locale 已统一到当前卡图优先口径：
  - `警长 / 阿拉密斯 / 斯坦福 / 女主角 / 盾牌少女 / 金币猫 / 武士 陈 / 着魔 / 战斗精神奖 / 现在是闪电时间！ / 怪兽冲击 / 老鼠、鸟和香肠 / 聪明Set-Up`
- 当前 `鲨鱼纹身 / 嗯？ / 快如闪电 / 高速追逐 / 海龟阿凯` 在运行时数据、镜像数据、主 locale、Android 内置 locale 中也已对齐，不再保留旧错名。
- 6 个新基地再次对照 `temp/wangling-base-title-0.png` ~ `temp/wangling-base-title-5.png`：
  - `Mermaid Reef / 人鱼暗礁 / 17`
  - `Mermaid Pool / 人鱼水池 / 23`
  - `Boneyard / 埋骨地 / 22`
  - `Ossuary / 藏骨堂 / 20`
  - `Arena / 竞技场 / 23`
  - `Hall of Fame / 名人堂 / 20`
- 当前代码中的名称、索引、断点值与上述基地标题切片一致，未再发现对调或旧名残留。
- `海龟阿凯` 的真实入口玩法留证也已补齐，见 `evidence/smashup/smashup-world-champs-akye-the-turtle-e2e-2026-04-26.md`。

## 基地图合同

| index | 英文名 | 图面中文名 | 结论 |
| --- | --- | --- | --- |
| 0 | Mermaid Reef | 人鱼暗礁 | 已于 2026-04-26 修正，当前代码与卡图一致 |
| 1 | Mermaid Pool | 人鱼水池 | 已于 2026-04-26 修正，当前代码与卡图一致 |
| 2 | Boneyard | 埋骨地 | 已于 2026-04-26 修正，当前代码与卡图一致 |
| 3 | Ossuary | 藏骨堂 | 当前代码与卡图一致 |
| 4 | Arena | 竞技场 | 当前代码与卡图一致 |
| 5 | Hall of Fame | 名人堂 | 当前代码与卡图一致 |

## 本轮重录裁定

1. `Mermaids`：按卡图 + Wiki 全量重录静态数据、i18n、能力实现、基地能力。
2. `Skeletons`：按卡图 + Wiki 全量重录静态数据、i18n、能力实现、基地能力。
3. `World Champs`：优先修中文卡名/文案；实现只改与图面/Wiki 不一致处。
4. 旧“10 周年三派系已收口”结论继续视为失效，必须在本轮修复完成后重审。

## 2026-04-25 当前实现进度

### 2026-04-26 第三轮回写

- `Mermaids`
  - `最后的歌声` 新确认并修复 1 个漏项：
    1. **目标基地准入错误**：卡图要求“选择一个你有仆从的基地”，旧实现却允许选择任意基地。
  - `迷倒观众` 新确认并修复两类漏项：
    1. **配置错误**：缺少 `playNeedsBase: true`，真实 UI 不会进入“先选基地”的打牌路径；
    2. **效果错误**：旧实现把“一个你在那里的仆从”错误做成了“任意基地上的一个己方随从”。
  - 已回写：
    - `src/games/smashup/abilities/mermaids.ts`
    - `src/games/smashup/data/factions/mermaids.ts`
    - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
    - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增真实入口证据：
    - `evidence/smashup/smashup-mermaids-ultimate-song-captive-audience-e2e-2026-04-26.md`
  - 当前 `Mermaids` 已补齐：
    - `最后的歌声` 的“只选你有仆从的基地” + 强制额外打出 + 取消 onPlay + 额外额度链路
    - `迷倒观众` 的“先选基地 -> 只选目标基地己方随从 -> +2 / 额外行动”链路
  - 这两条现在可以作为 `Mermaids` 的 L3 代表性玩法证据，但**不能外推成三新派系整包已收口**。

### 2026-04-26 第四轮回写

- `Mermaids`
  - `诱惑者 / Temptress`
    - 卡图切片：`temp/cards7-07.png`
    - 新确认旧实现漏掉“**其他玩家在自己的回合把自己的仆从移动到这里**”这条合法触发链。
    - 已改为基于 `minionsMovedToBaseThisTurn` 判定，并显式标注 `handlesPodInternally: true`，避免 `_pod` 自动映射把同一加成重复结算两次。
  - `无人岛 / Desert Island`
    - 卡图切片：`temp/cards7-11.png`
    - 失效回写：此前“**只压制行动拥有者自己在这里的随从总力量**”的解释是错的。
    - 卡图口径应为：**这里所有仆从都不能把自己的力量加到各自控制者的总力量中**；这不会改变基地总力量，只会同时压制双方/多方玩家在该基地的个人总力量。
    - 已回写：`src/games/smashup/domain/ongoingModifiers.ts`、`e2e/src/games/smashup/domain/ongoingModifiers.ts`、`src/games/smashup/__tests__/ongoingModifiers.test.ts`、`e2e/src/games/smashup/__tests__/ongoingModifiers.test.ts`
  - `塞壬的歌声 / Siren Song`
    - 卡图切片：`temp/cards7-03.png`
    - 新确认 1 个真实入口目标错误：旧来源基地候选只看“那里有没有其他玩家仆从”，没同时校验“是否存在另一个你有仆从的基地”，会把选了以后必然无效的来源基地也放进 prompt。
    - 已修成：只有存在至少 1 个**别的**己方基地可去时，该来源基地才可选。
  - `死亡海湾 / Toll Bay`
    - 卡图切片：`temp/cards7-04.png`
    - 本轮逐词复核后确认当前实现与卡图一致：**选择一个基地，按其他玩家在那里每有一个仆从抽一张牌**。
    - 已补聚焦断言，锁死“只数其他玩家仆从、不数己方仆从”的抽牌数量语义。
- 本轮验证：
  - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts --testNamePattern "Mermaids abilities"`
  - `npx vitest run src/games/smashup/__tests__/ongoingModifiers.test.ts --testNamePattern "mermaids_temptress|mermaids_desert_island|mermaids_charmed"`
- 本轮结果：
  - `Mermaids abilities`：`10 passed`
  - `ongoingModifiers` 聚焦：`3 passed`

### 2026-04-26 第五轮回写

- `Mermaids`
  - `塞壬 / Siren`
    - 卡图切片：`temp/cards7-06.png`
    - 失效回写：此前“**同一玩家在这里有多个仆从时只减 1 次**”的审计结论是错的。
    - 卡图口径应为：**其他玩家在这里的每个仆从都各自 -1 力量计入其控制者总力量**；不会改变基地总力量。
  - `人鱼暗礁 / Mermaid Reef`
    - 卡图切片：`temp/wangling-base-0.png`
    - 失效回写：此前把基地效果解释成“**同一玩家只统一减 1 次**”同样是错的。
    - 卡图口径应为：**你的回合内，其他玩家在这里的每个仆从都各自 -1 力量计入其控制者总力量**；不会改变基地总力量。
  - `无人岛 / Desert Island`
    - 延续第四轮失效回写，现已和 `塞壬 / 人鱼暗礁` 一并统一到 `getPlayerEffectivePowerOnBase` 的逐仆从口径。
  - 已回写：
    - `src/games/smashup/domain/ongoingModifiers.ts`
    - `e2e/src/games/smashup/domain/ongoingModifiers.ts`
    - `src/games/smashup/__tests__/ongoingModifiers.test.ts`
    - `e2e/src/games/smashup/__tests__/ongoingModifiers.test.ts`
- 本轮验证：
  - `npx vitest run src/games/smashup/__tests__/ongoingModifiers.test.ts --testNamePattern "mermaids_siren|base_mermaid_reef|mermaids_desert_island|mermaids_charmed|mermaids_temptress"`
- 本轮结果：
  - `ongoingModifiers` 聚焦：`10 passed`

### 2026-04-26 第六轮回写

- `Mermaids`
  - `安静的海岸 / Becalmed Shores`
    - 卡图切片：`temp/cards7-02.png`
    - 卡图口径：**打到基地上；持续：其他玩家在这里的仆从 -1 力量；天赋：把这张牌移到另一个基地。**
    - 当前实现复核：
      - 持续减力由 `registerOngoingPowerModifier('mermaids_becalmed_shores', 'base', 'opponentMinions', -1)` 覆盖；
      - 天赋移动由 `mermaidsBecalmedShoresTalent` + `handleMermaidsOngoingMove` 覆盖；
      - `newFactionAbilities.test.ts` 已覆盖真实交互 prompt。
    - 结论：**当前代码与卡图一致，本轮无新增修复。**
  - `沉船湾 / Shipwreck Cove`
    - 卡图切片：`temp/cards7-05.png`
    - 卡图口径：**打到基地上；持续：你在这里的仆从 +1 力量；特殊：这个基地计分后，你可以把这张牌移到另一个基地。**
    - 当前实现复核：
      - 持续加力由 `registerOngoingPowerModifier('mermaids_shipwreck_cove', 'base', 'ownerMinions', 1)` 覆盖；
      - 计分后可移动由 `mermaidsShipwreckCoveAfterScoring` 覆盖，且含跳过选项；
      - `newFactionAbilities.test.ts` 已覆盖打出后挂载 + 计分后迁移链路。
    - 结论：**当前代码与卡图一致，本轮无新增修复。**
  - `迷人的人 / Charmer`
    - 卡图切片：`temp/cards7-08.png`
    - 卡图口径：**天赋：你可以先把这个仆从移到另一个基地；然后你可以把另一个玩家一个力量 3 或以下的仆从移到相同的基地。**
    - 当前实现复核：
      - 第一段“先移动自己”由 `mermaidsCharmerTalent` / `handleMermaidsCharmerMove` 覆盖；
      - 第二段“再把别人的 3 力或以下仆从移到相同基地”由 `queueCharmerTargetPrompt` / `handleMermaidsCharmerTarget` 覆盖；
      - 若跳过第一段，自身留在原基地，第二段仍以该基地为目标，符合卡图语义；
      - `newFactionAbilities.test.ts` 已覆盖“先移自己，再拉别人的 3 力仆从”真实链路。
    - 结论：**当前代码与卡图一致，本轮无新增修复。**

### 2026-04-26 第二轮回写

- `Mermaids`
  - `最后的歌声` 与 `迷倒观众` 的 `zh-CN locale` 已按 `cards7-00.png / cards7-01.png` 回写。
- `Skeletons`
  - `灵车队伍` 已按卡图优先口径修成“普通效果可移动任意埋葬牌；特殊效果保留你的埋葬牌”。
  - `殉葬品` 已修正为“先强制首埋，再进入额外埋葬 / 挖掘分支”，且额外埋葬可选不同基地。
  - 对应真实入口 E2E 证据：`evidence/smashup/smashup-skeletons-grave-goods-hearse-fleet-e2e-2026-04-26.md`
- `World Champs`
  - `Stoneford / 斯坦福` 已去掉错误的“then shuffle / 洗牌”语义。
  - `Mummy / 木乃伊` 已按卡图维持 `ongoing + afterScoring` 口径，不再伪装成 `special`。
- 本轮验证：
  - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts src/games/smashup/__tests__/cardI18nIntegrity.test.ts`
  - `npm run i18n:check`
  - `npm run typecheck`

### Skeletons

- 已完成并通过聚焦验证：
  - `轮回者 / 往下埋 / 他们出来了 / 墓地爆发 / 墓园 / 骸骨之王 / 殉葬品 / 诡异。可怕。 / 灵车队伍 / 墓碑 / 守墓人 / 复仇者`
- 本轮真实验证命令：
  - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts -t "Skeletons abilities"`
  - `npm run typecheck`
- 本轮验证结果：
  - `Skeletons abilities`：`13 passed`
  - TypeScript：通过
- 已覆盖的合同点：
  - `轮回者`：打出自埋、被挖掘后再挖 1 张
  - `往下埋`：先选基地，再从弃牌堆埋葬至多 3 张总力量 ≤ 6 的随从
  - `他们出来了 / 墓地爆发`：按卡图改为“选基地/指定基地后挖掘埋葬牌”
  - `墓园 / 骸骨之王 / 殉葬品 / 墓碑`：改为“挖掘后再决定是否放指示物”，不再沿用旧错语义
  - `灵车队伍`：改为移动埋葬牌，不再错误操作弃牌堆
  - `守墓人`：补成“每回合一次，你的其他牌被埋葬或挖掘后抽 1”
  - `复仇者`：已改成“从弃牌堆埋葬到基地”的入口，不再沿用旧的“别处离场牌被埋葬”错语义
- 当前仍需明确标注的残余风险：
  - `复仇者` 图面是“你的回合中”，当前实现入口仍挂在 `onTurnStart`，属于**时机收窄**，不能算完全收口。
  - `Skeletons` 虽已补完当前聚焦单测，但整派系仍需和 `Mermaids / World Champs / 基地` 一起做最终整包重审，不能单独宣称三派系完成。

