# Smash Up 美人鱼派系：最后的歌声 / 迷倒观众 E2E 证据（2026-04-26）

## 审计范围

- 派系：`Mermaids / 美人鱼`
- 卡牌：
  - `mermaids_ultimate_song / 最后的歌声`
  - `mermaids_captive_audience / 迷倒观众`
- 目标：
  1. 用真实入口验证 `最后的歌声` 的“**只能选择你有仆从的基地** + 强制对手额外打出小随从 + 取消其打出能力 + 给予你额外行动/额外随从”链路；
  2. 用真实入口验证 `迷倒观众` 的“先选基地，再只允许选择该基地上你的随从，并按该基地非你控制随从数加力量”链路；
  3. 回写 2026-04-26 新发现的三类漏审：
     - **效果错误**：`最后的歌声` 旧实现错误允许选择任意基地，而不是“你有仆从的基地”；
     - **配置错误**：`迷倒观众` 缺少 `playNeedsBase: true`，真实 UI 不会进入选基地打出模式；
     - **效果错误**：`迷倒观众` 错把“该基地上的你的一个随从”实现成了“任意基地上的你的一个随从”。

## 权威来源

### 主真相源（卡图优先）

- `D:\gongzuo\webgame\BoardGame\temp\smashup-mermaids-card-crops-2026-04-26\wangling-00.png`
- `D:\gongzuo\webgame\BoardGame\temp\smashup-mermaids-card-crops-2026-04-26\wangling-01.png`

其中 `迷倒观众` 卡图正文明确为：

- “选择一个基地。”
- “那里每有一个你不拥有的仆从，**一个你在那里的仆从**就获得 +1 力量直到回合结束。”
- “打出一个额外的行动。”

### 代码/测试入口

- `src/games/smashup/abilities/mermaids.ts`
- `src/games/smashup/data/factions/mermaids.ts`
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 本轮修复

1. `src/games/smashup/data/factions/mermaids.ts`
   - 为 `mermaids_captive_audience` 补上 `playNeedsBase: true`。
2. `src/games/smashup/abilities/mermaids.ts`
   - 将 `mermaidsUltimateSongOnPlay` 的基地候选从“所有基地”收紧为“**你有仆从的基地**”。
3. `src/games/smashup/abilities/mermaids.ts`
   - 将 `mermaidsCaptiveAudienceOnPlay` 的候选目标从“全场你的随从”收紧为“**目标基地上**你的随从”。
4. `src/games/smashup/__tests__/newFactionAbilities.test.ts`
   - 回写断言：`最后的歌声` 不得把没有你仆从的基地放进候选。
   - 回写断言：`迷倒观众` 只能选择目标基地上的己方随从，其他基地己方随从不得进入候选。
5. `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
   - 回写真实入口场景：
     - `最后的歌声` 场景中额外放一个“只有对手随从、没有你方随从”的基地，防止“任意基地都可选”假通过；
     - `迷倒观众` 场景中目标基地同时有 2 个敌方随从 + 1 个己方随从；
     - 另一基地另放 1 个己方随从，专门防止“跨基地误选”假通过。

## 验证命令

1. 领域行为（L2）
   - `npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts --testNamePattern "mermaids_captive_audience|mermaids_ultimate_song"`
2. 真实入口（L3）
   - `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "最后的歌声应强制对手额外打出小随从且不触发其打出能力，并给予你额外行动与额外随从"`
   - `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "迷倒观众应按目标基地非己方随从数给己方随从加力量并给予额外行动"`

## 关键截图与肉眼结论

### 1. 最后的歌声：基地候选已收紧为“你有仆从的基地”

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\最后的歌声应强制对手额外打出小随从且不触发其打出能力，并给予你额外行动与额外随从\ultimate-song-base-prompt.png`

我实际看到：

1. 顶部明确显示“最后的歌声：选择目标基地”，说明当前还处在基地选择阶段，不是被静默跳过。
2. 只有左侧第一个基地出现绿色高亮边框；中间基地虽然有对手随从，但没有被点亮。
3. 这张图直接证明当前候选已经收紧到“**你有仆从的基地**”，不再允许误选“你没有仆从、只有对手随从的基地”。

验收判断：

- **达到验收标准**：成功证明 `最后的歌声` 的基地候选范围已经按卡图修正。

