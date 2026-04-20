# SummonerWars AI 攻击动画队列稳定化 E2E 证据

## 测试信息
- 用例：`在线对局流程：召唤、移动、建造、攻击与弃牌`
- 命令：`npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "在线对局流程：召唤、移动、建造、攻击与弃牌"`
- 结果：通过（1/1）
- 本轮补充：加入“特写关闭去重 + 特写退场后再播攻击动画”后复跑同一用例仍通过。
- 最新调整：移除“统一等退场再播”额外等待；特写兜底时长调整为 `1500ms`，并对纯 `advance-phase/response-pass` 启用 AI 快速通道。

## 关键截图与观察
- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\online-flow-guest-dice-overlay.png`
- 观察：
  - 攻击骰子特写本体可见，浮层内容完整，不是仅有遮罩或外框。
  - 浮层显示在对侧视角流程中，符合“远端/对手攻击事件可见”的验收目标。
  - 浮层处于可点击关闭状态，可作为“手动关闭优先”的入口。

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\online-flow-after-attack.png`
- 观察：
  - 攻击后流程正常推进到后续战场状态，没有卡在骰子层。
  - 战场主元素仍在正常坐标系，未出现攻击后整体错位或遮挡异常。
  - 说明特写收口后链路可继续，不存在“特写关闭后流程中断”现象。

- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\在线对局流程：召唤、移动、建造、攻击与弃牌\online-flow-after-discard.png`
- 观察：
  - 攻击之后可继续进入弃牌阶段，完整在线流程可收口。
  - 没有出现因动画链路未结束导致的阶段阻塞。
  - 说明视觉门控与后续交互队列释放正常。
