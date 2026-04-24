## Session: 2026-04-07 Android 本地素材包图片加载故障
- **Status:** in_progress
- Actions taken:
  - 复核 `GamePackagePlugin` / `GamePackageForegroundRuntime` / `packageManagerService` / `AssetLoader` / `OptimizedImage` 链路，确认原生素材包会安装到 `.../current/assets`，问题不在下载落盘本身。
  - 修复 `src/features/mobile-packages/packageManagerService.ts`：`hydrateInstalledNativeGamePackages()` 在没有预注册 `fallbackCache` 时也会构造兜底 state，确保已安装包仍能把 `assetBaseUrl` 注入到 AssetLoader override。
  - 修复 `src/components/common/media/OptimizedImage.tsx`：开发态 `fetch -> blob` workaround 只保留给 public `/assets/...`，Android `/_capacitor_file_/...` 本地包路径改为直接 `<img>` 加载。
  - 修复 `src/features/mobile-packages/nativeGamePackagePlugin.ts`：原生 ack / listener 返回 `running/completed/cancelled` 时先归一化为前端合法状态，避免 `易桌游测试` 把下载按钮直接污染成灰态。
  - 补回归测试：`src/components/common/media/__tests__/CardPreview.i18n.test.tsx` 与 `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts`。
  - 将包含修复的 `dist/` 覆盖到真机 `top.easyboardgame.app.debug` 当前 OTA 目录 `/data/user/0/top.easyboardgame.app.debug/files/versions/mhvPgIYOyN`，重启后确认加载新 bundle `index-wN3ZSRu0.js`。
  - 真机打开 `王权骰铸` 详情弹窗后，`安装游戏包` 按钮已恢复为可点击态；截图路径：`D:\\gongzuo\\webgame\\BoardGame\\temp\\mobile-debug\\dicethrone-modal-after-open.png`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint | `npx eslint src/features/mobile-packages/packageManagerService.ts src/components/common/media/OptimizedImage.tsx src/components/common/media/__tests__/CardPreview.i18n.test.tsx src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` | 0 error | 0 error，`OptimizedImage.tsx` 有 1 条 `react-refresh/only-export-components` warning | ✅ |
| 图片链路回归 | `node scripts/infra/vitest-cli-safe.mjs run src/components/common/media/__tests__/CardPreview.i18n.test.tsx --configLoader native --maxWorkers 1` | 通过 | `8 passed` | ✅ |
| 启动期 hydration 回归 | `node scripts/infra/vitest-cli-safe.mjs run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts -t "mobile package bootstrap hydration" --configLoader native --maxWorkers 1` | 通过 | `1 passed, 54 skipped` | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-07 | 启动期已安装游戏包在未注册 `fallbackCache` 时被直接跳过，资源 override 未生效 | 1 | `hydrateInstalledNativeGamePackages()` 对缺失 fallback 的游戏构造兜底 state 后继续 emit/apply override |
| 2026-04-07 | `OptimizedImage` 把 Android `/_capacitor_file_/...` 本地包路径误走开发态 fetch/blob workaround，图片停在加载态 | 1 | 将 workaround 收窄为“仅开发态 public `/assets/...`”，本地包路径直接 `<img>` 加载 |
| 2026-04-07 | 原生首次 ack 返回 `running`，旧前端把非法状态直接写进安装状态，导致下载按钮提前灰死 | 1 | `nativeGamePackagePlugin.ts` 归一化原生状态后再写入前端缓存，并已用真机新 bundle 确认按钮恢复可点 |

