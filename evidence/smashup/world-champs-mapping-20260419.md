# World Champs 逐卡裁定表（2026-04-19）

> 对应 OpenSpec 任务 `2.3`：为 World Champs 建立“直接复用 / 复制改名 / 全新实现”裁定并落地。

## 2026-04-25 重审补记

- 本表中的“已落地”只代表“实现与注册已落到代码”，**不再自动等价于“真实玩法已审计收口”**。
- `world_champs_stoneford` 当前仅有引擎级单测证据，缺少从真实对局入口打出后的浏览器级玩法留证。
- 若后续确认 `Stoneford` 在真实链路中存在“不触发 / 触发错误 / UI 未呈现可选项”等问题，则应判定为：
  - 对象级高优先级玩法 bug；
  - 同时也是旧三派系收口文档的反证，必须连带降级旧汇总结论。

## 裁定口径

- **直接复用**：语义与现有能力完全一致，仅绑定到新 defId。
- **复制改名**：主语义一致，但需要独立 sourceId / 文案 / 限制条件，不能直接别名。
- **全新实现**：仓库内无可直接复用语义，或需要新交互链路。

## 逐卡裁定

| 卡牌 | 裁定 | 依据 | 当前状态 |
| --- | --- | --- | --- |
| `world_champs_sheriff` | 复制改名 | 与牛仔决斗链路相似，但 sourceId/触发来源不同 | 已落地（beforeScoring 触发 + 决斗） |
| `world_champs_aramis` | 全新实现 | 直接影响同随从后额外行动，现有无等价“同目标复制影响”抽象 | 已落地（onMinionAffected 每回合一次额外行动） |
| `world_champs_stoneford` | 复制改名 | 与“检索行动卡+洗牌”语义近似，但需保留新卡来源标识 | 已落地 |
| `world_champs_akye_the_turtle` | 全新实现 | “交牌给对手换抽牌”无现成 handler | 本轮已落地 |
| `world_champs_diva` | 全新实现 | “同回合同目标复制影响”无现成稳定抽象 | 已落地（拦截复制同基地标准行动影响，每回合一次） |
| `world_champs_shield_maiden` | 直接复用（逻辑） | 与维京 `shield_maiden` 核心语义一致（揭示顶牌并按条件拿牌） | 已落地（独立 sourceId） |
| `world_champs_calicoin` | 复制改名 | 单体 +1 指示物语义可复用通用 helper | 已落地 |
| `world_champs_mummy` | 复制改名 | 与埃及木乃伊同类“计分后转移/埋葬”链路 | 已落地 |
| `world_champs_rainbow_girl` | 复制改名 | 同基地己方其他随从临时加成 | 已落地 |
| `world_champs_samurai_chan` | 复制改名 | “离场进弃牌堆后抽牌”语义已有触发模板 | 已落地 |
| `world_champs_bewitched` | 全新实现 | 附着 +2 且离场后转附着目标，需新迁移链路 | 已落地（离场转附着交互 + removeFromDiscard） |
| `world_champs_eh` | 全新实现 | 特殊时机 + 可回手 + 临时加成组合在库内无等价 | 本轮已落地（首版） |
| `world_champs_fast_as_lightning` | 全新实现 | 临时加成 + “本回合离场改回手”替代结算语义 | 本轮已落地（首版） |
| `world_champs_fighting_spirit_prize` | 复制改名 | 抽牌+分配指示物可由通用 helper 组合 | 已落地 |
| `world_champs_high_speed_chase` | 全新实现 | 行动卡迁移 + 随从迁移 + 临时加成组合 | 本轮已落地（首版） |
| `world_champs_its_blitzin_time` | 复制改名 | 单目标本回合 +3 可复用已有模式 | 已落地 |
| `world_champs_kaiju_conflict` | 直接复用（逻辑） | 额外行动额度发放为通用链路 | 已落地 |
| `world_champs_mouse_bird_and_sausage` | 全新实现 | 同基地同派系多选增益链路无现成模板 | 本轮已落地（首版） |
| `world_champs_shark_tattoo` | 全新实现 | 附着+指示物+回合开始条件触发组合 | 本轮已落地（首版） |
| `world_champs_smart_set_up` | 全新实现 | 附着在对手随从 + 首次触发抽牌规则 | 已落地（首次触发抽牌并打标防重复） |

## 备注

- 关键覆盖测试：`src/games/smashup/__tests__/newFactionAbilities.test.ts`（World Champs 段落，含 aramis/diva/smart_set_up/bewitched 等核心用例）。
- 后续如再修订本表，必须回填对应测试与 evidence 链接，保证“裁定→实现→验证”闭环可追溯。
