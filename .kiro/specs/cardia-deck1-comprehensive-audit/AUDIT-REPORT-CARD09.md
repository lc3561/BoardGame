# Card09 伏击者 - 详细审计报告

## 基本信息

- **卡牌ID**: `deck_i_card_09`
- **卡牌名称**: 伏击者 (Ambusher)
- **影响力**: 9
- **派系**: 沼泽 (Swamp)
- **能力ID**: `ability_i_ambusher`
- **能力类型**: 即时能力（⚡）
- **触发时机**: onLose（失败时触发）

---

## 能力描述

**官方规则**（`src/games/cardia/rule/卡迪亚规则.md`）:
> 影响力 9：伏击者 - 选择一个派系，你的对手弃掉所有该派系的手牌

**abilityRegistry 描述**（`src/games/cardia/domain/abilityRegistry.ts`）:
```typescript
{
    id: ABILITY_IDS.AMBUSHER,
    name: 'abilities.ambusher.name',
    description: 'abilities.ambusher.description',
    trigger: 'onLose',
    isInstant: true,
    isOngoing: false,
    requiresMarker: false,
    effects: [
        { type: 'discardByFaction', target: 'opponent', factionFilter: true, requiresChoice: true }
    ],
}
```

**i18n 文案**（`public/locales/zh-CN/game-cardia.json`）:
```json
{
    "abilities": {
        "ambusher": {
            "name": "伏击者",
            "description": "选择一个派系，你的对手弃掉所有该派系的手牌"
        }
    }
}
```

---

## D1 审计：语义保真度

### 1.1 描述与实现一致性

**官方描述**: "选择一个派系，你的对手弃掉所有该派系的手牌"

**实现分析**（`src/games/cardia/domain/abilities/group7-faction.ts`）:

```typescript
// 能力执行器：创建派系选择交互
abilityExecutorRegistry.register(ABILITY_IDS.AMBUSHER, (ctx: CardiaAbilityContext) => {
    const interaction = createFactionSelectionInteraction(
        `${ctx.abilityId}_${ctx.timestamp}`,
        ctx.abilityId,
        ctx.playerId,
        '选择派系',
        '选择一个派系，你的对手弃掉所有该派系的手牌'
    );
    
    return {
        events: [],
        interaction,
    };
});

// 交互处理器：处理派系选择后的弃牌逻辑
registerInteractionHandler(ABILITY_IDS.AMBUSHER, (state, playerId, value, _interactionData, _random, timestamp) => {
    const selectedFaction = (value as { faction?: string })?.faction;
    
    if (!selectedFaction) {
        return undefined;
    }
    
    const opponentId = playerId === '0' ? '1' : '0';
    const opponentPlayer = state.core.players[opponentId];
    
    // 查找对手该派系的所有手牌
    const factionCards = opponentPlayer.hand.filter(card => card.faction === selectedFaction);
    
    if (factionCards.length === 0) {
        return { state, events: [] };
    }
    
    const cardIds = factionCards.map(card => card.uid);
    
    const events: CardiaEvent[] = [
        {
            type: CARDIA_EVENTS.CARDS_DISCARDED,
            payload: {
                playerId: opponentId,
                cardIds,
                from: 'hand',
            },
            timestamp,
        }
    ];
    
    return { state, events };
});
```

**关键实现特性**:
1. ✅ 创建派系选择交互（`createFactionSelectionInteraction`）
2. ✅ 交互处理器已注册（`registerInteractionHandler`）
3. ✅ 正确识别对手玩家（`opponentId`）
4. ✅ 过滤对手手牌中指定派系的卡牌（`filter(card => card.faction === selectedFaction)`）
5. ✅ 发射弃牌事件（`CARDS_DISCARDED`）
6. ✅ 边界处理：没有该派系手牌时返回空事件数组

**语义一致性**: ✅ **通过**

实现完全符合官方描述：
- "选择一个派系" → 创建派系选择交互
- "你的对手" → 正确识别对手玩家
- "弃掉所有该派系的手牌" → 过滤并弃掉所有匹配派系的手牌

---

### 1.2 触发时机一致性

**官方描述**: 失败时触发（onLose）