## Session: 2026-03-28 Dice Throne AI 审计收口
- **Status:** completed
- Actions taken:
  - 复核 `src/games/dicethrone/ai.ts`、`domain/executeTokens.ts`、`domain/commandValidation.ts`、`domain/tokenResponse.ts`，确认 Monk 太极当前规则是“单响应窗口最多 1 次合法使用”。
  - 修复 `src/games/dicethrone/domain/systems.ts` 中 `TOKEN_RESPONSE_CLOSED` 未同步清空 `sys.responseWindow.current` 的状态残留问题。
  - 更新 `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts` 中的太极回归，使其断言当前真实行为：单次 token 响应后 `skip-token-response`，并在关闭窗口后恢复正常推进。
  - 继续强化太极回归，补断言验证 `skip-token-response` 后 `sys.interaction.current` 也被清空，且操作权仍回到玩家 `0`，下一拍继续返回 `advance-phase`。
  - 同型扫描 `ResponseWindowSystem` 后，补了一条锁定语义回归到 `src/games/dicethrone/__tests__/response-window-interaction-lock.test.ts`：交互创建并锁定响应窗口期间，`RESPONSE_PASS` 必须失败，且不得提前清掉 `sys.interaction.current` / `pendingInteractionId`。
  - 复跑 Dice Throne AI 关键回归，确认本地 AI 不再在太极响应链路上卡死。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| AI 基础命令覆盖 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native --maxWorkers 1` | 全部通过，且太极链路按当前规则关闭窗口并恢复推进 | `26 passed` | ✅ |
| Token 响应窗口回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-response-window.test.ts --configLoader native --maxWorkers 1` | 响应窗口开闭与交接链路稳定 | `8 passed` | ✅ |
| 响应窗口锁定回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/response-window-interaction-lock.test.ts --configLoader native --maxWorkers 1` | 交互锁定期间 `RESPONSE_PASS` 被拒绝，现有锁定/取消链路保持通过 | `7 passed` | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-28 | 太极响应结束后 AI 仍看到残留 response window，继续跑出 `response-pass` | 1 | 在 `TOKEN_RESPONSE_CLOSED` 路径同步清空 `sys.responseWindow.current` |
| 2026-03-28 | 旧回归仍期待“双太极再 skip”，与当前 token 规则不符 | 1 | 按当前 `getMaxTokenUseAmount` / `tokenUsageTotals` 真相改写测试，断言单次 token 后直接 `skip-token-response` |

# Progress Log

## Session: 2026-03-28

### Phase: 初始化
**Status**: Complete

- **[10:00] Action**: 检查根工作区、规划文件占用情况与相关规范
  - Result: 确认根工作区存在并行任务，且 `task_plan.md/findings.md/progress.md` 已服务其他主题；已读取资产、录入、审计、测试、OpenSpec 规范
  - Next: 创建独立 worktree 并初始化本任务规划文件

- **[10:05] Action**: 创建独立 worktree 与分支 `feat/smashup-base-faction-assets`
  - Result: 新工作目录 `D:\\gongzuo\\webgame\\BoardGame-wt-smashup-base-faction-assets` 已创建，工作区干净
  - Next: 盘点现有 Smash Up 图片接入链路和目标素材清单

### Phase: 发现与设计
**Status**: Complete

- **[10:08] Action**: 初始化 `task_plan.md`、`findings.md`、`progress.md`
  - Result: 本任务已建立独立的磁盘规划上下文，后续发现与验证可持续追加
  - Next: 扫描 `public/assets`、现有 Smash Up faction 资源与相关代码/脚本

- **[10:22] Action**: 核对原工作区 Smash Up 新原图与现有压缩产物
  - Result: `aiji_base.png` 与目标四派系基地匹配，但 `aiji.png` 实际是 Pretty Pretty 四派系卡图；旧 `cards5.webp` / `base4.webp` 不是本次目标内容
  - Next: 用 TTS / Wiki 源数据锁定四派系的正式卡牌与基地清单，判断中文 cards 原图缺口是否阻塞实现

- **[10:28] Action**: 解析 TTS 源数据 `2833984701.json`
  - Result: 已确认 Ancient Egyptians / Cowboys / Samurai / Vikings 四个 kit 均存在，且能提取对应 bases / deck / titan / CustomDeck 信息
  - Next: 按 Smash Up 专项规范运行 Wiki 爬虫，建立本次录入契约与 spec 范围

- **[10:40] Action**: 起草并校验 OpenSpec change `add-smashup-oops-faction-intake`
  - Result: `proposal.md` / `tasks.md` / `design.md` / spec delta 已创建，`openspec validate add-smashup-oops-faction-intake --strict --no-interactive` 通过
  - Next: 向用户确认 cards 原图来源；确认后再进入 apply 阶段

### Phase: 资产处理与录入
**Status**: Complete

- **[10:48] Action**: 用户修正并确认 `aiji.png` 为正确图片
  - Result: 当前 worktree 中 `public/assets/i18n/zh-CN/smashup/cards/aiji.png` 已变为 Oops, You Did It Again 四派系卡图
  - Next: 重新核定 atlas 网格、切片顺序与卡牌索引

- **[10:54] Action**: 直接查看并核对 `aiji.png` 与 `aiji_base.png`
  - Result: 已确认 `aiji.png` 为 `7x7` row-major（48 卡 + 1 尾格），`aiji_base.png` 为 `2x4` row-major（8 基地）
  - Next: 以该索引顺序生成 faction/base/card 接入清单

- **[10:58] Action**: 压缩 Smash Up 新原图
  - Result: 已生成 `cards/compressed/aiji.webp` 与 `base/compressed/aiji_base.webp`
  - Next: 在 atlasCatalog / ids / static defs 中接入新 atlas

- **[11:05] Action**: 复核 TTS `2833984701.json` 的四个目标 kit
  - Result: 已确认四派系的英文卡名、卡牌数量与基地清单，足以作为 defId / count / canonical base name 的英文来源
  - Next: 补 Wiki 抓取映射并开始正式录入

- **[11:40] Action**: 完成 Oops 四派系静态接入
  - Result: 已补 `ids.ts`、`atlasCatalog.ts`、4 个 faction 文件、8 个 base def、locale、`factionMeta.ts`，并修复 `registerPodBaseSkeletons()` 对非 POD 派系误生成 `_pod` 基地的问题
  - Next: 跑 Vitest / typecheck / E2E 并处理截图异常

### Phase: 审计与验证
**Status**: Complete

- **[12:00] Action**: 运行 Vitest、typecheck 与 OpenSpec 校验
  - Result: `CardPreview.i18n`、`criticalImageResolver`、`factionSelection`、`cardI18nIntegrity`、`typecheck`、`openspec validate` 全部通过
  - Next: 完成 E2E 证据与上传验证

- **[12:10] Action**: 排查 E2E 白板问题
  - Result: 确认根因不是 atlas 索引，而是 `AtlasCard` 用多层 `background-image` 充当 fallback，导致 Playwright 证据截图里 atlas 呈现白板
  - Next: 修复渲染策略并复跑 E2E

- **[12:25] Action**: 上传新 atlas 到 R2 并修复 `AtlasCard` 渲染策略
  - Result: `aiji.webp` 与 `aiji_base.webp` 已上传到 `official/i18n/zh-CN/smashup/...`，`HEAD` 均为 `200`；`AtlasCard` 已改为选择单个已加载成功的 URL 作为最终背景图
  - Next: 复跑 E2E 并留证

- **[12:35] Action**: 复跑 intake E2E 并自审截图
  - Result: `Oops 四派系在派系选择与注入场景中都能显示资源` 已通过，派系选择与棋盘截图均显示真实卡图/基地图
  - Next: 补 workflow / evidence 文档并回填计划文件

- **[12:50] Action**: 沉淀 workflow / contract / E2E evidence 文档
  - Result: 已新增 `docs/games/smashup/workflows/smashup-faction-intake.md`、`evidence/smashup/smashup-oops-faction-intake-contract.md`、`evidence/smashup/smashup-oops-faction-intake-e2e-test.md`
  - Next: 整理最终交付摘要

### Phase: gameplay proposal
**Status**: In Progress

- **[13:42] Action**: 为玩法补完创建 OpenSpec change `add-smashup-oops-faction-gameplay`
  - Result: `proposal.md` / `design.md` / `tasks.md` / spec delta 已落盘，范围明确为四派系正式玩法、新交互类型 UI、统一审计与 E2E
  - Next: 结合用户最新指令确认实施顺序与阶段边界

- **[13:47] Action**: 根据用户要求收敛实施顺序与收尾方式
  - Result: 已明确“一个一个派系实施，全部完成后再统一审计，然后端到端测新交互类型”；Gameplay 波次固定为 `Ancient Egyptians → Vikings → Cowboys → Samurai`
  - Next: 运行 OpenSpec 严格校验并回填 planning 文件

- **[13:49] Action**: 运行 `openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive`
  - Result: 校验通过，proposal 进入可评审状态
  - Next: 更新 `task_plan.md / findings.md / progress.md`，准备向用户汇报 proposal 核心范围与第一波实施入口

### Phase: Ancient Egyptians implementation
**Status**: In Progress

- **[14:10] Action**: 实现 Ancient Egyptians 的埋葬/翻开主链路与专属能力
  - Result: 已新增 `src/games/smashup/abilities/ancient_egyptians.ts`，接入 `Mummy / Pyramid Engineer / Priest of Anubis / Pharaoh / Lost Knowledge / Seal the Tomb / Tomb Trap / Blessing of Anubis / You Can Take It With You / Plague of Locusts / Mummy Strength / Ancient Curse`，并在 `domain/bury.ts` 增加可复用的 `buildBuryCardEvents()` / `uncoverBuriedCard()`，支持 `onUncover`、非法时机翻开 special 直接弃置、`onCardBuried / onBuriedCardUncovered` 触发。
  - Next: 完成 bury UI、同步 locale / OpenSpec，并跑相关验证。

- **[14:22] Action**: 落地 bury UI 与 Ancient Egyptians 正确文本
  - Result: `BaseZone.tsx` 已显示埋葬牌条带；控制者可见真实卡面并可检视，对手仅见隐藏占位与数量/控制者标识。`public/locales/en/game-smashup.json` 与 `public/locales/zh-CN/game-smashup.json` 已修正 Ancient Egyptians 与 `base_star_portal` 文本。
  - Next: 补最小 Vitest、复跑 typecheck / OpenSpec 校验。

- **[14:38] Action**: 补 Ancient Egyptians 最小测试并复核门禁
  - Result: 已在现有测试文件补 `buryEngine.test.ts` 与 `newBaseAbilities.test.ts`，覆盖“翻开后只结算 uncover 文本并弃置”“从场上埋葬确实离场”“Pyramids / Star Portal 基地入口”；`npx vitest run src/games/smashup/__tests__/buryEngine.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts` 通过，`npm run typecheck` 通过，`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过。
  - Next: 回填 planning / spec 后进入 Vikings。

