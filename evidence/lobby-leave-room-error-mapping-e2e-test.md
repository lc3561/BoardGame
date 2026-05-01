# Lobby 离房错误映射 E2E 证据

## 范围

- 首页活跃房间浮层中，非房主点击“离开”后的错误提示映射。
- 验证目标：
  - 403/凭证失效时，必须显示 `leaveForbidden`，不能错映射成 `destroyForbidden` 或泛化成 `actionFailed`。
  - 500/服务异常时，必须显示 `leaveNetwork`，不能吞成泛化失败。

## 用例

- `npm run test:e2e:ci:file -- e2e/lobby.e2e.ts "首页活跃房间非房主离房遇到 403 时显示凭证失效提示，而不是销毁错误"`
- `npm run test:e2e:ci:file -- e2e/lobby.e2e.ts "首页活跃房间非房主离房遇到 500 时显示离房网络错误提示"`

## 截图与结论

### 403 凭证失效

- 截图：
  [lobby-home-active-match-leave-forbidden-toast.png](/D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/_shared/lobby.e2e/首页活跃房间非房主离房遇到-403-时显示凭证失效提示，而不是销毁错误/lobby-home-active-match-leave-forbidden-toast.png)
- 肉眼观察：
  - 画面中央仍能看到“离开房间 / 确定要离开房间吗？”确认弹窗，说明这张图来自真实离房链路，不是脱离交互的独立 toast 摆拍。
  - 右上角 toast 文案是“无法离开房间：凭证无效或已失效，请重新进入房间后再试。”，关键词是“离开房间”，不是“销毁房间”。
  - 页面底部活跃房间条仍保持“离开 / 重连进入”这组非房主动作，没有被错判成房主销毁路径。
- 验收结论：
  - 达标。403 已明确映射到 `error.leaveForbidden`。

### 500 服务异常

- 截图：
  [lobby-home-active-match-leave-network-toast.png](/D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/_shared/lobby.e2e/首页活跃房间非房主离房遇到-500-时显示离房网络错误提示/lobby-home-active-match-leave-network-toast.png)
- 肉眼观察：
  - 右上角 toast 文案是“离开房间失败：网络或服务异常，请稍后重试。”，已经从泛化失败收敛成离房专属网络错误。
  - 页面底部活跃房间条仍保留，说明失败后没有误清本地状态，也没有错误跳转。
  - 画面中没有出现“无法销毁房间”或其他房主销毁相关提示。
- 验收结论：
  - 达标。500 已明确映射到 `error.leaveNetwork`。

## 风险说明

- 403 截图里确认弹窗与 toast 同时可见，说明失败提示出现时 modal 关闭并非同步；这不影响本轮“错误类型映射正确”的验收结论，但如果后续要优化交互一致性，可以再单独处理弹窗关闭时机。
