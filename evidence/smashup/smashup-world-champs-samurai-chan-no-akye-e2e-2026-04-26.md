# SmashUp 世界冠军《武士 陈》负路径 E2E 证据（2026-04-26）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：`world_champs_samurai_chan / 武士 陈`
- 目标：
  1. 证明当前 UI 基线下，打出《武士 陈》后**不会**再错误弹出《海龟阿凯》的“交给对手一张手牌并抽两张”交互。
  2. 为 `69e61a97ec9760fc42d2f46e` 这条“看起来像打出武士 陈，却触发海龟阿凯效果”的历史反馈补浏览器级负路径证据。

## 运行命令

- `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "武士 陈打出后不应触发海龟阿凯的交牌抽二交互"`

## 结论等级

- **代表性玩法已验证**

## 关键截图与肉眼结论

### 1. 武士 陈打出后已稳定留在基地，且没有错误 prompt

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\武士-陈打出后不应触发海龟阿凯的交牌抽二交互\samurai-chan-play-no-akye-prompt.png`
- 我实际看到：
  1. 左侧基地下方能直接看到《武士 陈》卡面本体，说明这张牌已经真实打出落地，不是只停留在手牌或注入态。
  2. 画面中央和顶部都没有出现《海龟阿凯》那条“选择一位玩家并交给其一张手牌”的 prompt。
  3. 右下角弃牌堆为 `0`，对手手牌也没有新增卡牌提示，说明没有误执行“交牌 + 抽两张”链路。
- 是否达到验收标准：
  - **达到。** 这张图直接证明当前浏览器基线下，打出《武士 陈》不会再重现“误触发海龟阿凯效果”的老问题。

## 状态断言补充

- `sys.interaction.current?.data?.sourceId` 不是：
  - `world_champs_akye_the_turtle_player`
  - `world_champs_akye_the_turtle_card`
- `player0.hand.length === 0`
- `player1.hand.length === 0`
- `core.bases[0].minions` 包含 `world_champs_samurai_chan`
- 页面文本中不存在《海龟阿凯》交牌 prompt

## 结论回写

- 这条证据和 `smashup-feedback-69e61a97-world-champs-card-index-fix-2026-04-25.md` 一起看时，可以把用户当时看到的“武士 陈 -> 海龟阿凯效果”明确归因为**图集索引错位**的历史问题，而不是当前《武士 陈》能力实现仍然串线。

## 当前残余范围

- 本文只补了《武士 陈》的浏览器级负路径证据，不等于 `World Champs / 世界冠军` 整派系已收口。
- 三新派系整包结论仍以总审计文档的“仍有残余范围”为准。
