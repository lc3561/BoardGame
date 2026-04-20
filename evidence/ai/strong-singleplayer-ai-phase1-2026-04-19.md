# 强单机 AI 第一阶段收口证据（2026-04-19）

## 1. 目标与范围

- 变更：`openspec/changes/add-strong-singleplayer-ai-difficulty`
- 收口目标：
  1) 统一难度档位与本地强单机执行路径；
  2) 公共搜索层（shortlist / lookahead / candidate loop / trace）可复用；
  3) Dice Throne 首发落地并有难度相关断言；
  4) SummonerWars、SmashUp 纳入同一框架验证；
  5) 本地房间 AI 难度配置、座位控制器序列化与调试信息可观测。

## 2. 实现落点（代码证据）

### 2.1 统一难度与公共 AI 核心

- `src/engine/ai/types.ts`
  - `AiDifficultyLevel = easy|normal|hard|expert`
  - `AiDifficultyProfile` 包含 `searchDepth / shortlistSize / simulationBudgetMs / randomness / beliefSampleCount / evaluatorProfile`
- `src/engine/ai/difficulty.ts`
  - 难度归一化与默认档位（`DEFAULT_LOCAL_AI_DIFFICULTY`）
- `src/engine/ai/lookahead.ts`
  - `createLookaheadLocalAiPolicy`
  - shortlist、稳定 tie-break、预算限制、trace 输出
  - `relative-utility` 与 `assignment-first` 贡献接入点
- `src/engine/ai/context.ts` / `src/engine/ai/localRunner.ts`
  - 决策上下文统一注入难度配置，执行路径保持 `legalActions` 根动作集合

### 2.2 本地房间与座位配置

- `src/components/lobby/CreateRoomModal.tsx`
  - 本地 AI 难度选择与默认值回填（normal）
- `src/engine/ai/seatControllers.ts`
  - `seatXDifficulty` 序列化/反序列化、规范化
- `src/engine/ai/localMatchPreferences.ts`
  - 本地偏好持久化与恢复
- `src/components/game/framework/widgets/GameDebugPanel.tsx`
  - 调试面板显示 AI 模式、座位控制器、难度与策略/Provider 信息

### 2.3 游戏侧落地

- `src/games/dicethrone/ai.ts`
  - baseline 升级为 lookahead 策略，启用 candidate loop + relative utility
- `src/games/summonerwars/ai.ts`
  - lookahead + relative utility + assignment-first（含承压/进攻任务分配）
- `src/games/smashup/ai.ts`
  - lookahead + assignment-first
  - 受限 `relative-utility-smashup-limited`（仅主阶段动作，显式避开 response window）

## 3. 验证记录（命令与结果）

### 3.1 seat controller / local runner

```bash
node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchSeatValidation.test.ts --configLoader native
```

- 结果：`65 passed / 0 failed`

### 3.2 本地房间 UI 与难度配置

```bash
node scripts/infra/vitest-cli-safe.mjs run src/components/lobby/__tests__/CreateRoomModal.test.tsx src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --configLoader native
```

- 结果：通过（`CreateRoomModal` 与 `GameDetailsModalJoinConfirm` 相关断言通过）
- 覆盖点：AI 默认难度、难度切换、`seat1Difficulty` 序列化/反序列化、local-ai controller 恢复

### 3.3 Dice Throne AI 决策

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native
```

- 结果：`75 passed / 0 failed`
- 覆盖点：不同难度/候选 trace/响应窗口下的 AI 决策行为

### 3.4 三游戏回归（本轮最终）

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts src/games/summonerwars/__tests__/flow.test.ts --configLoader native
```

- 结果：`243 passed / 0 failed`

## 4. 第一阶段效果结论

1. 已形成跨游戏一致的“难度 → 搜索预算/评估精度/随机扰动”语义。
2. 已形成可复用的公共搜索骨架（非每个游戏重复造轮子）。
3. Dice Throne 作为第一落地对象已具备强单机策略基础，并有断言保障。
4. SummonerWars / SmashUp 已并入同一 CA loop 框架，并完成 assignment-first 强化。

## 5. 当前限制（明确保留）

1. belief sampling 当前为接口与参数预留，尚未在所有不完全信息路径上做深度采样策略。
2. 调试面板当前聚焦“难度/策略/座位配置可观测”，更细粒度候选估值详情主要通过 providerMetadata trace 与测试断言验证。
3. SmashUp relative utility 采用受限策略（避开 response window）以保证既有 `response-pass` 稳定行为。

## 6. 后续接入顺序建议

1. 继续强化 Dice Throne 的阶段估值一致性（专家档 trace 审计）。
2. 扩展 SummonerWars 的战术前瞻深度（重点防守/推进转换）。
3. 在 SmashUp 保持 response 稳定前提下，逐步扩大 relative utility 覆盖面。

