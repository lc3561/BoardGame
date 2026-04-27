# SmashUp 世界冠军《警长 / 木乃伊》真实入口 E2E 证据（2026-04-26）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：
  - `world_champs_sheriff / 警长`
  - `world_champs_mummy / 木乃伊`
- 目标：
  1. 补齐《警长》“基地计分前 -> 选择同基地敌方仆从 -> 进入决斗 -> 落败者被摧毁”的 L3 真实入口证据。
  2. 补齐《木乃伊》“基地计分后 -> 选择另一个基地 -> 自身被埋葬到目标基地”的 L3 真实入口证据。
  3. 回写这两张牌此前为什么会被误判成“数据录入可能有问题”：本轮确认主问题不是卡图录错，而是旧 E2E 链路不真、场景被别的 beforeScoring/泰坦残留污染。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-33.png`（《警长》）
  - `temp/cards7-25.png`（《木乃伊》）
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 当前能力回归文件：`src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 执行命令

```powershell
$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "警长应在基地计分前发起决斗并摧毁落败随从"
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "木乃伊应在基地计分后埋葬到另一个基地"
```

## 结果

- `警长应在基地计分前发起决斗并摧毁落败随从` → `1 passed`
- `木乃伊应在基地计分后埋葬到另一个基地` → `1 passed`

## 根因修订

### 《警长》

- 本轮确认不是《警长》能力没实现。
- 真正根因是旧 E2E helper 只盯着 host 视角，漏掉了 guest 私有的决斗牌 prompt；再加上“跳过决斗牌”不能点泛化 `Pass`，所以旧证据会误判成“业务没继续推进”。
- 另一个污染源是注入场景残留的 titan / 旧 draft 字段；清理后，《警长》真实决斗链能稳定跑通。

### 《木乃伊》

- 本轮确认不是《木乃伊》卡图或静态数据录错。
- 真正根因是旧 E2E 场景同时塞了《警长》，导致计分窗口先进入了 beforeScoring reaction choose；《木乃伊》的 afterScoring 入口被前置交互污染。
- 本轮把场景收紧为《木乃伊》+ 单张高战力己方随从后，afterScoring 入口可以稳定直达。

## 关键截图与肉眼结论

> 说明：本轮稳定截图由 `saveStableScreenshot(...)` 直接落在 `e2e/evidence/screenshots/`，因此这里引用的是该目录下的绝对路径。

### 一、《警长》

#### 1. 决斗牌 prompt 已出现

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-sheriff-duel-card-prompt-2026-04-26.png`
- 我实际看到：
  1. 左侧基地下方能直接看到《警长》本体和被选中的敌方小随从，说明这是“基地计分前真实触发 -> 选中目标 -> 进入决斗”后的画面，不是裸注入 prompt。
  2. 画面中央能看到“跳过（不出决斗牌）”按钮，顶部也能看到决斗进行中的提示，说明已经进入 `smashup_duel_card` 阶段，而不是卡在《警长》第一段选目标。
  3. 右侧调试面板里 `interaction.current.id` 已是 `smashup_duel_card_*`，与《警长》选完目标后应切到决斗牌交互的规则一致。
- 是否达到验收标准：
  - **达到。** 这张图能直接证明《警长》的真实入口已经从“计分前反应选择”推进到了“决斗牌交互”。

#### 2. 决斗收口后落败随从已消失

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-sheriff-duel-resolved-2026-04-26.png`
- 我实际看到：
  1. 左侧基地上还保留着《警长》与己方高战力仆从，但之前被点名的敌方小随从已经不在这个基地，符合“摧毁失败的仆从”。
  2. 顶部决斗提示和中央决斗按钮都已经消失，说明这条链路已经正常收口，没有卡在 `activeDuel` 或后续 prompt。
  3. 右侧面板当前阶段已回到 `playCards`，说明计分前决斗链跑完后，对局继续进入下一正常阶段，而不是停在特殊交互里。
- 是否达到验收标准：
  - **达到。** 这张图证明《警长》的真实决斗链已经跑完，而且失败方随从确实从场上移除。

### 二、《木乃伊》

#### 1. afterScoring 目标基地提示已出现

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-mummy-after-scoring-prompt-2026-04-26.png`
- 我实际看到：
  1. 顶部明确写着“木乃伊：你可以将本随从埋葬到另一个基地”，与卡图“基地计分后，你可以埋葬这个仆从到另一个基地”一致。
  2. 中间和右侧两个基地出现绿色高亮边框，左侧正在计分的基地被灰掉，说明候选确实是“另一个基地”，不是把原基地也错误放进选项。
  3. 左侧当前计分基地上还能看到《木乃伊》本体与己方高战力仆从，说明触发发生在真实计分后的窗口，而不是木乃伊已经提前离场。
- 是否达到验收标准：
  - **达到。** 这张图直接证明《木乃伊》的 afterScoring 真入口已经出现，而且目标范围是“另一个基地”。

#### 2. 选择后已埋葬到目标基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-mummy-buried-on-other-base-2026-04-26.png`
- 我实际看到：
  1. 中间目标基地下方出现了一张背面埋葬牌，说明《木乃伊》已经不是继续站在原计分基地上，而是被埋入新基地。
  2. 左侧原计分基地已经清空，不再看到《木乃伊》本体，符合“把这个仆从埋葬到另一个基地”的结果。
  3. 顶部没有残留 `木乃伊` prompt，右侧阶段已进入 `playCards`，说明这条 afterScoring 链已经正常收口。
- 是否达到验收标准：
  - **达到。** 这张图证明《木乃伊》不只是 prompt 出现了，而是真的从原基地移除并埋到了目标基地。

## 状态断言补充

### 《警长》

- E2E 断言：
  - `world_champs_sheriff_before_scoring` 的候选包含 `enemy-target`
  - 选中目标后必须进入 `smashup_duel_card`
  - 决斗收口后 `activeDuel === null`
  - `enemy-target` 不再出现在任何基地的 `minions` 列表

### 《木乃伊》

- E2E 断言：
  - `interaction.sourceId === 'world_champs_mummy_after_scoring'`
  - 候选基地中包含 `baseIndex === 1`
  - 结算后 `resolvedCore.bases[1].buriedCards` 包含 `mummy-live`
  - `resolvedCore.bases[0].minions` 不再包含 `mummy-live`

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- 旧“《警长》《木乃伊》可能是数据录入或卡图索引又出了问题”的怀疑，在当前基线上需要降级。
- 当前更准确的结论是：
  1. 《警长》与《木乃伊》本体语义没有再被卡图推翻；
  2. 旧误判主要来自 E2E 链路不真、场景污染和私有 prompt 观察面错误；
  3. 这两张牌现在都已补到浏览器级 L3 证据。
- 但这**仍不等于** `World Champs / 世界冠军` 整派系或“三新派系整包”已经最终收口；总文档仍维持“仍有残余范围”。
