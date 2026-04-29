# Smash Up 骷髅《他们出来了》真实入口 E2E 证据（2026-04-29）

## 范围

- 派系：`Skeletons / 骷髅`
- 对象：`skeletons_dig_em_up / 他们出来了`
- 目标：
  1. 证明它只允许选择“你埋葬了牌”的基地。
  2. 证明它可在真实 prompt 中一次挖掘多张己方埋葬牌。

## 权威来源

- 卡图优先：
  - `temp/skeletons-card-14.png`
- 卡图口径：
  - **选择 1 个基地，挖掘至多 3 张你埋葬在那里的牌。**

## 本轮实现

- `e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
  - 新增：`他们出来了应只允许选择有己方埋葬牌的基地，并可一次挖掘多张己方埋葬牌`

## 验证命令

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "他们出来了应只允许选择有己方埋葬牌的基地，并可一次挖掘多张己方埋葬牌"
```

结果：

- `1 passed`

## 关键截图

### 1. 埋葬牌选择 prompt 已只暴露己方埋葬牌所在基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-dig-em-up-cards-prompt-2026-04-29.png`
- 肉眼观察：
  1. 画面已经进入《他们出来了》的挖掘牌选择阶段，不是只停在手牌打出。
  2. 只有基地 1 的两张己方埋葬牌被翻到可核对状态；基地 2 虽然也有埋葬牌，但那张是对手的，没有被错误放进当前选择链。
- 验收判断：
  - **达到。** 这张图证明“只看你的埋葬牌”这层约束已经落到真实入口 UI。

### 2. 结算后，两张己方埋葬牌都已真实挖出

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-skeletons-dig-em-up-resolved-2026-04-29.png`
- 肉眼观察：
  1. 原先埋在基地 1 的两张己方埋葬牌都已不再留在埋葬堆。
  2. 其中挖出的随从已经回到基地 1 的场上区域，说明这不是只清掉埋葬态、没完成真实挖掘。
- 验收判断：
  - **达到。** 这张图证明《他们出来了》的多张挖掘结算已真实落地。

## 结论

- 《他们出来了》当前已补齐对象级 **L3 真实入口证据**。
- 本轮没有新增实现修复，新增的是浏览器级真证据。
- 截至本轮，`Skeletons / 骷髅` 当前至少已有 `殉葬品 / 灵车队伍 / 复仇者 / 他们出来了` 共 `4` 条正路径对象级 L3 证据。
- 三新派系整包仍保持 **仍有残余范围**，不能把这条补证外推成整包收口。
