# Smash Up 派系玩法实施工作流

## 适用范围

适用于 **Smash Up 新派系在 intake 完成之后** 的正式玩法实施，覆盖：

- faction / card / base 的最终运行时接入
- ability / trigger / interaction handler / base ability 实现
- 共享机制复用与缺口补齐
- 单派系测试、E2E、evidence
- 批量派系任务的统一收口

本工作流**不负责**重新做一遍图片核对、atlas 索引裁定、资源 truth-source 合同；这些属于 intake 阶段。

本流程继承通用 `data-entry-workflow` 的 Spec 拆解模板（S0~S4），只是把其具体化到 Smash Up 派系实现。

## 前置输入（缺一不可）

进入 implementation 前，至少要有：

1. 一份已收口的 intake 合同文档
   - 必须写明主真相源、对照源、atlas 几何、row-major 索引、基地元信息
2. intake 已确认的 handoff 包
   - faction 清单
   - card/base canonical 名称
   - 仍待裁定项
   - 复用风险说明
3. 对应派系图片、locale、静态数据已接入或已明确待接入范围

若 intake 尚未收口，implementation 必须停下，不能边猜边做。

## 核心原则

### 0. 长期任务连续执行（强制）

- 用户明确给出“长期任务 / 继续 / 不要停 / 最后再总结”语义时，默认主流程必须持续推进到本轮 scope 完成。
- 除非出现硬阻塞（权限缺失、环境不可用、真相源冲突且无法裁定），否则不得在中间阶段以“进度确认”代替执行。
- 每次推进都必须产出可复查证据（测试结果、截图、evidence 文档、审计记录）并回填 planning 文件。

### 1. 一次只做一个派系

批量任务也必须按单派系闭环推进：

1. 派系 A：实现 → 测试 → E2E → evidence
2. 派系 B：实现 → 测试 → E2E → evidence
3. 派系 C：实现 → 测试 → E2E → evidence
4. 最后再做统一审计与批量收口

禁止“三个派系同时改一半”后再试图一起救火。

### 2. 资源完成 ≠ 派系完成

以下都**不能**当成“派系已完成”：

- 只是 atlas / locale 已接入
- 只是 faction selection 能看到新派系
- 只是静态数据已录入
- 只是单测通过

只有当 **玩法实现 + 测试 + E2E + evidence** 都闭环后，才能说该派系完成。

### 2.1 审计结论必须分级（强制）

Smash Up 派系任务对外汇报时，至少要先判断自己处于哪一级，禁止再混成一句“已收口”：

- **结构审计通过**：只证明静态接入、注册、`targetType`、`defId`、审计测试通过。
- **代表性玩法已验证**：已经有行为级测试和至少 1 条真实规则链路被证明成立，但覆盖范围仍有限。
- **当前发布口径已收口**：当前计划发布的派系范围内，结构、行为、真实入口玩法、残余范围声明都满足门禁。
- **仍有残余范围**：已经修了一部分，但仍有未审家族、共享根因、未覆盖交互链或待补验证。
- **旧结论失效**：之前的派系 audit / rollup / final closeout 已被后续证据推翻，必须回写原文档。

### 2.2 这些证据不能单独当玩法收口（强制）

以下情况最多只能写“展示已接入”或“结构已接通”，不能写“派系玩法完成”：

- 只能看到 faction selection、横幅、房间列表、资源展示的新派系 E2E。
- 只证明 `registerAbility`、静态覆盖、审计测试、`interactionCompletenessAudit` 没报新增失败。
- 通过状态注入、直接灌 `interaction`、从 prompt 已打开状态继续执行的注入型交互 E2E。
- 只证明 prompt 出现、按钮可点、toast 弹出，未证明真实入口和最终权威状态变化。

### 3. 先复用共享机制，再补共享缺口

优先检查：

- `src/games/smashup/domain/`
- `src/games/smashup/abilities/`
- `src/games/smashup/__tests__/`

是否已有：

- bury / uncover
- ongoing modifier
- ongoing restriction / suppression
- movement / transfer / destroy / replace
- duel
- after scoring / before scoring / response window

若确实缺共享抽象，再补共享层；不要一上来在派系文件里堆私有硬编码。

## 典型文件落点

### 基础接入

- `src/games/smashup/domain/ids.ts`
- `src/games/smashup/domain/atlasCatalog.ts`
- `src/games/smashup/data/cards.ts`
- `src/games/smashup/ui/factionMeta.ts`
- `public/locales/zh-CN/game-smashup.json`
- `public/locales/en/game-smashup.json`

### 派系数据与能力

- `src/games/smashup/data/factions/<faction>.ts`
- `src/games/smashup/abilities/<faction>.ts`
- `src/games/smashup/abilities/index.ts`

### 测试与留证

- `src/games/smashup/__tests__/*.test.ts`
- `e2e/smashup/*.e2e.ts`
- `evidence/smashup/*.md`

## 执行步骤

### 1. 读取 handoff 包并裁定实现边界

每个派系开工前，必须先写清楚：

- 哪些卡是直接复用现有能力
- 哪些卡是“同名但要重新核语义”
- 哪些卡必须全新实现
- 哪些基地能力已有共享模板
- 哪些机制会要求修改共享层

### 2. 单派系内再拆三批子任务（强制）

每个派系实施时，必须再拆成以下三批并按顺序推进：

1. **可直接通过配置复用的一批**
   - 目标：先把可复用卡牌/基地快速接上，降低不确定性
   - 典型内容：id、previewRef、abilityTags、已有 handler 绑定
