# Smash Up 世界冠军《着魔 / 嗯？》真实入口 E2E 证据（2026-04-28）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：
  - `world_champs_bewitched / 着魔`
  - `world_champs_eh / 嗯？`
- 目标：
  1. 补齐《着魔》“附着到宿主 -> 宿主离场 -> 转移到另一个随从”的 L3 真实入口证据。
  2. 补齐《嗯？》“本回合打出第一个行动后 -> 从弃牌堆作为额外行动发动 -> 选择己方随从 +1 -> 该牌回手”的 L3 真实入口证据。
  3. 明确《嗯？》此前缺的是**弃牌区 special 入口注册 + 每回合使用标记**，不是卡图录错或中文名录错。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-41.png`（《着魔》）
  - `temp/cards7-39.png`（《嗯？》）
- 当前实现：
  - `src/games/smashup/abilities/world_champs.ts`
- 当前回归文件：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 本轮实现补丁

- `src/games/smashup/abilities/world_champs.ts`
  - 为《嗯？》新增 `registerDiscardSpecialProvider(...)`，把它真实挂进弃牌区 `activate_special` 入口。
  - 在《嗯？》交互结算时新增 `SU_EVENTS.DISCARD_ABILITY_USED`，锁住“本回合只用一次”。
- `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - 新增《嗯？》弃牌区可见性与本回合锁定的单测。
- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增《着魔》真实入口 E2E。
  - 新增《嗯？》真实入口 E2E。
  - 新增 `dismissSpotlightQueueIfPresent(...)`，对齐当前 card spotlight 遮罩行为，避免假失败。

## 执行命令

```powershell
npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts -t "world_champs_eh"

$env:BG_BYPASS_GLOBAL_HEAVY_BUDGET='1'
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "嗯？"
npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "着魔"
```

## 结果

- `world_champs_eh` 聚焦单测：`2 passed`
- `嗯？` E2E：`1 passed`
- `着魔` E2E：`1 passed`

## 关键截图与肉眼结论

> 本轮稳定截图落在 `e2e/evidence/screenshots/`，以下均为绝对路径。

### 一、《着魔》

#### 1. 已真实附着到宿主

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-bewitched-attached-2026-04-28.png`
- 我实际看到：
  1. 左侧宿主随从旁边能直接看到《着魔》附着卡本体，不是只有文字提示。
  2. 宿主随从左上角出现绿色 `+2`，和卡图“持续：这个仆从获得 +2 力量”一致。
  3. 底部还能看到《暗杀》卡面，说明这是“先附着《着魔》，再准备让宿主离场”的真实连续链路。
- 是否达到验收标准：
  - **达到。** 这张图证明《着魔》第一段“打出到一个仆从身上”真实发生。

#### 2. 宿主离场后已进入转移 prompt

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-bewitched-transfer-prompt-2026-04-28.png`
- 我实际看到：
  1. 顶部提示明确写着《着魔》要求“选择一个随从来附着此卡”。
  2. 左侧原宿主已经不在场上，只剩右侧另一个随从高亮，说明触发点确实来自“宿主离场”而不是主动重选。
  3. 右下角弃牌区还能看到《暗杀》进入弃牌堆，链路上下文没有断。
- 是否达到验收标准：
  - **达到。** 这张图证明《着魔》的第二段“如果宿主离开游戏则转移”已真实进入交互。

#### 3. 转移后已挂到新宿主

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-bewitched-transferred-2026-04-28.png`
- 我实际看到：
  1. 中间基地的目标随从旁边能直接看到《着魔》附着卡本体。
  2. 目标随从左上角出现绿色 `+2`，说明转移后持续加成仍然生效。
  3. 左侧原宿主位置已经清空，说明不是复制了一份附着，而是从旧宿主转到了新宿主。
- 是否达到验收标准：
  - **达到。** 这张图证明《着魔》完成了“宿主离场 -> 转移附着 -> 新宿主继续获得 +2”的完整链路。

### 二、《嗯？》

#### 1. 打出本回合第一个行动后，弃牌区里已真实出现《嗯？》

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-eh-discard-available-2026-04-28.png`
- 我实际看到：
  1. 底部中央 spotlight 直接显示《嗯？》卡面本体，右下角弃牌区里也能看到同一张牌。
  2. 右侧弃牌区角标为 `1`，说明这张牌确实来自弃牌堆，不是伪装成手牌或注入 prompt。
  3. 左侧己方随从身上还能看到前一个行动《暗杀》的附着，说明《嗯？》是接在“本回合打出第一个行动后”的真实链路上出现的。
