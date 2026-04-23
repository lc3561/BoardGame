# DiceThrone 反馈修复证据（69a58f8c / 69a59782 / 69c7e7bc）

- 日期：2026-04-23
- 反馈：
  - `69a58f8cbd494244e5a29f3e`：野蛮人 5 个 6 点选不了终极技能
  - `69a59782bd494244e5a2a022`：狂战士选不了终结技能
  - `69c7e7bc32bd47a7b57a61fc`：重击升级后都不可防御

## 变更与验证

- 代码变更
  - `e2e/dicethrone/dicethrone-hero-mechanics.e2e.ts`
    - 新增并跑通用例：`5个6点时应出现并可选择狂怒（Rage）`
    - 使用在线状态注入把当前回合骰面设置为 5 个 `strength`，确认后优先选择 Rage（找不到槽位时回退到 `SELECT_ABILITY rage` 命令），验证 `activatingAbilityId` 命中 `rage`。
  - `src/games/dicethrone/__tests__/barbarian-abilities.test.ts`
    - 补断言：`RECKLESS_STRIKE_2.tags` 不包含 `unblockable`。

- 执行命令
  - `node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-hero-mechanics.e2e.ts "5个6点时应出现并可选择狂怒（Rage）"`
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/barbarian-abilities.test.ts --configLoader native -t "狂怒 - 终极技能，5个力量面触发|鲁莽打击 II - 伤害提升到 20，自伤 5"`

## 关键截图与观察

- 截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-hero-mechanics.e2e\5个6点时应出现并可选择狂怒（Rage）\barbarian-rage-5x6-selectable.png`

- 我实际看到：
  - 主战场上狂战士技能区可见 Rage（底部黄色条“RAGE!”），右侧“结算攻击”按钮可用。
  - 调试状态区骰面为 5 个 `strength`，与终极触发条件一致。

- 验收判定：
  - 达标。5 个 6 点（5 个 strength）场景下，终极 Rage 可以进入选定链路并成功激活。
  - `RECKLESS_STRIKE_2` 非 `unblockable` 的约束已被单测锁定，避免回归为“不可防御”。

