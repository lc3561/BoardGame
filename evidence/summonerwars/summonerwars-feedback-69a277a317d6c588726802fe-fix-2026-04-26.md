# SummonerWars 反馈 69a277a317d6c588726802fe 修复证据

## 反馈范围

- 反馈 ID：`69a277a317d6c588726802fe`
- 反馈原文：`SummonerWars：撤回特别慢，且放大镜功能缺失`
- 本轮目标：
  - 复现并定位“撤回慢”的真实瓶颈
  - 修复移动端/粗指针路径下“放大镜功能缺失”
  - 补测试与截图证据，避免只改状态假收口

## 结论先行

- “撤回特别慢”的主要体感瓶颈不在 `UndoSystem` 本体，而在本地同屏 UI 仍沿用“多人审批链”的前端交互路径。
- 放大镜缺失是 `HandArea` 在粗指针路径里把显式放大按钮整体 suppress 掉了，只剩长按，导致用户感知为“原来的放大镜没了”。
- 本轮修复后：
  - 本地同屏当前操作者可直接看到撤回入口，不再需要 `换位 -> 请求 -> 换回 -> 批准`
  - 真实 UI 撤回探针从点击到回到 `summon` 阶段为 `643ms`
  - 引擎最小基准下 `SYS_REQUEST_UNDO` 直撤回 200 次平均仅 `0.0336ms`
  - 触屏路径恢复显式放大按钮，同时保留原长按放大链路

## 根因

### 1. 撤回慢

- 根因不是领域命令慢，而是本地同屏模式仍沿用多人审批语义：
  - `useUndoStatus` 在当前操作者席位不给 `canRequest`
  - HUD 发出的仍是普通 `REQUEST_UNDO`
  - `UndoSystem` 无法识别“本地同屏自动批准”语义
- 结果是用户要走一条更长的人工审批链：
  - 先切到另一席位
  - 发起撤回
  - 再切回原席位
  - 再批准撤回
- 真实慢点在这条 UI/操作链和界面回退，不在 Undo 快照恢复本身。

### 2. 放大镜缺失

- `src/games/summonerwars/ui/HandArea.tsx` 的粗指针路径曾写死：
  - `suppressMagnifyButton={isCoarsePointer}`
- 这意味着手机/触屏下显式放大按钮被整个禁掉，只剩长按。
- 对用户来说，原来一眼可见、可点的放大镜入口消失，就会被反馈为“放大镜功能缺失”。

## 回归候选提交

- `last-known-good` 候选：`a571e9162b76d7f0ca70dd90e48245d538800e28`
  - `2026-03-18T07:58:20+08:00`
  - `feat: 提交当前已暂存改动`
- `first-known-bad` 候选：`cacdd053c93f9666ceb7ba577f577173b04f93c1`
  - `2026-03-18T07:58:20+08:00`
  - `chore: 提交后续暂存改动`

补充说明：

- 在 `first-known-bad` 候选版本里，粗指针路径已出现 `suppressMagnifyButton={isCoarsePointer}`。
- 该反馈创建时间早于这两个提交，所以它们只能作为“同类回归候选提交”，不能武断断言就是工单首次引入点。

## “撤回慢”复现与量化

### 最小复现步骤

1. 打开 SummonerWars 本地同屏移动横屏证据页，固定 `playerID=0`
2. 用 harness 注入一个带 1 个 undo snapshot 的状态：
   - 快照态为 `summon`
   - 当前态为 `move`
3. 在当前操作者席位尝试打开撤回 FAB
4. 点击撤回并等待界面回到 `summon`

### 真实 UI 探针

定向 E2E 用例：

- `移动横屏：本地同屏撤回应直接回退，不再要求换位审批`

本次复跑日志：

```text
[SW-UNDO-PROBE] {"sameSeatUndoVisible":true,"directUndoMs":643,"approvalFallbackMs":null}
```

我从这个日志实际得到的结论：

- `sameSeatUndoVisible=true`
  - 说明当前操作者席位已经能直接看到撤回入口
  - 不再需要通过换位才能发起
- `directUndoMs=643`
  - 说明真实 UI 从点击到回到 `summon` 阶段大约是 `643ms`
- `approvalFallbackMs=null`
  - 说明本次没有再走旧的换位审批回退链

### 领域层最小基准

我额外跑了一个 200 次的最小 Undo 基准，只测领域层 `SYS_REQUEST_UNDO + localAutoApprove`：

```json
{"iterations":200,"avgMs":0.0336,"minMs":0.0141,"maxMs":0.3884}
```

我从这个基准实际得到的结论：

