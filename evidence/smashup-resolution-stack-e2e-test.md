# SmashUp 嵌套结算栈 E2E 证据

## 范围

- worktree: `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup`
- 目标：
  - 验证 afterScoring 响应在当前 UI 壳层下仍能正确打开并收口
  - 验证 4 人多重强制效果链会先出现强制排序选择，再完整结算且不重复计分

## 执行命令

- `npm run test:e2e:ci -- e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`
- `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`

## 本轮复跑

- 时间：`2026-04-29T10:03:33.9058293+08:00`
- 口径：
  - 本轮实际复跑使用 `test:e2e:ci:file` + `CODEX_MANAGED_BY_NPM=1`，强制走托管 `isolated-single` runtime。
  - 运行端口为 `6273 / 20100 / 21100`，目的是避开别的 worktree 正在占用的 shared single-worker 端口，不影响这轮对逻辑正确性的验证。

## 追加复跑（收口前最终确认）

- 时间：`2026-04-29T10:19:10+08:00`
- 结果：
  - 同一命令再次复跑通过，`2 passed`。
  - 仍使用托管 `isolated-single` runtime，端口为 `6273 / 20100 / 21100`。
  - 浏览器控制台仍有一次 `Received NaN for the '%s' attribute... children` 警告，但未影响这两条链路的 UI 验收与最终状态收口。

## NaN 警告修复后复跑

- 时间：`2026-04-29T12:15:45+08:00`
- 命令：
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`
- 结果：
  - 整个文件复跑通过，`2 passed`。
  - 本轮已把 SmashUp Board 中回合额度显示的未初始化数值兜底到稳定默认值，不再渲染 `NaN`。
  - 调试探针撤除后再次复跑，未再看到之前那条 `children=NaN` React 告警。

## 2026-04-29 追加验证：三板斧迁移 + 复杂链复跑

- 时间：`2026-04-29T22:41:00+08:00` 到 `2026-04-29T22:43:00+08:00`
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run --configLoader native src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts -t "海盗湾 afterScoring 让过后"`
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup-multi-base-scoring-complete.e2e.ts`
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`
- 结果：
  - 新增的定向单测通过，证明 `海盗湾 skip` 后 `scoreBases` 不会直接 phase change 掉，而会继续留在结算栈里处理剩余基地。
  - 迁移后的 `e2e/smashup-multi-base-scoring-complete.e2e.ts` 已改成纯三板斧，并在真实卡面/真实基地奖励下 `1 passed`。
  - 主线复杂链 `e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts` 再次复跑 `2 passed`，说明这次 `halt` 修正没有把已通过的 2p / 4p 嵌套结算链打坏。

## 本轮新增根因

- 旧问题不在“多基地选择按钮”本身，而在 `scoreBases` 的 finalize 分支：
  - 当当前基地处于 `awaiting-interactions` / `awaiting-response-window` 时，`finalizeCurrentScoringBase()` 返回了事件和更新后的 session，但没有 `halt: true`。
  - 结果是当前基地刚 finalize 完，FlowSystem 就直接把 phase 从 `scoreBases` 推进到 `draw/end/start/playCards`，剩余已锁定基地不会继续结算。
- 修复后行为：
  - `海盗湾 skip` 会先 finalize 当前基地，再继续进入 `忍者道场` 的 afterScoring 响应选择器；
  - 若玩家触发 `base_ninja_dojo`，还会继续进入“不消灭 / 选随从消灭”的具体交互，而不是提前结束整个回合。

## 2026-04-30 追加验证：命令内创建交互不再丢失

- 时间：`2026-04-30T00:45:00+08:00` 到 `2026-04-30T01:05:00+08:00`
- 根因补充：
  - 这轮真正修掉的不是 `smashup_reaction_choose` 壳层本身，而是 `src/games/smashup/domain/reducer.ts` 里的 `execute()`。
  - `clearIdleSmashUpCommandResolutionFrame()` / `seedSmashUpCommandResolutionFrame()` 可能会返回新的 `MatchState` 对象；旧实现后续仍依赖“直接改 `state.sys` 引用”把交互回传给 pipeline。
  - 一旦 `state` 局部变量已经重绑到新对象，原始 pipeline 的 `currentState.sys` 就拿不到命令内部新建的交互，表现就是：牌面效果已经执行，但 `sys.interaction.current` 为空，UI 端看起来像“还能选，点了没效果”。
