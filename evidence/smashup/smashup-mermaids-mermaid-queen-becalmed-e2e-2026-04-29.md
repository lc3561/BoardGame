# Smash Up 美人鱼《人鱼女王 / 安静的海岸》真实入口 E2E 证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Mermaids / 美人鱼`
- 对象：
  - `mermaids_mermaid_queen / 人鱼女王`
  - `mermaids_becalmed_shores / 安静的海岸`
- 目标：
  1. 补齐《人鱼女王》“选择移动模式后，把其他玩家的一个仆从移到这里”的 L3 真实入口证据。
  2. 补齐《安静的海岸》“打到基地后，从场上发动持续牌天赋并移到另一个基地”的 L3 真实入口证据。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-09.png`（《人鱼女王》）
  - `temp/cards7-02.png`（《安静的海岸》）
- 当前回归文件：
  - `src/games/smashup/__tests__/newFactionAbilities.test.ts`
  - `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`

## 本轮改动

- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增：
    - `人鱼女王应可选择移动其他玩家的一个仆从到这里`
    - `安静的海岸应可从场上发动天赋并移到另一个基地`
- 本轮没有新增实现修复。
- 这次目标是把此前仅停留在 L2 的《人鱼女王》《安静的海岸》补到浏览器级 L3。

## 执行命令

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "mermaids_mermaid_queen|mermaids_becalmed_shores"

npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "人鱼女王应可选择移动其他玩家的一个仆从到这里"

node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "安静的海岸应可从场上发动天赋并移到另一个基地"
```

## 结果

- 定向单测：`3 passed`
- `人鱼女王` E2E：`1 passed`
- `安静的海岸` E2E：`1 passed`

## 关键截图与肉眼结论

> 本轮稳定截图落在 `e2e/evidence/screenshots/`，以下均为绝对路径。

### 一、《人鱼女王》

#### 1. 进入移动模式后，只给出可被移动到“这里”的敌方仆从

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-mermaid-queen-move-prompt-2026-04-29.png`
- 我实际看到：
  1. 顶部已经进入《人鱼女王》的后续目标选择，不是只停在打出本体。
  2. 画面中只有另一个基地上的目标仆从作为候选，不会把《人鱼女王》所在基地上的 `enemy-small` 也混进来。
  3. 这张图对应的是“移动到这里”分支，不是控制权分支。
- 是否达到验收标准：
  - **达到。** 这张图证明《人鱼女王》真实进入了“把其他玩家一个仆从移到这里”的目标选择链路。

#### 2. 结算后，目标仆从已被真实移动到《人鱼女王》所在基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-mermaid-queen-move-resolved-2026-04-29.png`
- 我实际看到：
  1. 《人鱼女王》已经真实站在左侧基地。
  2. 原本在另一基地的目标仆从现在也出现在左侧基地。
  3. 右侧原基地已经不再保留这张目标仆从。
- 是否达到验收标准：
  - **达到。** 这张图证明《人鱼女王》的移动模式不是假 prompt，目标仆从确实被移到了“这里”。

### 二、《安静的海岸》

#### 1. 打到基地后，持续牌本体已真实挂在场上

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-becalmed-shores-attached-2026-04-29.png`
- 我实际看到：
  1. 《安静的海岸》已经以基地持续牌形式挂在左侧基地，不是在手牌或弃牌堆。
  2. 这张图证明后续发动的是“场上的持续牌天赋”，不是测试直接注入 prompt。
  3. 目标基地两边都已有敌方仆从，后续迁移是有真实棋盘上下文的。
- 是否达到验收标准：
  - **达到。** 这张图证明《安静的海岸》的真实入口起点是正确的：先打到基地上，再从场上发动天赋。

#### 2. 从场上发动天赋后，进入“移到另一个基地” prompt

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-becalmed-shores-move-prompt-2026-04-29.png`
- 我实际看到：
  1. 顶部提示已经进入《安静的海岸》的移动目标选择。
  2. 可选项中存在另一个基地，不是无效空 prompt。
  3. 这张图说明场上持续牌的天赋入口已真实拉起。
- 是否达到验收标准：
  - **达到。** 这张图证明《安静的海岸》不是只有静态 `talent` 标签，真实对局里确实能发动迁移交互。

#### 3. 结算后，这张持续牌已经移到另一个基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-becalmed-shores-moved-2026-04-29.png`
- 我实际看到：
  1. 《安静的海岸》已经不在左侧基地，而是出现在右侧基地。
  2. 左侧原基地不再保留这张持续牌。
  3. 这张图对应的是“从场上发动天赋后完成迁移”的最终态，不是只有 prompt 出现。
- 是否达到验收标准：
  - **达到。** 这张图证明《安静的海岸》的天赋迁移真实完成，不是只改了状态字段没改棋盘。

## 状态断言补充

### 《人鱼女王》

- 单测断言：
  - `mermaids_mermaid_queen_mode` 同时存在 `control / move`
  - 选择 `move` 后，只允许选择别处敌方仆从，不把“这里”的敌方仆从混进候选
- E2E 断言：
  - `mode` prompt 同时存在 `move` 与 `control`
  - 进入 `move` prompt 后：
    - 存在 `enemy-other @ base 1`
    - 不存在 `enemy-small`
  - 结算后：
    - `enemy-other` 出现在基地 `0`
    - 基地 `1` 不再保留 `enemy-other`

### 《安静的海岸》

- 单测断言：
  - 使用 `USE_TALENT(ongoingCardUid)` 后，进入 `mermaids_becalmed_shores`
  - 结算后这张牌从基地 `0` 移到基地 `1`
- E2E 断言：
  - 打出后，基地 `0` 上存在 `mermaids_becalmed_shores`
  - 双击场上持续牌后进入 `mermaids_becalmed_shores` prompt
  - 结算后：
    - 基地 `0` 不再保留这张牌
    - 基地 `1` 挂上这张牌
    - `talentUsed === true`

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- `Mermaids / 美人鱼` 当前新增 2 条对象级 L3：
  - 《人鱼女王》移动模式
  - 《安静的海岸》持续牌天赋迁移
- 截至本轮，`Mermaids` 当前至少已有 `最后的歌声 / 迷倒观众 / 人鱼女王 / 安静的海岸` 共 `4` 条正路径对象级 L3 证据。
- 但这仍然只是 `Mermaids` 的对象级补证继续扩展，三新派系整包仍保持 **仍有残余范围**。