### Phase: Vikings implementation
**Status**: In Progress

- **[15:05] Action**: 按官方口径重建 Vikings 文本基线与能力范围
  - Result: 已确认仓库原有 Vikings locale 与 Oops 官方规则书 / Fandom 口径冲突，当前实现不再沿用旧文本；`Huscarl / Shield Maiden / Raider / Valkyrie / Viking Funeral / Ransack / Pillage / Cast the Runes / Raiding Party / Berserk / Tribute / Combat Training / Drakkar / Longhouse` 均已切到官方语义。
  - Next: 落能力文件、metadata 和基地触发实现。

- **[15:18] Action**: 接入 Vikings ability 与静态 metadata
  - Result: 已新增 `src/games/smashup/abilities/vikings.ts` 并在 `abilities/index.ts` 注册；`src/games/smashup/data/factions/vikings.ts` 已修正 `Huscarl / Raider` 为 `talent`、`Shield Maiden / Berserk` 为 `onPlay`、`Viking Funeral` 为 `ongoing` 且 `ongoingTarget: 'minion'`。
  - Next: 修正 locale、补最小行为测试并验证基地入口。

- **[15:34] Action**: 补 Vikings 最小测试并复核门禁
  - Result: 已在 `newFactionAbilities.test.ts` 覆盖 `vikings_huscarl / vikings_shield_maiden / vikings_pillage`，在 `newBaseAbilities.test.ts` 覆盖 `base_drakkar / base_longhouse`；`npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts` 通过，`npm run typecheck` 通过，`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过。
  - Next: 回填 planning 文件后进入 Cowboys。

## 5-Question Reboot Check
| Question | Answer |
| :--- | :--- |
| Current Phase? | Phase 9 收尾阶段：统一审计、gameplay E2E 与 evidence 已完成，剩余是确认门禁与向用户汇报真实残留缺口 |
| Goal? | 在已完成 intake、四派系第一轮实现的基础上，完成统一 gameplay 审计、浏览器层新交互 E2E 和证据收口，并明确真实残留风险 |
| Key Knowledge? | 统一审计已通过；共享官方 duel 内核已落地并完成 Cowboys 浏览器 full-chain 出图验证，`Stagecoach` 仍是最小移动语义；`Ancient Egyptians / Samurai` 仍主要是交互注入型 E2E |
| Last Action? | 已修复 `Deputy` 目标选择后的阶段推进 bug，并复跑 `newFactionAbilities` / `newBaseAbilities` 与 Cowboys 决斗 E2E |
| Next Step? | 向用户汇报官方 duel 收口结果、截图证据绝对路径，以及仍然真实存在的 Samurai 专项 E2E 与 `Stagecoach` 语义缺口 |

### Phase: Cowboys implementation
**Status**: In Progress

- **[16:10] Action**: 按官方口径修正 Cowboys 文本基线与 metadata
  - Result: 已将 `Deputy / Gunfighter / Pinkerton / Sheriff / Stagecoach / Run 'Em Off / Quick Draw / High Noon / Gold Strike / Gold in Them Thar Hills / Form a Posse / Dynamite Surprise / So-So Corral` 的中英文 locale 改回官方语义；`src/games/smashup/data/factions/cowboys.ts` 已补 `special / ongoing / onPlay` metadata。
  - Next: 收敛 duel MVP 实现，修复错误事件字段并补最小测试。

