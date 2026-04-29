# DiceThrone 防御技能伤害特效 E2E 证据

## 范围

- 游戏：`dicethrone`
- 技能：武士 `stand-tall` / `stand-tall II`
- 目标：确认“防御技能本体造成伤害”时，UI 是否实际出现伤害飞行动画，而不是只有结算结果跳变

## 执行命令

```bash
npm run test:e2e:ci:file -- e2e/dicethrone/temp-dicethrone-ability-atlas-regression.e2e.ts "samurai Stand Tall II 应显示 4 骰防御并在无盾时不自加 Shame"
```

## 关键截图

### 1. 伤害飞行中

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-hero-ability-cards-e2e\samurai-stand-tall-2-damage-fx-frame-1.png`
- 我实际看到：武士面板右上区域到敌方顶部头像区域之间存在一串白色飞行弹道/光点，本体可见，不是静态 UI 元素。
- 验收判断：达到“防御技能伤害特效已出现”的标准；这张图证明不是只有数值结算，没有特效。

### 2. 同批次另一段伤害飞行

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-hero-ability-cards-e2e\samurai-stand-tall-2-damage-fx-frame-3.png`
- 我实际看到：左下生命条附近还有一枚白色飞行光点，说明这次收口阶段同批次存在另一段伤害飞行动画。
- 验收判断：说明该阶段伤害 FX 管线确实在工作，不是完全无动画。

### 3. 收口后状态

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-hero-ability-cards-e2e\samurai-stand-tall-2-settled-no-shame.png`
- 我实际看到：对手顶部生命值为 `46`，武士左下生命值为 `45`，武士未额外获得 `Shame`。
- 验收判断：达到“伤害结算已收口且流程回到可继续推进状态”的标准。

## 结论

- 这次 E2E 成功复现并拍到了 `stand-tall II` 防御伤害的飞行动画。
- 代码修复后，防御技能伤害不再只表现为最终 HP 变化，已经能看到真实伤害特效链。
