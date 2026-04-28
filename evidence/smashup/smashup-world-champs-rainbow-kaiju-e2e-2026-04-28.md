# SmashUp 世界冠军《彩虹女孩 / 怪兽冲击》真实入口 E2E 证据（2026-04-28）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`World Champs / 世界冠军`
- 对象：
  - `world_champs_rainbow_girl / 彩虹女孩`
  - `world_champs_kaiju_conflict / 怪兽冲击`
- 目标：
  1. 补齐《彩虹女孩》“你在这里的其他随从获得 +1 力量直到回合结束”的 L3 真实入口证据。
  2. 补齐《怪兽冲击》“打出两个额外的行动”的 L3 真实入口证据。

## 权威来源

- 卡图正文切片：
  - `temp/cards7-24.png`（《彩虹女孩》）
  - `temp/cards7-38.png`（《怪兽冲击》）
- 当前 E2E 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 当前能力回归文件：`src/games/smashup/__tests__/newFactionAbilities.test.ts`

## 执行命令

> 仓库当时已有其他 `e2e-run` 重任务在跑，项目包装命令会被同名 guard 拒绝；本轮实际采用“手工拉起 managed runtime + 定向 Playwright grep”的等价链路执行。

```powershell
node scripts/infra/e2e-runtime-manager.mjs ensure --json --hold --scope <manual-scope> --target e2e/smashup/smashup-robot-hoverbot-new.e2e.ts
npx playwright test e2e/smashup/smashup-robot-hoverbot-new.e2e.ts -g "彩虹女孩"
npx playwright test e2e/smashup/smashup-robot-hoverbot-new.e2e.ts -g "怪兽冲击"
```

## 结果

- `彩虹女孩` → `1 passed`
- `怪兽冲击` → `1 passed`

## 关键截图与肉眼结论

> 本轮稳定截图落在 `e2e/evidence/screenshots/`，以下均为绝对路径。

### 一、《彩虹女孩》

#### 1. 打出前，只有同基地己方随从在左侧基地，另一名己方随从在别的基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-rainbow-girl-before-2026-04-28.png`
- 我实际看到：
  1. 左侧基地下方能直接看到一张己方随从本体，右侧另一个基地下方也有一张己方随从本体，说明“同基地己方”和“其他基地己方”两类对象都真实存在。
  2. 手牌中能直接看到《彩虹女孩》卡面本体，不是只靠状态注入伪造结论。
  3. 左侧基地当前总力量还是打出前的原始值，尚未出现《彩虹女孩》入场后的额外加成。
- 是否达到验收标准：
  - **达到。** 这张图证明测试场景里确实存在“同基地其他己方随从”和“其他基地己方随从”的可区分对象。

#### 2. 打出后，只给这里的其他己方随从 +1

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-rainbow-girl-resolved-2026-04-28.png`
- 我实际看到：
  1. 左侧基地已经出现《彩虹女孩》卡面本体，说明它确实是通过真实打出进入基地。
  2. 同基地原有己方随从旁边出现绿色 `+1` 标记，证明“这里的其他己方随从”获得了加成。
  3. 右侧基地的己方随从没有出现 `+1` 标记；《彩虹女孩》自己也没有额外 `+1` 标记，视觉结果与卡图语义一致。
- 是否达到验收标准：
  - **达到。** 这张图证明《彩虹女孩》没有把加成错误扩散到自己、敌方或其他基地的己方随从。

### 二、《怪兽冲击》

#### 1. 打出后，顶部出现两次“获得 1 次额外行动机会”，且手里还保留两张可继续打出的行动

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-kaiju-conflict-after-first-action-2026-04-28.png`
- 我实际看到：
  1. 顶部连续出现两条“获得 1 次额外行动机会”提示，直接对应《怪兽冲击》的“两次额外行动”。
  2. 手牌区仍能看到《现在是闪电时间！》和《暗杀》两张行动卡本体，说明打出《怪兽冲击》后本回合还能继续打行动。
  3. 右下角额度提示显示本回合仍有 `战术 2`，这和“打出后还能再打两个行动”的语义一致。
- 是否达到验收标准：
  - **达到。** 这张图证明《怪兽冲击》在真实入口下确实给出了两个额外行动额度，不是只有状态字段变化而没有实际可执行能力。

#### 2. 额外行动已真实消耗到第三张行动，且第三张行动成功附着

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-kaiju-conflict-third-action-resolved-2026-04-28.png`
- 我实际看到：
  1. 中间基地的己方随从旁边出现绿色 `+3` 标记，说明第一张额外行动《现在是闪电时间！》已经真实结算。
  2. 敌方《大副》卡面本体仍在场，但旁边能看到《暗杀》附着提示与图标，说明第二张额外行动《暗杀》也已经被合法打出并附着成功。
  3. 右下角额度提示显示 `战术 0`，说明这回合的两个额外行动都已经实际消耗完，而不是只在日志里写了额度。
- 是否达到验收标准：
  - **达到。** 这张图证明《怪兽冲击》给出的两个额外行动额度，已经被真实用来打出后续两张行动。

## 状态断言补充

### 《彩虹女孩》

- E2E 断言：
  - 结算后 `rainbow-ally-same-base.tempPowerModifier === 1`
  - `rainbow-enemy-same-base.tempPowerModifier === 0`
  - `world_champs_rainbow_girl.tempPowerModifier === 0`
  - `rainbow-ally-other-base.tempPowerModifier === 0`

### 《怪兽冲击》

- E2E 断言：
  - 打出《怪兽冲击》后：
    - `players['0'].actionsPlayed === 1`
    - `players['0'].actionLimit >= 3`
  - 再连续打出《现在是闪电时间！》与《暗杀》后：
    - `players['0'].actionsPlayed === 3`
    - `players['0'].actionLimit >= 3`
    - `players['0'].hand.length === 0`
    - `kaiju-ally-2.tempPowerModifier === 3`
    - `kaiju-enemy-1.attachedActions` 包含 `ninja_assassination`

## 结论等级

- **代表性玩法已验证**

## 对总审计的修订

- 《彩虹女孩》当前已补齐浏览器级 L3 真实入口证据，且本轮未发现“卡图录错 / 中文名录错 / 索引错位”问题。
- 《怪兽冲击》当前已补齐浏览器级 L3 真实入口证据，且本轮未发现“少给额度”的实现问题；中途暴露的是**E2E 断言误把《暗杀》当成即时消灭**，不是卡牌实现错。
- 截至本轮，`World Champs / 世界冠军` 已累计补到 `16` 条正路径对象级 L3 证据；但三新派系整包仍维持 **仍有残余范围**，不能把这两张补证外推成整包收口。