2. **需要新机制或共享层扩展的一批**
   - 目标：解决当前引擎/共享抽象无法表达的规则
   - 典型内容：新增 shared helper、补 domain 抽象、补 interaction 链路
3. **需要新 UI / 新交互表现的一批（含对应 E2E）**
   - 目标：把机制真正暴露为可操作、可验收的真实链路
   - 典型内容：新交互组件、可选目标提示、阶段按钮、真实端到端流程验证

禁止把“机制还没实现”或“UI 还没接上”的残留留到派系完成后再补。

### 3. 先完成静态接入，再落能力

顺序建议：

1. faction id / atlas / metadata / locale
2. `data/factions/*.ts`
3. `abilities/*.ts`
4. `abilities/index.ts`
5. 必要的 domain / shared helper 调整

### 4. 共享缺口可直接扩展重构（默认授权）

当你在派系实施中确认存在共享抽象缺口时：

- 允许直接进行必要的扩展重构，不需要再逐次停下来确认
- 但必须满足：
  - 改动目的仅限“让当前与后续派系都可复用”
  - 不引入临时硬编码和一次性补丁
  - 同步更新受影响测试与 evidence
  - 在阶段总结中明确写清“为什么要改共享层、影响范围是什么”

仍需单独确认的场景：

- 分支/worktree/tag 操作
- 删除/清理本地数据
- 其他高风险不可逆操作

### 5. 单派系完成后立刻验证

每完成一个派系，至少做：

- 相关 Vitest / GameTestRunner，证明核心规则链确实生效
- 受影响的审计测试，证明结构接入没有漏注册或漏声明
- 至少 1 条关键真实交互 E2E，入口必须来自真实打牌 / 真实触发 / 真实响应窗口
- 1 份 evidence 文档，明确写清当前结论等级、残余范围、共享根因

不能把验证全压到最后。

### 6. 批量任务最后再做统一审计

当所有派系都已完成后，再做：

- 统一回归
- 批量 E2E 补充
- 统一 evidence 汇总
- 资源上传与远端回查

#### 审计执行矩阵（强制）

统一审计时，必须把结果分成两层，避免“历史债”干扰本轮结论：

1. **本任务新增范围（硬门禁）**
   - 新增/修改派系相关能力、交互、targetType、defId、能力标签执行器覆盖
   - 必须达到“无新增失败”或“失败已在本轮修复并复测通过”
2. **全局历史基线债（单列追踪）**
   - 与本轮改动无关的历史失败可以保留，但必须单列成债务清单
   - 禁止写成“本任务未完成”，也禁止伪装成“审计全绿”
   - 对 `interactionCompletenessAudit` 这类历史债密集项，建议维护 `orphan/dynamic` 基线白名单：**当前基线允许存在，新增项必须失败**

最低产出要求：
- 一份专项审计文档：`evidence/smashup/<task>-audit-YYYY-MM-DD.md`
- 文档内必须包含：命令、结果、失败归因（本任务/历史基线）、结论等级、残余范围、后续动作

#### 统一收口口径（强制）

- 批量汇总文档只能在每个派系都已有各自 evidence 的前提下，才允许写汇总结论。
- 汇总文档引用单派系结论时，必须保留原等级；某个派系只是“结构审计通过”，汇总里也只能写到这个等级。
- 若后续发现某个派系存在漏审、误判或假阳性收口，必须回写原派系 evidence，并同步修订批量 rollup / final closeout，禁止保留旧“全部完成”摘要继续流通。

#### `targetType: 'generic'` 门禁补充（强制）

凡是新增或调整到 `targetType: 'generic'` 的 `sourceId`，必须同步更新：

1. `src/games/smashup/__tests__/interactionTargetTypeAudit.test.ts` 的 `REQUIRED_SOURCE_CONFIGS`
2. 同文件 `APPROVED_GENERIC_SOURCE_REASONS`（写清保留 generic 的语义理由）

否则 `interactionTargetTypeAudit` 会在“所有 generic targetType 都必须登记保留原因”处直接失败。

## 多 agent 使用建议

允许并行的通常是：

- 规则核对
- 索引合同整理
- 文档 / evidence 草拟
- 测试梳理

默认**不建议**多个 agent 同时写同一组核心文件：

- `ids.ts`
- `atlasCatalog.ts`
- `data/cards.ts`
- `abilities/index.ts`
- locale 主文件

如果要并行，必须先明确文件写入边界，避免互相覆盖。

## World Champs 额外规则

`World Champs` 默认按 **mixed-source one-of deck** 对待。

这意味着：

- 不能因为卡名和旧牌一样，就默认直接复用旧 handler
- 必须逐张写清：
  - 直接复用
  - 复制并改名
  - 全新实现
- 只有在语义已核对一致后，才允许别名复用

## 完成清单

- [ ] intake 合同与 handoff 包已存在
- [ ] 单派系边界已裁定
- [ ] 单派系已按“配置复用 / 新机制 / 新 UI+E2E”三批推进
- [ ] 运行时静态接入完成
- [ ] ability / interaction / base ability 完成
- [ ] 相关 Vitest 通过
- [ ] 关键 E2E 通过
- [ ] evidence 已留档，且已声明结论等级 / 残余范围 / 共享根因
- [ ] 批量统一审计完成（已区分本任务新增范围 vs 历史基线债）
- [ ] 若旧结论被推翻，原 evidence 与汇总文档已完成失效回写
- [ ] 若涉及资源运行时链路，R2 / CDN 已上传并远端验证
