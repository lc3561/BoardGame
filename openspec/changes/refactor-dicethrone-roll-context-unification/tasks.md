## 1. 建模与迁移设计
- [ ] 1.1 盘点 DiceThrone 当前所有“额外掷骰”入口，按“可改骰 / Ultimate 锁定 / 纯展示”三类建立迁移清单。
- [ ] 1.2 定义统一 `roll context` 状态模型、来源元数据和结算模式，明确与 `pendingAttack`、`responseWindow`、`interaction` 的边界。

## 2. 领域层重构
- [ ] 2.1 将通用改骰 / 重掷命令、校验与交互入口改为面向“当前活跃掷骰上下文”，不再只绑定 `core.dice`。
- [ ] 2.2 迁移 `rollDie` 效果和现有 `displayOnly` 额外掷骰，使规则上可改骰的掷骰进入统一掷骰上下文。
- [ ] 2.3 迁移现有 `pendingBonusDiceSettlement` 路径，收敛为统一结算模型，避免“有些可交互、有些直接展示”的分叉。
- [ ] 2.4 为 Ultimate 成功发动后的结算骰增加不可修改门禁，并补齐命令级错误口径。
- [ ] 2.5 保持 Targeting Roll、attack bonus、threshold effect、direct damage 等现有结算语义在新模型下不回归。

## 3. UI 与 AI
- [ ] 3.1 统一 DiceTray / BonusDieOverlay / 卡牌特写对掷骰上下文的消费，确保当前活跃掷骰具有单一权威展示。
- [ ] 3.2 更新被动能力、通用骰子卡、AI 行动枚举与权重逻辑，使其可识别额外掷骰上下文。

## 4. 验证
- [ ] 4.1 补齐领域测试：额外掷骰可被通用改骰卡 / 被动 / 对手响应修改。
- [ ] 4.2 补齐领域测试：Ultimate 结算骰不可修改。
- [ ] 4.3 补齐领域测试：Targeting Roll 与额外掷骰不会互相污染当前骰面上下文。
- [ ] 4.4 补齐 UI / E2E 证据：至少覆盖“可改骰额外掷骰”和“Ultimate 锁定额外掷骰”两条真实链路。