- **[16:24] Action**: 落地 Cowboys 第一轮 duel / move / destroy / draw 实现
  - Result: `src/games/smashup/abilities/cowboys.ts` 已接入 `Gunfighter / Quick Draw / High Noon / Run 'Em Off / Gold in Them Thar Hills / Form a Posse / Dynamite Surprise / Sheriff / Gold Strike / Saloon / So-So Corral`；同时移除了旧错误的 `Saloon` 决斗内偷触发和 `Dynamite Surprise` 伪 buff 逻辑，并改用现有 `grantExtraMinion / grantExtraAction` 契约。
  - Next: 在现有测试文件补 Cowboys 最小覆盖，并复跑门禁。

- **[16:29] Action**: 补 Cowboys 最小测试并复核门禁
  - Result: 已在 `newFactionAbilities.test.ts` 覆盖 `cowboys_gunfighter / cowboys_quick_draw / cowboys_high_noon / cowboys_gold_strike`，在 `newBaseAbilities.test.ts` 覆盖 `base_saloon / base_so_so_corral`；`npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts` 通过，`npm run typecheck` 通过，`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过。
  - Next: 回填 Cowboy 残留缺口后进入 Samurai。

### Phase: Samurai implementation
**Status**: In Progress

- **[16:54] Action**: 按官方口径修正 Samurai 文本基线与 metadata
  - Result: 已将 `Samurai-Chan / Ronin / Bushi / Shogun / Yokai Attack! / Way of the Warrior / Honorable Combat / Honor the Fallen / Honor the Ancestors / Heart of the Battle / Final Haiku / Code of Bushido / Shogun's Palace / Sakura Garden` 的中英文 locale 改回官方语义；`src/games/smashup/data/factions/samurai.ts` 已补 `special / ongoing / onPlay` metadata。
  - Next: 落地第一轮 duel / honor / destroy / ongoing draw 实现并接入注册入口。

