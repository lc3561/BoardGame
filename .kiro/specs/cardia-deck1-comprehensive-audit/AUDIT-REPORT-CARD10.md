# Card10 傀儡师 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_10`
- **卡牌名称**: 傀儡师 (Puppeteer)
- **影响力**: 10
- **派系**: 学院 (Academy)
- **能力ID**: `ability_i_puppeteer`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 10：傀儡师 - 弃掉相对的牌，替换为你从对手手牌随机抽取的一张牌。对方的能力不会被触发

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.PUPPETEER,
    name: 'abilities.puppeteer.name',
    description: 'abilities.puppeteer.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'replaceOpponentCard' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "puppeteer": {
            "name": "傀儡师",
            "description": "弃掉相对的牌，替换为你从对手手牌随机抽取的一张牌。对方的能力不会被触发"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "弃掉相对的牌，替换为你从对手手牌随机抽取的一张牌。对方的能力不会被触发"

**实现分析**（`src/games/cardia/domain/abilities/group6-special.ts`）:

```typescript
abilityExecutorRegistry.register(ABILITY_IDS.PUPPETEER, (ctx: CardiaAbilityContext) => {
    console.log('[Puppeteer] 能力执行器被调用');
    
    const player = ctx.core.players[ctx.playerId];
    const opponent = ctx.core.players[ctx.opponentId];
    
    // 查找当前卡牌
    const currentCard = player.playedCards.find(card => card.uid === ctx.cardId);
    
    if (!currentCard) {
        console.warn('[Puppeteer] 未找到当前卡牌');
        return { events: [] };
    }
    
    // 查找相对的卡牌（相同遭遇序号）
    const oppositeCard = opponent.playedCards.find(
        card => card.encounterIndex === currentCard.encounterIndex
    );
    
    if (!oppositeCard) {
        console.warn('[Puppeteer] 未找到相对的卡牌');
        return { events: [] };
    }
    
    // 对手手牌为空，无法替换
    if (opponent.hand.length === 0) {
        console.warn('[Puppeteer] 对手手牌为空');
        return { events: [] };
    }
    
    // 随机选择对手手牌中的一张
    const randomIndex = Math.floor(ctx.random.random() * opponent.hand.length);
    const replacementCard = opponent.hand[randomIndex];
    
    console.log('[Puppeteer] 准备替换卡牌:', {
        oldCard: { uid: oppositeCard.uid, defId: oppositeCard.defId },
        newCard: { uid: replacementCard.uid, defId: replacementCard.defId },
        encounterIndex: currentCard.encounterIndex,
    });
    
    return {
        events: [
            {
                type: CARDIA_EVENTS.CARD_REPLACED,
                payload: {
                    oldCardId: oppositeCard.uid,
                    newCardId: replacementCard.uid,
                    playerId: ctx.opponentId,
                    encounterIndex: currentCard.encounterIndex,
                    suppressAbility: true, // 不触发替换卡牌的能力
                },
                timestamp: ctx.timestamp,
            }
        ],
    };
});
```

**关键实现特性**:
1. ✅ 查找相对的卡牌（相同遭遇序号）
2. ✅ 从对手手牌随机抽取一张（使用 `ctx.random.random()`）
3. ✅ 发射 `CARD_REPLACED` 事件
4. ✅ 设置 `suppressAbility: true`（不触发替换卡牌的能力）
5. ✅ 边界检查：当前卡牌不存在、相对卡牌不存在、对手手牌为空

### 1.2 触发时机一致性

**官方描述**: 失败时触发（onLose）

**abilityRegistry 定义**:
```typescript
trigger: 'onLose',
isInstant: true,
```

**触发时机**: ✅ **一致**

能力定义中 `trigger: 'onLose'` 与官方描述"失败时触发"完全一致。

### 1.3 目标选择一致性

**官方描述**: "弃掉相对的牌"

**实现**:
```typescript
// 查找相对的卡牌（相同遭遇序号）
const oppositeCard = opponent.playedCards.find(
    card => card.encounterIndex === currentCard.encounterIndex
);
```

**目标选择**: ✅ **正确**

实现正确地通过 `encounterIndex` 查找相对的卡牌（同一遭遇中对手的卡牌）。

### 1.4 语义一致性总结

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "弃掉相对的牌" → 查找相同遭遇序号的对手卡牌
- "替换为你从对手手牌随机抽取的一张牌" → 使用随机数从对手手牌中选择
- "对方的能力不会被触发" → 设置 `suppressAbility: true`

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "弃掉相对的牌，替换为你从对手手牌随机抽取的一张牌。对方的能力不会被触发"

**关键限定词**:
- "相对的牌" → 同一遭遇中对手的卡牌
- "从对手手牌随机抽取" → 必须有手牌才能替换
- "对方的能力不会被触发" → 替换的卡牌不触发能力

**实现检查**:

1. ✅ **相对卡牌存在性检查**:
   ```typescript
   const oppositeCard = opponent.playedCards.find(
       card => card.encounterIndex === currentCard.encounterIndex
   );
   
   if (!oppositeCard) {
       console.warn('[Puppeteer] 未找到相对的卡牌');
       return { events: [] };
   }
   ```

2. ✅ **对手手牌非空检查**:
   ```typescript
   if (opponent.hand.length === 0) {
       console.warn('[Puppeteer] 对手手牌为空');
       return { events: [] };
   }
   ```

3. ✅ **能力抑制标记**:
   ```typescript
   suppressAbility: true, // 不触发替换卡牌的能力
   ```

### 2.2 边界场景处理

**边界场景**:
1. ✅ 当前卡牌不存在 → 返回空事件数组
2. ✅ 相对卡牌不存在 → 返回空事件数组
3. ✅ 对手手牌为空 → 返回空事件数组
4. ✅ 随机选择使用 `ctx.random.random()` → 可测试性强

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 所有前置条件都有检查
- 边界情况下返回空事件数组（不执行能力）
- 使用注入的随机数生成器（可测试）

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `PUPPETEER: 'ability_i_puppeteer'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group6-special.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.PUPPETEER, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'onLose'`）
- ✅ 事件发射正确（`CARD_REPLACED`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**事件定义**:
- ✅ `src/games/cardia/domain/events.ts`: `CARD_REPLACED` 事件已定义
  ```typescript
  export interface CardReplacedEvent extends GameEvent<typeof CARDIA_EVENTS.CARD_REPLACED> {
      payload: {
          slotIndex: number;
          o