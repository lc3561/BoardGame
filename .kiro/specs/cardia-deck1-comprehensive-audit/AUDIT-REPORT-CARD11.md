# Card11 钟表匠 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_11`
- **卡牌名称**: 钟表匠 (Clockmaker)
- **影响力**: 11
- **派系**: 公会 (Guild)
- **能力ID**: `ability_i_clockmaker`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 11：钟表匠 - 添加+3影响力到你上一个遭遇的牌和你下一次打出的牌

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.CLOCKMAKER,
    name: 'abilities.clockmaker.name',
    description: 'abilities.clockmaker.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'modifyMultipleCards', modifierValue: 3, condition: 'previous_and_next' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "clockmaker": {
            "name": "钟表匠",
            "description": "添加+3影响力到你上一个遭遇的牌和你下一次打出的牌"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "添加+3影响力到你上一个遭遇的牌和你下一次打出的牌"

**实现分析**（`src/games/cardia/domain/abilities/group2-modifiers.ts`）:

```typescript
abilityExecutorRegistry.register(ABILITY_IDS.CLOCKMAKER, (ctx: CardiaAbilityContext) => {
    const player = ctx.core.players[ctx.playerId];
    const events: any[] = [];
    
    // 查找上一个遭遇的牌（当前卡牌的 encounterIndex - 1）
    const currentCard = player.playedCards.find(card => card.uid === ctx.cardId);
    
    if (currentCard && currentCard.encounterIndex > 0) {
        const previousCard = player.playedCards.find(
            card => card.encounterIndex === currentCard.encounterIndex - 1
        );
        
        if (previousCard) {
            events.push({
                type: CARDIA_EVENTS.MODIFIER_TOKEN_PLACED,
                payload: {
                    cardId: previousCard.uid,
                    value: 3,
                    source: ctx.abilityId,
                    timestamp: ctx.timestamp,
                },
                timestamp: ctx.timestamp,
            });
        }
    }
    
    // 注册延迟效果，为下一张打出的牌添加 +3
    events.push({
        type: CARDIA_EVENTS.DELAYED_EFFECT_REGISTERED,
        payload: {
            effectType: 'modifyInfluence',
            target: 'self',
            value: 3,
            condition: 'onNextCardPlayed',
            sourceAbilityId: ctx.abilityId,
            sourcePlayerId: ctx.playerId,
            timestamp: ctx.timestamp,
        },
        timestamp: ctx.timestamp,
    });
    
    return { events };
});
```

**关键实现特性**:
1. ✅ 查找上一个遭遇的牌（通过 `encounterIndex - 1`）
2. ✅ 为上一个遭遇的牌添加 +3 修正标记（`MODIFIER_TOKEN_PLACED`）
3. ✅ 注册延迟效果（`DELAYED_EFFECT_REGISTERED`）
4. ✅ 延迟效果条件正确（`condition: 'onNextCardPlayed'`）
5. ✅ 修正值正确（`value: 3`）
6. ✅ 目标正确（`target: 'self'` - 己方下一张牌）

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "添加+3影响力到你上一个遭遇的牌" → 查找 `encounterIndex - 1` 的牌，发射 `MODIFIER_TOKEN_PLACED` 事件
- "你下一次打出的牌" → 注册延迟效果，条件为 `onNextCardPlayed`
- 修正值为 +3 → `value: 3`
- 目标为己方 → `target: 'self'`

### 1.2 触发时机一致性

**abilityRegistry 定义**: `trigger: 'onLose'`

**实现验证**:
- ✅ 能力执行器在失败时被调用
- ✅ 触发时机与描述一致

### 1.3 目标选择一致性

**官方描述**: "你上一个遭遇的牌" + "你下一次打出的牌"

**实现验证**:
- ✅ 上一个遭遇的牌：通过 `encounterIndex - 1` 查找己方已打出的牌
- ✅ 下一次打出的牌：通过延迟效果系统，在下一张牌打出时触发
- ✅ 目标都是己方（`target: 'self'`）

**目标选择**: ✅ **通过**

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "添加+3影响力到你上一个遭遇的牌和你下一次打出的牌"

**关键限定词**:
- "上一个遭遇的牌" → 必须存在上一个遭遇（`encounterIndex > 0`）
- "你下一次打出的牌" → 只影响下一张牌，不影响后续所有牌

**实现检查**:

1. ✅ **上一个遭遇存在性检查**: 
   ```typescript
   if (currentCard && currentCard.encounterIndex > 0) {
       const previousCard = player.playedCards.find(
           card => card.encounterIndex === currentCard.encounterIndex - 1
       );
       
       if (previousCard) {
           // 添加修正标记
       }
   }
   ```
   - 检查 `encounterIndex > 0`（不是第一个遭遇）
   - 检查 `previousCard` 存在性

2. ✅ **延迟效果单次触发**: 
   ```typescript
   condition: 'onNextCardPlayed'
   ```
   - 延迟效果只在下一张牌打出时触发一次
   - 触发后从 `delayedEffects` 数组中移除

3. ✅ **边界场景处理**:
   - 第一个遭遇（`encounterIndex === 0`）→ 不添加修正标记到"上一个遭遇的牌"
   - 上一个遭遇的牌不存在 → 不添加修正标记
   - 延迟效果触发后 → 从 `delayedEffects` 数组中移除

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 第一个遭遇时不会尝试修改不存在的"上一个遭遇的牌"
- 延迟效果只影响下一张牌，不影响后续所有牌
- 延迟效果触发后正确清理

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `CLOCKMAKER: 'ability_i_clockmaker'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group2-modifiers.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.CLOCKMAKER, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'onLose'`）
- ✅ 事件发射正确（`MODIFIER_TOKEN_PLACED`, `DELAYED_EFFECT_REGISTERED`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**延迟效果触发链路**:
1. ✅ 注册延迟效果 → `DELAYED_EFFECT_REGISTERED` 事件
2. ✅ Reducer 处理 → 添加到 `core.delayedEffects` 数组
3. ✅ 下一张牌打出 → `execute.ts` 中 `PLAY_CARD` 命令检查延迟效果
4. ✅ 触发延迟效果 → 发射 `DELAYED_EFFECT_TRIGGERED` 事件
5. ✅ 应用修正 → 发射 `MODIFIER_TOKEN_PLACED` 事件
6. ✅ 清理延迟效果 → 从 `delayedEffects` 数组中移除

**UI**:
- ✅ 能力按钮显示（`[data-testid="cardia-activate-ability-btn"]`）
- ✅ 修正标记显示（卡牌上的 `modifiers` 数组）
- ✅ 延迟效果提示（可选，当前未实现 UI 提示）

**数据流闭环**: ✅ **通过**

完整的数据流链路：
1. 定义：`ids.ts` + `abilityRegistry.ts` + i18n
2. 注册：`abilityExecutorRegistry.register()`
3. 执行：发射 `MODIFIER_TOKEN_PLACED` 和 `DELAYED_EFFECT_REGISTERED` 事件
4. 延迟效果触发：`execute.ts` 中检查并触发延迟效果
5. UI：显示能力按钮、修正标记

---

## D47 审计：E2E 测试覆盖完整性

### 4.1 测试文件

**测试文件**: `e2e/cardia-deck1-card11-clockmaker.e2e.ts`

**测试模式**: ✅ 联机模式 + 状态注入

**测试用例**:

1. ✅ **基础功能：延迟效果注册 + 触发**
   - 测试场景：P1 打出钟表匠（影响力11），P2 打出财务官（影响力12）
   - 验证点：
     - 能力执行前：P1 失败（11 < 12）
     - 能力执行后：延迟效果已注册到 `delayedEffects` 数组
     - 延迟效果内容正确（`effectType: 'modifyInfluence'`, `value: 3`, `condition: 'onNextCardPlayed'`）
     - P1 打出下一张牌后：延迟效果被触发
     - 修正标记已添加到下一张牌（`value: 3`, `source: ABILITY_IDS.CLOCKMAKER`）
     - 延迟效果已从 `delayedEffects` 数组中移除

### 4.2 测试质量

**状态断言**: ✅ 完整
- 验证延迟效果注册（`delayedEffects` 数组）
- 验证延迟效果内容（`effectType`, `value`, `condition`, `sourceAbilityId`）
- 验证延迟效果触发（修正标记添加）
- 验证延迟效果清理（从 `delayedEffects` 数组中移除）

**测试模式**: ✅ 正确
- 使用联机模式（`setupCardiaTestScenario`）
- 使用状态注入（`player1.hand`, `player2.hand`, `playedCards`）
- 使用辅助函数（`playCard`, `waitForPhase`, `readCoreState`）

**最终状态验证**: ✅ 完整
- 验证延迟效果已清理
- 验证修正标记已添加
- 验证修正标记内容正确