**实现检查**:
- ✅ `abilityRegistry` 中 `trigger: 'onLose'` 正确
- ✅ `isInstant: true` 正确（即时能力）
- ✅ `isOngoing: false` 正确（非持续能力）
- ✅ `requiresMarker: false` 正确（不需要持续标记）

**触发时机一致性**: ✅ **通过**

---

### 1.3 目标选择一致性

**官方描述**: "你的对手弃掉所有该派系的手牌"

**实现检查**:
```typescript
const opponentId = playerId === '0' ? '1' : '0';
const opponentPlayer = state.core.players[opponentId];
const factionCards = opponentPlayer.hand.filter(card => card.faction === selectedFaction);
```

- ✅ 正确识别对手玩家（`opponentId`）
- ✅ 正确选择对手手牌（`opponentPlayer.hand`）
- ✅ 正确过滤派系（`card.faction === selectedFaction`）
- ✅ 弃牌事件目标正确（`playerId: opponentId`）

**目标选择一致性**: ✅ **通过**

---

## D2 审计：边界完整性

### 2.1 限定条件检查

**官方描述**: "选择一个派系，你的对手弃掉所有该派系的手牌"

**关键限定词**:
- "选择一个派系" → 必须选择派系
- "所有该派系的手牌" → 只影响手牌，不影响牌库或弃牌堆
- "对手" → 只影响对手，不影响自己

**实现检查**:

1. ✅ **派系选择验证**: 
   ```typescript
   if (!selectedFaction) {
       return undefined;
   }
   ```
   - 未选择派系时返回 `undefined`，阻止能力执行

2. ✅ **只影响手牌**: 
   ```typescript
   const factionCards = opponentPlayer.hand.filter(card => card.faction === selectedFaction);
   ```
   - 只过滤 `hand` 数组，不涉及 `deck` 或 `discard`

3. ✅ **只影响对手**: 
   ```typescript
   const opponentId = playerId === '0' ? '1' : '0';
   const opponentPlayer = state.core.players[opponentId];
   ```
   - 正确识别对手玩家

4. ✅ **边界场景处理**:
   ```typescript
   if (factionCards.length === 0) {
       return { state, events: [] };
   }
   ```
   - 对手没有该派系手牌时，返回空事件数组（不报错）

**边界完整性**: ✅ **通过**

实现正确处理了所有边界场景：
- 未选择派系 → 阻止执行
- 对手没有该派系手牌 → 返回空事件
- 只影响手牌 → 不涉及牌库或弃牌堆
- 只影响对手 → 不影响自己

---

## D3 审计：数据流闭环

### 3.1 定义 → 注册 → 执行 → UI 链路

**定义**:
- ✅ `src/games/cardia/domain/ids.ts`: `AMBUSHER: 'ability_i_ambusher'`
- ✅ `src/games/cardia/domain/abilityRegistry.ts`: 能力定义完整
- ✅ `public/locales/zh-CN/game-cardia.json`: i18n 文案完整

**注册**:
- ✅ `src/games/cardia/domain/abilities/group7-faction.ts`: 执行器已注册
  ```typescript
  abilityExecutorRegistry.register(ABILITY_IDS.AMBUSHER, (ctx: CardiaAbilityContext) => {
      // 实现代码
  });
  ```
- ✅ 交互处理器已注册
  ```typescript
  registerInteractionHandler(ABILITY_IDS.AMBUSHER, (state, playerId, value, ...) => {
      // 实现代码
  });
  ```
- ✅ 注册函数已调用（`src/games/cardia/game.ts`）:
  ```typescript
  import { registerFactionInteractionHandlers } from './domain/abilities/group7-faction';
  registerFactionInteractionHandlers();
  ```

**执行**:
- ✅ 触发时机正确（`trigger: 'onLose'`）
- ✅ 交互创建正确（`createFactionSelectionInteraction`）
- ✅ 事件发射正确（`CARDS_DISCARDED`）
- ✅ 状态更新正确（通过 reducer 处理事件）

**UI**:
- ✅ 能力按钮显示（`[data-testid="cardia-activate-ability-btn"]`）
- ✅ 派系选择弹窗显示（`.fixed.inset-0.z-50`）
- ✅ 弃牌效果显示（对手手牌数量变化）

**数据流闭环**: ✅ **通过**

