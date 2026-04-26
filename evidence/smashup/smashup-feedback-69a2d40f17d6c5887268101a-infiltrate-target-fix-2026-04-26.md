# SmashUp 反馈 69a2d40f17d6c5887268101a 修复证据

- 反馈 ID：`69a2d40f17d6c5887268101a`
- 游戏：`smashup`
- 目标卡牌：`ninja_infiltrate_pod`
- 日期：`2026-04-26`

## 结论

- 已定位到具体卡牌为 `ninja_infiltrate_pod`。
- 卡牌定义与 `onPlay` 主逻辑本身是“打到基地上，选择基地上的另一张战术”。
- 根因不在 `ninjaInfiltratePodOnPlay()` 主体，而在基础版 `ninja_infiltrate` 的旧保护/基地忽略链路使用了宽松匹配，把 `_pod` 版本也一并算进去了。
- 本轮修复后，`ninja_infiltrate_pod` 不再继承基础版 `ninja_infiltrate` 的专属语义；定向回归测试通过。

## 触发链定位

1. 卡牌定义：`[ninjas_pod.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/data/factions/ninjas_pod.ts:142)`
   - 我实际看到：`ninja_infiltrate_pod` 是 `type: 'action'`、`subtype: 'ongoing'`，且 `ongoingTarget: 'base'`。
   - 是否达标：达标。定义明确要求这张卡打到基地，不是打到随从。

2. `onPlay` 逻辑：`[ninjas.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/abilities/ninjas.ts:208)` 与 `[ninjas.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/abilities/ninjas.ts:229)`
   - 我实际看到：`ninjaInfiltratePodOnPlay()` 只遍历 `base.ongoingActions`，并创建 `sourceId: 'ninja_infiltrate_pod_destroy'`、`targetType: 'ongoing'` 的交互。
   - 是否达标：达标。主逻辑目标类型就是基地战术，不是随从。

3. 串味根因：`[utils.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/utils.ts:30)`、`[ninjas.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/abilities/ninjas.ts:577)`、`[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:477)`
   - 我实际看到：`matchesDefId(defId, 'ninja_infiltrate')` 会同时匹配 `ninja_infiltrate` 和 `ninja_infiltrate_pod`；多个基地能力/保护链还用过 `startsWith('ninja_infiltrate')`。这会把 POD 版渗透错误并入基础版渗透的专属效果链。
   - 是否达标：未达标。这正是本轮需要修的逻辑串味点。

## 修复内容

1. 收紧基础版 `ninja_infiltrate` 专属语义到精确匹配
   - `[ninjas.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/abilities/ninjas.ts:577)`
   - `[ninjas.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/abilities/ninjas.ts:585)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:477)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:904)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:920)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:945)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:976)`
   - `[baseAbilities.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities.ts:1054)`
   - `[baseAbilities_expansion.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities_expansion.ts:230)`
   - `[baseAbilities_expansion.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/baseAbilities_expansion.ts:639)`
   - `[ongoingEffects.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/ongoingEffects.ts:1009)`
   - `[ongoingEffects.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/domain/ongoingEffects.ts:1043)`
   - 我实际看到：这些链路已从 `matchesDefId` / `startsWith('ninja_infiltrate')` 收紧为 `=== 'ninja_infiltrate'`。
   - 是否达标：达标。POD 版不再误入基础版专属链路。

2. 补回归测试
   - `[baseFactionOngoing.test.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/__tests__/baseFactionOngoing.test.ts:267)`
   - `[baseFactionOngoing.test.ts](D:/gongzuo/webgame/BoardGame/src/games/smashup/__tests__/baseFactionOngoing.test.ts:341)`
   - 我实际看到：
     - `POD 版渗透不会继承基础版渗透的保护语义`
     - `POD 版渗透只会给出基地上的战术目标，不会把随从或附着战术当目标`
   - 是否达标：达标。覆盖了这次反馈对应的错误面。

## 测试结果

1. `npm run test -- src/games/smashup/__tests__/baseFactionOngoing.test.ts`
   - 实际观察：`1 passed`，`78 passed`。
   - 实际观察：新增的 `ninja_infiltrate_pod` 回归测试通过，交互 `targetType` 为 `ongoing`，且唯一卡牌目标是基地上的 `ongoing-pod-1 / zombie_overrun`，不包含随从上的 `poison-pod`。
   - 是否达标：达标。

2. `npm run test -- src/games/smashup/__tests__/baseRestrictions.test.ts`
   - 实际观察：`1 passed`，`27 passed`。
   - 实际观察：基础版 `ninja_infiltrate` 仍可按 FAQ 忽略相关基地限制，说明精确匹配没有把原版功能打坏。
   - 是否达标：达标。

3. `npm run test -- src/games/smashup/__tests__/baseAbilityNeutralProtection.test.ts`
   - 实际观察：`1 passed`，`2 passed`。
   - 实际观察：基础版 `ninja_infiltrate` 对“随从不受基地能力影响”的旧保护链仍正常。
   - 是否达标：达标。

4. `npm run test -- e2e/src/games/smashup/__tests__/baseFactionOngoing.test.ts`
   - 实际观察：当前 Vitest `include` 只收 `src/**/__tests__`，不收 `e2e/src/**/__tests__`，因此报 `No test files found`。
   - 是否达标：不作为失败项。镜像文件已同步修改，但当前项目测试配置不直接执行该镜像路径。

## 最终判定

- 本轮修复是否达到反馈验收：达标。
- 是否建议标记 resolved：建议 `resolved`。
- 剩余风险：`src/games/smashup/domain/baseAbilities_expansion.ts` 与 `src/games/smashup/domain/ongoingEffects.ts` 当前存在他人未提交的大量无关改动；本轮只动了其中的 `ninja_infiltrate` 精确匹配行，后续提交时需要继续按 hunk 甄别范围。
