# Card06 占卜师 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_06`
- **卡牌名称**: 占卜师 (Diviner)
- **影响力**: 6
- **能力ID**: `ability_i_diviner`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> ⚡ 下一次遭遇中，你的对手必须在你之前朝上打出牌

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.DIVINER,
    name: 'abilities.diviner.name',
    description: 'abilities.diviner.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'revealFirst', target: 'opponent' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "diviner": {
            "name": "占卜师",
            "description": "下一次遭遇中，你的对手必须在你之前朝上打出牌"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "⚡ 下一次遭遇中，你的对手必须在你之前朝上打出牌"

**实现分析**（`src/games/cardia/domain/abilities/group6-special.ts`）:

```typescript
abilityExecutorRegistry.register(ABILITY_IDS.DIVINER, (ctx: CardiaAbilityContext) => {
    return {
        events: [
            {
                type: CARDIA_EVENTS.REVEAL_ORDER_CHANGED,
                payload: {
                    revealFirstPlayerId: ctx.opponentId,
                    forcedPlayOrderPlayerId: ctx.opponentId,  // 新增：强制先出牌
                },
                timestamp: ctx.timestamp,
            }
        ],
    };
});
```

**关键实现特性**:
1. ✅ 目标正确（对手：`ctx.opponentId`）
2. ✅ 揭示顺序改变（`revealFirstPlayerId: ctx.opponentId`）
3. ✅ 出牌顺序改变（`forcedPlayOrderPlayerId: ctx.opponentId`）
4. ✅ 事件类型正确（`REVEAL_ORDER_CHANGED`）

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "你的对手" → 目标为 `ctx.opponentId`
- "必须在你之前" → `forcedPlayOrderPlayerId: ctx.opponentId`（对手先出牌）
- "朝上打出牌" → `revealFirstPlayerId: ctx.opponentId`（对手的牌立即揭示）
- "下一次遭遇" → 通过 reducer 处理，只影响下一次遭遇

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "⚡ 下一次遭遇中，你的对手必须在你之前朝上打出牌"

**关键限定词**:
- "下一次遭遇" → 只影响下一次遭遇，不影响后续遭遇

**实现检查**:

1. ✅ **作用范围限定**: 通过 reducer 处理，只影响下一次遭遇
   - 实现层：发射 `REVEAL_ORDER_CHANGED` 事件
   - Reducer 层：设置 `revealFirstNextEncounter` 和 `forcedPlayOrderNextEncounter`
   - 回合结束后：清除这两个标记

2. ✅ **双重效果**: 同时改变揭示顺序和出牌顺序
   - `revealFirstPlayerId`: 对手的牌立即揭示（朝上）
   - `forcedPlayOrderPlayerId`: 对手必须先出牌（在你之前）

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 只影响下一次遭遇（通过 reducer 清除标记）
- 同时改变揭示顺序和出牌顺序
- 正确处理"对手先出牌"和"对手的牌立即揭示"两个效果

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `DIVINER: 'ability_i_diviner'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group6-special.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.DIVINER, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'onLose'`）
- ✅ 事件发射正确（`REVEAL_ORDER_CHANGED`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**UI**:
- ✅ 能力按钮显示（`[data-testid="cardia-activate-ability-btn"]`）
- ✅ 出牌顺序变化显示（对手先出牌）
- ✅ 揭示顺序变化显示（对手的牌立即揭示）

**数据流闭环**: ✅ **通过**

完整的数据流链路：
1. 定义：`ids.ts` + `abilityRegistry.ts` + i18n
2. 注册：`abilityExecutorRegistry.register()`
3. 执行：发射 `REVEAL_ORDER_CHANGED` 事件
4. UI：显示能力按钮、出牌顺序变化、揭示顺序变化

---

## D47 审计：E2E 测试覆盖完整性

### 4.1 测试文件

**测试文件**: `e2e/cardia-deck1-card06-diviner.e2e.ts`

**测试模式**: ✅ 联机模式 + 状态注入

**测试用例**:

