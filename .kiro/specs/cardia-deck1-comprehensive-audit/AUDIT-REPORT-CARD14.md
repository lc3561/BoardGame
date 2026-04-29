# Card14 女导师 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_14`
- **卡牌名称**: 女导师 (Governess)
- **影响力**: 14
- **派系**: 学院 (Academy)
- **能力ID**: `ability_i_governess`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 14：女导师 - 复制并发动你的一张影响力不小于本牌的已打出牌的即时能力

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.GOVERNESS,
    name: 'abilities.governess.name',
    description: 'abilities.governess.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'copyAbility', target: 'self', requiresChoice: true, condition: 'influence_gte_14' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "governess": {
            "name": "女导师",
            "description": "复制并发动你的一张影响力不小于本牌的已打出牌的即时能力"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "复制并发动你的一张影响力不小于本牌的已打出牌的即时能力"

**实现分析**（`src/games/cardia/domain/abilities/group5-copy.ts`）:


**关键实现特性**:
1. ✅ 查找己方场上影响力≥14的卡牌（排除当前卡牌）
2. ✅ 检查卡牌是否有即时能力（`card.abilityIds.length > 0`）
3. ✅ 计算当前影响力（基础影响力 + 修正标记）
4. ✅ 创建交互让玩家选择目标卡牌（`card_selection` 交互）
5. ✅ 递归执行被复制的能力（调用目标能力的执行器）
6. ✅ 发射 `ABILITY_COPIED` 事件（用于日志记录）
7. ✅ 传递被复制能力的交互（如果被复制能力需要交互）
8. ✅ 如果没有符合条件的卡牌，发射 `ABILITY_NO_VALID_TARGET` 事件

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "你的一张" → 查找己方场上卡牌（`player.playedCards`）
- "影响力不小于本牌" → 检查 `currentInfluence >= 14`
- "已打出牌" → 从 `playedCards` 中查找（排除当前卡牌）
- "即时能力" → 检查 `card.abilityIds.length > 0`
- "复制并发动" → 递归调用目标能力的执行器

### 1.2 触发时机一致性

**abilityRegistry 定义**: `trigger: 'onLose'`

**实现验证**:
- ✅ 能力执行器在失败时被调用
- ✅ 触发时机与描述一致（失败时激活）

### 1.3 目标选择一致性

**官方描述**: "你的一张影响力不小于本牌的已打出牌的即时能力"

**实现验证**:
- ✅ 查找己方场上卡牌（`player.playedCards`）
- ✅ 排除当前卡牌（不能复制自己）
- ✅ 检查影响力≥14（`currentInfluence >= 14`）
- ✅ 检查是否有即时能力（`card.abilityIds.length > 0`）
- ✅ 创建交互让玩家选择目标卡牌

**目标选择**: ✅ **通过**

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "复制并发动你的一张影响力不小于本牌的已打出牌的即时能力"

**关键限定词**:
- "你的" → 必须是己方场上卡牌
- "影响力不小于本牌" → 当前影响力≥14
- "已打出牌" → 从 `playedCards` 中查找（排除当前卡牌）
- "即时能力" → 必须有能力ID（`abilityIds.length > 0`）

**实现检查**:

1. ✅ **己方场上卡牌检查**: 
   ```typescript
   const eligibleCards = player.playedCards.filter(card => {
       if (card.uid === ctx.cardId) return false;
       
       // 计算当前影响力
       const modifiers = ctx.core.modifierTokens.filter(t => t.cardId === card.uid);
       const currentInfluence = modifiers.reduce((acc, m) => acc + m.value, card.baseInfluence);
       
       // 检查是否有即时能力
       const hasInstantAbility = card.abilityIds.length > 0;
       
       return currentInfluence >= 14 && hasInstantAbility;
   });
   ```

