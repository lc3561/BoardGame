# Task Plan: Smash Up Oops 四派系接入与玩法实施

## Addendum（2026-04-07）：Android 本地素材包图片加载故障

### Goal
> 修复 App 端“素材包已下载但进入游戏后图片仍全部加载中”的问题，确保前端能在未走大厅包管理 hook 的情况下接住已安装游戏包，并且不会把 Android `/_capacitor_file_/...` 本地路径误套进开发态图片 fetch/blob workaround。

### Phase

- [x] **Phase A: 链路排查与根因确认**
  - [x] 复核原生安装目录、前端 asset override 注入点、MatchRoom 关键图片加载链路
  - [x] 确认启动期 hydration 会跳过“未预注册 fallbackState 的已安装包”
  - [x] 确认 `OptimizedImage` 会把 `/_capacitor_file_/...` 本地包路径误走开发态 `fetch -> blob` workaround

- [x] **Phase B: 修复与回归**
  - [x] 修复 `hydrateInstalledNativeGamePackages()` 对已安装包的兜底 hydration
  - [x] 收窄 `OptimizedImage` 的 blob-fetch workaround，只保留开发态 public `/assets/...`
  - [x] 补定向测试并完成 eslint / vitest 校验

## Goal
> 分两阶段完成 Smash Up `Oops, You Did It Again` 四个派系（埃及、牛仔、武士、维京人）的完整交付：先完成图片 intake、可复刻工作流与静态接入；再按 `Ancient Egyptians → Vikings → Cowboys → Samurai` 的顺序逐派系实施正式玩法、补齐 UI、新交互类型 E2E、统一审计与证据留档。

## Phases

- [x] **Phase 1: 发现与设计（intake）**
  - [x] 阅读 AGENTS、OpenSpec、资产/录入/测试/审计规范
  - [x] 创建独立 worktree 与任务分支
  - [x] 盘点现有 Smash Up 图片接入链路、脚本、数据结构与目标素材
  - [x] 创建 OpenSpec proposal/tasks/design/spec delta

- [x] **Phase 2: 资产处理与录入（intake）**
  - [x] 锁定权威来源与图片清单，建立 Markdown 核对契约
  - [x] 完成图片压缩、图集/切片配置与资源落盘
  - [x] 完成 i18n / 静态数据 / atlas / faction metadata 的同步录入
  - [x] 沉淀“给一批图片即可录入”的复刻工作流文档

- [x] **Phase 3: 审计与验证（intake）**
  - [x] 对照描述、资源路径、加载链路做 intake 审计
  - [x] 运行相关 Vitest / 审计脚本
  - [x] 编写并运行相关 E2E，用截图留证
  - [x] 汇总 evidence、结果与残留风险

- [x] **Phase 4: 玩法提案与实施设计（gameplay）**
  - [x] 创建 `add-smashup-oops-faction-gameplay` OpenSpec 变更
  - [x] 明确用户要求的实施顺序：逐派系实现，全部完成后统一审计与 E2E
  - [x] 将 bury UI 与新交互类型纳入正式 scope
  - [x] 运行 `openspec validate add-smashup-oops-faction-gameplay --strict --no-interactive`
  - [x] 等待用户确认 proposal 后进入 `Ancient Egyptians`

- [x] **Phase 5: Ancient Egyptians**
  - [x] 补齐 card defs 元数据与 `abilityTags`
  - [x] 实现埋葬、翻开、替代去向与相关 base/action/minion ability
  - [x] 补齐 owner-visible bury UI 与对手隐藏占位
  - [x] 补领域测试与统一 E2E 证据收口

- [x] **Phase 6: Vikings**
  - [x] 按官方规则书 / Fandom 口径修正 defs、locale 与 ability metadata
  - [x] 实现 deck-top / discard / steal / extra-action 联动与相关基地能力
  - [x] 补领域测试并完成增量门禁验证
  - [x] 统一 E2E 与更严格语义收口已在四派系统一审计阶段完成

- [x] **Phase 7: Cowboys**
  - [x] 实现官方 duel 内核、move / destroy / ongoing draw 与相关 metadata
  - [x] 补决斗/目标选择最小交互断言
  - [x] 补完整 duel 浏览器 E2E 与证据收口

- [x] **Phase 8: Samurai**
  - [x] 按官方规则书 / Fandom 口径修正 defs、locale 与 ability metadata
  - [x] 实现 honor / duel / destroy / temporary-buff / ongoing draw 与相关基地能力
  - [x] Samurai 专项浏览器 E2E、临时触发精细语义与更严格审计已在统一审计阶段完成

- [x] **Phase 9: 统一审计与收尾**
  - [x] 四派系完成后再统一做 gameplay 审计
  - [x] 运行相关 Vitest / typecheck / OpenSpec 校验
  - [x] 运行覆盖新交互类型的 E2E 并留证
  - [x] 汇总最终 evidence、残留风险与后续扩展点