- Undo 快照恢复本体非常快，平均只有 `0.0336ms`
- 与真实 UI 探针的 `643ms` 相比，差了约 19000 倍
- 因此“撤回特别慢”的主瓶颈不在 `UndoSystem` 领域执行，而在 UI 链、交互链和界面回退

## 修复点

### 1. 本地同屏撤回不再强制走审批链

- `UndoContext`
  - 本地模式下，只要存在 snapshot 且没有 pending request，当前操作者也显示 `canRequest`
- `GameHUD`
  - 本地模式点击撤回时，发送 `payload.localAutoApprove = true`
- `UndoSystem`
  - 仅当 `payload.localAutoApprove === true` 且 `state.sys.matchId` 为空时，允许 `REQUEST_UNDO` 直接恢复快照
  - 在线对局仍维持原审批语义，不放大影响面

### 2. 触屏显式放大入口恢复

- 抽出 `resolveHandCardMagnifyPresentation(...)`
- 粗指针路径改为：
  - 选中的手牌：显示显式放大按钮
  - 未选中的手牌：继续只保留长按放大，避免遮挡主点击
- 显式按钮增加独立触控 hit target，保证手机上可点

## 测试与结果

### 单测

命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/summonerwars/__tests__/cardPreviewHelper.test.ts --configLoader native
```

结果：

- `1 passed`
- `7 tests passed`

覆盖点：

- `resolveHandCardMagnifyPresentation(...)`
  - 选中手牌时应显示显式放大按钮
  - 未选中手牌时继续 suppress 显式按钮

### E2E 1：放大镜入口与放大链路

命令：

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机可达"
```

结果：

- `1 passed`

### E2E 2：本地同屏撤回直回退

命令：

```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：本地同屏撤回应直接回退，不再要求换位审批"
```

结果：

- `1 passed`
- 控制台输出：

```text
[SW-UNDO-PROBE] {"sameSeatUndoVisible":true,"directUndoMs":643,"approvalFallbackMs":null}
```

## 截图与我实际看到什么

### 1. 显式放大按钮出现

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\11a-phone-hand-magnify-button-visible.png`

我实际看到什么：

- 当前被选中的手牌右上角确实有一个黑底圆形的显式放大按钮
- 这个按钮贴在被选中的那张牌上，不是所有手牌都常驻浮着
- 手游横屏布局仍然完整，手牌区、棋盘区、右侧阶段列都还在原位

是否达到验收标准：

- 达标
- 这张图能直接证明“触屏下显式放大入口已恢复”

### 2. 点击显式放大按钮后打开大图

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\11b-phone-hand-magnify-click-open.png`

我实际看到什么：

- 牌面大图覆盖层已经打开
- 肉眼能直接看到 `亡灵战士` 卡牌本体，不是只有遮罩或容器边框
- 右上角的 `关闭` 按钮可见，说明用户能收口

是否达到验收标准：

- 达标
- 这张图能直接证明“点击显式放大按钮可进入放大视图”

### 3. 长按链路仍然可用

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机可达\11c-phone-hand-magnify-long-press-open.png`

我实际看到什么：

- 同样是 `亡灵战士` 的卡牌大图覆盖层
- 这张图和点击放大按钮后的覆盖层一致，说明长按仍能打开同一套放大 UI
- 没有因为恢复显式按钮而把原长按放大链路破坏掉

是否达到验收标准：

- 达标
- 这张图能证明“恢复显式按钮后，原长按功能未回归倒退”

### 4. 本地同屏撤回后已回到 summon

截图：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：本地同屏撤回应直接回退，不再要求换位审批\33-local-fast-undo-restored.png`

我实际看到什么：

- 右侧 FAB 列里当前席位已经能直接看到撤回入口
- 撤回完成后，界面已经恢复到 `summon` 状态
- 右侧阶段列中 `召唤` 是当前高亮阶段
- 棋盘和手牌区仍是正常可见状态，不是切位审批后的中间态

是否达到验收标准：

- 达标
- 这张图能证明“本地同屏撤回已经直接回退到目标阶段，不再要求换位审批”

## 最终验收结论

- 放大镜缺失：已修复，并有点击路径 + 长按路径两条证据链
- 撤回特别慢：已定位真实瓶颈，主要慢在本地同屏 UI 审批链，不在 UndoSystem 本体
- 本轮修复已经去掉本地同屏最主要的慢链路，当前实际 UI 回退约 `643ms`

结论：

- 该反馈可以按 `resolved` 口径收口
- 但更准确地说，当前是“已去掉错误的审批式慢链路”，不是把整条 UI 回退压到引擎级微秒量级
