# Smash Up 美人鱼《塞壬的歌声》真实入口 E2E 证据（2026-04-29）

## 范围

- 派系：`Mermaids / 美人鱼`
- 对象：`mermaids_siren_song / 塞壬的歌声`
- 目标：
  1. 证明它不是“任意有敌方仆从的基地都能选”。
  2. 证明它会把目标仆从真实移动到“另一个且你有仆从的基地”。

## 权威来源

- 卡图优先：
  - `temp/cards7-03.png`
- 卡图口径：
  - **选择一个基地，把每位其他玩家在那里的一张仆从移动到同一个、且你有仆从的另一个基地。**

## 本轮实现

- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增：`塞壬的歌声应只提供有其他己方基地可去的来源基地，并把目标仆从移到该己方基地`

## 验证命令

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "塞壬的歌声应只提供有其他己方基地可去的来源基地，并把目标仆从移到该己方基地"
```

结果：

- `1 passed`

## 关键截图

### 1. 来源基地 prompt 已排除“没有其他己方基地可去”的非法来源

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-siren-song-source-prompt-2026-04-29.png`
- 肉眼观察：
  1. 当前已经进入《塞壬的歌声》的来源基地选择，不是只停在手牌选中。
  2. 只出现基地 2 作为合法来源；基地 1 虽然也有敌方仆从，但因为没有“另一个己方基地可去”，没有混进候选。
- 验收判断：
  - **达到。** 这张图直接证明了来源基地过滤已按卡图口径收紧。

### 2. 目标选择 prompt 已锁到来源基地上的敌方仆从

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-siren-song-target-prompt-2026-04-29.png`
- 肉眼观察：
  1. 顶部提示已经进入《塞壬的歌声》的仆从选择阶段。
  2. 候选只剩来源基地上的 `enemy-movable`，没有把目标基地上的敌方仆从混进来。
- 验收判断：
  - **达到。** 这张图证明“来源基地”与“目标仆从范围”两层约束都还在。

### 3. 结算后，目标仆从已真实移动到你有仆从的基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-siren-song-resolved-2026-04-29.png`
- 肉眼观察：
  1. 原本在基地 2 的 `enemy-movable` 已经出现在基地 1。
  2. 来源基地不再保留该仆从，说明不是假 prompt 或只改了交互态。
- 验收判断：
  - **达到。** 这张图证明《塞壬的歌声》的真实移动结算已经落到棋盘权威状态。

## 结论

- 《塞壬的歌声》当前已补齐对象级 **L3 真实入口证据**。
- 本轮没有新增实现修复，新增的是浏览器级真证据。
- 截至本轮，`Mermaids / 美人鱼` 当前至少已有 `最后的歌声 / 迷倒观众 / 人鱼女王 / 安静的海岸 / 塞壬的歌声` 共 `5` 条正路径对象级 L3 证据。
- 但三新派系整包仍保持 **仍有残余范围**，不能把这条补证外推成整包收口。
