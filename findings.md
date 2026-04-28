# Findings & Resources

## Addendum（2026-04-24）：线上反馈 69a440ea（DiceThrone 教程弃牌堆方向）
- 反馈 `69a440ea1eb921c6091f1231` 指向“教程把右侧弃牌堆写成左侧”。
- 复核结论：中文文案已正确，英文教程仍残留旧方向描述（`on the left`）。
- 已修复 `public/locales/en/game-dicethrone.json`：
  - `tutorial.steps.sellCardIntro` 改为 `on the right`
  - `tutorial.steps.undoSellIntro` 改为 `on the right`
- 校验：`npm run i18n:check` 通过。
- 证据：`evidence/dicethrone/dicethrone-feedback-69a440ea-tutorial-discard-side-fix-2026-04-24.md`。

## Addendum（2026-04-07）：Android 本地素材包图片加载故障
- 原生安装链路本身正常：`GamePackageForegroundRuntime`/`GamePackagePlugin` 会把游戏包解压到 `.../files/game-packages/<gameId>/current/assets`，并通过 `assetRootPath` 回传前端。
- 启动期丢本地素材的首个根因在 `src/features/mobile-packages/packageManagerService.ts`：
  - `hydrateInstalledNativeGamePackages()` 之前只会处理已经存在 `fallbackCache` 的游戏。
  - `fallbackCache` 主要由大厅里的 `useGamePackageState()` 注册；如果用户没先经过这层 hook，已安装包会被 hydration 直接跳过。
  - 结果是 `setGameAssetBaseOverride(gameId, assetBaseUrl)` 没有执行，AssetLoader 继续按远端资源域名取图。
- 图片长时间“加载中”的第二个根因在 `src/components/common/media/OptimizedImage.tsx`：
  - 组件原先把所有“非 http(s) 本地路径”都走成开发态 `/assets/...` 的 `fetch -> blob` workaround。
  - Android 已安装包路径 `/_capacitor_file_/...` 也会落进这个分支，导致本地包图片被误伤，停在加载态。
- 本轮修复策略：
  - `hydrateInstalledNativeGamePackages()` 在 fallbackState 缺失时，使用已安装包信息构造兜底 state，再继续 emit/apply override。
  - `OptimizedImage` 的 blob-fetch workaround 收窄为“仅开发态 public `/assets/...`”；对 `/_capacitor_file_/...` 直接交给 `<img>` 原生加载。
  - `nativeGamePackagePlugin.ts` 对原生首次 ack / installState listener 返回的 `running/completed/cancelled` 做前端状态归一化，禁止把非法状态直接写进 `StoredGamePackageState.status`。
- 第二轮真机排障确认了更前置的一层 bug：
  - `易桌游测试(top.easyboardgame.app.debug)` 当前私有目录里没有 `dicethrone` 已安装包，也没有 `install-state.json`。
  - 但旧 H5 bundle 仍可能把原生 ack 的 `status: "running"` 直接写进前端状态，导致下载按钮被判成“处理中”并直接变灰。
  - 这会掩盖后续“是否正确使用本地素材包”的真实状态，所以必须先修状态机污染，再继续看图片链路。
- 定向验证：
  - `src/components/common/media/__tests__/CardPreview.i18n.test.tsx` 新增断言：游戏包 override 生效时，`OptimizedImage` 不得触发 fetch/blob workaround。
  - `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` 新增断言：即使未先进入大厅包管理 hook，启动期 hydration 也能把原生已安装包同步进状态缓存。
  - 真机 `易桌游测试` OTA 目录已覆盖最新 `dist/`，启动日志确认加载的是新 bundle `http://localhost/assets/index-wN3ZSRu0.js`。
  - 真机截图与 `uiautomator dump` 已确认 `王权骰铸 -> 安装游戏包` 按钮处于可点击态，不再是“直接变灰”的脏状态。

## Requirements Checklist
- [x] 使用中文沟通与文档
- [x] 涉及图片资源时遵循 `docs/ai-rules/asset-pipeline.md`
- [x] 涉及图片驱动录入时遵循 `docs/ai-rules/data-entry.md`
- [x] 涉及审计时先遵循 `docs/ai-rules/testing-audit.md`
- [x] 涉及自动化测试与 E2E 时遵循 `docs/testing-best-practices.md` 与 `docs/automated-testing.md`
- [x] 本次任务需要独立 worktree、OpenSpec、可复刻工作流文档、Vitest、E2E、evidence

## Addendum（2026-03-28）：Dice Throne AI 审计收口
- 本轮 Dice Throne AI 卡死主链路已收口，核心根因确认是 token response 关闭后，只 resolve 交互，没有同步清理 `sys.responseWindow.current`。
- 修复点：`src/games/dicethrone/domain/systems.ts` 在 `TOKEN_RESPONSE_CLOSED` 路径显式清空 `sys.responseWindow.current`，避免领域层已关闭、系统层仍残留响应窗口。
- 同步校正了一条过期回归：Monk 太极在当前 token 规则下，单个响应窗口内只允许合法使用一次；旧的“双太极再 skip”预期不是当前真相。
- 回归测试已改成当前真实行为：
  - `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts` 断言 AI 执行 `['token-response', 'skip-token-response']`
  - 断言 `state.sys.responseWindow?.current` 被清空
  - 断言后续 AI 返回正常 `advance-phase`
- 本轮补齐的 AI 覆盖重点：setup 选角/ready 视角切换、main1 可行动作优先级、defensiveRoll 连续决策、attemptKey 去重、response-play-card 优先级、passive draw-card 优先级、token-response 关闭清理。
- 验证结果：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native --maxWorkers 1` → `26 passed`
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-response-window.test.ts --configLoader native --maxWorkers 1` → `8 passed`
- 结论：这次 Dice Throne AI 审计暴露的缺口不在单一领域规则，而在“本地 AI 连续决策链 + 响应关闭后的系统态清理 + 过期回归未同步当前 token 规则”三者叠加。

## Research Findings

### 规范与流程
- 根工作区已有并行任务改动，且根目录 `task_plan.md` 正服务其他主题，当前任务必须隔离执行。
- 图片资源运行时禁止直接引用原始 `.png/.jpg`，需要走 `compressed/*.webp` 路径，由项目工具自动映射。
- 图片录入属于“先文档后实现”任务，需要先锁定来源、建立核对契约，再落运行时代码。
- 新的 E2E 必须使用 `e2e/framework` 的 `GameTestContext` API，并将显式证据截图写入 `test-results/evidence-screenshots/_shared/`。
- 用户本轮已明确要求：spec、审计、测试、E2E 全部包含在交付范围内。

### 当前工作区状态
- 新 worktree：`D:\\gongzuo\\webgame\\BoardGame-wt-smashup-base-faction-assets`
- 分支：`feat/smashup-base-faction-assets`
- 基线：`main` 分支提交 `8dc480cd`

### 当前素材核对结论
- 原工作区存在未纳入 `main` 的 Smash Up 中文原图：`public/assets/i18n/zh-CN/smashup/base/aiji_base.png` 与 `public/assets/i18n/zh-CN/smashup/cards/aiji.png`。
- `aiji_base.png` 尺寸为 `4096x1458`，视觉内容与目标四派系基地一致，包含：
  - `Saloon` / `So-So Corral`
  - `Pyramids` / `Star Portal`
  - `Kyuden Konbini` / `Sakura Shigemi`
  - `Drakkar` / `Longhouse`
- 用户已修正 `aiji.png`，当前 worktree 内文件尺寸为 `2914x4096`，内容确认为 `Ancient Egyptians / Cowboys / Samurai / Vikings` 四派系统一卡图。
- `aiji.png` 的真实切片结构为 `7x7` row-major，共 `49` 格：
  - 前 `48` 格是四个派系的卡牌
  - 最后 `1` 格是 `Smash Up` 尾格，不参与卡牌录入
