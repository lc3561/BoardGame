# SmashUp 反馈 69daa34c469c37573d131bf7 修复验证（2026-04-22）

- 反馈ID：`69daa34c469c37573d131bf7`
- 严重级别：`high`
- 反馈内容：`丧尸很容易死机，ai不跳牌`
- 在线路由：`/play/smashup/match/W8n8icyVow8?playerID=0`

## 根因定位

- 线上快照中出现异常迹象：
  - actionLog 末尾为 `顽强丧尸 -> ?`
  - `minionsPlayedPerBase` 出现 `"undefined": 1`
- 对应代码链路定位到 `zombie_lord_pick` 交互处理器：
  - 在只收到 `optionId`（未合并 `baseIndex`）时，旧实现仍会构造 `MINION_PLAYED` 事件。
  - 该脏事件会携带缺失基地索引，进而污染每回合基地出牌计数，并使 AI 回合恢复链路出现卡滞风险。

## 修复内容

文件：`src/games/smashup/abilities/zombies.ts`

- `zombie_lord_pick` 增加完整防御：
  - 校验 `continuationContext`、`cardUid`、弃牌堆卡牌存在性。
  - 只允许力量 `<=2` 的合法目标随从。
  - 当 `baseIndex` 缺失/非法时，回退到首个仍可用的空基地（避免写脏事件）。
  - 在发出事件前执行 `validateDiscardMinionPlaySemantics` 校验。
  - 生成事件时补齐 `baseDefId`，并显式 `consumesNormalLimit: false`。

## 自动化验证

1. 单测回归（命中本次根因）

- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/zombieInteractionChain.test.ts --config vitest.config.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1`
- 结果：`21 passed`
- 新增断言点：
  - 在只传 `optionId` 的情况下，`zombie_lord_pick` 仍能把弃牌堆随从部署到有效基地。
  - `minionsPlayedPerBase` 不得再出现 `undefined` 键。

2. 交互链 E2E（防回归）

- 命令：
  - `node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-zombie-lord.e2e.ts "僵尸领主：仅回传 optionId 时也应回退到首个合法基地，不写入 undefined 基地状态"`
- 结果：`1 passed`
- 证伪路径：
  - 测试故意绕过 UI 基地点击，直接向 `SYS_INTERACTION_RESPOND` 只发送 `optionId`，复现“AI/自动恢复链路未合并 `baseIndex`”这一线上坏输入。
  - 若修复失效，预期会重新出现弃牌随从未正确落地、交互不收口，或 `minionsPlayedPerBase.undefined` 被写入的现象。

## 关键截图与观察

1. 坏输入提交后，弃牌随从仍被正常落到首个合法空基地
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-zombie-lord.e2e\僵尸领主：仅回传-optionId-时也应回退到首个合法基地，不写入-undefined-基地状态\zombie-lord-ai-optionid-fallback-after.png`
- 我实际看到：`顽强丧尸` 已经落到首个合法空基地，画面不再停在待选基地/待交互状态。
- 验收判定：达标（AI 只回 `optionId` 时也能正常收口，不再死机）。

2. 状态断言同步证明未写入脏基地键
- 路径：同上用例运行结果截图目录。
- 我实际看到：用例通过后，对应状态断言同时确认 `minionsPlayedPerBase?.undefined === undefined`，没有再把基地索引写成 `undefined`。
- 验收判定：达标（线上坏状态已被证伪）。

## 结论

- 当前代码已补齐 `zombie_lord_pick` 在缺失 `baseIndex` 下的安全回退与语义校验。
- 本次反馈描述的“丧尸链路易卡死、AI 不跳牌”对应风险点已被覆盖，具备 `resolved` 回写依据。