- 本轮命令：
  - `node scripts/infra/vitest-cli-safe.mjs run --configLoader native src/games/smashup/__tests__/zombieInteractionChain.test.ts -t "zombie_they_keep_coming（它们不断来临）交互创建"`
  - `node scripts/infra/vitest-cli-safe.mjs run --configLoader native src/games/smashup/__tests__/specialInteractionChain.test.ts -t "ninja_acolyte special 交互创建"`
  - `node scripts/infra/vitest-cli-safe.mjs run --configLoader native src/games/smashup/__tests__/multi-base-afterscoring-bug.test.ts -t "海盗湾 afterScoring 让过后"`
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup-zombie-lord.e2e.ts`
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts`
  - `CODEX_MANAGED_BY_NPM=1 npm run test:e2e:ci:file -- e2e/smashup-multi-base-scoring-complete.e2e.ts`
- 结果：
  - `zombieInteractionChain.test.ts` 定向用例通过，证明 `zombie_they_keep_coming` 在命令执行后仍能保留 `discard_minion` 直点交互。
  - `specialInteractionChain.test.ts` 定向用例通过，证明 `ninja_acolyte` 的场上 special 会直接进入手牌点击交互，而不是在 pipeline 里把交互丢掉。
  - `multi-base-afterscoring-bug.test.ts` 定向用例再次通过，证明这次 `execute()` 修补没有把多基地 afterScoring 链重新打坏。
  - `e2e/smashup-zombie-lord.e2e.ts` 整文件复跑 `4 passed`。
  - `e2e/smashup/smashup-complex-multi-base-scoring.e2e.ts` 复跑 `2 passed`。
  - `e2e/smashup-multi-base-scoring-complete.e2e.ts` 复跑 `1 passed`。

## 2026-04-30 关键截图与肉眼结论

### 1. 僵尸领主直点链会先打开弃牌堆选择，再保留“点击基地部署”的中间态

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-zombie-lord.e2e\僵尸领主：弃牌堆选随从后直接点击基地部署\zombie-lord-card-selected.png`
- 我实际看到：
  - 浮层里已经选中了弃牌堆目标随从，说明 `僵尸领主` 的第一段“从弃牌堆挑随从”交互真实打开了。
  - 画面仍停在需要继续操作的中间态，没有被错误收口回常规出牌阶段。
  - 这是“先选弃牌堆，再继续点基地”的真实链路，不是旧 PromptOverlay 那种脱离牌面来源的假交互。
- 是否达标：
  - 达标。第一段交互没有丢失，且流程保持在可继续推进的直点链中间态。

### 2. 僵尸领主选完弃牌堆随从后，可以直接点击基地部署并完成收口

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-zombie-lord.e2e\僵尸领主：弃牌堆选随从后直接点击基地部署\zombie-lord-after-deploy.png`
- 我实际看到：
  - 选中的低力量随从已经进入基地，不再停留在弃牌堆面板里。
  - 画面中没有遗留“选择目标”或旧式 prompt 浮层，说明命令内新建的“点基地部署”交互已经被真实消费并收口。
  - 整条链体现的是“弃牌堆选择 -> 点击基地部署 -> 回到正常棋盘”，不是点完后无事发生。
- 是否达标：
  - 达标。用户之前反馈的“目标不在场也能选，点了没效果”在这条链上已被修掉。