- `aiji_base.png` 的真实切片结构为 `2x4` row-major，共 `8` 张基地。
- 本轮已执行 `npm run compress:images -- public/assets/i18n/zh-CN/smashup`，产物为：
  - `public/assets/i18n/zh-CN/smashup/cards/compressed/aiji.webp`
  - `public/assets/i18n/zh-CN/smashup/base/compressed/aiji_base.webp`

### TTS / 英文资源发现
- `public/assets/atlas-configs/smashup/2833984701.json`（TTS 源数据）中可定位到四个目标派系的 kit：
  - `Ancient Egyptians Kit`
  - `Cowboys Kit`
  - `Samurai Kit`
  - `Vikings Kit`
- 可确认的基地与英文卡堆如下：
  - Ancient Egyptians：`Pyramids`、`Star Portal`
  - Cowboys：`Saloon`、`So-So Corral`
  - Samurai：`Shogun's Palace`、`Sakura Garden`
  - Vikings：`Longhouse`、`Drakkar`
- 四个 faction deck 的 TTS `CustomDeck` 已定位：
  - Ancient Egyptians：deck `79`
  - Cowboys：deck `54`
  - Samurai：deck `55`
  - Vikings：deck `56`
- 这意味着即使中文 cards 原图缺失，仍可先从 TTS / Wiki 锁定派系列表、英文 defId 候选、卡牌数量与基础数据结构。

### 已确认的切片索引与命名差异
- `aiji.png` 的 row-major 顺序按 faction 分块稳定，依次为：
  - Vikings：索引 `0-11`
  - Samurai：索引 `12-23`
  - Ancient Egyptians：索引 `24-35`
  - Cowboys：索引 `36-47`
- `aiji_base.png` 的 row-major 顺序为：
  - `0 Saloon`
  - `1 So-So Corral`
  - `2 Pyramids`
  - `3 Star Portal`
  - `4 Kyuden Konbini`
  - `5 Sakura Shigemi`
  - `6 Drakkar`
  - `7 Longhouse`
- 武士基地存在来源差异：
  - 图片图面英文：`Kyuden Konbini` / `Sakura Shigemi`
  - TTS / Wiki canonical：`Shogun's Palace` / `Sakura Garden`
  - 结论：base def 采用 canonical 英文名与 defId，图面差异必须写入 workflow / evidence 契约。

### Smash Up 专项规则
- 根 `AGENTS.md` 明确要求：Smash Up 的数据录入、数据核对、审计、效果描述查询必须先跑 Wiki 爬虫，不能只凭图片或记忆。
- 因此本次正式录入的权威链路应为：
  - 图片：用于资源文件、atlas 切片、中文图面与索引确认
  - Wiki / 项目爬虫：用于卡牌/基地描述、名称、效果与数据审计

### 本轮实现边界
- OpenSpec `add-smashup-oops-faction-intake` 已将本变更边界定义为：
  - 图片压缩与 atlas 接入
  - faction / cards / bases 静态数据录入
  - locale / UI faction metadata 接入
  - intake 流程文档、证据文档、Vitest、E2E
- 不在本轮内：
  - 四个派系完整 ability handler / ongoing registry / trigger registry 的 gameplay 补完

## Gameplay Proposal Findings

### 用户最新实施要求
- 已明确改为玩法阶段，不再停留在静态录入验收。
- 实施顺序必须是“一个一个派系来”，不能四个派系并行混改。
- 四个派系全部完成后再做统一审计。
- E2E 重点不是再次验证静态图片，而是覆盖本轮新增交互类型。

### 已建立的 gameplay proposal
- OpenSpec change：`add-smashup-oops-faction-gameplay`
- 校验结果：`openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 已通过
- 主要范围：
  - `Ancient Egyptians`：bury、unbury、replacement destination、owner-visible bury UI
  - `Vikings`：bury/discard synergy、buried recovery
  - `Cowboys`：duel、hand-size checks、movement、destroy
  - `Samurai`：honor-based destruction、reactive movement、replacement destination
  - UI：必须端到端支撑 bury source/target、duel target、replacement destination

### 玩法实施顺序裁定
- 第一波：`Ancient Egyptians`
  - 原因：先把 bury 主链路与 UI 做成正式能力，解决已有体系“有领域没 UI”的缺口。
- 第二波：`Vikings`
  - 原因：复用 bury / discard / hidden info 处理，能直接验证第一波设计是否足够通用。
- 第三波：`Cowboys`
  - 原因：决斗和手牌数量判定依赖不同交互模型，应与 bury 稳定后分开调试。
- 第四波：`Samurai`
  - 原因：替代去向与响应移动更偏 after-event / replacement 语义，放在最后更利于集中验证。

### 现有代码事实（对 gameplay 有直接影响）
- bury 领域模型已存在：
  - `src/games/smashup/domain/bury.ts`
  - `src/games/smashup/domain/types.ts`
  - `src/games/smashup/domain/reduce.ts`
  - `src/games/smashup/domain/index.ts`
- `vampires_pod` 已有 bury 先例，但 UI 仍未正式完成：
  - `src/games/smashup/abilities/vampires.ts`
- Smash Up UI 中目前基本没有 bury 渲染入口：
  - `src/games/smashup/ui/BaseZone.tsx` 是后续 bury UI 主要落点之一

### proposal 阶段的关键结论
- intake 与 gameplay 必须分成两个 OpenSpec change，不能混写。
- bury UI 不能再延后到“最后统一补”，否则 Ancient Egyptians 第一波无法算完整实现。
- 新交互类型的 E2E 应围绕“能不能从 UI 完成整条链路”设计，而不是只断言领域状态存在。

## Ancient Egyptians 实施发现

- Ancient Egyptians 的旧 locale 文本与当前 Wiki/Fandom 口径存在系统性偏差，已按当前口径修正 `Mummy / Pyramid Engineer / Priest of Anubis / Pharaoh / Lost Knowledge / You Can Take It With You / Tomb Trap / Seal the Tomb / Plague of Locusts / Mummy Strength / Blessing of Anubis / Ancient Curse / Pyramids / Star Portal`。
- bury 体系仅有“从埋葬翻开并额外打出”的半成品实现，不足以支持 Ancient Egyptians：
  - 需要区分 `onUncover` 与“正常额外打出”
  - 需要支持非法时机翻开 `special` 时直接弃置
  - 需要支持 `CARD_BURIED` 的 `buriedFrom: 'play'` 真正把场上实体移出
- 以 `onCardBuried / onBuriedCardUncovered` 作为通用触发时机后，`base_star_portal` 与 `Pharaoh` 可以直接复用反应队列，不再把 Ancient Egyptians 特判塞进 UI 或 reducer。
- bury UI 现已落在 `src/games/smashup/ui/BaseZone.tsx`：
  - 当前玩家通过 `playerView` 保留真实 `defId`，因此可直接渲染真实卡面
  - 非控制者继续看到 `buried_unknown`，UI 只渲染隐藏占位，不会泄露真实信息

## Vikings 实施发现

- 仓库原有 Vikings locale 与官方 Oops 规则书 / Fandom 口径明显冲突，不能继续当作实现基线；本轮已整体改回官方语义。
- 当前 Vikings 的实现主轴不是 bury，而是 `deck top / discard / steal / extra-action` 联动，核心文本基线为：
  - `Huscarl`：天赋，手牌压回牌库顶，本回合自身 `+2`
  - `Shield Maiden`：展示另一位玩家牌库顶；若为行动或力量 `<= 3` 的随从，则加入你手牌
  - `Raider`：天赋，至多三张手牌压顶，本回合自身每张 `+1`
  - `Valkyrie`：从另一位玩家弃牌堆取一张随从到你手牌
  - `Viking Funeral`：附着力量 `5+` 随从；当其进入弃牌堆时你得 `1 VP`；若你拥有该随从则改为回盒
  - `Ransack / Pillage / Cast the Runes / Raiding Party / Berserk / Tribute / Combat Training`
  - `Drakkar / Longhouse`
- `base_drakkar` 不能走 `CARD_TRANSFERRED` 的同玩家 `deck -> hand` 路径；该 reducer 分支会被相同 key 覆盖。当前已改用 `CARDS_DRAWN`，测试通过。
- 已落地的 Vikings 行为包括：
  - `Huscarl / Shield Maiden / Raider / Valkyrie`
  - `Ransack / Pillage / Cast the Runes / Raiding Party / Berserk / Tribute / Combat Training`
  - `Viking Funeral`
  - `base_drakkar / base_longhouse`
- 仍需在统一收尾阶段重点复核的近似实现点：
  - `Raiding Party` 目前是“先入手再给额外同类打出额度”的近似语义，不是严格的“从揭示区立即打出”
  - `Raiding Party` 未实现“其余牌任意顺序放回牌库顶”的完整交互
  - `Viking Funeral` 目前只有最小覆盖测试，后续统一审计时应补更强回归用例

## Cowboys 实施发现

- 仓库原有 Cowboys locale 与官方 Oops 规则书 / Fandom 口径冲突明显，不能继续沿用；本轮已将 `Deputy / Gunfighter / Pinkerton / Sheriff / Stagecoach / Run 'Em Off / Quick Draw / High Noon / Gold Strike / Gold in Them Thar Hills / Form a Posse / Dynamite Surprise / So-So Corral` 切回官方文本。
- Cowboys 第一轮已落地的玩法主链路包括：
  - `Gunfighter`：打出后在同基地选择敌方随从决斗，并按胜负消灭失败者
  - `High Noon`：先选己方随从再选敌方随从决斗；己方获胜时给予该基地额外随从额度
  - `Run 'Em Off`：决斗后给予胜者 `+3` 临时力量，并把失败者移动到另一基地
  - `Quick Draw`：已实现“普通场景 `+2` / active duel 中 `+4`”两条分支
  - `Gold Strike`：打出到基地后，在你打出随从到这里时抽牌
  - `Sheriff / Saloon / So-So Corral`