### 2. 最后的歌声：强制手牌选择

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\最后的歌声应强制对手额外打出小随从且不触发其打出能力，并给予你额外行动与额外随从\ultimate-song-forced-hand-prompt.png`

我实际看到：

1. 画面中央出现“最后的歌声：选择一张力量 3 或以下的随从额外打出到目标基地”，说明不是静默自动完成，而是真的进入了强制选择链路。
2. 左侧只看得到被迫打出的那张对手小随从牌，符合“力量 3 或以下”的约束。
3. 画面存在“正在等待 P1”提示，说明强制出牌的决策权确实交给了被影响玩家，而不是错误地仍由施放者代选。

验收判断：

- **达到验收标准**：成功证明了“最后的歌声”先选目标基地、再强制对手从手牌额外打出小随从的真实入口链路。

### 3. 最后的歌声：结算后额外额度落地

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\最后的歌声应强制对手额外打出小随从且不触发其打出能力，并给予你额外行动与额外随从\ultimate-song-resolved-extra-limits.png`

我实际看到：

1. 左侧目标基地已经同时出现原有己方随从与被强制打出的对手小随从，说明额外打出确实落到了目标基地。
2. 顶部连续出现“获得 1 次额外行动机会 / 获得 1 次额外随从机会”，说明施放者奖励已落地。
3. 画面中没有继续弹出 `海龟阿凯` 的后续 onPlay 链路，符合“取消那些仆从的能力直到回合结束”的要求。

验收判断：

- **达到验收标准**：成功证明“最后的歌声”在强制对手额外打出后，会跳过其 onPlay，并把额外行动/额外随从给到施放者。

### 4. 迷倒观众：只能选择目标基地上的己方随从

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\迷倒观众应按目标基地非己方随从数给己方随从加力量并给予额外行动\captive-audience-target-prompt.png`

我实际看到：

1. 顶部提示明确写着“迷倒观众：选择你的一个随从，获得 +2 力量直到回合结束”，说明目标基地上统计出的非己方随从数量为 2。
2. 只有左侧目标基地上的己方随从出现绿色高亮边框；另一基地上的己方随从没有被点亮。
3. 这张截图直接证明现在候选范围已经收紧到“**你在那里的仆从**”，而不是旧错误实现中的“全场任意己方随从”。

验收判断：

- **达到验收标准**：成功证明 `迷倒观众` 的目标候选已经按卡图语义修正为“目标基地上的己方随从”。

### 5. 迷倒观众：+2 只落到被选中的目标随从

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\迷倒观众应按目标基地非己方随从数给己方随从加力量并给予额外行动\captive-audience-resolved.png`

我实际看到：

1. 左侧目标基地上的被选中己方随从头上出现绿色 `+2` 标识，说明加成数值正确按“2 个非己方随从”落地。
2. 另一基地上的己方随从没有 `+2` 标识，说明没有再出现“跨基地误加成”的旧错误。
3. 右下角额外行动额度从 `0` 变成 `1`，说明卡牌第二段“打出一个额外的行动”也已真实生效。

验收判断：

- **达到验收标准**：成功证明 `迷倒观众` 的加成只会写到目标基地中被选中的己方随从，且额外行动额度同步落地。

## 维度命中

- `D1 语义保真`：修正了“任意基地都可选”与“任意己方随从都可选”两类误实现，恢复成卡图限定范围。
- `D5 交互完整`：补上 `playNeedsBase`，真实 UI 才会进入选基地打出路径。
- `D8 时序正确`：先选基地，再选该基地上的己方随从，再结算 +X 与额外行动。
- `D47 E2E 真实入口`：两张卡都已从真实打牌入口完成浏览器级证据补链，不再只靠单测或文案对照。

## 结论等级

- **代表性玩法已验证**

说明：

- `最后的歌声` 与 `迷倒观众` 这两条美人鱼关键链路现在已有卡图优先 + L2 + L3 证据；
- 但这仍然只是 `Mermaids` 派系的关键样本补证，**不等于三新派系整包已收口**。

## 对旧审计结论的回写

- 旧问题不是“只差多跑几条测试”，而是审计时把：
  - **目标基地准入**（是否只允许选“你有仆从的基地”）
  - **配置契约**（是否声明 `playNeedsBase`）
  - **目标范围语义**（是否限定在目标基地）
  - **真实入口验证**（是否真的从浏览器打牌入口走通）
  这四层拆开校验做得不够细。
- 因此这次必须把这组 `Mermaids` 补证明确记成：
  1. `最后的歌声`：**一个目标基地准入错误**
  2. `迷倒观众`：**一个配置错误**
  3. `迷倒观众`：**一个实现错误**
  4. **一个旧审计漏判案例**
