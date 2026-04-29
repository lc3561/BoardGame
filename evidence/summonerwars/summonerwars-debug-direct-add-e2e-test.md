# SummonerWars 调试补牌 E2E 证据

## 范围

- 文件：`e2e/summonerwars/summonerwars.e2e.ts`
- 用例：`调试面板在目标牌已离开剩余牌库后仍可按稳定 cardId 直接补牌`
- 目标：验证 `summonerwars` 调试面板不再把“剩余牌库里有没有这张牌”误当成唯一条件；当目标牌已离开剩余牌库后，仍可通过稳定 `cardId` 直接补到手牌。

## 本轮结论

- `summonerwars` 调试面板现在是通用双语义：
  - 目标牌仍在剩余牌库：优先走 `deck -> hand`
  - 目标牌已离开剩余牌库：走 `SYS_CHEAT_ADD_CARD_TO_HAND_BY_CARD_ID`
- 图集索引只保留为速查展示，不再作为提交主键。
- 这次 E2E 真实把 `necro-elut-bar` 从 P0 剩余牌库移除，只保留在弃牌堆，然后通过调试面板把同名牌直接补回手牌，链路跑通。

## 验证结果

- `npm run typecheck`：通过
- `node scripts/infra/vitest-cli-safe.mjs run src/games/summonerwars/__tests__/factions.test.ts src/engine/systems/__tests__/CheatSystem.test.ts src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native`：通过
- `npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "调试面板在目标牌已离开剩余牌库后仍可按稳定 cardId 直接补牌"`：通过

## 场景与观察

场景：

- 对局：在线双人 SummonerWars
- Host / P0：`necromancer`
- Guest / P1：`trickster`
- 调试目标 seat：`P0`
- 目标卡：`necro-elut-bar`

操作与结果：

1. 先通过调试状态注入把 `necro-elut-bar` 从 `players['0'].deck` 移除，并放入 `players['0'].discard`
2. 打开调试面板控制页，选择 `P0 + necro-elut-bar`
3. 按钮文案变为“直接补到手牌”，说明 UI 已识别这是稳定 `cardId` 注入，而不是 deck-only 发牌
4. 点击后，`players['0'].hand` 中出现 `necro-elut-bar-0-1`
5. 同时 `players['0'].deck` 中仍不存在 `necro-elut-bar`，说明这次不是误从剩余牌库发牌，而是直接补牌成功

## 截图

- 发牌前，按钮已切到“直接补到手牌”：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\调试面板在目标牌已离开剩余牌库后仍可按稳定-cardId-直接补牌\调试面板在目标牌已离开剩余牌库后仍可按稳定-cardId-直接补牌-debug-stable-cardid-before-apply.png`
- 点击后，整页状态已更新，手牌中出现新增的 `necro-elut-bar`：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\调试面板在目标牌已离开剩余牌库后仍可按稳定-cardId-直接补牌\调试面板在目标牌已离开剩余牌库后仍可按稳定-cardId-直接补牌-debug-stable-cardid-after-apply.png`

## 验收结论

- 这次修复不只是把提示语改准确。
- 实际行为已经从“只看剩余牌库”变成“优先剩余牌库，否则按稳定 `cardId` 直接补牌”。
- 对 `summonerwars` 来说，这条调试补牌链路已经从局部业务修补上升到了共享作弊协议的正确语义。
