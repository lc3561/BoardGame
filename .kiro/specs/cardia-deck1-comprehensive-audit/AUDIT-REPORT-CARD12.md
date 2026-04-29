# Card12 财务官 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_12`
- **卡牌名称**: 财务官 (Treasurer)
- **影响力**: 12
- **派系**: 王朝 (Dynasty)
- **能力ID**: `ability_i_treasurer`
- **能力类型**: 持续能力（🔄）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 12：财务官 - 🔄 上个遭遇获胜的牌额外获得1枚印戒

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.TREASURER,
    name: 'abilities.treasurer.name',
    description: 'abilities.treasurer.description',
    trigger: 'ongoing',
    isInstant: false,
    isOngoing: true,
    requiresMarker: true,
    effects: [
        { type: 'extraSignet', condition: 'on_any_winner' }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "treasurer": {
            "name": "财务官",
            "description": "上个遭遇获胜的牌额外获得1枚印戒"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "🔄 上个遭遇获胜的牌额外获得1枚印戒"


**实现分析**（`src/games/cardia/domain/abilities/group3-ongoing.ts`）:

```typescript
abilityExecutorRegistry.register(ABILITY_IDS.TREASURER, (ctx: CardiaAbilityContext) => {
    // 只放置持续标记，效果在下次遭遇结算时应用
    return {
        events: [
            {
                type: CARDIA_EVENTS.ONGOING_ABILITY_PLACED,
                payload: {
                    abilityId: ctx.abilityId,
                    cardId: ctx.cardId,
                    playerId: ctx.playerId,
                    effectType: 'extraSignet',
                    timestamp: ctx.timestamp,
                    encounterIndex: ctx.core.turnNumber,
                },
                timestamp: ctx.timestamp,
            }
        ],
    };
});
```

**触发逻辑**（`src/games/cardia/domain/execute.ts`）:

```typescript
// 财务官：给上一个遭遇获胜的牌额外印戒
// 在下一个遭遇结算时自动触发（无论当前遭遇谁获胜，无论上一个遭遇谁获胜）
if (ability.abilityId === ABILITY_IDS.TREASURER) {
    const previousEncounter = core.previousEncounter;
    if (previousEncounter && previousEncounter.winnerId && previousEncounter.winnerId !== 'tie') {
        const previousWinnerCard = previousEncounter.winnerId === previousEncounter.player1Card?.ownerId
            ? previousEncounter.player1Card
            : previousEncounter.player2Card;
        
        if (previousWinnerCard) {
            // 给上一个遭遇的获胜卡牌额外印戒
            events.push({
                type: CARDIA_EVENTS.EXTRA_SIGNET_PLACED,
                timestamp: Date.now(),
                payload: {
                    cardId: previousWinnerCard.uid,
                    playerId: previousEncounter.winnerId,
                },
            });
        }
    }
    
    // 财务官是一次性效果，触发后移除
    events.push({
        type: CARDIA_EVENTS.ONGOING_ABILITY_REMOVED,
        timestamp: Date.now(),
        payload: {
            abilityId: ability.abilityId,
            cardId: ability.cardId,
            playerId: ability.playerId,
        },
    });
}
```


**关键实现特性**:
1. ✅ 放置持续标记（`ONGOING_ABILITY_PLACED`）
2. ✅ 在下次遭遇结算时检查持续标记
3. ✅ 查找上一个遭遇的获胜卡牌（通过 `core.previousEncounter`）
4. ✅ 给上一个遭遇的获胜卡牌额外印戒（`EXTRA_SIGNET_PLACED`）
5. ✅ 触发后自动移除持续标记（`ONGOING_ABILITY_REMOVED`）
6. ✅ 无论当前遭遇谁获胜，都会触发（只要有上一个遭遇的获胜者）
7. ✅ 无论上一个遭遇谁获胜，都会给该获胜者额外印戒

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "🔄 持续能力" → 放置持续标记（`ONGOING_ABILITY_PLACED`）
- "上个遭遇获胜的牌" → 查找 `core.previousEncounter.winnerId` 对应的卡牌
- "额外获得1枚印戒" → 发射 `EXTRA_SIGNET_PLACED` 事件
- 一次性效果 → 触发后自动移除持续标记

### 1.2 触发时机一致性

**abilityRegistry 定义**: `trigger: 'ongoing'`

**实现验证**:
- ✅ 能力执行器在失败时被调用，放置持续标记
- ✅ 持续标记在下次遭遇结算时自动触发
- ✅ 触发时机与描述一致（"上个遭遇"指的是已经结束的上一个遭遇）

### 1.3 目标选择一致性

**官方描述**: "上个遭遇获胜的牌"

**实现验证**:
- ✅ 查找上一个遭遇的获胜者（`core.previousEncounter.winnerId`）
- ✅ 无论上一个遭遇谁获胜，都会给该获胜者额外印戒
- ✅ 无论当前遭遇谁获胜，都会触发（只要有上一个遭遇的获胜者）

**目标选择**: ✅ **通过**

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "🔄 上个遭遇获胜的牌额外获得1枚印戒"

**关键限定词**:
- "上个遭遇" → 必须存在上一个遭遇（`core.previousEncounter`）
- "获胜的牌" → 上一个遭遇必须有获胜者（不是平局）
- "额外获得1枚印戒" → 只额外获得1枚，不影响基础印戒

**实现检查**:

1. ✅ **上一个遭遇存在性检查**: 
   ```typescript
   const previousEncounter = core.previousEncounter;
   if (previousEncounter && previousEncounter.winnerId && previousEncounter.winnerId !== 'tie') {
       // 触发效果
   }
   ```
   - 检查 `previousEncounter` 存在性
   - 检查 `winnerId` 存在性
   - 检查不是平局（`winnerId !== 'tie'`）

2. ✅ **一次性效果**: 
   ```typescript
   // 财务官是一次性效果，触发后移除
   events.push({
       type: CARDIA_EVENTS.ONGOING_ABILITY_REMOVED,
       // ...
   });
   ```
   - 触发后立即移除持续标记
   - 不会重复触发


3. ✅ **边界场景处理**:
   - 第一个遭遇时激活财务官 → 下次遭遇结算时，上一个遭遇存在，正常触发
   - 上一个遭遇是平局 → 不触发（`winnerId === 'tie'`）
   - 上一个遭遇不存在 → 不触发（`!previousEncounter`）

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 第一个遭遇时激活财务官，下次遭遇结算时正常触发
- 上一个遭遇是平局时不触发
- 一次性效果，触发后自动移除

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `TREASURER: 'ability_i_treasurer'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group3-ongoing.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.TREASURER, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'ongoing'`）
- ✅ 事件发射正确（`ONGOING_ABILITY_PLACED`, `EXTRA_SIGNET_PLACED`, `ONGOING_ABILITY_REMOVED`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**持续能力触发链路**:
1. ✅ 注册持续能力 → `ONGOING_ABILITY_PLACED` 事件
2. ✅ Reducer 处理 → 添加到 `core.ongoingAbilities` 数组
3. ✅ 下次遭遇结算 → `execute.ts` 中 `RESOLVE_ENCOUNTER` 命令检查持续能力
4. ✅ 触发持续能力 → 发射 `EXTRA_SIGNET_PLACED` 事件
5. ✅ 清理持续能力 → 发射 `ONGOING_ABILITY_REMOVED` 事件
6. ✅ Reducer 处理 → 从 `ongoingAbilities` 数组中移除

**UI**:
- ✅ 能力按钮显示（`[data-testid="cardia-activate-ability-btn"]`）
- ✅ 持续标记显示（卡牌上的 `ongoingMarkers` 数组）
- ✅ 额外印戒显示（卡牌上的 `signets` 数值）

**数据流闭环**: ✅ **通过**

完整的数据流链路：
1. 定义：`ids.ts` + `abilityRegistry.ts` + i18n
2. 注册：`abilityExecutorRegistry.register()`
3. 执行：发射 `ONGOING_ABILITY_PLACED` 事件
4. 持续能力触发：`execute.ts` 中检查并触发持续能力
5. UI：显示能力按钮、持续标记、额外印戒

---

## D47 审计：E2E 测试覆盖完整性

### 4.1 测试文件

**测试文件**: `e2e/cardia-deck1-card12-treasurer.e2e.ts`

**测试模式**: ✅ 联机模式 + 状态注入

**测试用例**:

1. ✅ **基础功能：持续能力注册 + 触发 + 清理**
   - 测试场景：
     - 初始状态：P1 已激活财务官能力（持续标记已放置）
     - 第1回合已结束：P1 精灵（16）获胜，有1个印戒
     - 第2回合：P1 打出财务官（12），P2 打出傀儡师（10）
     - P1 获胜（当前遭遇）
   - 验证点：
     - 初始状态：持续标记已存在（`ongoingAbilities` 数组）
     - 初始状态：精灵有1个印戒
     - 遭遇解析后：精灵获得额外印戒（总共2枚）
     - 遭遇解析后：财务官只有1枚印戒（不受财务官能力影响）
     - 遭遇解析后：持续标记已被移除（一次性效果）


### 4.2 测试质量

**状态断言**: ✅ 完整
- 验证持续标记注册（`ongoingAbilities` 数组）
- 验证持续标记内容（`abilityId`, `effectType`, `playerId`）
- 验证初始状态：精灵有1个印戒
- 验证持续能力触发：精灵获得额外印戒（总共2枚）
- 验证当前遭遇获胜者：财务官只有1枚印戒（不受财务官能力影响）
- 验证持续标记清理（从 `ongoingAbilities` 数组中移除）

**测试模式**: ✅ 正确
- 使用联机模式（`setupCardiaTestScenario`）
- 使用状态注入（`player1.playedCards`, `player2.playedCards`, `ongoingMarkers`）
- 使用辅助函数（`playCard`, `waitForPhase`, `readCoreState`, `applyCoreStateDirect`）

**最终状态验证**: ✅ 完整
- 验证精灵获得额外印戒（总共2枚）
- 验证财务官只有1枚印戒（不受财务官能力影响）
- 验证持续标记已清理

### 4.3 边界场景覆盖

**核心场景**: ✅ 完整覆盖
- 基础功能：持续能力注册 + 触发 + 清理
- 验证"上一个遭遇获胜的牌"获得额外印戒
- 验证"当前遭遇获胜的牌"不受财务官能力影响
- 验证一次性效果（触发后移除）

**边界场景**: ⚠️ **部分覆盖**
- ✅ 持续能力触发后清理（已覆盖）
- ✅ 当前遭遇获胜者不受财务官能力影响（已覆盖）
- ❌ **缺失**：第一个遭遇时激活财务官（没有"上一个遭遇"）
- ❌ **缺失**：上一个遭遇是平局时激活财务官（不应触发）

**E2E 测试覆盖**: ⚠️ **Partial (75/100)**

测试覆盖基本完整，但缺少以下边界场景：
- 第一个遭遇时激活财务官（没有"上一个遭遇"）
- 上一个遭遇是平局时激活财务官（不应触发）

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
- E2E 测试未覆盖"第一个遭遇时激活财务官"边界场景（-8分）
- E2E 测试未覆盖"上一个遭遇是平局时激活财务官"边界场景（-5分）

### 发现问题

**P0（严重）**: 0 个

**P1（重要）**: 0 个

**P2（次要）**: 2 个

#### P2-1: E2E 测试未覆盖"第一个遭遇时激活财务官"边界场景

**问题描述**:
- 当财务官在第一个遭遇时激活，下次遭遇结算时应该正常触发（因为有"上一个遭遇"）
- 实现中已正确处理这个场景（检查 `core.previousEncounter` 存在性）
- 但 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证边界场景的正确性

**修复建议**:
- 新增测试用例：
  1. 第1回合：P1 打出财务官（12），P2 打出精灵（16）
  2. P2 获胜，P1 失败，激活财务官能力
  3. 第2回合：P1 打出虚空法师（2），P2 打出雇佣剑士（1）
  4. P1 获胜（当前遭遇）
  5. 验证：精灵（上一个遭遇获胜的牌）获得额外印戒
  6. 验证：持续标记已被移除

**优先级**: P2（次要）


#### P2-2: E2E 测试未覆盖"上一个遭遇是平局时激活财务官"边界场景

**问题描述**:
- 当上一个遭遇是平局时，财务官能力不应触发（因为没有"获胜的牌"）
- 实现中已正确处理这个场景（检查 `winnerId !== 'tie'`）
- 但 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证边界场景的正确性

**修复建议**:
- 新增测试用例：
  1. 第1回合：P1 打出调停者（4），P2 打出虚空法师（2）
  2. P1 获胜，激活调停者能力（强制平局）
  3. 第2回合：P1 打出财务官（12），P2 打出傀儡师（10）
  4. P1 失败，激活财务官能力
  5. 第3回合：P1 打出精灵（16），P2 打出雇佣剑士（1）
  6. P1 获胜（当前遭遇）
  7. 验证：调停者（上一个遭遇是平局）没有获得额外印戒
  8. 验证：持续标记已被移除

**优先级**: P2（次要）

---

## 修复建议

### 建议 1: 新增"第一个遭遇时激活财务官"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card12-treasurer.e2e.ts` 中新增测试用例
2. 测试场景：
   - 第1回合：P1 打出财务官（12），P2 打出精灵（16）
   - P2 获胜，P1 失败，激活财务官能力
   - 第2回合：P1 打出虚空法师（2），P2 打出雇佣剑士（1）
   - P1 获胜（当前遭遇）
3. 验证：
   - 精灵（上一个遭遇获胜的牌）获得额外印戒
   - 持续标记已被移除

**影响范围**: 测试文件

**预估工作量**: 30 分钟

### 建议 2: 新增"上一个遭遇是平局时激活财务官"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card12-treasurer.e2e.ts` 中新增测试用例
2. 测试场景：
   - 第1回合：P1 打出调停者（4），P2 打出虚空法师（2）
   - P1 获胜，激活调停者能力（强制平局）
   - 第2回合：P1 打出财务官（12），P2 打出傀儡师（10）
   - P1 失败，激活财务官能力
   - 第3回合：P1 打出精灵（16），P2 打出雇佣剑士（1）
   - P1 获胜（当前遭遇）
3. 验证：
   - 调停者（上一个遭遇是平局）没有获得额外印戒
   - 持续标记已被移除

**影响范围**: 测试文件

**预估工作量**: 40 分钟

---

## 附录

### A. 相关文件

- **规则文档**: `src/games/cardia/rule/卡迪亚规则.md`
- **能力定义**: `src/games/cardia/domain/abilityRegistry.ts`
- **能力执行器**: `src/games/cardia/domain/abilities/group3-ongoing.ts`
- **触发逻辑**: `src/games/cardia/domain/execute.ts`
- **E2E 测试**: `e2e/cardia-deck1-card12-treasurer.e2e.ts`
- **i18n 文案**: `public/locales/zh-CN/game-cardia.json`

### B. 关键代码片段

**能力执行器**:
```typescript
abilityExecutorRegistry.register(ABILITY_IDS.TREASURER, (ctx: CardiaAbilityContext) => {
    // 只放置持续标记，效果在下次遭遇结算时应用
    return {
        events: [
            {
                type: CARDIA_EVENTS.ONGOING_ABILITY_PLACED,
                payload: {
                    abilityId: ctx.abilityId,
                    cardId: ctx.cardId,
                    playerId: ctx.playerId,
                    effectType: 'extraSignet',
                    timestamp: ctx.timestamp,
                    encounterIndex: ctx.core.turnNumber,
                },
                timestamp: ctx.timestamp,
            }
        ],
    };
});
```


**触发逻辑**:
```typescript
// 财务官：给上一个遭遇获胜的牌额外印戒
if (ability.abilityId === ABILITY_IDS.TREASURER) {
    const previousEncounter = core.previousEncounter;
    if (previousEncounter && previousEncounter.winnerId && previousEncounter.winnerId !== 'tie') {
        const previousWinnerCard = previousEncounter.winnerId === previousEncounter.player1Card?.ownerId
            ? previousEncounter.player1Card
            : previousEncounter.player2Card;
        
        if (previousWinnerCard) {
            // 给上一个遭遇的获胜卡牌额外印戒
            events.push({
                type: CARDIA_EVENTS.EXTRA_SIGNET_PLACED,
                timestamp: Date.now(),
                payload: {
                    cardId: previousWinnerCard.uid,
                    playerId: previousEncounter.winnerId,
                },
            });
        }
    }
    
    // 财务官是一次性效果，触发后移除
    events.push({
        type: CARDIA_EVENTS.ONGOING_ABILITY_REMOVED,
        timestamp: Date.now(),
        payload: {
            abilityId: ability.abilityId,
            cardId: ability.cardId,
            playerId: ability.playerId,
        },
    });
}
```

### C. 持续能力触发链路

**注册阶段**（财务官能力执行时）:
```typescript
// 1. 发射 ONGOING_ABILITY_PLACED 事件
events.push({
    type: CARDIA_EVENTS.ONGOING_ABILITY_PLACED,
    payload: {
        abilityId: ctx.abilityId,
        cardId: ctx.cardId,
        playerId: ctx.playerId,
        effectType: 'extraSignet',
        timestamp: ctx.timestamp,
        encounterIndex: ctx.core.turnNumber,
    },
    timestamp: ctx.timestamp,
});

// 2. Reducer 处理事件，添加到 core.ongoingAbilities 数组
function reduceOngoingAbilityPlaced(core: CardiaCore, event: any): CardiaCore {
    return {
        ...core,
        ongoingAbilities: [
            ...core.ongoingAbilities,
            event.payload,
        ],
    };
}
```

**触发阶段**（下次遭遇结算时）:
```typescript
// 1. execute.ts 中 RESOLVE_ENCOUNTER 命令检查持续能力
const extraSignetAbilities = core.ongoingAbilities.filter(
    a => a.abilityId === ABILITY_IDS.ADVISOR || a.abilityId === ABILITY_IDS.TREASURER
);

// 2. 发射 EXTRA_SIGNET_PLACED 事件
for (const ability of extraSignetAbilities) {
    if (ability.abilityId === ABILITY_IDS.TREASURER) {
        const previousEncounter = core.previousEncounter;
        if (previousEncounter && previousEncounter.winnerId && previousEncounter.winnerId !== 'tie') {
            const previousWinnerCard = previousEncounter.winnerId === previousEncounter.player1Card?.ownerId
                ? previousEncounter.player1Card
                : previousEncounter.player2Card;
            
            if (previousWinnerCard) {
                events.push({
                    type: CARDIA_EVENTS.EXTRA_SIGNET_PLACED,
                    timestamp: Date.now(),
                    payload: {
                        cardId: previousWinnerCard.uid,
                        playerId: previousEncounter.winnerId,
                    },
                });
            }
        }
    }
}

// 3. 发射 ONGOING_ABILITY_REMOVED 事件
events.push({
    type: CARDIA_EVENTS.ONGOING_ABILITY_REMOVED,
    timestamp: Date.now(),
    payload: {
        abilityId: ability.abilityId,
        cardId: ability.cardId,
        playerId: ability.playerId,
    },
});

// 4. Reducer 处理事件，从 ongoingAbilities 数组中移除
function reduceOngoingAbilityRemoved(core: CardiaCore, event: any): CardiaCore {
    return {
        ...core,
        ongoingAbilities: core.ongoingAbilities.filter(
            ability => ability.abilityId !== event.payload.abilityId || 
                       ability.cardId !== event.payload.cardId
        ),
    };
}
```

---

**审计日期**: 2025-01-19  
**审计人员**: AI Assistant  
**审计版本**: 1.0