## Technical Decisions
| Decision | Rationale | Status |
| :--- | :--- | :--- |
| 使用独立 worktree `feat/smashup-base-faction-assets` | 根工作区已有并行任务与规划文件，隔离当前任务避免串改 | Approved |
| 使用 OpenSpec + planning-with-files 双轨记录 | 本次既要落地实现，也要沉淀可复刻流程和验收证据 | Approved |
| 以用户提供图片作为当前任务的直接权威来源 | 符合数据录入规范第 3 优先级，可直接用于资源与索引录入 | Approved |
| Smash Up 规则文本与审计必须走 Wiki 爬虫 | 项目专用强制规范，不能只凭图片或记忆录入 | Approved |
| 本轮 scope 以 intake/静态接入为准 | 用户要求整条资源接入链路，但 OpenSpec 已收束为图片、atlas、静态数据、文档、测试、E2E；不在本 change 内补完四派系完整 gameplay ability | Approved |
| `aiji.png` 按 `7x7`、`aiji_base.png` 按 `2x4` row-major 切片 | 已通过直接看图确认 48 张卡 + 1 尾格、8 张基地；后续 atlas/index 以此为唯一切片基准 | Approved |
| 武士基地 defId 使用 canonical 英文名，图面英文差异写入证据文档 | 图面为 `Kyuden Konbini / Sakura Shigemi`，TTS / Wiki canonical 为 `Shogun's Palace / Sakura Garden`；运行时名称与来源说明必须分离 | Approved |
| 先完整录入 locale 文本，再最小化卡牌结构标签 | 为避免把“未实现玩法”误录成“已实现 ability”，本轮卡牌 defs 仅承载图片、数量、力量、所属派系与最小结构，详细文本放入 locale | Approved |
| gameplay 以独立 OpenSpec change 推进，而不与 intake 混写 | intake 已完成并可单独验收；玩法补完涉及新交互类型、UI 与审计范围，必须单独建模 | Approved |
| gameplay 实施顺序固定为 `Ancient Egyptians → Vikings → Cowboys → Samurai` | 先打通 bury 主链路与 UI，再做 duel / movement / replacement，更容易收敛和审计 | Approved |
| bury UI 必须纳入 Ancient Egyptians 第一波范围 | 用户已指出吸血鬼 pod 时 bury 体系只有领域逻辑，没有正式 UI；若继续只做逻辑会重复留下未完成实现 | Approved |

## Critical Errors / Blockers
| Error | Impact | Resolution |
| :--- | :--- | :--- |
| 根工作区 `task_plan.md/findings.md/progress.md` 已服务其他任务 | 不能在原工作区继续维护本次计划 | 新建独立 worktree 承载本任务 |

## Addendum（2026-04-22）：lane-S2R SmashUp 卡牌效果/文本偏差反馈修复

### Goal
> 核对并最小修复 7 条线上 human open 反馈：世界冠军/美人鱼效果、436-1337工厂计分、疯狂山脉抽牌、缅怀先祖、天守阁决斗、武士进弃牌堆加攻击力链路；补测试、运行验证，并产出 vidence/smashup/2026-04-22 逐条证据。

### Phase
- [ ] Phase A: 读取规范、锁权威基线与现有实现
- [ ] Phase B: 最小修复反馈相关实现与文本
- [ ] Phase C: 补现有测试文件中的回归用例并运行验证
- [ ] Phase D: 写 evidence/smashup/2026-04-22 逐条结论与最终汇报

### Scope Control
- 只改 SmashUp 反馈相关文件和 evidence。
- 不触碰当前工作区已有的非本轮改动；已发现 src/games/smashup/domain/index.ts 与 src/games/smashup/__tests__/smashup.smoke.test.ts 存在他人改动，本轮除非必要不修改。

## Addendum（2026-04-22）：SmashUp 10 周年三派系审计复审

### Goal
> 持续验证 `mermaids / skeletons / world_champs` 三派系在当前主线上的实现稳定性，并补齐审计维度（D1-D49）与横幅统一样式证据，确保“实施中”文案与样式收敛后无回归。

### Phase
- [x] 复跑三派系能力与审计门禁（newFactionAbilities + 4 个 audit suite）
- [x] 复跑三派系统一斜向横幅 E2E 并更新截图证据
- [x] 删除中英文 locale 里的 `faction_implementation_in_progress_hint`，只保留“实施中”主文案
- [x] 在 `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md` 补齐 D1-D49 维度
- [x] 按“配置直通 / 新机制 / 新 UI-E2E”补齐主回归文件三派系能力覆盖缺口（静态比对为 0）
- [x] 回写通用 workflow：新增 `targetType: 'generic'` 双登记门禁（实现 + 审计理由）避免后续派系重复踩坑


## Addendum（2026-04-22）：线上 Dicethrone critical 反馈收口补强（69c3c83e / 69cba605）

### Goal
> 对 `69c3c83e`（黑屏）与 `69cba605`（骰面不可见）做当前代码基线复核；对仍存在前端兜底缺口的骰面链路做最小修复并补回归证据。

### Phase
- [x] Phase A: 复核反馈上下文与当前实现入口
- [x] Phase B: 最小修复 `Dice3D` 无 sprite 可见性兜底
- [x] Phase C: 补现有测试断言并运行验证
- [x] Phase D: 产出 evidence 文档并回填 planning 文件

### Scope Control
- 仅修改 `src/games/dicethrone/ui/Dice3D.tsx` 与对应现有测试文件。
- 黑屏链路仅做兼容修复有效性复核，不引入额外架构改动。