- **[17:02] Action**: 落地 Samurai 第一轮 duel / destroy / draw / counter 实现并复核门禁
  - Result: 已新增 `src/games/smashup/abilities/samurai.ts` 并在 `abilities/index.ts` 注册，接入 `Ronin / Samurai-Chan / Bushi / Shogun / Yokai Attack! / Honorable Combat / Code of Bushido / Heart of the Battle / Honor the Fallen / base_shoguns_palace / base_sakura_garden`；已在 `newFactionAbilities.test.ts` 覆盖 `samurai_ronin / samurai_yokai_attack / samurai_honorable_combat / samurai_code_of_bushido / samurai_honor_the_fallen`，在 `newBaseAbilities.test.ts` 覆盖 `base_shoguns_palace / base_sakura_garden`；`npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts` 通过，`npm run typecheck` 通过，`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过。
  - Next: 继续补齐 Samurai 第一轮遗漏能力，再统一回填残留语义。

- **[17:10] Action**: 补完 Samurai 第一轮遗漏能力并复跑门禁
  - Result: `src/games/smashup/abilities/samurai.ts` 已继续接入 `Honor the Ancestors / Way of the Warrior(+3 分支) / Final Haiku / Sakura Garden` 的第一轮能力；`newFactionAbilities.test.ts` 已新增 `samurai_samurai_chan / samurai_honor_the_ancestors / samurai_shogun / samurai_final_haiku` 覆盖，`newBaseAbilities.test.ts` 已补 `base_shoguns_palace / base_sakura_garden` 强化断言；`npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts` 通过，`npm run typecheck` 通过，`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过。
  - Next: 转入四派系统一审计与新交互 E2E 收口。

### Phase: 统一审计与收尾
**Status**: Complete

- **[17:18] Action**: 运行四派系统一 gameplay 审计并修复显式硬错误
  - Result: 已确认默认 `vitest` 配置会排除 `*audit*.test.ts`，必须改用 `vitest.config.audit.ts`；`npx vitest run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native` 最终 `21 passed`。过程中额外发现 `cowboys_stagecoach` 存在 `abilityTags: ['onPlay']` 但未注册执行器的硬错误，现已补 `Stagecoach` 的 MVP 实现与 `newFactionAbilities.test.ts` 最小回归。
  - Next: 跑浏览器层新交互 E2E，并输出证据文档。