### 3. 它们不断来临在额外打出后，会继续进入僵尸行者自身的 onPlay 收口交互

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-zombie-lord.e2e\zombie_they_keep_coming-应从弃牌堆直接额外打出，不回手也不返还随从位\they-keep-coming-after-deploy.png`
- 我实际看到：
  - 弃牌堆里选出的 `zombie_walker` 已经额外打到了基地上，没有回手，也没有把随从出牌额度“返还成空位”。
  - 额外打出后流程没有凭空结束，而是继续进入 `zombie_walker` 自身的后续收口交互，这和当前真实规则链一致。
  - 这张图证明旧 E2E 的失败点不是实现坏了，而是测试以前误把“walker 的后续交互”当成“没有收口”。
- 是否达标：
  - 达标。命令内创建的后续交互已被保留，额外打出链符合真实规则。

### 4. ninja_acolyte 的 special 不再弹旧 PromptOverlay，而是直接进入手牌点击交互

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-zombie-lord.e2e\ninja_acolyte_play-应该直接点击手牌而不是弹-PromptOverlay\hand-direct-click-prompt.png`
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-zombie-lord.e2e\ninja_acolyte_play-应该直接点击手牌而不是弹-PromptOverlay\hand-direct-click-after.png`
- 我实际看到：
  - 第一张图里，场上 special 触发后直接进入“点击手牌打出”的交互语义，没有再出现脱离当前架构的旧 PromptOverlay。
  - 第二张图里，手牌点击完成后棋盘回到正常状态，说明这段“场上 special -> 手牌直点”的命令内交互没有被 pipeline 吞掉。
  - 这正是 `execute()` 同步 `sys` 回 pipeline 后恢复的链路：命令执行成功时，UI 也真实拿到了后续交互。
- 是否达标：
  - 达标。special 直点手牌链路已回到当前通用交互架构，不再出现“内部执行了但前端没拿到交互”的问题。

## 2026-04-29 关键截图与肉眼结论

### 1. 2 人 afterScoring 窗口已按当前壳层打开

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\smashup\smashup-complex-multi-base-scoring.e2e\基地计分后-afterScoring-响应窗口正常打开\04-after-scoring-open.png`
- 我实际看到：
  - 中间出现 `选择一个反应动作` 浮层，不再依赖旧的 `me-first-overlay`。
  - 浮层里同时有 `我们乃最强 -> 基地 1` 和 `让过` 两个按钮，说明 afterScoring 响应动作与 pass 都可操作。
  - 左侧当前计分基地仍显示 `13 / 12`，说明窗口是在基地刚达成计分后的真实场景里打开，不是跳过链路直接收口。
- 是否达标：
  - 达标。窗口语义正确，且动作按钮与 pass 按钮都真实可见。

### 2. 4 人强制效果排序选择器已真实出现

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\smashup\smashup-complex-multi-base-scoring.e2e\4p-afterScoring-chain-handles-6-interactions-without-duplicate-score\4p-02-mandatory-order-chooser.png`
- 我实际看到：
  - 中央浮层标题是 `选择先结算的强制效果`。
  - 浮层里可见 `托尔图加` 和 4 个 `大副` 按钮，和本场景中 1 个基地能力 + 4 个大副强制触发一致。
  - 背景仍保留 4 人计分现场与 VP 奖励提示，说明这不是脱离主链的假窗口，而是在真实计分链中插入的强制排序步骤。
- 是否达标：
  - 达标。多重强制效果没有直接卡死，也没有丢失排序入口。

### 3. 2 人 afterScoring 收口后已回到出牌阶段

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\smashup\smashup-complex-multi-base-scoring.e2e\基地计分后-afterScoring-响应窗口正常打开\06-final-state.png`
- 我实际看到：
  - 左上角阶段标签已回到 `出牌阶段`。
  - 右上角记分板显示 `你 0 / P0 2`，和该 2 人场景预期一致。
  - 画面中已没有 afterScoring 反应浮层或强制排序浮层，右侧又出现正常回合操作按钮。
- 是否达标：
  - 达标。窗口关闭后流程确实回到了可继续推进的常规状态。

