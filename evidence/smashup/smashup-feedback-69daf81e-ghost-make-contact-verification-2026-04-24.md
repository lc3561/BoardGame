# SmashUp 反馈验证：幽灵「交朋友」最后一张手牌行为（2026-04-24）

- 反馈ID：`69daf81e469c37573d131c16`
- 用户描述：最后一张幽灵“交朋友”没有效果，直接进弃牌堆。

## 代码口径

对应实现文件：
- `src/games/smashup/abilities/ghosts.ts`

当前规则逻辑：
1. `ghost_make_contact`（基础版）
- 只能在该牌是唯一手牌时打出。
- 成功附着后会发出控制权转移事件，不是“直接进弃牌堆”。

2. `ghost_make_contact_pod`（POD 版）
- 若手牌仍有其它牌，会触发自毁并进入弃牌堆；
- 只有在该牌为最后一张手牌时才执行控制权转移。

## 验证测试

执行命令：
- `npm run test -- src/games/smashup/__tests__/ghostsAbilities.test.ts`

通过结果：`8/8`

覆盖到的关键断言：
- `ghost_make_contact`：最后一张手牌可打出并转移控制权。
- `ghost_make_contact`：手牌有其他卡时禁止打出（不会错误结算）。
- `ghost_make_contact_pod`：最后一张手牌转移控制权；有其他手牌时自毁入弃牌堆。

## 结论

该反馈对应链路在当前实现已被修复并有专门回归测试覆盖。可将该条反馈推进为 `resolved`，并保留此文档作为验收依据。