完整的数据流链路：
1. 定义：`ids.ts` + `abilityRegistry.ts` + i18n
2. 注册：`abilityExecutorRegistry.register()` + `registerInteractionHandler()` + `registerFactionInteractionHandlers()`
3. 执行：创建交互 → 玩家选择派系 → 发射 `CARDS_DISCARDED` 事件
4. UI：显示能力按钮 → 显示派系选择弹窗 → 显示弃牌效果

---

## D47 审计：E2E 测试覆盖完整性

### 4.1 测试文件

**测试文件**: `e2e/cardia-deck1-card09-ambusher.e2e.ts`

**测试模式**: ✅ 联机模式 + 状态注入

**测试用例**:

1. ✅ **基础功能：选择派系 + 对手弃掉该派系手牌**
   - 测试场景：P1 打出伏击者（影响力9），P2 打出审判官（影响力8）
   - 初始状态：P2 手牌有 2 张（1 张 Academy + 1 张 Guild）
   - 验证点：
     - 能力执行前：P2 手牌 2 张
     - P1 激活能力，选择 Academy 派系
     - 能力执行后：P2 的 Academy 派系手牌被弃掉
     - P2 手牌剩余 1 张（Guild 派系）
     - 弃牌堆增加 1 张
     - 回合结束后 P2 抽 1 张牌，手牌变为 2 张

### 4.2 测试质量

**状态断言**: ✅ 完整
- 验证派系选择交互创建（`hasInteraction`, `interactionType`, `interactionSourceId`）
- 验证派系选择弹窗显示（`.fixed.inset-0.z-50`）
- 验证对手手牌中该派系卡牌被弃掉（`academyCards.length === 0`）
- 验证弃牌堆增加（`discard.length`）
- 验证手牌数量变化（`hand.length`）

**测试模式**: ✅ 正确
- 使用联机模式（`setupOnlineMatch`）
- 使用状态注入（`applyCoreStateDirect`）
- 使用辅助函数（`readCoreState`）

**最终状态验证**: ✅ 完整
- 验证对手手牌中没有该派系卡牌
- 验证弃牌堆增加
- 验证手牌数量正确（弃掉 1 张，抽了 1 张）

### 4.3 边界场景覆盖

**核心场景**: ✅ 完整覆盖
- 基础功能：选择派系 + 对手弃掉该派系手牌

**边界场景**: ⚠️ **部分覆盖**
- ✅ 对手有该派系手牌 → 弃掉所有该派系手牌（已覆盖）
- ❌ 对手没有该派系手牌 → 不执行弃牌（未覆盖）
- ❌ 对手有多张该派系手牌 → 弃掉所有该派系手牌（未覆盖）
- ❌ 选择不同派系 → 弃掉不同派系手牌（未覆盖）

**E2E 测试覆盖**: ⚠️ **Partial (70/100)**

测试覆盖基本完整，但缺少以下边界场景：
- 对手没有该派系手牌
- 对手有多张该派系手牌
- 选择不同派系

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
- E2E 测试未覆盖"对手没有该派系手牌"场景（-5分）
- E2E 测试未覆盖"对手有多张该派系手牌"场景（-5分）
- E2E 测试未覆盖"选择不同派系"场景（-5分）

### 发现问题

**P0（严重）**: 0 个

**P1（重要）**: 0 个

**P2（次要）**: 3 个

#### P2-1: E2E 测试未覆盖"对手没有该派系手牌"场景

**问题描述**:
- 当对手没有该派系手牌时，能力应该不执行弃牌
- 当前 E2E 测试未覆盖这个场景

**影响范围**:
- 测试覆盖不完整
- 无法验证"对手没有该派系手牌时，能力不报错"

**修复建议**:
- 新增测试用例：对手没有该派系手牌
- 验证：能力执行后，对手手牌数量不变，弃牌堆不增加

**优先级**: P2（改进项）

---

#### P2-2: E2E 测试未覆盖"对手有多张该派系手牌"场景

**问题描述**:
- 当对手有多张该派系手牌时，能力应该弃掉所有该派系手牌
- 当前 E2E 测试只覆盖了"对手有 1 张该派系手牌"的场景

**影响范围**:
- 测试覆盖不完整
- 无法验证"弃掉所有该派系手牌"的逻辑

**修复建议**:
- 新增测试用例：对手有多张该派系手牌（如 3 张 Academy）
- 验证：能力执行后，对手所有 Academy 派系手牌被弃掉，弃牌堆增加 3 张