1. ✅ **完整流程：对手下次先出牌且强制出明牌**
   - 回合1：P1 打出占卜师（影响力6），P2 打出傀儡师（影响力10）
   - P1 失败，激活占卜师能力
   - 验证点（回合1结束后）：
     - `revealFirstNextEncounter` 设置为对手ID
     - `forcedPlayOrderNextEncounter` 设置为对手ID
   - 回合2：验证对手先出牌且强制出明牌
     - P2 先出牌（影响力3，外科医生）
     - P2 的牌立即揭示（`cardRevealed: true`）
     - P1 后出牌（影响力1，雇佣剑士）
   - 回合3：验证能力只影响一次遭遇
     - P1 打出影响力2（虚空法师）
     - P1 的牌不会立即揭示（恢复正常）
     - P2 打出影响力4（调停者）

### 4.2 测试质量

**状态断言**: ✅ 完整
- 验证 `revealFirstNextEncounter` 设置为对手ID
- 验证 `forcedPlayOrderNextEncounter` 设置为对手ID
- 验证对手先出牌（`hasPlayed: true`）
- 验证对手的牌立即揭示（`cardRevealed: true`）
- 验证能力只影响一次遭遇（回合3恢复正常）

**测试模式**: ✅ 正确
- 使用联机模式（`setupCardiaTestScenario`）
- 使用状态注入（`player1.hand`, `player2.hand`）
- 使用辅助函数（`playCard`, `waitForPhase`, `readCoreState`）

**最终状态验证**: ✅ 完整
- 验证揭示顺序标记设置和清除
- 验证出牌顺序标记设置和清除
- 验证对手先出牌且强制出明牌
- 验证能力只影响一次遭遇

### 4.3 边界场景覆盖

**核心场景**: ✅ 完整覆盖
- 完整流程：对手下次先出牌且强制出明牌
- 作用范围：只影响下一次遭遇

**边界场景**: ✅ 完整覆盖
- 对手先出牌（`forcedPlayOrderNextEncounter` 生效）
- 对手的牌立即揭示（`revealFirstNextEncounter` 生效）
- 能力只影响一次遭遇（回合3恢复正常）

**E2E 测试覆盖**: ✅ **Full (100/100)**

测试覆盖非常完整：
- 1 个完整流程测试（覆盖3个回合）
- 所有关键边界场景覆盖
- 状态断言完整
- 测试模式正确

---

## 审计结论

### 总体评估

**状态**: ✅ **优秀**

**评分**: 100/100

**评分说明**:
- D1（语义保真）: 25/25 ✅
- D2（边界完整）: 25/25 ✅
- D3（数据流闭环）: 20/20 ✅
- D47（E2E 测试覆盖）: 30/30 ✅

### 发现问题

**P0（严重）**: 0 个

**P1（重要）**: 0 个

**P2（次要）**: 0 个

---

## 修复建议

无需修复。实现和测试都非常完整。

---

## 附录

### A. 相关文件

- **规则文档**: `src/games/cardia/rule/卡迪亚规则.md`
- **能力定义**: `src/games/cardia/domain/abilityRegistry.ts`
- **能力执行器**: `src/games/cardia/domain/abilities/group6-special.ts`
- **E2E 测试**: `e2e/cardia-deck1-card06-diviner.e2e.ts`
- **i18n 文案**: `public/locales/zh-CN/game-cardia.json`

### B. 关键代码片段

**能力执行器**:
```typescript
abilityExecutorRegistry.register(ABILITY_IDS.DIVINER, (ctx: CardiaAbilityContext) => {
    return {
        events: [
            {
                type: CARDIA_EVENTS.REVEAL_ORDER_CHANGED,
                payload: {
                    revealFirstPlayerId: ctx.opponentId,
                    forcedPlayOrderPlayerId: ctx.opponentId,
                },
                timestamp: ctx.timestamp,
            }
        ],
    };
});
```

---

**审计日期**: 2025-01-19  
**审计人员**: AI Assistant  
**审计版本**: 1.0
