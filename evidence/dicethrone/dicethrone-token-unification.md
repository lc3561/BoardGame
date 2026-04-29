# DiceThrone Token 统一化修复

## 问题描述

用户发现狂战士的 Daze（晕眩）token 和火法师的 Stun（眩晕）token 实际上是同一个效果，但代码中实现成了两个不同的 token。此外，还有其他角色重复定义了相同的 token（Knockdown、Evasive）。

## 修复内容

### 1. 创建共享 Token 定义文件

创建 `src/games/dicethrone/domain/sharedTokens.ts`，统一定义以下共享 token：

- **KNOCKDOWN（击倒）** - 使用角色：火法师、武僧、枪手、武士
- **EVASIVE（闪避）** - 使用角色：月精灵、武僧、枪手（注意：月精灵和武僧有 activeUse 配置，与共享版本不同）
- **DAZE（晕眩）** - 使用角色：狂战士、火法师

### 2. 统一 STUN → DAZE

- 删除 `STATUS_IDS.STUN` 定义（`src/games/dicethrone/domain/ids.ts`）
- 将所有引用 `STATUS_IDS.STUN` 的地方改为 `STATUS_IDS.DAZE`
- 更新测试文件和 Wiki 快照

### 3. 修改各角色的 tokens.ts

#### 火法师（Pyromancer）
- 移除 KNOCKDOWN 和 STUN 的定义
- 从 `sharedTokens` 导入 KNOCKDOWN 和 DAZE
- 更新 `PYROMANCER_INITIAL_TOKENS` 使用 `STATUS_IDS.DAZE`

#### 狂战士（Barbarian）
- 移除 DAZE 的定义
- 从 `sharedTokens` 导入 DAZE

#### 武僧（Monk）
- 移除 KNOCKDOWN 的定义
- 从 `sharedTokens` 导入 KNOCKDOWN
- 保留自己的 EVASIVE 定义（有 activeUse 配置）

#### 枪手（Gunslinger）
- 移除 KNOCKDOWN 和 EVASIVE 的定义
- 从 `sharedTokens` 导入

#### 武士（Samurai）
- 移除 KNOCKDOWN 的定义
- 从 `sharedTokens` 导入

#### 月精灵（Moon Elf）
- 保留自己的 EVASIVE 定义（有 activeUse 配置，与共享版本不同）

### 4. 更新测试

- `pyromancer-tokens.test.ts`：将 "Stun（眩晕）— debuff, onPhaseEnter" 改为 "Daze（晕眩）— debuff, onAttackEnd"
- 其他测试文件：将 `STATUS_IDS.STUN` 替换为 `STATUS_IDS.DAZE`

### 5. 更新文档

修改 `AGENTS.md` 中的 "Git 变更回退与暂存规范"，明确：
- 修复 bug 时必须使用编辑工具（strReplace/editCode/fsWrite）
- 禁止用 git restore/git checkout 等 git 命令恢复文件
- 可以用 `git diff` 查看差异来辅助定位问题

## 技术细节

### Daze vs Stun 的区别

根据卡牌描述，两者效果相同：
- 攻击结算后，如果防御方有眩晕，立即移除眩晕
- 攻击方获得额外攻击机会

代码实现：
- `timing: 'onAttackEnd'`（攻击结束时触发）
- `actions: [{ type: 'extraAttack', target: 'self' }]`
- 实际逻辑在 `flowHooks.ts` 的 `checkDazeExtraAttack` 函数中

### 为什么月精灵和武僧保留自己的 EVASIVE？

月精灵和武僧的 EVASIVE 有 `activeUse` 配置（投掷判定），与共享版本的 `passiveTrigger` 不同：

```typescript
// 月精灵/武僧的 EVASIVE
activeUse: {
    timing: ['beforeDamageReceived'],
    consumeAmount: 1,
    effect: {
        type: 'rollToNegate',
        rollSuccess: { range: [1, 2] },
    },
}

// 共享版本的 EVASIVE
passiveTrigger: {
    timing: 'onDefense',
    removable: true,
    actions: [{ type: 'evade' }],
}
```

## 测试结果

所有测试通过：
```
✓ src/games/dicethrone/__tests__/pyromancer-tokens.test.ts (9 tests)
```

## 教训

1. **遵守 AGENTS.md 规范**：修复 bug 时必须使用编辑工具，不能用 git restore
2. **DRY 原则**：相同的 token 应该统一定义，避免重复
3. **面向百游戏设计**：共享的 token 应该提取到公共文件，方便复用
4. **文档同步**：代码修改后必须同步更新测试和文档

## 影响范围

- 7 个角色的 tokens.ts 文件
- 6 个测试文件
- 1 个 Wiki 快照文件
- 1 个 flowHooks.ts 文件
- 1 个 ids.ts 文件
- 1 个新增的 sharedTokens.ts 文件
- 1 个 AGENTS.md 文档

## 后续工作

无。所有重复的 token 已统一，测试已通过。