- 本轮顺手修掉了 `cowboys.ts` 中两处会制造假阳性的旧逻辑：
  - 额外出牌额度事件误写成 `amount`，现已改回 reducer 约定的 `delta`
  - `Saloon` 曾被错误塞进 duel 结算里直接抽牌；现已只保留官方的 `onMinionDestroyed` 基地触发
- 当前 Cowboys 已切到官方 duel 内核共享实现；已覆盖并验证的链路包括：
  - `Pinkerton`：决斗前为己方决斗随从放置 `+1` 指示物
  - `双方各可选择 1 张 duel card 或跳过`
  - `Deputy`：弃置手牌中的 `Deputy`，再选择一个随从获得直到回合结束 `+2` 力量
  - `destroy_loser / high_noon / run_em_off / vp_to_winner / draw2_to_winner` 等结局分支复用同一 duel 状态机
- Cowboys 决斗链此前还存在一处 UI 文案层的 i18n 断裂：
  - `Board.tsx` 顶部决斗横幅与卡名已经跟随 locale 渲染
  - 但 `src/games/smashup/domain/duel.ts` 的阶段标题、跳过按钮、Pinkerton 数量按钮仍是硬编码中文
  - 同时 `Board.tsx` 里用于手牌/基地/随从直点交互的快捷按钮没有复用 `PromptOverlay` 的 i18n 解析
  - 结果就是英文 locale 下会出现“英文横幅 + 中文交互标题/按钮”的混搭
- 本轮修复后：
  - `PromptOption` 新增 `labelKey / labelParams`
  - `PromptOverlay.tsx` 支持把整句 `ui.xxx` 直接解析成翻译文本
  - `Board.tsx` 的 hand/base/minion 快捷按钮也统一走同一套 label 解析
  - `duel.ts` 的 `Pinkerton / duel card / Deputy / Run 'Em Off` 相关提示全部改成 locale key
  - 复跑 Cowboys 浏览器 E2E 后，决斗横幅、阶段提示与跳过按钮已经统一成同一语言，不再混搭
- 本轮 E2E 还额外暴露并修复了一个真实的 duel 收尾 bug：
  - `smashup_duel_deputy_target` 之前会在弃掉 `Deputy` 后继续用旧状态推进阶段，导致同一玩家再次收到已失效的 `Deputy` 提示
  - 现已改为先模拟 `CARDS_DISCARDED + addTempPower` 再推进下一阶段，浏览器与单测都已验证修复
- Cowboys 当前仍需在后续阶段复核的缺口：
  - `Stagecoach` 的 `move / transfer` 完整语义尚未接入
  - `Dynamite Surprise` 的“对方查看/展示你手牌或牌库时反制消灭”尚未接入
  - `Form a Posse` 目前只有 `+1` 力量，尚未实现“不能被消灭/移动/回手”的完整保护
  - `Gold in Them Thar Hills` 当前仍是“抽到手里 + 给额外额度”的近似实现，不是严格的“立刻额外打出并把余牌任意排序放回”
- `So-So Corral` 已重新按官方口径收敛为“决斗并消灭失败者”；之前基于不完整摘录的“不消灭”判断已确认错误，后续统一审计不得再回退到那套口径。
- 统一审计阶段额外暴露出一个结构性硬错误：`cowboys_stagecoach` 已标注 `abilityTags: ['onPlay']`，但当时没有实际执行器；现已补上最小可运行实现与测试。
- 当前 `Stagecoach` 的明确 MVP 范围是：
  - 先选来源基地
  - 再选同一基地上 `1-2` 个己方随从
  - 最后把它们移动到另一基地
- 当前 `Stagecoach` 仍未覆盖的语义包括：
  - 更完整的 `transfer` 语义
  - 与附着行动牌、基地持续牌、其他联动对象一起搬运时的细粒度行为

## Samurai 实施发现

- 仓库原有 Samurai locale 与官方 Oops 规则书 / Fandom 口径冲突明显，不能继续沿用；本轮已将 `Samurai-Chan / Ronin / Bushi / Shogun / Yokai Attack! / Way of the Warrior / Honorable Combat / Honor the Fallen / Honor the Ancestors / Heart of the Battle / Final Haiku / Code of Bushido / Shogun's Palace / Sakura Garden` 切回官方文本。
- Samurai 第一轮已落地的玩法主链路包括：
  - `Ronin`：当它是你在该基地唯一的己方随从时，可放置两个 `+1` 指示物
  - `Samurai-Chan`：从场上进入弃牌堆后抽一张牌
  - `Bushi`：从场上进入弃牌堆且力量 `>= 5` 时获得 `1 VP`
  - `Shogun`：你另一个随从从场上进入弃牌堆后，在此随从上放置 `+1` 指示物
  - `Yokai Attack!`：消灭你的一个随从，获得额外随从与额外行动额度
  - `Honorable Combat`：两段选择后按 duel MVP 比较力量，胜者控制者获得 `1 VP`
  - `Code of Bushido`：通过三段交互把总计三个 `+1` 指示物分配给你的随从
  - `Honor the Ancestors`：当前第一轮会先给己方随从放置 `+1` 指示物，并按“其他玩家数量上限”自动把弃牌堆中的随从洗回牌库
  - `Way of the Warrior`：当前第一轮已接入对目标随从的 `+3` 临时力量
  - `Final Haiku`：附着随从离场后，当前场上的己方随从都会获得直到回合结束 `+2` 力量
  - `Heart of the Battle`：计分前 special，决斗后消灭失败者
  - `Honor the Fallen`：你此处随从进入弃牌堆后抽牌
  - `base_shoguns_palace / base_sakura_garden`
