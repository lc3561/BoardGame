# Dicethrone 反馈 69a6db8b84ff8ed02e45add4 核验

- 日期：2026-04-23
- 反馈：`69a6db8b84ff8ed02e45add4`
- 主题：升级卡是否允许越级升级（`I -> III`）

## 结论

- 当前规则口径：允许直接从 `I` 升到 `III`。
- 当前实现状态：`rules.ts`、`commandValidation.ts`、手牌入口 `Board.tsx` 均支持该规则。
- 本轮未发现功能性缺陷，不需要改升级逻辑；仅修正文档性旧注释，避免把当前规则误写成“必须逐级升级”。

## 核验证据

### 规则与实现

- `src/games/dicethrone/domain/rules.ts`
  - `checkPlayCard` 中已移除 `upgradeCardSkipLevel` 的实际拦截逻辑。
  - `checkPlayUpgradeCard` 明确只拦：
    - 非主阶段
    - 非升级卡/目标技能不匹配
    - 已满级
    - CP 不足
  - 对 `desiredLevel > currentLevel` 的场景，不再要求 `desiredLevel === currentLevel + 1`。

- `src/games/dicethrone/domain/commandValidation.ts`
  - `PLAY_UPGRADE_CARD` 直接复用 `checkPlayUpgradeCard`，没有额外“逐级升级”门禁。

- `src/games/dicethrone/Board.tsx`
  - 手牌打出升级卡时，直接按卡牌自带的 `targetAbilityId` 分发 `PLAY_UPGRADE_CARD`，没有 UI 侧 `II` 前置要求。

### 现有测试

- `src/games/dicethrone/__tests__/card-system.test.ts`
  - 已有用例：`允许直接跳级升级（直接 I -> III）`
- `src/games/dicethrone/__tests__/flow.test.ts`
  - 已有用例：`升级卡允许直接从 I 升到 III`

## 实际验证

1. `npx vitest run src/games/dicethrone/__tests__/card-system.test.ts`
   - 结果：通过（11 tests passed）
   - 关键点：`card-meditation-3` 可直接把 `meditation` 从 `1` 升到 `3`

2. `npx vitest run src/games/dicethrone/__tests__/flow.test.ts -t "升级卡允许直接从 I 升到 III"`
   - 结果：通过（目标用例 1 passed）
   - 关键点：命令链路下同样允许直接升级到 `III`

## 本轮改动

- `src/games/dicethrone/domain/rules.ts`
- `e2e/src/games/dicethrone/domain/rules.ts`
- `evidence/dicethrone/dicethrone-feedback-69a6db8b-upgrade-skip-level-verification-2026-04-23.md`
