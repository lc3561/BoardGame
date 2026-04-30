# Smash Up 美人鱼《塞壬 / 诱惑者 / 无人岛》真实入口 E2E 证据（2026-04-30）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Mermaids / 美人鱼`
- 对象：
  - `mermaids_siren / 塞壬`
  - `mermaids_temptress / 诱惑者`
  - `mermaids_desert_island / 无人岛`
- 目标：
  1. 补齐这 3 张牌此前缺失的浏览器级 L3 证据。
  2. 回写《塞壬 / 无人岛 / 魅惑》同类问题的真实根因：UI 分数徽章口径错误，不是卡图录错。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-06.png`（《塞壬》）
  - `temp/cards7-07.png`（《诱惑者》）
  - `temp/cards7-11.png`（《无人岛》）
- 当前回归文件：
  - `src/games/smashup/__tests__/ongoingModifiers.test.ts`
  - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 本轮真实修复

- `src/games/smashup/ui/BaseZone.tsx`
- `e2e/src/games/smashup/ui/BaseZone.tsx`

### 根因

- 《塞壬》《无人岛》《魅惑》这类牌会改变“仆从对控制者总力量的贡献”，但**不会**改基地总力量。
- 领域层一直是对的，`getPlayerEffectivePowerOnBase(...)` 也一直有正确语义。
- 真问题出在 `BaseZone`：
  - 玩家列分数徽章没有走 `getPlayerEffectivePowerOnBase(...)`
  - 而是自己手算 `getEffectivePower + ongoing + base bonus`
  - 结果 UI 漏掉了：
    - `mermaids_siren`
    - `base_mermaid_reef`
    - `mermaids_desert_island`
    - `mermaids_charmed`
  这类“只影响控制者总力量”的特殊扣减口径。

### 修复方式

- 玩家列分数徽章统一改走 `getPlayerEffectivePowerOnBase(core, base, baseIndex, pid)`。
- 这次不是再补一套分支，而是把 UI 收口到领域层单一真相源。

## 本轮新增 E2E

- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - `塞壬应只压低其他玩家在这里的总力量贡献而不改变基地总力量`
  - `诱惑者应在其他玩家的仆从本回合移动到这里后获得 +2 力量`
  - `无人岛应把这里所有仆从的控制者总力量压到 0 并在你下回合开始前自毁`

## 执行命令

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "塞壬应只压低其他玩家在这里的总力量贡献而不改变基地总力量"

node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "诱惑者应在其他玩家的仆从本回合移动到这里后获得"

node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "无人岛应把这里所有仆从的控制者总力量压到 0 并在你下回合开始前自毁"

node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/ongoingModifiers.test.ts --configLoader native --maxWorkers 1 --testNamePattern "mermaids_siren|mermaids_desert_island|mermaids_temptress"

npm run typecheck
```

## 结果

- `塞壬` E2E：`1 passed`
- `诱惑者` E2E：`1 passed`
- `无人岛` E2E：`1 passed`
- `ongoingModifiers` 聚焦回归：`6 passed`
- `typecheck`：通过

## 关键截图与肉眼结论

> 以下截图均来自 `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\`

### 一、《塞壬》

#### 1. 打出后，对手个人总力量从 7 降到 5，但基地总力量仍是 9

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-siren-score-suppression-2026-04-30.png`
- 我实际看到：
  1. 《塞壬》已经真实在基地上，不是只改了权威状态。
  2. 玩家 1 的基地分数徽章显示 `5`，不是未修复前的 `7`。
  3. 基地中央总力量仍显示 `9`，说明这张牌压的是控制者总力量，不是基地总力量。
- 是否达到验收标准：
  - **达到。** 这张图直接证明 UI 已经改回卡图语义口径。

### 二、《诱惑者》

#### 1. 《迷人的人》真实进入移动自己到别处的 prompt

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-temptress-charmer-move-prompt-2026-04-30.png`
- 我实际看到：
  1. 画面进入了《迷人的人》的移动基地选择，不是测试直接改位置。
  2. 《诱惑者》所在基地是合法目标之一。
- 是否达到验收标准：
  - **达到。** 这张图证明“敌方仆从移动到这里”走的是浏览器级真实移动链路。

#### 2. 结算后，《诱惑者》已显示 +2，且控制者分数徽章变成 6

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-temptress-buffed-2026-04-30.png`
- 我实际看到：
  1. 《迷人的人》已经移动到《诱惑者》所在基地。
  2. 《诱惑者》卡面上出现 `+2` 徽章，不是只有底层状态变化。
  3. 《诱惑者》控制者在该基地的分数徽章显示 `6`。
- 是否达到验收标准：
  - **达到。** 这张图证明“别人的仆从本回合移动到这里”后，浏览器里确实能看见《诱惑者》的 +2。

> 补充口径：
> “而且是在其他玩家自己的回合移动来这里”这一更细分支，继续由
> `src/games/smashup/__tests__/ongoingModifiers.test.ts`
> 里的
> `mermaids_temptress 在其他玩家自己的回合把自己的随从移动到这里时仍应 +2`
> 锁定。本轮 L3 负责补真实棋盘显示证据，不再伪装成 guest 私有视角链路。

### 三、《无人岛》

#### 1. 挂到基地后，双方在这里的个人总力量都被压到 0，但基地总力量仍是 7

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-desert-island-attached-2026-04-30.png`
- 我实际看到：
  1. 《无人岛》已经真实挂在基地上。
  2. 双方分数徽章都显示 `0`。
  3. 基地中央总力量仍是 `7`，说明被压的是“控制者总力量贡献”，不是把仆从力量本体清零。
- 是否达到验收标准：
  - **达到。** 这张图证明《无人岛》的核心持续语义已在浏览器里真实生效。

#### 2. 到你下回合开始前，这张牌已经自毁，双方分数恢复为 3 / 4

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-desert-island-destroyed-2026-04-30.png`
- 我实际看到：
  1. 基地上已经看不到《无人岛》本体。
  2. 双方分数徽章恢复为 `3` 和 `4`。
  3. 仆从仍在场上，说明恢复不是通过清场伪造出来的。
- 是否达到验收标准：
  - **达到。** 这张图证明《无人岛》不仅会压制总力量，还会按卡图在你下回合开始前自毁。

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- `Mermaids / 美人鱼` 本轮新增 3 条对象级 L3：
  - 《塞壬》
  - 《诱惑者》
  - 《无人岛》
- 截至本轮，`Mermaids` 当前至少已有：
  - 《最后的歌声》
  - 《迷倒观众》
  - 《人鱼女王》
  - 《安静的海岸》
  - 《塞壬的歌声》
  - 《塞壬》
  - 《诱惑者》
  - 《无人岛》
  共 `8` 条正路径对象级 L3 证据。
- 但三新派系整包仍保持 **仍有残余范围**，不能把 `Mermaids` 这一批补证直接外推成整包收口。