### 4.3 边界场景覆盖

**核心场景**: ✅ 完整覆盖
- 基础功能：延迟效果注册 + 触发

**边界场景**: ⚠️ **部分覆盖**
- ✅ 延迟效果触发后清理（隐式覆盖）
- ❌ **缺失**：第一个遭遇时激活钟表匠（没有"上一个遭遇的牌"）
- ❌ **缺失**：上一个遭遇的牌添加修正标记（当前测试只验证延迟效果）

**E2E 测试覆盖**: ⚠️ **Partial (70/100)**

测试覆盖基本完整，但缺少以下场景：
- 第一个遭遇时激活钟表匠（边界场景）
- 验证"上一个遭遇的牌"添加修正标记（核心功能的另一半）

---

## 审计结论

### 总体评估

**状态**: ✅ **良好**

**评分**: 85/100

**评分说明**:
- D1（语义保真）: 25/25 ✅
- D2（边界完整）: 25/25 ✅
- D3（数据流闭环）: 20/20 ✅
- D47（E2E 测试覆盖）: 15/30 ⚠️

**扣分原因**:
- E2E 测试未覆盖"上一个遭遇的牌添加修正标记"场景（-10分）
- E2E 测试未覆盖"第一个遭遇时激活钟表匠"边界场景（-5分）

### 发现问题

**P0（严重）**: 0 个

**P1（重要）**: 1 个

**P2（次要）**: 1 个

#### P1-1: E2E 测试未覆盖"上一个遭遇的牌添加修正标记"场景

**问题描述**:
- 钟表匠能力有两个效果：
  1. 为上一个遭遇的牌添加 +3 修正标记
  2. 为下一次打出的牌添加 +3 修正标记（延迟效果）
- 当前 E2E 测试只验证了延迟效果（效果2），未验证"上一个遭遇的牌"修正（效果1）

**影响范围**:
- 测试覆盖不完整
- 无法验证"上一个遭遇的牌"修正是否正确添加

**修复建议**:
- 在现有测试用例中补充验证：
  1. 设置初始状态时，P1 已有一张已打出的牌（`encounterIndex: 0`）
  2. P1 打出钟表匠（`encounterIndex: 1`）
  3. 激活钟表匠能力后，验证上一张牌（`encounterIndex: 0`）的修正标记
  4. 验证修正标记内容（`value: 3`, `source: ABILITY_IDS.CLOCKMAKER`）

**优先级**: P1（重要）

#### P2-1: E2E 测试未覆盖"第一个遭遇时激活钟表匠"边界场景

**问题描述**:
- 当钟表匠是第一个遭遇（`encounterIndex === 0`）时，没有"上一个遭遇的牌"
- 实现中已正确处理这个边界场景（检查 `encounterIndex > 0`）
- 但 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证边界场景的正确性

**修复建议**:
- 新增测试用例：
  1. P1 第一个遭遇打出钟表匠（`encounterIndex: 0`）
  2. 激活钟表匠能力
  3. 验证：没有为"上一个遭遇的牌"添加修正标记（因为不存在）
  4. 验证：延迟效果仍然正常注册

**优先级**: P2（次要）

---

## 修复建议

### 建议 1: 补充"上一个遭遇的牌添加修正标记"验证

**修复步骤**:
1. 修改现有测试用例的初始状态设置
2. 在 `player1.playedCards` 中添加一张已打出的牌（`encounterIndex: 0`）
3. 钟表匠设置为 `encounterIndex: 1`
4. 激活钟表匠能力后，验证：
   - 上一张牌（`encounterIndex: 0`）的修正标记已添加
   - 修正标记内容正确（`value: 3`, `source: ABILITY_IDS.CLOCKMAKER`）
5. 继续验证延迟效果（保持现有验证）

**影响范围**: 测试文件

**预估工作量**: 20 分钟

### 建议 2: 新增"第一个遭遇时激活钟表匠"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card11-clockmaker.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 第一个遭遇打出钟表匠（`encounterIndex: 0`）
   - P2 打出高影响力卡牌
   - P1 失败，激活钟表匠能力
3. 验证：
   - 没有为"上一个遭遇的牌"添加修正标记（因为不存在）
   - 延迟效果仍然正常注册
   - P1 打出下一张牌后，延迟效果正常触发

**影响范围**: 测试文件

**预估工作量**: 30 分钟

---

## 附录

### A. 相关文件