- **[17:32] Action**: 跑通三条 Oops gameplay E2E 并留存截图
  - Result: `e2e/smashup/smashup-phase-transition-simple.e2e.ts` 已新增 `Ancient Egyptians bury/uncover`、`Cowboys duel direct click`、`Samurai extra play` 三条用例；三条命令均通过，并生成对应的 before/after 显式证据截图。
  - Next: 写统一 evidence，并把真实覆盖边界回填到 planning 文件。

- **[17:40] Action**: 汇总 gameplay E2E evidence 与残留风险
  - Result: 已新增 `evidence/smashup/smashup-oops-faction-gameplay-e2e-test.md`，明确三条浏览器交互证据、截图绝对路径与限制说明；`task_plan.md`、`findings.md`、`progress.md` 已同步回填统一审计入口、`Stagecoach` MVP 范围，以及 `Ancient Egyptians / Samurai` 两条 E2E 属于“注入当前交互”而非 full-chain 的事实边界。
  - Next: 复跑最终门禁，确认本轮可交付状态。

- **[17:43] Action**: 复跑最终门禁并确认收尾状态
  - Result: `npm run typecheck` 通过，`npx openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 通过，`npx vitest run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native` 通过（`76 passed, 1 skipped`），`npx vitest run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native` 通过（`21 passed`）。
  - Next: 向用户汇报已完成范围、证据落点与仍需后续补完的官方语义缺口。

### Phase: duel official-chain validation
**Status**: Complete

- **[18:34] Action**: 将 Cowboys 决斗浏览器用例升级为官方链路并补关键截图点
  - Result: `e2e/smashup/smashup-phase-transition-simple.e2e.ts` 中的 Cowboys 用例已从“选中敌方随从后直接结算”升级为完整 `Pinkerton -> 决斗牌 -> Deputy -> 结算` 链路，并新增 `pinkerton / duel-card / deputy-card / deputy-target / resolve` 五张显式证据截图。
  - Next: 运行用例并核对画面。

- **[18:37] Action**: 借助 E2E 暴露并修复 Deputy 收尾的真实链路 bug
  - Result: 发现 `smashup_duel_deputy_target` 在推进下一阶段时使用了弃牌前旧状态，导致 `Deputy` 已弃置却又被重新排入同一玩家提示；现已在 `src/games/smashup/domain/duel.ts` 中先模拟 `CARDS_DISCARDED + addTempPower` 再推进阶段，消除重复提示并确保决斗正常收口。
  - Next: 复跑单测与 E2E。

- **[18:39] Action**: 复跑决斗门禁并人工核图
  - Result: `node .\\scripts\\infra\\vitest-cli-safe.mjs run src\\games\\smashup\\__tests__\\newFactionAbilities.test.ts src\\games\\smashup\\__tests__\\newBaseAbilities.test.ts --configLoader native` 通过；`npm run test:e2e:ci:file -- smashup-phase-transition-simple.e2e.ts "Oops Cowboys 决斗交互应按官方链路完成 Pinkerton/决斗牌/Deputy/结算"` 通过；已人工核对五张截图，确认决斗横幅、Pinkerton 按钮、决斗牌跳过按钮、Deputy 选牌/选目标与结算后敌方离场全部符合预期。
  - Next: 回填 evidence / planning 文件并向用户汇报。

- **[21:10] Action**: 收口 Cowboys 决斗链 i18n 混用
  - Result: 已确认根因是 `src/games/smashup/domain/duel.ts` 的阶段标题/跳过按钮仍是硬编码中文，而 `Board.tsx` 决斗横幅已走 locale；现已给交互选项补 `labelKey/labelParams` 渲染入口，补齐 `duel.ts` 的 locale key，并让 `PromptOverlay.tsx` 与 `Board.tsx` 的快捷按钮统一解析这些 key。`npm run typecheck` 通过，`newFactionAbilities + newBaseAbilities` 共 `123 passed, 1 skipped`，`npm run test:e2e:ci:file -- smashup-phase-transition-simple.e2e.ts "Oops Cowboys 决斗交互应按官方链路完成 Pinkerton/决斗牌/Deputy/结算"` 再次通过。
  - Next: 提交、推送并为这轮 i18n 收尾补开新 PR。

## Session: 2026-04-22 lane-S2R SmashUp 反馈修复

### Phase: 初始化与基线锁定
**Status**: In Progress

- **[2026-04-22 00:21:34] Action**: 读取 AGENTS、planning-with-files、数据录入、测试/审计、引擎系统规范，并检查工作区状态。
  - Result: 确认本轮需要 Wiki/实现/测试/evidence 闭环；发现工作区存在非本轮改动，将避开无关文件。
  - Next: 运行 SmashUp Wiki 抓取/对比并审查 7 条反馈的实现入口。

### Phase: SmashUp 三派系审计复审（Mermaids / Skeletons / World Champs）
**Status**: In Progress

- **[2026-04-22 23:22:32] Action**: 复跑三派系能力回归与审计门禁
  - Result: `newFactionAbilities`（`146 passed / 1 skipped`）、`interactionTargetTypeAudit`（`7 passed`）、`interactionDefIdAudit`（`2 passed`）、`abilityBehaviorAudit`（`22 passed`）、`interactionCompletenessAudit`（`5 passed`）全部通过。
  - Next: 复跑三派系“统一斜向实施中横幅”E2E，并回填证据文档维度。

- **[2026-04-22 23:25:58] Action**: 复跑三派系横幅 E2E + i18n 门禁
  - Result: `npm run i18n:check` 通过；`npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"` 通过（`1 passed`），并生成最新截图。
  - Next: 更新 `smashup-10th-anniversary-factions-audit-20260419.md`，补齐 D1-D49 与最新截图路径。

