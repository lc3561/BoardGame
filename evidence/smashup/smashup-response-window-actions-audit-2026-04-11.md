# 大杀四方：计分前响应窗口行动牌审计（2026-04-11）

## 1. 审计范围
- **范围**：所有 Wiki 描述中包含“Before a base scores / Play before a base scores”的行动牌。
- **目标**：确认这些行动牌在代码中能正确区分：
  - **只能计分前打**（special 行动牌）
  - **平时可打 + 计分前也可打**（standard + responseWindowTiming）
- **涉及派系**：
  - Ancient Egyptians、Pirates、Cowboys、Ninjas、Samurai、Elder Things、Miskatonic University、Giant Ants

## 2. 权威来源
- Smash Up Fandom Wiki（通过脚本抓取 Wikitext）  
  - `node scripts/scrape-wiki-with-descriptions.mjs`
  - 生成文件：`wiki-cards-with-descriptions.json`

## 3. 逐项结论（按卡牌）

> 记号说明  
> - **标准+响应**：`subtype=standard` + `responseWindowTiming=beforeScoring`  
> - **计分前专用**：`subtype=special` + `specialTiming/beforeScoring`（可省略 specialTiming，默认 beforeScoring）

### Ancient Egyptians
- **Lost Knowledge**
  - Wiki 描述：`Special: Play before a base scores. ...`
  - 结论：**标准+响应** ✅  
  - 代码：`subtype=standard`, `responseWindowTiming=beforeScoring`
- **Plague of Locusts**
  - Wiki 描述：`Special: ... play this before a base scores. Choose a base...`
  - 结论：**标准+响应** ✅  
  - 代码：`subtype=standard`, `responseWindowTiming=beforeScoring`, `playNeedsBase=true`, `responseWindowNeedsBase=true`

### Pirates
- **Full Sail**
  - Wiki 描述：`Special: Before a base scores, you may play this card.`
  - 结论：**标准+响应** ✅  
  - 代码：`subtype=standard`, `responseWindowTiming=beforeScoring`

### Cowboys
- **Dynamite Surprise**
  - Wiki 描述：`Special: Before a base scores ...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialTiming=beforeScoring`, `specialNeedsBase=true`

### Ninjas
- **Hidden Ninja**
  - Wiki 描述：`Special: Before a base scores, play a minion there.`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialNeedsBase=true`

### Samurai
- **Heart of the Battle**
  - Wiki 描述：`Special: Play before a base scores. ...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialTiming=beforeScoring`, `specialNeedsBase=true`

### Elder Things
- **The Price of Power**
  - Wiki 描述：`Special: Before a base scores, ...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialNeedsBase=true`

### Miskatonic University
- **“Old Man Jenkins!?”**
  - Wiki 描述：`Special: Before a base scores, destroy...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialNeedsBase=true`
- **Things Best Not Known**
  - Wiki 描述：`Special: Before a base scores, choose a minion...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialNeedsBase=true`

### Giant Ants
- **Under Pressure**
  - Wiki 描述：`Special: Before a base scores, ...`
  - 结论：**计分前专用** ✅  
  - 代码：`subtype=special`, `specialTiming=beforeScoring`, `specialNeedsBase=true`

## 4. 文案一致性修订（D1 子项：响应窗口可选打出）
发现以下卡牌中文文案为英文，并缺少“你可以打出本卡”语义，已修正：
- `ancient_egyptians_lost_knowledge`
- `ancient_egyptians_plague_of_locusts`
- `samurai_heart_of_the_battle`
- `samurai_heart_of_the_battle_pod`

修订口径：  
`特殊：在一个基地计分前，你可以打出本卡。...`

## 5. 验证证据
- 运行测试：
  - `npx vitest src/games/smashup/__tests__/properties/coreProperties.test.ts`
  - `npx vitest src/games/smashup/__tests__/response-window-skip.test.ts`

## 6. 未覆盖风险
- 本轮仅聚焦“计分前响应窗口行动牌”，未对 **计分后响应窗口** 行动牌进行全量复核。
- Wiki vs 代码数量一致性（其他派系）存在差异报告，未在本审计范围内展开修复。

## 7. 修订记录
- 2026-04-11：补齐 4 张行动牌中文文案的“可选打出”语义，确保不会误读为“必须打出”。
