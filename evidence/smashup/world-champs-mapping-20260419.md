# World Champs 逐卡裁定表（2026-04-19）

> 对应 OpenSpec 任务 `2.3`：为 World Champs 建立“直接复用 / 复制改名 / 全新实现”裁定并落地。

## 裁定口径

- **直接复用**：语义与现有能力完全一致，仅绑定到新 defId。
- **复制改名**：主语义一致，但需要独立 sourceId / 文案 / 限制条件，不能直接别名。
- **全新实现**：仓库内无可直接复用语义，或需要新交互链路。

## 逐卡裁定

| 卡牌 | 裁定 | 依据 | 当前状态 |
| --- | --- | --- | --- |
| `world_champs_sheriff` | 复制改名 | 与牛仔决斗链路相似，但 sourceId/触发来源不同 | 已落地（beforeScoring 触发 + 决斗） |
| `world_champs_aramis` | 全新实现 | 直接影响同随从后额外行动，现有无等价“同目标复制影响”抽象 | 待实现 |
| `world_champs_stoneford` | 复制改名 | 与“检索行动卡+洗牌”语义近似，但需保留新卡来源标识 | 已落地 |
| `world_champs_akye_the_turtle` | 全新实现 | “交牌给对手换抽牌”无现成 handler | 本轮已落地 |
| `world_champs_diva` | 全新实现 | “同回合同目标复制影响”无现成稳定抽象 | 待实现 |
| `world_champs_shield_maiden` | 直接复用（逻辑） | 与维京 `shield_maiden` 核心语义一致（揭示顶牌并按条件拿牌） | 已落地（独立 sourceId） |
| `world_champs_calicoin` | 复制改名 | 单体 +1 指示物语义可复用通用 helper | 已落地 |
| `world_champs_mummy` | 复制改名 | 与埃及木乃伊同类“计分后转移/埋葬”链路 | 已落地 |
| `world_champs_rainbow_girl` | 复制改名 | 同基地己方其他随从临时加成 | 已落地 |
| `world_champs_samurai_chan` | 复制改名 | “离场进弃牌堆后抽牌”语义已有触发模板 | 已落地 |
| `world_champs_bewitched` | 全新实现 | 附着 +2 且离场后转附着目标，需新迁移链路 | 待实现 |
| `world_champs_eh` | 全新实现 | 特殊时机 + 可回手 + 临时加成组合在库内无等价 | 本轮已落地（首版） |
| `world_champs_fast_as_lightning` | 全新实现 | 临时加成 + “本回合离场改回手”替代结算语义 | 本轮已落地（首版） |
| `world_champs_fighting_spirit_prize` | 复制改名 | 抽牌+分配指示物可由通用 helper 组合 | 已落地 |
| `world_champs_high_speed_chase` | 全新实现 | 行动卡迁移 + 随从迁移 + 临时加成组合 | 本轮已落地（首版） |
| `world_champs_its_blitzin_time` | 复制改名 | 单目标本回合 +3 可复用已有模式 | 已落地 |
| `world_champs_kaiju_conflict` | 直接复用（逻辑） | 额外行动额度发放为通用链路 | 已落地 |
| `world_champs_mouse_bird_and_sausage` | 全新实现 | 同基地同派系多选增益链路无现成模板 | 本轮已落地（首版） |
| `world_champs_shark_tattoo` | 全新实现 | 附着+指示物+回合开始条件触发组合 | 本轮已落地（首版） |
| `world_champs_smart_set_up` | 全新实现 | 附着在对手随从 + 首次触发抽牌规则 | 待实现 |

## 备注

- “首版”表示主链路已接通，后续仍需在规则核对阶段补齐边界语义（尤其是替代结算、一次/每回合门限、优先级冲突）。
- 后续每次修订本表时，必须回填对应测试与 evidence 链接，保证“裁定→实现→验证”闭环可追溯。
