# 召唤师战争：祖灵法师无充能转移回归 E2E 证据

## 测试目标
- 验证 `spirit_bond` 在祖灵法师无充能时，不能给友方单位转移充能。
- 验证该场景下只允许“充能自身”收口。

## 执行命令
```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars-barbaric-abilities.e2e.ts "祖灵交流：无充能时不能给队友转移，只能充能自身"
```

## 关键断言（测试内）
- 触发移动后交互时，点击友方单位后状态保持：
  - 祖灵法师 `boosts === 0`
  - 友方目标 `boosts === 0`
- 点击“充能自身”后状态变为：
  - 祖灵法师 `boosts === 1`
  - 友方目标 `boosts === 0`
- 交互收口：`Skip/跳过` 按钮消失。

## 截图证据与观察

### 1) 无充能触发后的主视图（操作前）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：无充能时不能给队友转移，只能充能自身\spirit-bond-no-charge-before-click-ally.png`
- 我实际看到：
  - 顶部出现“祖灵交流：充能不足，只能充能自身”提示。
  - 顶部操作区存在“充能自身”和“跳过”，没有“转移”按钮。
  - 棋盘上可见祖灵法师本体与友方目标本体。
- 验收判断：达到“无充能限制转移路径”的界面提示要求。

### 2) 友方目标单位本体（操作前）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：无充能时不能给队友转移，只能充能自身\spirit-bond-no-charge-before-click-ally-unit.png`
- 我实际看到：
  - 友方目标单位卡面本体可见（半透明高亮态）。
  - 该截图用于证明“被点击对象本体”真实存在，不是空容器。
- 验收判断：达到“可复核目标本体”要求。

### 3) 选择“充能自身”后的主视图（操作后）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：无充能时不能给队友转移，只能充能自身\spirit-bond-no-charge-after-charge-self.png`
- 我实际看到：
  - 顶部“祖灵交流”操作横幅已收口，不再显示“充能自身/跳过”按钮。
  - 场景返回可继续推进状态（移动阶段常规提示）。
- 验收判断：达到“交互已收口，不重复停留在转移选择”要求。

### 4) 祖灵法师单位本体（操作后）
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-barbaric-abilities.e2e\祖灵交流：无充能时不能给队友转移，只能充能自身\spirit-bond-no-charge-after-charge-self-shaman-unit.png`
- 我实际看到：
  - 祖灵法师单位卡面本体可见。
  - 与测试断言配合，确认这是“充能自身”后的源单位对象。
- 验收判断：达到“结果对象可复核”要求。

## 结论
- 本次 E2E 在真实移动后交互链路下通过，且断言明确证明：
  - **无充能时，点击友方不会发生转移充能。**
  - **只能通过“充能自身”完成本次交互。**