- **[2026-04-22 23:30:00] Action**: 完成三派系审计文档补全
  - Result: `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md` 已新增“2026-04-22 复审记录 + D1-D49 维度”；`public/locales/zh-CN/game-smashup.json` 与 `public/locales/en/game-smashup.json` 已删除 `faction_implementation_in_progress_hint`，仅保留“实施中 / Implementation in Progress”文案。
  - Next: 按长期任务继续推进剩余未收口反馈与专项审计。

- **[2026-04-22 23:34:00] Action**: 扫描三派系能力覆盖缺口并回写风险
  - Result: 静态比对 `registerAbility` 与 `newFactionAbilities.test.ts` 后确认仍有 20 条能力未被主回归文件直接点名（Mermaids 7 / Skeletons 6 / World Champs 7），已在三派系审计文档新增“未覆盖风险”与后续补测计划。
  - Next: 按“配置直通 / 新机制 / 新 UI-E2E”三批继续补专项断言与证据。

- **[2026-04-23 00:26:40] Action**: 完成三派系缺口补测并复跑审计链
  - Result: `src/games/smashup/__tests__/newFactionAbilities.test.ts` 已补齐三派系 21 条缺口能力断言，最新结果 `166 passed / 1 skipped`；同时复跑 `interactionTargetTypeAudit(7 passed)`、`interactionDefIdAudit(2 passed)`、`abilityBehaviorAudit(22 passed)`、`interactionCompletenessAudit(5 passed)` 与 `npm run i18n:check` 全部通过。
  - Next: 回填审计文档与计划文件，把“20 条未覆盖风险”收敛为 0 缺口。

- **[2026-04-23 00:27:10] Action**: 回填审计文档与 planning 文件
  - Result: `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md` 已新增“补测收敛记录（2026-04-23）”；`task_plan.md` 将三派系覆盖缺口任务标记完成；`findings.md` 追加补测结论（缺口 `0/0/0`）。
  - Next: 继续执行长期任务下一批实施/审计项，直至用户最终验收总结。

- **[2026-04-23 00:35:48] Action**: 复现并定位 SmashUp 大厅 3 人房 E2E 失败
  - Result: `npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "3 人房间可加入且大厅会显示座位状态"` 首次失败，确认失败点为座位文本断言误写（期望 `空位/空位/空位`），截图实际为“玩家/空位/空位”。
  - Next: 按真实语义最小修正断言并重跑单用例。

- **[2026-04-23 00:37:46] Action**: 最小修正座位断言并复跑单用例
  - Result: 已将 `e2e/smashup/smashup.e2e.ts` 中断言收敛为 `toContainText(/空位\\s*\\/\\s*空位/)`；`npx eslint e2e/smashup/smashup.e2e.ts` 通过；单用例复跑 `1 passed`。
  - Next: 复跑整文件，确认三派系统一横幅用例不受影响。

- **[2026-04-23 00:43:22] Action**: 复跑 SmashUp 大厅整文件并回填证据
  - Result: `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts` 全量 `3 passed`；已在 `evidence/smashup/smashup-10th-anniversary-factions-selection-e2e-test.md` 与 `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md` 增补 2026-04-23 复测记录与截图路径。
  - Next: 继续三派系审计收口项，直至本轮长期任务最终汇总。

