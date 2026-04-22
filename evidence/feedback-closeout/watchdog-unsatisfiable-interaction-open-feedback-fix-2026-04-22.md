# watchdog「unsatisfiable-interaction-auto-skipped」误入 open 反馈修复（2026-04-22）

## 背景

- 用户要求：反馈默认按 bug 排查并修复（默认按线上环境）。
- 线上实时排查结果：
  - 人类 open/in_progress：`0`
  - 系统 open/in_progress：`1`
  - 目标反馈：`69e7afbba786964bfa317c21`（`smashup`，`unsatisfiable-interaction-auto-skipped`，状态 `open`）

## 根因

- 文件：`src/engine/transport/server.ts`
- 在 watchdog 识别到「无解交互并已执行 emergency skip」时，上报系统反馈未明确标记恢复态，导致入库被当成待处理 `open`。

## 修复

1. 代码口径（防再发）  
   - 在 `unsatisfiableInteractionFeedback` 上报 payload 中明确：`status: 'resolved'`。
   - 含义：该事件是 watchdog 已执行应急跳过后的“已恢复”信号，不应再制造 open 噪音。

2. 测试补强  
   - 文件：`src/engine/transport/__tests__/server.test.ts`
   - 用例：`AI 走无解交互 emergency skip 时，服务端应立即自动反馈`
   - 新增断言：`status: 'resolved'`。

3. 线上存量回写（仅改状态字段）  
   - 将 `69e7afbba786964bfa317c21` 从 `open` 回写为 `resolved`（已执行，`matched=1, modified=1`）。

## 验证记录

- ESLint：
  - `npx eslint src/engine/transport/server.ts src/engine/transport/__tests__/server.test.ts`（通过）
- 定向单测：
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "AI 走无解交互 emergency skip 时，服务端应立即自动反馈"`（通过）
- 线上查询（SSH + Mongo）：
  - 修复前系统 open/in_progress：`1`
  - 修复后系统 open/in_progress：`0`
  - 人类 open/in_progress：`0`

## 产物路径

- 修复前查询：
  - `temp/feedback-closeout/query-system-open-inprogress-20260422-082707.json`
  - `temp/feedback-closeout/query-human-open-inprogress-20260422-082707.json`
- 线上回写：
  - `temp/feedback-closeout/update-feedback-status-20260422-082929-69e7afbba786964bfa317c21.json`
- 修复后复核：
  - `temp/feedback-closeout/query-system-open-inprogress-20260422-082944.json`
  - `temp/feedback-closeout/query-human-open-inprogress-20260422-082959.json`