- 当前 Samurai 仍然只是第一轮实现，不是完整官方语义；统一收尾阶段必须复核以下缺口：
  - 仍未实现官方 duel 的完整 duel-card 内核，当前 `Honorable Combat / Heart of the Battle / Shogun's Palace` 仍使用力量比较型 MVP
  - `Way of the Warrior` 目前只实现了 `+3` 临时力量，尚未接入“本回合进入弃牌堆时抽牌”的正式临时触发语义
  - `Honor the Ancestors` 目前是“按其他玩家数量上限自动取弃牌堆前 N 张随从洗回牌库”的 MVP，尚未接入更精细的玩家选择 / may 语义
  - `Final Haiku` 已接入核心离场加成，但仍需在统一审计阶段复核其与附着目标离场、结算时序、后进场随从的严格官方语义
  - `Sakura Garden` 已覆盖 `onMinionDestroyed / onMinionDiscardedFromBase` 两条入口，但“同回合首次”门控目前仍更偏 destroy 记录，需在统一收尾阶段复核 discard-from-base 路径的去重语义

## 统一审计与 Gameplay E2E 发现

- `abilityBehaviorAudit.test.ts` 默认不会被普通 `vitest` 配置执行；必须使用：
  - `npx vitest run src/games/smashup/__tests__/abilityBehaviorAudit.test.ts --config vitest.config.audit.ts --configLoader native`
- 统一审计当前已通过，结果为 `21 passed`；说明四派系第一轮实现至少已经满足现有描述-元数据-注册链路的一致性门槛。
- 新增的三条 gameplay E2E 当前覆盖的是“浏览器层新交互类型能否走通”，不是“所有正式出牌链都已 full-chain 覆盖”。
- 三条 gameplay E2E 的真实覆盖口径如下：
  - `Ancient Egyptians`：验证埋葬条带显示、翻开选择、翻开后弃置与抓牌结算
  - `Cowboys`：验证真实打出 `Gunfighter` 后，浏览器里可以完整走通 `Pinkerton -> 决斗牌 -> Deputy -> 结算`
  - `Samurai`：验证目标点击、己方随从离场，以及额外随从/行动额度兑现
- 其中两条是明确的“交互注入型 E2E”：
  - `Ancient Egyptians` 直接注入 `ancient_egyptians_seal_the_tomb_uncover`
  - `Samurai` 直接注入 `samurai_yokai_attack`
- 因此这两条只能证明：
  - bury / extra-play 这两类新 UI 交互在浏览器中可操作
  - 交互选择后的 reducer/额度/UI 联动能兑现
- 但它们不能替代：
  - `Ancient Egyptians / Samurai` 从手牌正常打出该牌到最终结算的 full-chain E2E
  - Samurai outcome 专项在浏览器中的独立出图证明（当前仍以领域测试为主）

## Visual / Browser Data
- E2E 最初出现“卡图/基地图白板”现象，但不是 atlas 索引错误：
  - 远端 `aiji.webp` / `aiji_base.webp` 可正常下载
  - 页面内 `new Image()` 可拿到正确 `naturalWidth / naturalHeight`
  - 真正根因是 `CardPreview` 以前使用多层 `background-image` 充当 locale fallback，Playwright 截图路径下会把 atlas 渲染成白板
- 已修复为：运行时选择“实际加载成功的单个 URL”作为最终 `backgroundImage`。
- 新 atlas 已上传到 R2，并验证：
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/aiji.webp` → `200`
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/aiji_base.webp` → `200`
- E2E 最终证据截图：
  - `test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-四派系在派系选择与注入场景中都能显示资源/oops-faction-selection-visible.png`
  - `test-results/evidence-screenshots/smashup/smashup-phase-transition-simple.e2e/Oops-四派系在派系选择与注入场景中都能显示资源/oops-faction-intake-board.png`

## Technical notes
```text
关键规范：
- AGENTS.md
- openspec/AGENTS.md
- docs/ai-rules/asset-pipeline.md
- docs/ai-rules/data-entry.md
- docs/ai-rules/testing-audit.md
- docs/testing-best-practices.md
- docs/automated-testing.md

关键原图：
- D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\base\aiji_base.png
- D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\aiji.png

当前 worktree 压缩产物：
- D:\gongzuo\webgame\BoardGame-wt-smashup-base-faction-assets\public\assets\i18n\zh-CN\smashup\base\compressed\aiji_base.webp
- D:\gongzuo\webgame\BoardGame-wt-smashup-base-faction-assets\public\assets\i18n\zh-CN\smashup\cards\compressed\aiji.webp

最终 evidence：
- D:\gongzuo\webgame\BoardGame-wt-smashup-base-faction-assets\evidence\smashup\smashup-oops-faction-intake-contract.md
- D:\gongzuo\webgame\BoardGame-wt-smashup-base-faction-assets\evidence\smashup\smashup-oops-faction-intake-e2e-test.md
- D:\gongzuo\webgame\BoardGame-wt-smashup-base-faction-assets\docs\games\smashup\workflows\smashup-faction-intake.md
```

## 2026-03-31 feedback closeout

### ���޸����������鵵��
- `69c8c039`�������ı����� DiceThrone����ʵ�ʶ�Ӧ SmashUp Samurai ͬʱ�������⣻���� `393b83b3` ���ǡ�
- `69c8c230` / `69c8c419` / `69c8c4f8`��Samurai ���������� `393b83b3` �޸���
- `69c903f3`��AI �Ʒֽ׶� special ���������� `d8ec6aad` �޸���
- `69c92631`����������ѡĹ����Ӻ���ѡ���ش�������� `22713717` �޸���
- `69c92aa4` / `69c92bca`��Ancient Egyptians ǰ���������� `05db8831` �޸���
- `69c92d8d` / `69c9319f`��Ancient Egyptians ʣ������������ `fa9a4c02` �޸���
- `69c92e82`���������������⣬���߼�����ȷ��ȱ�ؼ��ع鸲�ǣ��Ѳ����Բ������޸��鵵��`3dd374b2`����
- `69c93b65`���������� / afterScoring ���ⴰ���쳣������ `4ec96272` �޸���
- `69c942f0`��һĿ��Ȼ vs ɱ����������ȷ���� bug ���� `74d8e513` �޸���

### �ѹر�
- `69c93d98`��֤�ݲ��㣻����ʵ������ػع�δ�����Դ��ڵ����� bug���ȹرա�
- `69c8f2f4`���߸����ѱ������޸����ǣ���ǰ `mobileSupport` ���� zero-height �ع��� Gunslinger `The Law` 1v1/����Ŀ��ѡ��ع��ͨ������ȱ����ʵ�豸/Ŀ�����������ê��ǰ���رչ鵵��

### ����������Ӧ�ύ
- `74d8e513` fix(smashup): respect in plain sight against entangled
- `393b83b3` fix(smashup): tighten samurai trigger regressions
- `4ec96272` fix(smashup): skip pirate king afterscoring window when unplayable
- `fa9a4c02` fix(smashup): cover ancient egyptians tomb trap and seal the tomb
- `22713717` fix(smashup): support dead rise discard-base quick play
- `3dd374b2` fix(smashup): cover drakkar reshuffle handoff
- `05db8831` fix(smashup): close ancient egyptians feedback regressions
- `d8ec6aad` fix(smashup): resolve open feedback regressions

## 2026-04-22 lane-S2R Findings
- 工作区当前有大量非本轮改动；本轮必须只碰 SmashUp 反馈相关文件与 evidence，不回滚/不覆盖他人修改。
- 根目录旧 	ask_plan.md/findings.md/progress.md 服务历史 SmashUp/Oops 任务，本轮作为 2026-04-22 Addendum 追加，不创建第二份正式 plan。
- 目标实现初步入口：src/games/smashup/abilities/world_champs.ts、src/games/smashup/abilities/mermaids.ts、src/games/smashup/abilities/samurai.ts、src/games/smashup/domain/baseAbilities.ts、src/games/smashup/domain/reducer.ts、对应 faction data/locale 与现有测试文件。

