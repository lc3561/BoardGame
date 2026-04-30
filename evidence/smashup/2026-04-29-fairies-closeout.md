# Smash Up Fairies Closeout (2026-04-29)

## Scope

- Game: `smashup`
- Expansion: `Pretty Pretty Smash Up`
- Faction: `Fairies / 仙灵`
- Delivery target: `正式可玩`
- Titan scope: `Spirit of the Forest / 丛林之灵` 已纳入本轮

## Truth Sources

- Intake / source contract: [2026-04-28-fairies-intake-contract.md](./2026-04-28-fairies-intake-contract.md)
- 英文名称与原版效果主对照：`https://smashup.fandom.com/wiki/Fairies`
- POD 官方 wiki：`https://smashup-rulebook.alderac.com/wiki/Fairies`
  - 本轮仅作 compare-only，不作为 original Fairies 主真相源
- Titan atlas：[`taitan1.png`](../../public/assets/i18n/zh-CN/smashup/taitan/taitan1.png)
  - 本地图集来源由用户提供，用于 `Spirit of the Forest / 丛林之灵` 预览链路与运行时资源

## Delivered

- 新增 Fairies 正式 card atlas 接线：`SMASHUP_ATLAS_IDS.CARDS8 -> smashup/cards/pretty_pretty`
- 复用并校正 Fairies base atlas：`BASE3 -> smashup/base/base3`
- 补齐 Fairies faction metadata、静态卡牌数据、base 数据、locale、关键图片解析链路
- 完成 Fairies 主派系卡牌能力与基地能力闭环
- 完成 `Spirit of the Forest / 丛林之灵` Titan 接入：
  - 正式 Titan 定义、预览图索引与派系关联
  - “代替通常随从与通常行动”召唤条件校验
  - `Titania`、`Puck`、`Magic Acorns`、`Playful Tricks`、`Enchantment`、`Fairy Circle`、`Fairy Ballet` 与 Titan 激活态的额外分支
  - titan clash 输掉时可改为移动到其他基地的例外交互
- 补齐 Titan 运行时资源：
  - `public/assets/i18n/zh-CN/smashup/taitan/taitan1.png`
  - `public/assets/i18n/zh-CN/smashup/taitan/compressed/taitan1.webp`
  - `public/assets/i18n/en/smashup/taitan/taitan1.png`
  - `public/assets/i18n/en/smashup/taitan/compressed/taitan1.webp`
- 修正 `Fairy Circle / 精灵之环` 旧实现，使其回到官方二选一语义，而不是同时授予额外随从与额外行动
- 为相关共享规则补了回归覆盖：
  - 基地行动限制对随从目标行动的合法性校验
  - `Magic Ward` 与 `Dread Lookout` 的目标面区分
  - `Fairy Circle` 的交互式额度选择与 off-phase `immediate` 语义

## Validation Completed

- `npm run typecheck`
  - 结果：通过
- `npx tsx scripts/verify/i18n-check.ts`
  - 结果：通过，`no missing keys detected`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseRestrictions.test.ts src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/criticalImageResolver.test.ts --configLoader native`
  - 结果：`3` files passed，`231` passed，`1` skipped
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/commandsValidation.test.ts src/games/smashup/__tests__/factionSelection.test.ts src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native`
  - 结果：通过；覆盖 Titan 特殊召唤门禁、派系 Titan 暴露、titan clash 例外交互
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionBaseAbilities.test.ts --configLoader native`
  - 结果：`46 passed`
- `npm run test:smashup`
  - 结果：`146` files passed，`2050` passed，`9` skipped，`0` failed
- `openspec validate add-smashup-fairies-faction --strict --no-interactive`
  - 结果：`Change 'add-smashup-fairies-faction' is valid`

## Remaining Non-Blocking Gaps

- 本轮未在当前 closeout 中补跑 Fairies 专属真实入口 E2E，因此这里不能声称已经完成 UI 看图验收
- 运行时资源已写入仓库本地树，但本轮未执行远端资产上传与 `HEAD 200` 回查

## User Manual Verification

### Startup

- 安装依赖：`npm ci`
- 启动本地环境：
  - 有 Docker：`npm run dev`
  - 只想快速本地验证：`npm run dev:lite`
- 打开：`http://localhost:5173`

### In-Game Checklist

建议先开一个本地 `Smash Up` 对局，自己选 `Fairies / 仙灵`，对手任意。为了更容易验证额外行动，推荐对手或副派系带 `Wizards / 巫师` 或任意行动多的派系，但不是硬要求。

1. 先看选派系页。
   - 应该能看到 `仙灵 / Fairies`
   - 预览图不应是空白卡背

2. 开局进入对局后看手牌与基地图。
   - Fairies 手牌卡图应该来自 `pretty_pretty`
   - `结界谷 / Enchanted Glen`、`精灵之环 / Fairy Circle` 应该有正确基地图和名称

3. 验证 `Puck`。
   - 打出 `Puck`
   - 预期出现二选一：`额外行动` 或 `抽 1`
   - 选 `额外行动` 后，本回合应该还能再打 1 张行动

4. 验证 `Fairy Circle / 精灵之环`。
   - 第一次把随从打到 `精灵之环`
   - 预期出现二选一，而不是同时给两种额度
   - 选 `额外行动`：本回合多 1 次行动额度，不额外给随从额度
   - 再开一局或重试一次选 `额外随从到这里`：应该只能多打 1 个随从到该基地

5. 验证 `Magic Ward / 魔法守护`。
   - 把它打到某基地
   - 让对手尝试把行动打到该基地，或打到该基地上的随从
   - 预期都被禁止

6. 验证 `Ladybug / 甲虫夫人`。
   - 附着到一个随从上
   - 让该随从成为 destroy 效果目标
   - 预期不会被消灭

7. 验证 `Glymmer`。
   - 使用天赋对别的随从 `-4`
   - 到你的下个回合开始后，这个临时修正应回滚

8. 验证 `Spirit of the Forest / 丛林之灵`。
   - 在仍保留通常随从与通常行动额度时，尝试特殊召唤它
   - `Titania`、`Puck`、`Magic Acorns`、`Playful Tricks`、`Enchantment`、`Fairy Circle`、`Fairy Ballet` 中任选 1-2 张与其联动，确认会触发额外分支
   - 让它输掉一次 titan clash
   - 预期会出现“移动到另一个基地”而不是直接移除的选择

## Current Closeout Status

- 代码、资源、静态数据、locale、规则实现：已收口
- 类型检查、i18n 校验、Smash Up 大范围回归：已收口
- OpenSpec 变更校验：已收口
- 真实入口 E2E 与远端资源回查：仍可作为后续加强项，但不影响当前“代码可并入”结论