**优先级**: P2（改进项）

---

#### P2-3: E2E 测试未覆盖"选择不同派系"场景

**问题描述**:
- 能力可以选择 4 个派系（Swamp, Academy, Guild, Dynasty）
- 当前 E2E 测试只覆盖了"选择 Academy 派系"的场景

**影响范围**:
- 测试覆盖不完整
- 无法验证"选择不同派系"的逻辑

**修复建议**:
- 新增测试用例：选择不同派系（如 Guild）
- 验证：能力执行后，对手 Guild 派系手牌被弃掉，其他派系手牌保留

**优先级**: P2（改进项）

---

## 修复建议

### 建议 1: 补充"对手没有该派系手牌"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card09-ambusher.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 打出伏击者（影响力9），P2 打出高影响力卡牌
   - P2 手牌只有 Guild 和 Dynasty 派系（没有 Academy）
   - P1 激活能力，选择 Academy 派系
   - 验证：P2 手牌数量不变，弃牌堆不增加

**影响范围**: 测试文件

**预估工作量**: 20 分钟

---

### 建议 2: 补充"对手有多张该派系手牌"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card09-ambusher.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 打出伏击者（影响力9），P2 打出高影响力卡牌
   - P2 手牌有 3 张 Academy 派系卡牌
   - P1 激活能力，选择 Academy 派系
   - 验证：P2 所有 Academy 派系手牌被弃掉，弃牌堆增加 3 张

**影响范围**: 测试文件

**预估工作量**: 20 分钟

---

### 建议 3: 补充"选择不同派系"测试用例

**修复步骤**:
1. 在 `e2e/cardia-deck1-card09-ambusher.e2e.ts` 中新增测试用例
2. 测试场景：
   - P1 打出伏击者（影响力9），P2 打出高影响力卡牌
   - P2 手牌有 Academy 和 Guild 派系卡牌
   - P1 激活能力，选择 Guild 派系
   - 验证：P2 Guild 派系手牌被弃掉，Academy 派系手牌保留

**影响范围**: 测试文件

**预估工作量**: 20 分钟

---

## 附录

### A. 相关文件

- **规则文档**: `src/games/cardia/rule/卡迪亚规则.md`
- **能力定义**: `src/games/cardia/domain/abilityRegistry.ts`
- **能力执行器**: `src/games/cardia/domain/abilities/group7-faction.ts`
- **交互处理器注册**: `src/games/cardia/game.ts`
- **E2E 测试**: `e2e/cardia-deck1-card09-ambusher.e2e.ts`
- **i18n 文案**: `public/locales/zh-CN/game-cardia.json`

### B. 关键代码片段

**能力执行器**:
```typescript
abilityExecutorRegistry.register(ABILITY_IDS.AMBUSHER, (ctx: CardiaAbilityContext) => {
    const interaction = createFactionSelectionInteraction(
        `${ctx.abilityId}_${ctx.timestamp}`,
        ctx.abilityId,
        ctx.playerId,
        '选择派系',
        '选择一个派系，你的对手弃掉所有该派系的手牌'
    );
    
    return {
        events: [],
        interaction,
    };
});
```

**交互处理器**:
```typescript
registerInteractionHandler(ABILITY_IDS.AMBUSHER, (state, playerId, value, _interactionData, _random, timestamp) => {
    const selectedFaction = (value as { faction?: string })?.faction;
    
    if (!selectedFaction) {
        return undefined;
    }
    
    const opponentId = playerId === '0' ? '1' : '0';
    const opponentPlayer = state.core.players[opponentId];
    
    const factionCards = opponentPlayer.hand.filter(card => card.faction === selectedFaction);
    
    if (factionCards.length === 0) {
        return { state, events: [] };
    }
    
    const cardIds = factionCards.map(card => card.uid);
    
    const events: CardiaEvent[] = [
        {
            type: CARDIA_EVENTS.CARDS_DISCARDED,
            payload: {
                playerId: opponentId,
                cardIds,
                from: 'hand',
            },
            timestamp,
        }
    ];
    
    return { state, events };
});
```

---

**审计日期**: 2025-01-19  
**审计人员**: AI Assistant  
**审计版本**: 1.0