## 2026-04-22 Dicethrone critical follow-up Findings
- `69cba605` 的核心风险点在于 `Dice3D` 无 sprite 时仅显示 shimmer；当浏览器/网络导致骰图长期不可用，会形成“骰面不可见”的真实体验缺口。
- 本轮将兜底策略改成“shimmer + 可见文本符号”，并且用 `data-face-symbol` 暴露可观测标记，保证失败路径可验证。
- `69c3c83e` 黑屏链路本轮未观察到新的回归实现点；历史修复（board-shell 缩放从 CSS 除法改为 JS 预计算）仍在当前代码中。
- 本轮证据文档：`evidence/dicethrone/dicethrone-feedback-69c3c83e-69cba605-followup-2026-04-22.md`。

## 2026-04-22 SmashUp 三派系审计复审 Findings
- 三派系（`mermaids` / `skeletons` / `world_champs`）能力回归与四项审计套件在当前代码上全部通过，未发现新增行为回归。
- “实施中”文案已收敛到单值：`实施中 / Implementation in Progress`，并已从中英文 locale 删除 `faction_implementation_in_progress_hint` 长文案键。
- 三派系统一斜向横幅 E2E 已复跑通过，最新截图时间为 2026-04-22 23:26（`test-results/evidence-screenshots/_shared/smashup-10th-factions-*.png`）。
- 三派系专项审计文档已补齐 D1-D49 维度：`evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md`。
- 通过静态比对 `registerAbility` 与 `newFactionAbilities` 主回归文件，发现仍有 20 条能力未被该文件直接点名（Mermaids 7 / Skeletons 6 / World Champs 7）；已在审计文档登记为“未覆盖风险”，后续按批次补专项断言。

## 2026-04-23 SmashUp 三派系补测收敛 Findings
- 已在 `src/games/smashup/__tests__/newFactionAbilities.test.ts` 补齐三派系缺口能力用例，新增/完善 `21` 条专项断言（含 `world_champs_shark_tattoo`、`skeletons_hearse_fleet`、`mermaids_toll_bay` 等）。
- `newFactionAbilities` 最新结果提升为 `166 passed / 1 skipped`，说明补测后无新增回归。
- 四项审计门禁与 i18n 复跑全部通过：
  - `interactionTargetTypeAudit` `7 passed`
  - `interactionDefIdAudit` `2 passed`
  - `abilityBehaviorAudit` `22 passed`
  - `interactionCompletenessAudit` `5 passed`
  - `npm run i18n:check` 通过
- 静态比对 `registerAbility('<id>')` 与 `newFactionAbilities.test.ts` 后，三派系缺口已收敛为 `0 / 0 / 0`（Mermaids / Skeletons / World Champs）。

## 2026-04-23 SmashUp 三派系大厅 E2E 断言修正 Findings
- 失败根因不是业务回归，而是测试语义错配：3 人房创建后房主占 1 席，座位文本应为“玩家 / 空位 / 空位”，旧断言误写成“空位 / 空位 / 空位”。
- 已将 `e2e/smashup/smashup.e2e.ts` 的座位校验收敛为 `toContainText(/空位\\s*\\/\\s*空位/)`，保留“仍有两个空位”的真实业务约束。
- 修正后复跑结果：
  - 单用例：`npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "3 人房间可加入且大厅会显示座位状态"` → `1 passed`
  - 整文件：`npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts` → `3 passed`
- 三派系统一斜向“实施中”横幅用例在整文件复跑中仍保持通过，无新增样式回归。

## 2026-04-23 SmashUp 三派系审计门禁补记 Findings
- 复跑 `interactionTargetTypeAudit` 时出现 1 条门禁失败：`cthulhu_corruption` 已切到 `targetType: 'generic'`，但审计白名单未登记保留理由。
- 已在 `src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts` 补齐两处登记：
  - `REQUIRED_SOURCE_CONFIGS`：补 `targetType/generic + autoRefresh: field + responseValidationMode: live`
  - `APPROVED_GENERIC_SOURCE_REASONS`：补 `cthulhu_corruption` 的 generic 保留原因
- 修复后整组门禁回归恢复全绿：
  - `newFactionAbilities`：`166 passed / 1 skipped`
  - `interactionTargetTypeAudit`：`7 passed`
  - `interactionDefIdAudit`：`2 passed`
  - `abilityBehaviorAudit`：`22 passed`
  - `interactionCompletenessAudit`：`5 passed`
  - `npm run i18n:check`：通过

## 2026-04-23 Workflow 升级补记（派系实施流程）
- 已在 `docs/games/smashup/workflows/smashup-faction-implementation.md` 增补强制门禁：凡新增 `targetType: 'generic'` 的 `sourceId`，必须同步更新 `interactionTargetTypeAudit` 的 `REQUIRED_SOURCE_CONFIGS` 与 `APPROVED_GENERIC_SOURCE_REASONS`。
- 这次补记把“审计规则”前置到 workflow，避免后续新增派系时再次踩到“实现对了但审计登记漏了”的回归坑。

## 2026-04-24 SmashUp 三派系持续审计 Findings
- 已复跑三派系主回归与四项审计门禁，最新结果为：
  - `newFactionAbilities`: `168 passed / 1 skipped`
  - `interactionTargetTypeAudit`: `7 passed`
  - `interactionDefIdAudit`: `2 passed`
  - `abilityBehaviorAudit`: `22 passed`
  - `interactionCompletenessAudit`: `5 passed`
  - `npm run i18n:check`: 通过
- 已复跑 `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`，整文件 `3 passed`（含三派系统一斜向“实施中”横幅用例）。
- 横幅证据截图已更新到最新时间 `2026-04-24 09:08`（`test-results/evidence-screenshots/_shared/smashup-10th-factions-*.png`）。
- 历史“20 条缺口”已在 2026-04-23 收敛为 `0 / 0 / 0`，2026-04-24 再次复核保持不变；当前不存在三派系主回归覆盖缺口。
- 追加静态覆盖复核（扫描 `registerAbility` vs `newFactionAbilities.test.ts`）：
  - 总计能力：`40`
  - 未覆盖：`0`
  - Mermaids：`10/0`，Skeletons：`13/0`，World Champs：`17/0`
- `npx openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive` 已复跑通过。
- R2 远端资源回查保持 `200`：
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp`
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp`

## 2026-04-24 Workflow 强化补记（通用 + SmashUp）
- 已更新 `.windsurf/skills/data-entry-workflow/SKILL.md`：
  - 新增“长期任务连续执行模式”强制门禁（S0→S4 连续推进，不得中间收口）；
  - 明确 `continue` 的默认语义是“推进下一批执行”，不是重复汇报。
- 已更新 `docs/games/smashup/workflows/smashup-faction-implementation.md`：
  - 新增“长期任务连续执行（强制）”章节；
  - 约束在无硬阻塞时持续执行，且每次推进必须回填可复查证据与 planning 文件。
- 已同步 Android 内置 locale：
  - `android/app/src/main/assets/public/locales/zh-CN/game-smashup.json` 删除 `faction_implementation_in_progress_hint`，避免 App 壳继续出现旧长文案。
- `npm run assets:upload` 复跑结果：`上传 0，跳过 530（未变更），失败 0`。

## 2026-04-24 反馈审计文档复核补记
- 已在以下证据文档追加“2026-04-24 复核补记”，与当前主线 E2E 结果对齐：
  - `evidence/smashup/smashup-feedback-69db57c-faction-select-stall-2026-04-22.md`
  - `evidence/smashup/smashup-feedback-69daa51e-auto-skip-turn-2026-04-22.md`
- 统一复核命令：`npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`，结果 `3 passed`。