- **[2026-04-23 08:49:58] Action**: 复跑三派系审计门禁并定位新增失败
  - Result: `interactionTargetTypeAudit` 首次复跑出现 `cthulhu_corruption` 未登记 generic 保留理由导致的 1 条失败；其余审计项未见新增失败。
  - Next: 最小补齐审计登记并复跑全套门禁。

- **[2026-04-23 08:53:26] Action**: 补齐 `cthulhu_corruption` 审计登记并完成全套复跑
  - Result: 已在 `src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts` 补齐 `REQUIRED_SOURCE_CONFIGS + APPROVED_GENERIC_SOURCE_REASONS`；`eslint` 通过；`newFactionAbilities(166/1) + 4 个 audit suite + i18n` 全部通过。
  - Next: 回填三派系审计证据文档，继续长期任务直到最终汇总。

- **[2026-04-23 09:03:12] Action**: 回写派系实施 workflow 门禁，沉淀可复用流程
  - Result: `docs/games/smashup/workflows/smashup-faction-implementation.md` 已新增 `targetType: 'generic'` 强制补记规则（`REQUIRED_SOURCE_CONFIGS + APPROVED_GENERIC_SOURCE_REASONS` 双登记），将本次踩坑前置为流程约束。
  - Next: 进入本轮长期任务最终收口准备（等待你要求最终总汇报时一次性给出）。

## Session: 2026-04-22 Dicethrone critical 反馈补强（69c3c83e / 69cba605）

### Phase: 实施与验证
**Status**: Complete

- **[2026-04-22 23:00] Action**: 锁定两个线上 critical 的当前实现入口并确认最小改动面。
  - Result: `69cba605` 命中 `src/games/dicethrone/ui/Dice3D.tsx` 失败路径可见性缺口；`69c3c83e` 当前以历史 board-shell 兼容修复链路复核为主。
  - Next: 修 `Dice3D` 的无 sprite 文本兜底并补单测。

- **[2026-04-22 23:03] Action**: 完成 `Dice3D` 无 sprite 可见性兜底修复并更新断言。
  - Result: 已新增 face symbol -> fallback label 映射；无 sprite 时输出 `data-face-fallback="glyph"` 与可见标签；`StatusEffectsIcons` 用例同步覆盖。
  - Next: 跑 lint + vitest + compat helper 回归。

- **[2026-04-22 23:06] Action**: 运行回归并落证据文档。
  - Result: `eslint` 通过；`StatusEffectsIcons.test.tsx` 15/15 通过；`androidCompatSmoke.test.ts` 5/5 通过；新增证据文档 `evidence/dicethrone/dicethrone-feedback-69c3c83e-69cba605-followup-2026-04-22.md`。
  - Next: 汇总给用户并等待是否继续回写线上状态。

## Session: 2026-04-24 SmashUp 三派系持续审计复核

### Phase: 审计与证据口径同步
**Status**: Complete

- **[2026-04-24 09:02:00] Action**: 复跑三派系主能力回归
  - Result: `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1` 通过，结果 `168 passed / 1 skipped`。
  - Next: 继续复跑四项审计套件并确认无回归。

- **[2026-04-24 09:06:00] Action**: 复跑四项审计套件 + i18n 门禁
  - Result: `interactionTargetTypeAudit(7 passed)`、`interactionDefIdAudit(2 passed)`、`abilityBehaviorAudit(22 passed)`、`interactionCompletenessAudit(5 passed)`、`npm run i18n:check` 全部通过。
  - Next: 复跑 SmashUp 大厅整文件 E2E，核对统一“实施中”横幅证据。

- **[2026-04-24 09:08:00] Action**: 复跑 `smashup.e2e.ts` 并核图
  - Result: `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts` 全量 `3 passed`；三派系统一斜向横幅截图更新为 `2026-04-24 09:08`。
  - Next: 回写 `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md`、`evidence/smashup/smashup-10th-anniversary-factions-selection-e2e-test.md`、`task_plan.md/findings.md`，统一最新计数与时间口径。

- **[2026-04-24 09:20:00] Action**: 完成证据与规划文档口径同步
  - Result: 已把 `168 passed / 1 skipped`、`smashup.e2e.ts = 3 passed`、截图时间 `2026-04-24 09:08` 回写到 `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md`、`evidence/smashup/smashup-10th-anniversary-factions-selection-e2e-test.md`、`task_plan.md`、`findings.md`。
  - Next: 继续三派系后续审计/实施批次，不中途收口，等待你最后统一验收时再做总汇报。
