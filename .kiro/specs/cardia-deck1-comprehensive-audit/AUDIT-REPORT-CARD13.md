# Card13 沼泽守卫 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_13`
- **卡牌名称**: 沼泽守卫 (Swamp Guard)
- **影响力**: 13
- **派系**: 沼泽 (Swamp)
- **能力ID**: `ability_i_swamp_guard`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 13：沼泽守卫 - 拿取一张你之前打出的牌回到手上，并弃掉其相对的牌

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.SWAMP_GUARD,
    name: 'abilities.swamp_guard.name',
    description: 'abilities.swamp_guard.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'recycleCard', target: 'self', requiresChoice: true },
        { type: 'discard', target: 'opponent', condition: 'opposite_card' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "swamp_guard": {
            "name": "沼泽守卫",
            "description": "拿取一张你之前打出的牌回到手上，并弃掉其相对的牌"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "拿取一张你之前打出的牌回到手上，并弃掉其相对的牌"

**实现分析**（`src/games/cardia/domain/abilities/group4-card-ops.ts`）:

```typescript
abilityExecutorRegistry.register(ABILITY_IDS.SWAMP_GUARD, (ctx: CardiaAbilityContext) => {
    const player = ctx.core.players[ctx.playerId];
    
    // 查找己方场上卡牌（排除当前卡牌）
    const eligibleCards = player.playedCards.filter(card => card.uid !== ctx.cardId);
    
    if (eligibleCards.length === 0) {
        return {
            events: [{
                type: CARDIA_EVENTS.ABILITY_NO_VALID_TARGET,
                timestamp: ctx.timestamp,
                payload: {
                    abilityId: ctx.abilityId,
                    cardId: ctx.cardId,
                    playerId: ctx.playerId,
                    reason: 'no_field_cards',
                },
            }],
        };
    }
    
    // 如果还没有选择目标卡牌，创建交互
    if (!ctx.selectedCardId) {
        const interaction: CardiaInteraction = {
            type: 'card_selection',
            interactionId: `${ctx.abilityId}_${ctx.timestamp}`,
            playerId: ctx.playerId,
            abilityId: ctx.abilityId,
            title: '选择要回收的卡牌',
            description: '选择一张你之前打出的牌回到手上，并弃掉其相对的牌',
            availableCards: eligibleCards.map(c => c.uid),
            minSelect: 1,
            maxSelect: 1,
        };
        
        return {
            events: [],
            interaction,
        };
    }
    
    // 已选择目标卡牌，执行回收逻辑
    const targetCard = player.playedCards.find(c => c.uid === ctx.selectedCardId);
    if (!targetCard) {
        console.error('[SwampGuard] Selected card not found:', ctx.selectedCardId);
        return { events: [] };
    }
    
    const opponent = ctx.core.players[ctx.opponentId];
    
    // 查找相对的卡牌（相同遭遇序号）
    const oppositeCard = opponent.playedCards.find(
        card => card.encounterIndex === targetCard.encounterIndex
    );
    
    const events: any[] = [
        // 回收己方卡牌到手牌
        {
            type: CARDIA_EVENTS.CARD_RECYCLED,
            payload: {
                cardId: targetCard.uid,
                playerId: ctx.playerId,
                from: 'field',
            },
            timestamp: ctx.timestamp,
        }
    ];
    
    // 如果有相对的牌，弃掉它
    if (oppositeCard) {
        events.push({
            type: CARDIA_EVENTS.CARDS_DISCARDED,
            payload: {
                playerId: ctx.opponentId,
                cardIds: [oppositeCard.uid],
                from: 'field',
            },
            timestamp: ctx.timestamp,
        });
    }
    
    return { events };
});
```

**关键实现特性**:
1. ✅ 创建交互让玩家选择目标卡牌（`card_selection` 交互）
2. ✅ 查找己方场上卡牌（`player.playedCards`）
3. ✅ 排除当前卡牌（`card.uid !== ctx.cardId`）
4. ✅ 回收选中的卡牌到手牌（`CARD_RECYCLED` 事件）
5. ✅ 查找相对的卡牌（相同 `encounterIndex`）
6. ✅ 弃掉相对的卡牌（`CARDS_DISCARDED` 事件）
7. ✅ 如果没有相对的牌，只回收己方卡牌

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "拿取一张你之前打出的牌" → 创建交互选择己方场上卡牌（排除当前卡牌）
- "回到手上" → 发射 `CARD_RECYCLED` 事件
- "弃掉其相对的牌" → 查找相同 `encounterIndex` 的对手卡牌，发射 `CARDS_DISCARDED` 事件

### 1.2 触发时机一致性

**abilityRegistry 定义**: `trigger: 'onLose'`

**实现验证**:
- ✅ 能力执行器在失败时被调用
- ✅ 触发时机与描述一致（失败时激活）

### 1.3 目标选择一致性

**官方描述**: "拿取一张你之前打出的牌"

**实现验证**:
- ✅ 查找己方场上卡牌（`player.playedCards`）
- ✅ 排除当前卡牌（不能回收自己）
- ✅ 创建交互让玩家选择目标卡牌
- ✅ 查找相对的卡牌（相同 `encounterIndex`）

**目标选择**: ✅ **通过**

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "拿取一张你之前打出的牌回到手上，并弃掉其相对的牌"

**关键限定词**:
- "你之前打出的牌" → 必须是己方场上卡牌（排除当前卡牌）
- "相对的牌" → 相同遭遇序号的对手卡牌
- "弃掉" → 如果没有相对的牌，只回收己方卡牌

**实现检查**:

1. ✅ **己方场上卡牌检查**: 
   ```typescript
   const eligibleCards = player.playedCards.filter(card => card.uid !== ctx.cardId);
   
   if (eligibleCards.length === 0) {
       return {
           events: [{
               type: CARDIA_EVENTS.ABILITY_NO_VALID_TARGET,
               timestamp: ctx.timestamp,
               payload: {
                   abilityId: ctx.abilityId,
                   cardId: ctx.cardId,
                   playerId: ctx.playerId,
                   reason: 'no_field_cards',
               },
           }],
       };
   }
   ```
   - 检查己方场上卡牌数量（排除当前卡牌）
   - 如果没有可选卡牌，发射 `ABILITY_NO_VALID_TARGET` 事件

2. ✅ **相对的牌检查**: 
   ```typescript
   const oppositeCard = opponent.playedCards.find(
       card => card.encounterIndex === targetCard.encounterIndex
   );
   
   // 如果有相对的牌，弃掉它
   if (oppositeCard) {
       events.push({
           type: CARDIA_EVENTS.CARDS_DISCARDED,
           payload: {
               playerId: ctx.opponentId,
               cardIds: [oppositeCard.uid],
               from: 'field',
           },
           timestamp: ctx.timestamp,
       });
   }
   ```
   - 查找相同 `encounterIndex` 的对手卡牌
   - 如果没有相对的牌，只回收己方卡牌

3. ✅ **边界场景处理**:
   - 没有己方场上卡牌（排除当前卡牌）→ 发射 `ABILITY_NO_VALID_TARGET` 事件
   - 没有相对的牌 → 只回收己方卡牌，不弃掉对手卡牌
   - 选中的卡牌不存在 → 返回空事件（防御性编程）

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 没有己方场上卡牌时发射 `ABILITY_NO_VALID_TARGET` 事件
- 没有相对的牌时只回收己方卡牌
- 选中的卡牌不存在时返回空事件

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `SWAMP_GUARD: 'ability_i_swamp_guard'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group4-card-ops.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.SWAMP_GUARD, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```
- ✅ 交互处理器已注册
  ```typescript
  registerInteractionHandler(ABILITY_IDS.SWAMP_GUARD, (state, playerId, value, ...) => {
      // 实现代码
  });
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'onLose'`）
- ✅ 事件发射正确（`CARD_RECYCLED`, `CARDS_DISCARDED`, `ABILITY_NO_VALID_TARGET`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**交互链路**:
1. ✅ 创建交互 → `card_selection` 交互
2. ✅ UI 显示 → 卡牌选择弹窗
3. ✅ 玩家选择 → 选中目标卡牌
4. ✅ 交互处理器 → 发射 `CARD_RECYCLED` 和 `CARDS_DISCARDED` 事件
5. ✅ Reducer 处理 → 更新 `hand`, `playedCards`, `discard` 数组

**UI**:
- ✅ 能力按钮显示（`[data-testid="cardia-activate-ability-btn"]`）
- ✅ 卡牌选择弹窗显示（`.fixed.inset-0.z-50`）
- ✅ 回收的卡牌回到手牌（`hand` 数组）
- ✅ 相对的卡牌被弃掉（`discard` 数组）

**数据流闭环**: ✅ **通过**

完整的数据流链路：
1. 定义：`ids.ts` + `abilityRegistry.ts` + i18n
2. 注册：`abilityExecutorRegistry.register()` + `registerInteractionHandler()`
3. 执行：创建 `card_selection` 交互
4. 交互处理：发射 `CARD_RECYCLED` 和 `CARDS_DISCARDED` 事件
5. UI：显示能力按钮、卡牌选择弹窗、更新手牌和弃牌堆

---

## D47 审计：E2E 测试覆盖完整性

### 4.1 测试文件

**测试文件**: `e2e/cardia-deck1-card13-swamp-guard.e2e.ts`

**测试模式**: ✅ 联机模式 + 状态注入

**测试用例**:

1. ✅ **基础功能：回收已打出的牌并弃掉相对的牌**
   - 测试场景：
     - P1 之前打出了 2 张牌（card01 和 card03）
     - P2 之前打出了 2 张牌（card02 和 card05）
     - P1 打出影响力13（沼泽守卫）
     - P2 打出影响力14（女导师）
     - P1 失败（13 < 14），激活沼泽守卫能力
     - P1 选择回收 card01
   - 验证点：
     - card01 回到 P1 手上
     - card02（相对的牌）被弃掉
     - P1 的已打出牌数减少 1
     - P2 的已打出牌数减少 1
     - P2 的弃牌堆增加 1

### 4.2 测试质量

**状态断言**: ✅ 完整
- 验证初始状态：P1 手牌数、P1 已打出牌数、P2 已打出牌数、P2 弃牌堆数
- 验证目标牌回到 P1 手上（`hand` 数组）
- 验证相对的牌被弃掉（`discard` 数组）
- 验证 P1 的已打出牌数减少 1
- 验证 P2 的已打出牌数减少 1
- 验证 P2 的弃牌堆增加 1

**测试模式**: ✅ 正确
- 使用联机模式（`setupCardiaTestScenario`）
- 使用状态注入（`player1.playedCards`, `player2.playedCards`）
- 使用辅助函数（`playCard`, `waitForPhase`, `readCoreState`）

**最终状态验证**: ✅ 完整
- 验证目标牌回到 P1 手上
- 验证相对的牌被弃掉
- 验证 P1 的已打出牌数减少 1
- 验证 P2 的已打出牌数减少 1
- 验证 P2 的弃牌堆增加 1

### 4.3 边界场景覆盖

**核心场景**: ✅ 完整覆盖
- 基础功能：回收已打出的牌并弃掉相对的牌
- 验证目标牌回到手上
- 验证相对的牌被弃掉

**边界场景**: ⚠️ **部分覆盖**
- ✅ 回收已打出的牌（已覆盖）
- ✅ 弃掉相对的牌（已覆盖）
- ❌ **缺失**：没有己方场上卡牌时（排除当前卡牌）
- ❌ **缺失**：没有相对的牌时（只回收己方卡牌）

**E2E 测试覆盖**: ⚠️ **Partial (75/100)**

测试覆盖基本完整，但缺少以下边界场景：
- 没有己方场上卡牌时（排除当前卡牌）
- 没有相对的牌时（只回收己方卡牌）

---

## 审计结论

### 总体评估

**状态**: ✅ **良好**

**评分**: 87/100

**评分说明**:
- D1（语义保真）: 25/25 ✅
- D2（边界完整）: 25/25 ✅
- D3（数据流闭环）: 20/20 ✅
- D47（E2E 测试覆盖）: 17/30 ⚠️

**扣分原因**:
- E2E 测试未覆盖"没有己方场上卡牌"边界场景（-8分）
- E2E 测试未覆盖"没有相对的牌"边界场景（-5分）

### 发现问题

**P0（严重）**: 0 个

**P1（重要）**: 0 个

**P2（次要）**: 2 个

#### P2-1: E2E 测试未覆盖"没有己方场上卡牌"边界场景

**问题描述**:
- 当沼泽守卫是己方唯一的场上卡牌时，应该发射 `ABILITY_NO_VALID_TARGET` 事件
- 实现中已正确处理这个场景（检查 `eligibleCards.length === 0`）
- 但 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证边界场景的正确性

**修复建议**:
- 新增测试用例：
  1. P1 打出沼泽守卫（13），P2 打出女导师（14）
  2. P1 失败，激活沼泽守卫能力
  3. 验证：发射 `ABILITY_NO_VALID_TARGET` 事件
  4. 验证：能力按钮不可用或显示提示信息

**优先级**: P2（次要）

#### P2-2: E2E 测试未覆盖"没有相对的牌"边界场景

**问题描述**:
- 当选中的卡牌没有相对的牌时，应该只回收己方卡牌，不弃掉对手卡牌
- 实现中已正确处理这个场景（检查 `oppositeCard` 存在性）
- 但 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证边界场景的正确性

**修复建议**:
- 新增测试用例：
  1. P1 之前打出了 2 张牌（card01 和 card03）
  2. P2 之前打出了 1 张牌（card02，encounterIndex=0）
  3. P1 打出沼泽守卫（13），P2 打出女导师（14）
  4. P1 失败，激活沼泽守卫能力
  5. P1 选择回收 card03（encounterIndex=1，没有相对的牌）
  6. 验证：card03 回到 P1 手上
  7. 验证：P2 的弃牌堆没有增加（没有相对的牌被弃掉）

**优先级**: P2（次要）

---

## 修复建议

### 建议 1: 新增"没有己方场上卡牌"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card13-swamp-guard.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 打出沼泽守卫（13），P2 打出女导师（14）
   - P1 失败，激活沼泽守卫能力
3. 验证：
   - 发射 `ABILITY_NO_VALID_TARGET` 事件
   - 能力按钮不可用或显示提示信息

**影响范围**: 测试文件

**预估工作量**: 30 分钟

### 建议 2: 新增"没有相对的牌"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card13-swamp-guard.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 之前打出了 2 张牌（card01 和 card03）
   - P2 之前打出了 1 张牌（card02，encounterIndex=0）
   - P1 打出沼泽守卫（13），P2 打出女导师（14）
   - P1 失败，激活沼泽守卫能力
   - P1 选择回收 card03（encounterIndex=1，没有相对的牌）
3. 验证：
   - card03 回到 P1 手上
   - P2 的弃牌堆没有增加（没有相对的牌被弃掉）

**影响范围**: 测试文件

**预估工作量**: 40 分钟

---

## 附录

### A. 相关文件

- **规则文档**: `src/games/cardia/rule/卡迪亚规则.md`
- **能力定义**: `src/games/cardia/domain/abilityRegistry.ts`
- **能力执行器**: `src/games/cardia/domain/abilities/group4-card-ops.ts`
- **交互处理器**: `src/games/cardia/domain/abilities/group4-card-ops.ts` (registerCardOpsInteractionHandlers)
- **E2E 测试**: `e2e/cardia-deck1-card13-swamp-guard.e2e.ts`
- **单元测试**: `src/games/cardia/__tests__/abilities-group4-card-ops.test.ts`
- **i18n 文案**: `public/locales/zh-CN/game-cardia.json`

### B. 关键代码片段

**能力执行器**:
```typescript
abilityExecutorRegistry.register(ABILITY_IDS.SWAMP_GUARD, (ctx: CardiaAbilityContext) => {
    const player = ctx.core.players[ctx.playerId];
    
    // 查找己方场上卡牌（排除当前卡牌）
    const eligibleCards = player.playedCards.filter(card => card.uid !== ctx.cardId);
    
    if (eligibleCards.length === 0) {
        return {
            events: [{
                type: CARDIA_EVENTS.ABILITY_NO_VALID_TARGET,
                timestamp: ctx.timestamp,
                payload: {
                    abilityId: ctx.abilityId,
                    cardId: ctx.cardId,
                    playerId: ctx.playerId,
                    reason: 'no_field_cards',
                },
            }],
        };
    }
    
    // 如果还没有选择目标卡牌，创建交互
    if (!ctx.selectedCardId) {
        const interaction: CardiaInteraction = {
            type: 'card_selection',
            interactionId: `${ctx.abilityId}_${ctx.timestamp}`,
            playerId: ctx.playerId,
            abilityId: ctx.abilityId,
            title: '选择要回收的卡牌',
            description: '选择一张你之前打出的牌回到手上，并弃掉其相对的牌',
            availableCards: eligibleCards.map(c => c.uid),
            minSelect: 1,
            maxSelect: 1,
        };
        
        return {
            events: [],
            interaction,
        };
    }
    
    // 已选择目标卡牌，执行回收逻辑
    const targetCard = player.playedCards.find(c => c.uid === ctx.selectedCardId);
    if (!targetCard) {
        console.error('[SwampGuard] Selected card not found:', ctx.selectedCardId);
        return { events: [] };
    }
    
    const opponent = ctx.core.players[ctx.opponentId];
    
    // 查找相对的卡牌（相同遭遇序号）
    const oppositeCard = opponent.playedCards.find(
        card => card.encounterIndex === targetCard.encounterIndex
    );
    
    const events: any[] = [
        // 回收己方卡牌到手牌
        {
            type: CARDIA_EVENTS.CARD_RECYCLED,
            payload: {
                cardId: targetCard.uid,
                playerId: ctx.playerId,
                from: 'field',
            },
            timestamp: ctx.timestamp,
        }
    ];
    
    // 如果有相对的牌，弃掉它
    if (oppositeCard) {
        events.push({
            type: CARDIA_EVENTS.CARDS_DISCARDED,
            payload: {
                playerId: ctx.opponentId,
                cardIds: [oppositeCard.uid],
                from: 'field',
            },
            timestamp: ctx.timestamp,
        });
    }
    
    return { events };
});
```

**交互处理器**:
```typescript
registerInteractionHandler(ABILITY_IDS.SWAMP_GUARD, (state, playerId, value, _interactionData, _random, timestamp) => {
    const selectedCard = value as { cardUid?: string };
    if (!selectedCard?.cardUid) {
        console.error('[SwampGuard] No cardUid in interaction value');
        return { state, events: [] };
    }
    
    const targetCardId = selectedCard.cardUid;
    const player = state.core.players[playerId];
    const opponentId = playerId === '0' ? '1' : '0';
    const opponent = state.core.players[opponentId];
    
    // 查找目标卡牌
    const targetCard = player.playedCards.find(c => c.uid === targetCardId);
    if (!targetCard) {
        console.error('[SwampGuard] Selected card not found:', targetCardId);
        return { state, events: [] };
    }
    
    // 查找相对的卡牌（相同遭遇序号）
    const oppositeCard = opponent.playedCards.find(
        card => card.encounterIndex === targetCard.encounterIndex
    );
    
    const events: CardiaEvent[] = [
        // 回收己方卡牌到手牌
        {
            type: CARDIA_EVENTS.CARD_RECYCLED,
            payload: {
                cardId: targetCardId,
                playerId,
                from: 'field',
            },
            timestamp,
        }
    ];
    
    // 如果有相对的牌，弃掉它
    if (oppositeCard) {
        events.push({
            type: CARDIA_EVENTS.CARDS_DISCARDED,
            payload: {
                playerId: opponentId,
                cardIds: [oppositeCard.uid],
                from: 'field',
            },
            timestamp,
        });
    }
    
    return { state, events };
});
```

---

**审计日期**: 2025-01-19  
**审计人员**: AI Assistant  
**审计版本**: 1.0