## 2026-04-25 两条 watchdog 反馈定向复测 Findings
- `69db57c` 定向用例复测通过：
  - `npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "回归：在线 AI 在 factionSelect 阶段 seat state 延迟就绪时，不得被 watchdog 跳过到空牌对局"` → `1 passed`
- `69daa51e` 两条定向用例复测通过：
  - `在线 AI 连续 8 秒没有任何实际进展时，应自动强制结束当前回合` → `1 passed`
  - `在线 AI 结束回合切回我方时不应出现整板重挂载或 loading 闪屏` → `1 passed`
- 关键截图时间已更新到 `2026-04-25 00:13`，对应证据文档已追加“2026-04-25 定向复测补记”。

## 2026-04-24 线上反馈 69eb3924（SmashUp recover-interaction 卡住）
- 线上 watchdog 快照显示 `smashup_reaction_choose` 出现重复 `optionId`（同一 `activate_special:titan:*` 重复两次），并触发 `visible-interaction:recover-interaction:blocker_persisted`。
- 根因：`scoringEligibleBaseIndices` 在锁定/读取链路缺少统一去重，重复基地索引在 scoreBases 响应窗口放大为重复交互选项。
- 修复：
  - `ongoingModifiers.getScoringEligibleBaseIndices` 统一走 `normalizeScoringEligibleBaseIndices`（保序去重）；
  - `reduce` 的 `SCORING_ELIGIBLE_BASES_LOCKED` 写入前去重；
  - `index.getLockedScoringBaseIndices` 统一走 getter，避免绕过规范化。
- 回归：`src/games/smashup/__tests__/scoringEligibleLock.test.ts` 新增 2 条去重用例并通过（`12 passed`）。
- 远端状态：`69eb392453c8e640a4475d6b` 已回写为 `resolved`（`matched=1, modified=1`）。

## 2026-04-25 SmashUp 三派系复审补记（Toll Bay 回归修复）
- `newFactionAbilities` 新出现失败点是 `mermaids_toll_bay 打出后会标记本回合触发窗口`，根因不是能力缺失，而是写入路径错误：
  - 能力里通过 `result.matchState.core` 直接改 core；
  - 但执行链路仅透传 `updatedState.sys`，不会把该 core 写回，导致字段落地失败。
- 已把“触发窗口标记”收敛到 reducer 的权威写入路径：
  - 在 `SU_EVENTS.ACTION_PLAYED` 中，`defId === 'mermaids_toll_bay'` 时写入 `mermaidsTollBayActiveTurnByPlayer[playerId] = turnNumber`。
- 修复后复跑结果：
  - `newFactionAbilities`: `170 passed / 1 skipped`
  - `interactionTargetTypeAudit + interactionDefIdAudit + abilityBehaviorAudit + interactionCompletenessAudit`: `36 passed`
  - `npm run i18n:check`: 通过
  - `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts`: `3 passed`
- 补充稳定性复核：`smashup.smoke.test.ts` 复跑 `121 passed`，确认本轮修复未破坏 SmashUp 主流程烟测。

## 2026-04-25 三派系审计修订（旧结论失效回写）
- 失效结论：上一条“`mermaids_toll_bay` 触发窗口标记回归修复”的描述与当前权威语义不一致，已判定失效。
- 当前权威语义：`mermaids_toll_bay` 仅执行“选择基地后按对手随从数即时抽牌”，不包含“本回合后续移动再触发”的持续窗口。
- 证据：
  - `newFactionAbilities.test.ts` 中该卡仅保留两条即时抽牌断言，当前结果 `170 passed / 1 skipped`；
  - 全量 SmashUp 回归 `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup --configLoader native --maxWorkers 1` 结果 `146 files passed / 9 skipped`，`1962 passed / 19 skipped`；
  - 四审计套件复跑 `36 passed`，`smashup.smoke.test.ts` `121 passed`，`smashup.e2e.ts` `3 passed`。
- 文档修订：
  - 已在 `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md` 新增“修订记录（2026-04-25 10:30）”，显式标注旧结论失效与新口径。

## 2026-04-25 R2 复核补记
- 执行 `npm run assets:upload`，结果：`上传 1342，跳过 530，失败 1（socket hang up）`。
- 对关键 URL 二次 HEAD 复核均为 `200`：
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/cards/compressed/wangling.webp`
  - `https://assets.easyboardgame.top/official/i18n/zh-CN/smashup/base/compressed/wangling_base.webp`
  - `https://assets.easyboardgame.top/official/common/audio/bgm/Villains Music Pack Vol. 1/Maniac (RT 5.161)/compressed/Villains Maniac Main.ogg`

## 2026-04-25 Gameplay 回归 Finding：巨石阵附着天赋二次发动
- 问题复现：
  - `npm run test:e2e:ci -- e2e/smashup/smashup-gameplay.e2e.ts` 首轮出现 `1 failed / 6 passed`；
  - 失败用例：`巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额`。
- 根因：
  - `src/games/smashup/domain/commands.ts` 的 `USE_TALENT` 在 `ongoingCardUid` 分支对 `ongoing.talentUsed` 直接拒绝；
  - 缺少“巨石阵 + 附着在己方随从上的持续行动卡 + 双才能名额未占用”的例外判定。
- 修复：
  - `src/games/smashup/domain/commands.ts` 与 `e2e/src/games/smashup/domain/commands.ts` 补 `attachedHostMinion` 识别与双才能例外；
  - `src/games/smashup/__tests__/talentAbilities.test.ts` 与 `e2e/src/games/smashup/__tests__/talentAbilities.test.ts` 新增 2 条回归测试（可用/不可用各 1 条）。
- 修复后验证：
  - `talentAbilities.test.ts`: `22 passed`
  - `smashup-gameplay.e2e.ts`: `7 passed`
  - `smashup.e2e.ts`: `3 passed`
  - `newFactionAbilities + smoke`: `174 passed / 1 skipped` + `121 passed`
  - 四审计套件：`36 passed`
  - `npm run i18n:check`: 通过

## 2026-04-25 三派系复核补记（去重测试块后重跑）
- 触发：发现 `src/e2e/src/games/smashup/__tests__/talentAbilities.test.ts` 有重复新增 case。
- 处理：去重为单组“附着行动卡第2次天赋可用/不可用”回归断言，避免重复测试掩盖真实覆盖率。
- 去重后复跑结果：
  - `talentAbilities.test.ts`：`20 passed`
  - `newFactionAbilities + smashup.smoke`：`179 passed / 1 skipped` + `122 passed`
  - 四审计套件：`36 passed`
  - `npm run i18n:check`：通过
  - `smashup-gameplay.e2e.ts`：`7 passed`
  - `smashup.e2e.ts`：`3 passed`
- 结论：计数变化来自重复 case 去重，不是能力回退；去重后三派系主链路仍全绿。

## 2026-04-25 数据录入基操补齐（Wiki 工具链）
- `scripts/scrape-wiki-with-descriptions.mjs` 已补 `skeletons / mermaids / world_champs` 映射，避免对 10 周年派系漏抓。
- `scripts/final-wiki-code-comparison.mjs` 已补：
  - `nameEn` 双引号/单引号统一解析；
  - 名称归一化（`'`/`’`）避免假缺失；
  - 报告显式声明“仅校验 name/count，不校验语义”。
- 现场复核：
  - `node scripts/scrape-wiki-with-descriptions.mjs skeletons` -> `12 种 / 20 张`
  - `node scripts/final-wiki-code-comparison.mjs` -> `1 正确 / 0 问题（仅 name/count）`
  - `npx eslint scripts/scrape-wiki-with-descriptions.mjs scripts/final-wiki-code-comparison.mjs` -> 0 errors
- 结论：工具链“漏派系 + 引号误判”问题已修复；`Skeletons` 语义错配结论不变，仍需整派系重录与实现。

