## 1. Analysis & Modeling
- [ ] 1.1 盘点并分类 DiceThrone 当前所有掷骰入口：主骰、目标掷骰、`rollDie`、奖励骰、对掷/比骰、Ultimate 结算骰。
- [ ] 1.2 为每类掷骰定义统一的上下文元数据：归属玩家、目标玩家、所属阶段、可否改骰、可否重掷、是否允许对手干预、是否已进入 Ultimate 锁定。
- [ ] 1.3 明确哪些现有 `displayOnly` 场景其实应改为可交互骰子上下文，哪些仍可保留为纯展示回放。

## 2. Engine / Domain Refactor
- [ ] 2.1 设计并实现 DiceThrone 的统一临时骰池状态与事件模型，使非主骰也能进入标准校验与交互链路。
- [ ] 2.2 重构 `effects.ts` / `customActions/*`，让规则上可干预的额外掷骰不再直接 `displayOnly + immediate resolution`。
- [ ] 2.3 重构 `commandValidation.ts` / `execute.ts` / `executeTokens.ts`，使 `MODIFY_DIE` / `REROLL_DIE` / 相关卡牌效果能作用于当前活动骰子上下文，而不只绑定 `state.dice`。
- [ ] 2.4 重构 `flowHooks.ts` / `systems.ts`，确保可交互额外骰会正确阻塞阶段推进，结算完成后再恢复流程。

## 3. UI & Presentation
- [ ] 3.1 扩展骰盘/交互 UI，使目标掷骰与可干预额外骰能使用统一可操作视图。
- [ ] 3.2 收敛 `BonusDieOverlay` / `useCardSpotlight` / `BoardOverlays` 的职责，只保留不可干预结果展示与回放。
- [ ] 3.3 为多人局与 2v2 明确显示当前骰子上下文的拥有者、目标与可干预边界。

## 4. Verification
- [ ] 4.1 为目标掷骰、额外技能骰、奖励骰重掷、Ultimate 锁定分别补领域测试。
- [ ] 4.2 为至少 1 条“之前 displayOnly、现在进入统一骰盘”的真实技能链路补 E2E。
- [ ] 4.3 产出证据文档，逐项说明哪些掷骰已从特效链迁移到统一可交互链路。