- **规则文档**: `src/games/cardia/rule/卡迪亚规则.md`
- **能力定义**: `src/games/cardia/domain/abilityRegistry.ts`
- **能力执行器**: `src/games/cardia/domain/abilities/group2-modifiers.ts`
- **E2E 测试**: `e2e/cardia-deck1-card11-clockmaker.e2e.ts`
- **i18n 文案**: `public/locales/zh-CN/game-cardia.json`

### B. 关键代码片段

**能力执行器**:
```typescript
abilityExecutorRegistry.register(ABILITY_IDS.CLOCKMAKER, (ctx: CardiaAbilityContext) => {
    const player = ctx.core.players[ctx.playerId];
    const events: any[] = [];
    
    // 查找上一个遭遇的牌（当前卡牌的 encounterIndex - 1）
    const currentCard = player.playedCards.find(card => card.uid === ctx.cardId);
    
    if (currentCard && currentCard.encounterIndex > 0) {
        const previousCard = player.playedCards.find(
            card => card.encounterIndex === currentCard.encounterIndex - 1
        );
        
        if (previousCard) {
            events.push({
                type: CARDIA_EVENTS.MODIFIER_TOKEN_PLACED,
                payload: {
                    cardId: previousCard.uid,
                    value: 3,
                    source: ctx.abilityId,
                    timestamp: ctx.timestamp,
                },
                timestamp: ctx.timestamp,
            });
        }
    }
    
    // 注册延迟效果，为下一张打出的牌添加 +3
    events.push({
        type: CARDIA_EVENTS.DELAYED_EFFECT_REGISTERED,
        payload: {
            effectType: 'modifyInfluence',
            target: 'self',
            value: 3,
            condition: 'onNextCardPlayed',
            sourceAbilityId: ctx.abilityId,
            sourcePlayerId: ctx.playerId,
            timestamp: ctx.timestamp,
        },
        timestamp: ctx.timestamp,
    });
    
    return { events };
});
```

### C. 延迟效果触发链路

**注册阶段**（钟表匠能力执行时）:
```typescript
// 1. 发射 DELAYED_EFFECT_REGISTERED 事件
events.push({
    type: CARDIA_EVENTS.DELAYED_EFFECT_REGISTERED,
    payload: {
        effectType: 'modifyInfluence',
        target: 'self',
        value: 3,
        condition: 'onNextCardPlayed',
        sourceAbilityId: ctx.abilityId,
        sourcePlayerId: ctx.playerId,
        timestamp: ctx.timestamp,
    },
    timestamp: ctx.timestamp,
});

// 2. Reducer 处理事件，添加到 core.delayedEffects 数组
function reduceDelayedEffectRegistered(core: CardiaCore, event: any): CardiaCore {
    return {
        ...core,
        delayedEffects: [
            ...core.delayedEffects,
            event.payload,
        ],
    };
}
```

**触发阶段**（下一张牌打出时）:
```typescript
// 1. execute.ts 中 PLAY_CARD 命令检查延迟效果
const delayedEffectsToTrigger = core.delayedEffects.filter(
    effect => effect.condition === 'onNextCardPlayed' && effect.sourcePlayerId === playerId
);

// 2. 发射 DELAYED_EFFECT_TRIGGERED 事件
for (const effect of delayedEffectsToTrigger) {
    events.push({
        type: CARDIA_EVENTS.DELAYED_EFFECT_TRIGGERED,
        payload: {
            effectType: effect.effectType,
            targetCardId: cardUid,
            sourceAbilityId: effect.sourceAbilityId,
            value: effect.value,
            sourcePlayerId: effect.sourcePlayerId,
        },
        timestamp: Date.now(),
    });
}

// 3. 发射 MODIFIER_TOKEN_PLACED 事件
events.push({
    type: CARDIA_EVENTS.MODIFIER_TOKEN_PLACED,
    payload: {
        cardId: cardUid,
        value: effect.value,
        source: effect.sourceAbilityId,
        timestamp: Date.now(),
    },
    timestamp: Date.now(),
});

// 4. Reducer 处理事件，从 delayedEffects 数组中移除
function reduceDelayedEffectTriggered(core: CardiaCore, event: any): CardiaCore {
    return {
        ...core,
        delayedEffects: core.delayedEffects.filter(
            effect => effect.sourceAbilityId !== event.payload.sourceAbilityId
        ),
    };
}
```

---

**审计日期**: 2025-01-19  
**审计人员**: AI Assistant  
**审计版本**: 1.0