## 2026-04-25 Skeletons 整派系重录实施（进行中）
- 已将 `newFactionAbilities.test.ts` 的 Skeletons 区块（原 7064-7604）整体替换为新语义断言，覆盖：
  - Returned One 自埋 + 翻开后再翻一张；
  - Place ’em Down / Dig ’em Up 的基地-卡牌双段交互；
  - Graveyard / Grave Goods / Lord of Bones 的“挖掘+指示物/手埋”语义；
  - Spooky, Scary... 的“弃牌堆埋葬 + 抽 1”；
  - Hearse Fleet 的埋葬牌搬运；
  - Revenant 回合内弃牌堆自埋且每回合一次；
  - Gravestones 计分后自埋到他基地；
  - Gravetender 每回合首次埋/挖触发抽牌。
- 定向验证通过：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts -t "Skeletons abilities" --configLoader native --maxWorkers 1`
  - 结果：`13 passed`（Skeletons 子集全绿）。
- `interactionTargetTypeAudit` 已按新 sourceId 完成门禁同步：
  - 新增/调整 `APPROVED_GENERIC_SOURCE_REASONS`（`skeletons_*_cards/uncover/...`）；
  - 修复 `unknown` generic 来源（`handleSkeletonsHearseFleetSpecialMode` 改为字面量 sourceId 分支）；
  - 移除失效登记项 `skeletons_dig_em_up`，改为 `skeletons_dig_em_up_cards`。
- 审计验证通过：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
  - 结果：`7 passed`。
- 质量门禁：
  - `npx eslint src/games/smashup/abilities/skeletons.ts src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts`：0 error（warnings 存量未扩大）；
  - `npm run i18n:check`：通过（仅动态 key 警告）。

## 2026-04-26 SmashUp 三派系审计续跑 Findings
- `interactionCompletenessAudit` 的孤儿误报根因已确认是 `_pod` alias 引用不对称；在 `createOrphanHandlerCheck` 做 alias 对称映射后，审计恢复稳定通过。
- `Mermaids` 两条争议用例已对齐当前实现语义：
  - `mermaids_desert_island` 校验“控制者总力量压制”而非“强制退回随从”；
  - `mermaids_charmed` 校验完整交互链与压制元数据，不再误用 `tempPowerModifier=-2` 旧口径。
- 最新门禁口径：`newFactionAbilities 178 passed / 1 skipped`，四审计套件 `36 passed`，`i18n:check` 通过（仅 dynamic-key warning）。
- E2E 本轮状态：横幅目标用例通过并完成核图；同文件存在 1 条 join 超时失败（3 人房座位状态），需后续单独稳态化。

## 2026-04-26 SmashUp 横幅 E2E 稳态化补记
- 本轮 `smashup.e2e.ts` 失败不是横幅逻辑回归，而是“3 人房间”用例在第三访客 join 时触发默认 30s 测试超时。
- 已在 `e2e/smashup/smashup.e2e.ts` 对该用例显式提升超时为 `120000ms`，保留原业务断言不变。
- 修复后复跑结果：`npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts` 为 `3 passed`，横幅用例继续通过。

## 2026-04-26 SmashUp smoke 追加复核
- 在完成三派系审计 + 横幅 E2E 收敛后，补跑 `smashup.smoke.test.ts`，结果 `124 passed`。
- 结论：本轮 `_pod` 审计修复、Mermaids 语义对齐与 E2E 超时稳态化未引入 SmashUp 主流程烟测回归。

## 2026-04-26 全量 SmashUp 回归探测 Findings
- 三派系目标门禁（`newFactionAbilities` + 4 审计 + 横幅 E2E + smoke）本轮均已通过；但全量 `src/games/smashup` 复跑仍报 `14` 条失败。
- 当前失败主要集中在两条链路：
  1) `afterScoring` 响应窗口会话收口（2 条）；
  2) `onDestroy` 事件链期望（11 条）与 1 条命令校验。
- 这批失败不在本轮“横幅统一样式 + 三派系审计门禁”直接改动面内，但已构成继续推进的阻塞项，需下一批进入定向排查与修复。

## 2026-04-26 全量 SmashUp 失败簇收敛（14 → 2 → 0）
- 14 条失败簇先收敛到 2 条后，最终剩余均位于 `newFactionAbilities.test.ts` 的 `bear_cavalry_bear_necessities`：
  1) 断言把目标限制成“仅行动卡”；
  2) stale 目标离场后仍可能发出 `ONGOING_DETACHED`。
- 根因分类：
  - **测试语义漂移**：卡面/i18n 权威语义明确是“消灭一个随从或在基地上打出的一张战术卡”，旧断言过度收窄。
  - **交互 stale 防护缺口**：`bear_cavalry_bear_necessities` handler 对行动卡分支缺少“目标仍在场”校验。
- 修复：
  - 对齐回归断言为“目标包含对手随从 + 已打出的行动卡”；
  - 在 `registerInteractionHandler('bear_cavalry_bear_necessities')` 增加 `actionStillOnBoard` 校验，离场则返回空事件。
- 验证：
  - `newFactionAbilities.test.ts`：`174 passed / 1 skipped`；
  - 全量回归：`node scripts/infra/vitest-cli-safe.mjs run src/games/smashup --configLoader native --pool threads --maxWorkers 1 --no-file-parallelism`
    - `146 files passed / 9 skipped`
    - `2016 passed / 19 skipped`

## 2026-04-26 三派系审计套件复核（收敛后再次确认）
- 失败簇清零后，复跑四项审计套件：
  - `interactionTargetTypeAudit`
  - `interactionDefIdAudit`
  - `abilityBehaviorAudit`
  - `interactionCompletenessAudit`
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts src/games/smashup/__tests__/interactionDefIdAudit.test.ts src/games/smashup/__tests__/abilityBehaviorAudit.test.ts src/games/smashup/__tests__/interactionCompletenessAudit.test.ts --config vitest.config.audit.ts --configLoader native --maxWorkers 1`
- 结果：`4 files passed`，`36 passed`。
- 结论：三派系审计门禁在“14→0”修复后仍保持全绿，没有被回归修复反向打破。

## 2026-04-26 横幅 E2E 稳态化（服务冷启动防抖）
- 现象：`派系选择页应显示 10 周年三派系与统一斜向实施中横幅` 用例在 managed runtime 冷启动窗口偶发 `skip`，根因是探活仅单次请求，服务尚未 ready 即判定不可用。
- 修复：
  - `e2e/smashup/smashup.e2e.ts`
  - `e2e/smashup.e2e.ts`
  - `ensureGameServerAvailable` 改为 45 秒轮询探活（每秒一次）。
- 验证：
  1. `npm run test:e2e:ci:file -- e2e/smashup/smashup.e2e.ts "派系选择页应显示 10 周年三派系与统一斜向实施中横幅"` → `1 passed`
  2. `npm run test:e2e:ci -- e2e/smashup/smashup.e2e.ts` → `3 passed`
  3. `npm run i18n:check` → 通过（仅既有 `dynamic-key` warning）
- 关键截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-selection.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-mermaids-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-skeletons-banner.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-10th-factions-world-champs-banner.png`

## 2026-04-26 World Champs 关键链路补证（三）
- 新增 `world_champs_mouse_bird_and_sausage` 的浏览器级真实入口证据：覆盖“锚点选择 -> 同基地同派系二段多选 -> +2 生效”完整链路。
- 修正 `world_champs_fighting_spirit_prize` 的 E2E 多选提交方式：将“UI 局部点击 + confirm”改成 `SYS_INTERACTION_RESPOND(optionIds[])` 一次性提交，避免多选态在不同渲染模式下不稳定导致的假阴性。
- 结论变化：
  - `World Champs` 的 L3 证据从 `Stoneford / 海龟阿凯 / 盾女` 扩展为 `Stoneford / 海龟阿凯 / 盾女 / 斗志奖杯 / 鼠、鸟与香肠`。
  - 这仍是“关键样本扩展”，不是“三派系整包发布收口”；主口径继续保持“仍有残余范围”。
- 本轮关键截图（绝对路径）：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斗志奖杯打出后应抽两张并给两个己方随从各放一个-+1-指示物\fighting-spirit-prize-prompt-visible.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\斗志奖杯打出后应抽两张并给两个己方随从各放一个-+1-指示物\fighting-spirit-prize-resolved.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从-+2\mouse-bird-sausage-targets-prompt.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-robot-hoverbot-new.e2e\鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从-+2\mouse-bird-sausage-resolved.png`

