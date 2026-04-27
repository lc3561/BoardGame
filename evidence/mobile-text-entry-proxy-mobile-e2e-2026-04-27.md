# 移动端额外输入框验证 2026-04-27

## 范围

- `src/components/system/MobileTextEntryProxyLayer.tsx`
- `e2e/auth-account-login.e2e.ts`
- `e2e/_shared/social.e2e.ts`

## 验证命令

- `npm test -- src/components/system/__tests__/MobileTextEntryProxyLayer.test.tsx`
- `npm run test:e2e:ci:file -- e2e/auth-account-login.e2e.ts "AuthModal register should keep mobile inputs visible and editable on narrow screens"`
- `npm run test:e2e:ci:file -- e2e/_shared/social.e2e.ts "移动端社交聊天输入聚焦后仍应保持可见"`

## 关键截图与观察

### 1. 认证弹窗移动端输入截图

- 截图路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\auth-modal-mobile-register-filled.png`
- 说明：这张图来自测试里的认证弹窗快照克隆，只用来辅助看表单布局，不作为唯一收口证据。
- 肉眼观察：
  - 注册弹窗主体完整出现在视口内，没有被键盘顶出可视区。
  - 输入区和提交按钮都保留在弹窗内，没有出现透明到完全不可辨认的空白区域。
  - 这张图只能证明弹窗布局与输入区占位正常，不能单独证明真实页面原位焦点状态。

### 2. 社交聊天移动端原位截图

- 截图路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\social-chat-mobile-input-visible.png`
- 说明：这张图来自真实页面原位截图，可作为本轮主要视觉证据。
- 肉眼观察：
  - 底部额外输入框真实出现在页面底部，可直接看到输入框本体，不是只有容器或遮罩。
  - 输入框位于运行时可视区内，没有被键盘区域吞掉，也没有缩到左上角。
  - 输入后聊天消息成功发送，说明焦点没有在输入一个字后立刻丢失。

## 断言级结论

### AuthModal 窄屏用例

- 在 `e2e/auth-account-login.e2e.ts` 中，主动聚焦非 `autoFocus` 的透明注册昵称输入。
- 断言代理输入 `mobile-text-entry-proxy-input` 可见。
- 断言代理输入的 `backgroundColor` 不是 `transparent`，也不是 `rgba(0, 0, 0, 0)`。
- 用 `pressSequentially('RememberMe')` 连续输入，并断言代理输入仍保持 focus、值完整同步回源输入。

### 社交聊天原位用例

- 在 `e2e/_shared/social.e2e.ts` 中，移动端聊天输入聚焦后等待代理输入出现。
- 断言输入值能保留在激活输入框上，并能通过 Enter 成功发送到消息列表。
- 断言输入框右侧和底部都仍在运行时视口范围内。

## 本轮结论

- “额外输入框背景透明看不见”已被针对性门禁覆盖：Auth E2E 直接检查代理输入背景不是透明色。
- “输入一个字就失去焦点”已被单测和 E2E 双重覆盖：单测验证代理输入改值不重建节点，社交原位 E2E 验证连续输入后仍可发送。
- 当前仍有 Vitest `act(...)` 警告，但不影响本轮代理输入问题的通过结论；它属于测试包装噪音，不是功能失败。