- 是否达到验收标准：
  - **达到。** 这张图证明《嗯？》此前缺的真实入口现在已经出现在 UI。

#### 2. 发动后已进入“选择你的一个随从” prompt

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-eh-prompt-2026-04-28.png`
- 我实际看到：
  1. 顶部提示明确写着“嗯？：选择你的一个随从，本回合力量 +1（并将此卡返回手牌）”。
  2. 左右两个己方随从都出现绿色高亮边框，说明候选范围是“你的随从”，不是只限发动所在基地。
  3. 右下角弃牌区仍能看到《嗯？》被选中，说明这是从弃牌区 special 入口一路走到交互 prompt。
- 是否达到验收标准：
  - **达到。** 这张图证明《嗯？》不只是能在弃牌区显示，还能真实进入二段选择交互。

#### 3. 结算后目标 +1，且《嗯？》回到手牌

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-eh-resolved-2026-04-28.png`
- 我实际看到：
  1. 中间基地被选中的己方随从左上角出现绿色 `+1`。
  2. 底部中央能直接看到《嗯？》卡面回到手牌区，不再留在右下角弃牌区。
  3. 右下角弃牌区角标变成 `0`，说明这张牌确实已从弃牌堆移出。
- 是否达到验收标准：
  - **达到。** 这张图证明《嗯？》完成了“弃牌区发动 -> 目标 +1 -> 回手”整条真实链路。

## 状态断言补充

### 《着魔》

- E2E 断言：
  - 打出后 `bewitched-host.attachedActions` 包含 `world_champs_bewitched`
  - 结束回合后 `interaction.sourceId === 'world_champs_bewitched_transfer'`
  - 结算后：
    - 原宿主 `bewitched-host` 已离场
    - 新宿主 `bewitched-target.attachedActions` 包含 `world_champs_bewitched`
    - `players['0'].discard` 不包含 `world_champs_bewitched`

### 《嗯？》

- 单测断言：
  - `actionsPlayed === 1` 时，`getDiscardSpecialOptions(core, '0')` 返回 `world_champs_eh`
  - 发动并响应后，`usedDiscardPlayAbilities` 包含 `world_champs_eh`
  - 同回合再次读取 `getDiscardSpecialOptions(...)` 为 `0`
- E2E 断言：
  - 第一个行动打出后，弃牌区可见 `world_champs_eh`
  - 点击基地后 `interaction.sourceId === 'world_champs_eh'`
  - 结算后：
    - `eh-ally-1.tempPowerModifier === 0`
    - `eh-ally-2.tempPowerModifier === 1`
    - `players['0'].hand` 包含 `world_champs_eh`
    - `players['0'].discard` 不包含 `world_champs_eh`
    - `players['0'].usedDiscardPlayAbilities` 包含 `world_champs_eh`

## 根因裁定

- 《着魔》：
  - 本轮没有发现卡图录入或中文名错误；当前实现与卡图语义一致，缺的是 L3 真实入口证据。
- 《嗯？》：
  - 本轮发现的不是数据录入问题，而是**实现缺口**：
    1. 之前只有 `special` 执行器和交互 handler；
    2. 但没有把它注册到弃牌区 `discard special provider`；
    3. 也没有在结算时写入 `DISCARD_ABILITY_USED` 做“本回合一次”锁定。
  - 这属于**入口实现缺陷 / 审计范围此前未抽到 discard-special 真实入口**，不是卡图索引错位。

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- `World Champs / 世界冠军` 当前再新增：
  - 《着魔》1 条正路径 L3 证据
  - 《嗯？》1 条正路径 L3 证据
- 其中《嗯？》本轮顺带修复了真实入口缺口，所以这不是“只补证据不改实现”的记录。
- 但当前仍是**对象级补证继续扩展**，三新派系整包仍保持 **仍有残余范围**。