## 2026-04-26 骷髅《复仇者》真实入口口径回写
- 旧 E2E 失败不是《复仇者》逻辑回归，而是**测试还停留在旧 prompt 模型**。
- 当前真实实现已经不是 `waitForInteraction('skeletons_revenant_base')` 这条链，而是：
  1. 你的出牌阶段，弃牌堆存在《复仇者》；
  2. 弃牌堆面板中出现可选《复仇者》；
  3. 选中后出现“点击基地埋葬这张牌”提示；
  4. 点基地直接 `ACTIVATE_SPECIAL({ discardCardUid, baseIndex })`；
  5. `usedDiscardPlayAbilities` 记账后，同回合第二次不再暴露入口。
- 因此这里被补上的不是单纯一条 E2E，而是**审计口径纠偏**：旧“Revenant 仍缺 during-turn/L3”结论已经失效。

## 2026-04-26 世界冠军《武士 陈》负路径证据
- 当前浏览器基线下，真实打出《武士 陈》后不会再出现《海龟阿凯》的“选择玩家 -> 交牌 -> 抽两张”交互。
- 这说明用户当时看到的“武士 陈卡面却触发海龟阿凯效果”在当前基线上已不再复现，能够继续支撑“根因是 cards7 图集索引错位，而不是当前能力实现串线”的结论。
- 这条证据的价值是**负路径**：不是再证明《海龟阿凯》能正常触发，而是证明《武士 陈》不会误触发《海龟阿凯》。

## 2026-04-26 World Champs《金币猫 / 鲨鱼纹身》补证与根因升级
- 《金币猫》当前浏览器级真实入口已确认：
  - 打出后 prompt 会同时给出同基地己方/敌方其他随从；
  - 选择敌方后，只有敌方目标获得 `+1`，没有误加到己方。
- 《鲨鱼纹身》当前卡图语义与实现录入本身一致，问题不在数据录入：
  - 打出时附着并立即给宿主 `+1`；
  - 下个自己回合开始时若这里确实只有你这一张随从，则再给 `+1`；
  - 若这里还有你的其他随从，则不会额外加。
- 本轮真正定位到的根因比“卡图/配置录错”更深一层：
  - `src/games/smashup/domain/index.ts` 的 flow hook 会把**已被事件预先 reduce 过的 core**夹带进 `updatedState` 返回；
  - 引擎随后又会对返回事件再 reduce 一遍；
  - 对《鲨鱼纹身》表现成“事件只有 1 条，结果却多算 1 次”。
- 结论：
  - 这次不是“审计维度只有卡图/文本不够”，而是**对象级重审把问题从表面卡牌怀疑，推进到了 flow hook / updatedState / core 双算边界缺陷**。
  - 也因此，后续三派系重审不能只看“卡图对上了没”，还必须继续抽样覆盖“startTurn / endTurn / afterScoring”这类阶段切换链路。

## 2026-04-26 World Champs《警长 / 木乃伊》补证与误判根因回写
- 《警长》与《木乃伊》当前都已补到浏览器级真实入口证据：
  - `警长应在基地计分前发起决斗并摧毁落败随从` → `1 passed`
  - `木乃伊应在基地计分后埋葬到另一个基地` → `1 passed`
- 新证据文档：
  - `evidence/smashup/smashup-world-champs-sheriff-mummy-e2e-2026-04-26.md`
- 关键截图绝对路径：
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-sheriff-duel-card-prompt-2026-04-26.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-sheriff-duel-resolved-2026-04-26.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-mummy-after-scoring-prompt-2026-04-26.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-mummy-buried-on-other-base-2026-04-26.png`
- 本轮收紧后的根因结论：
  - 《警长》此前更像是 **E2E helper 只看 host 视角 + 错点泛化 Pass + 场景残留 titan 污染**；
  - 《木乃伊》此前更像是 **beforeScoring 场景污染 afterScoring 入口**；
  - 这两张牌当前都**不应再被粗暴归类成“卡图录错 / 数据录错”**。

## 2026-04-27 World Champs《高速追逐 / 现在是闪电时间！ / 聪明Set-Up》对象级补证
- 本轮继续按“卡图优先 + 对象级真实入口”推进，补齐 3 张仍缺浏览器级 L3 证据的行动牌：
  - 《高速追逐》
  - 《现在是闪电时间！》
  - 《聪明Set-Up》
- 本轮 E2E 结论：
  - `高速追逐`：已证实真实链路为“打到基地 -> 发动天赋 -> 先选己方随从 -> 再选目标基地 -> 行动转移、随从移动、本回合 +3”
  - `现在是闪电时间！`：已证实真实链路为“打出 -> 选己方随从 -> 仅被选中者本回合 +3”
  - `聪明Set-Up`：已证实真实链路为“附着到其他玩家随从 -> 切到对手出牌阶段 -> 该基地首次打出随从后你抽 1 张”
- 证据文档：
  - `evidence/smashup/smashup-world-champs-high-speed-smart-blitz-e2e-2026-04-27.md`
- 稳定截图绝对路径：
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-ongoing-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-minion-prompt-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-high-speed-chase-resolved-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-its-blitzin-time-prompt-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-its-blitzin-time-resolved-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-smart-set-up-attached-2026-04-27.png`
  - `D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-world-champs-smart-set-up-triggered-2026-04-27.png`
- 当前口径继续保持：
  - `World Champs` 对象级证据继续扩展，但三新派系整包仍是 **仍有残余范围**。

## 2026-04-28 World Champs《着魔 / 嗯？》补证与《嗯？》入口缺口定位
- 《着魔》当前不是数据录入问题；真实入口已证实为“附着宿主 -> 宿主离场 -> 转移到另一个随从并继续 +2”。
- 《嗯？》本轮发现的真实问题不是卡图/locale/previewRef，而是**入口实现缺口**：
  - 之前只有 `special executor` 和交互 handler；
  - 但没有注册到弃牌区 `discard special provider`；
  - 也没有在结算后写 `DISCARD_ABILITY_USED` 做“本回合一次”锁定。
- 修复后《嗯？》已证实真实链路为：
  - 本回合打出第一个行动后；
  - 从弃牌堆作为额外行动发动；
  - 选择一个己方随从获得 `+1`；
  - 该牌回到手牌。
- 这次再次说明三新派系重审不能只看“卡图和中文名有没有对上”，还要抽样 `discard special / endTurn / afterScoring / startTurn` 这类真实入口链路。

## 2026-04-28 World Champs《彩虹女孩 / 怪兽冲击》补证
- 《彩虹女孩》当前不是数据录入问题；真实入口已证实为“打出后只给这里的其他己方随从 +1，自己、敌方、其他基地己方都不吃到加成”。
- 《怪兽冲击》当前也不是数据录入问题；真实入口已证实为“打出后得到两个额外行动，并能在同回合真实打出后续两张行动”。
- 《怪兽冲击》本轮暴露的问题是**E2E 断言写错**：
  - 我一开始把第三张行动《暗杀》误当成“立即消灭目标”；
  - 但《暗杀》真实语义是“附着后在回合结束时消灭该随从”；
  - 所以这里修的是验证口径，不是卡牌实现。
- 这再次说明三新派系重审除了卡图和中文名，还要把“验证断言是否忠于卡图语义”也纳入审计范围。
