# Mobile Text Entry Proxy 社交输入回归（2026-04-25）

## 变更目标
- 修复移动端代理输入场景下的值同步与提交链路：
  1. 代理激活后源输入被设为 `readOnly` 时，仍能正确读取与回写值。
  2. 单行输入在代理层按 `Enter` 时，能稳定触发表单提交。

## 执行命令
- `node scripts/infra/vitest-cli-safe.mjs run src/components/system/__tests__/MobileTextEntryProxyLayer.test.tsx --configLoader native --maxWorkers 1`
- `npm run test:e2e:ci:file -- social.e2e.ts "移动端社交聊天输入聚焦后仍应保持可见"`

## 结果
- `MobileTextEntryProxyLayer.test.tsx`：`8 passed`。
- `social.e2e.ts` 指定用例：`1 passed`。

## 截图与观察
- 截图：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\social-chat-mobile-input-visible.png`
- 观察 1：社交聊天输入在模拟键盘弹起后仍保持可见，未越界到运行时视口外。
- 观察 2：输入文本“移动端社交聊天输入可见性校验”可在源输入与代理输入之间保持一致。
- 观察 3：发送链路可完成，消息文本在聊天区可见。