### 4. 4 人强制链收口后没有重复计分

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\smashup\smashup-complex-multi-base-scoring.e2e\4p-afterScoring-chain-handles-6-interactions-without-duplicate-score\4p-03-final.png`
- 我实际看到：
  - 左上角阶段标签已回到 `出牌阶段`。
  - 右上角 4 人记分板显示 `你 4 / P0 3 / P2 2 / P3 0`，总 VP 为 9，没有出现重复加分。
  - 画面中已无 `选择先结算的强制效果` 浮层，也没有遗留交互遮罩。
  - 原先计分中的基地已经完成清空/替换，说明主结算链与子交互链都已收口。
- 是否达标：
  - 达标。4 人链路完成后没有重复计分，也没有停在半路。

### 5. 迁移后的三板斧复杂场景会在海盗湾后继续进入最后一个基地的 afterScoring 选择器

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-multi-base-scoring-complete.e2e\3-个基地依次计分，afterScoring-不会打断后续基地结算\05-dojo-reaction-chooser.png`
- 我实际看到：
  - 丛林与海盗湾都已经完成清空/替换，中间的 `忍者道场` 仍保留在场，说明最后一个基地没有被跳过。
  - 中央出现的是 `smashup_reaction_choose` 壳层，不是旧测试假设的“直接弹出忍者道场 prompt”；这符合当前架构里“先进入 afterScoring 响应窗口，再决定是否触发可选能力”的规则映射。
  - 记分板此时已经是 `P0 7 / P1 4`，说明前 3 个基地的真实奖励值已按当前卡面正确累计，不再沿用旧 `3/2` 假设。
- 是否达标：
  - 达标。最后一个基地没有丢失，且进入了正确的 afterScoring 响应入口。

### 6. 触发忍者道场后，具体交互会继续打开并允许“不消灭”收口

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-multi-base-scoring-complete.e2e\3-个基地依次计分，afterScoring-不会打断后续基地结算\06-ninja-dojo-interaction.png`
- 我实际看到：
  - 中央已经不是通用响应窗口，而是 `忍者道场` 的具体交互，顶部文案与选项内容对应“冠军可以消灭一个随从”。
  - 交互里同时能看到 `不消灭` 和两个随从候选，说明从通用响应窗口进入具体 ability prompt 的桥接是通的。
  - 画面里仍能看到中间基地的两个随从本体，证明这不是伪造状态，而是“基地已计分但 afterScoring 还没收口”的真实中间态。
- 是否达标：
  - 达标。嵌套结算栈已经把“通用可选响应窗口 -> 具体 afterScoring 交互”这一层桥接稳定下来。

### 7. 迁移后的三板斧复杂场景最终完整收口

- 截图：
  - `D:\gongzuo\webgame\BoardGame\.worktrees\resolution-stack-smashup\test-results\evidence-screenshots\_shared\smashup-multi-base-scoring-complete.e2e\3-个基地依次计分，afterScoring-不会打断后续基地结算\07-final-state.png`
- 我实际看到：
  - 左上角阶段标签回到 `出牌阶段`，说明 `scoreBases -> draw -> endTurn -> startTurn -> playCards` 已完整走完。
  - 三个原始基地都被替换掉，中间的 `忍者道场` 也已离场，不再停在 `19/18` 的未结算状态。
  - 右上角记分板收口在 `P0 7 / 你 4`，与当前真实基地奖励链一致。
- 是否达标：
  - 达标。这个旧测试文件迁移成三板斧后，已经能真实覆盖“多基地顺序选择 + afterScoring 嵌套响应 + 最后基地收口”整条链。

## 结论

- 本轮 E2E 证据支持：
  - afterScoring 响应已适配当前 `smashup_reaction_choose` 壳层；
  - 多重强制效果会先给排序入口，再继续具体能力链；
  - 4 人复杂链在强制排序 + 子交互结束后只结算一次 VP，并回到正常出牌阶段。
  - 旧 `smashup-multi-base-scoring-complete.e2e.ts` 已迁成三板斧，且真实验证出/修复了“当前基地 finalize 后误直接离开 scoreBases”这个回归。

## 残留风险

- 本轮针对 `children=NaN` 的浏览器告警已完成定位与修复；当前证据里未再观察到同类 React 告警。
- 仍建议后续继续用真实 `setupScene` 场景覆盖更多 HUD / 额度展示分支，避免别的未初始化计数再次把数值型 `NaN` 渲染到文本节点。
