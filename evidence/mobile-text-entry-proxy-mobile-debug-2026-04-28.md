# 移动端注册输入代理复核 2026-04-28

## 范围

- `src/components/system/MobileTextEntryProxyLayer.tsx`
- `src/components/system/__tests__/MobileTextEntryProxyLayer.test.tsx`
- Android debug 包 `top.easyboardgame.app.debug`

## 本轮改动结论

- 代理冻结源输入时，不再把源输入或密码宿主直接设为透明。
- 当前仍保留两条原有链路：
  - 单行 Enter/IME “开始/确认”收口逻辑
  - 无手势时禁止自动重绑到下一个输入框的 suppress-retarget 逻辑

## 验证命令

- `npm test -- src/components/system/__tests__/MobileTextEntryProxyLayer.test.tsx`
- `npm run typecheck`
- `npm run mobile:android:build:debug`
- `adb -s 10ADAU063C0010U install -r -d .\android\app\build\outputs\apk\debug\easyboardgame-debug.apk`

## 真机证据

### 1. 昵称位点：源输入与代理输入同步可见

- 截图路径：`D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\nickname-typed.png`
- UI 树路径：`D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\nickname-typed.xml`
- 肉眼观察：
  - 注册弹窗中的昵称行显示 `abNci1c2k388nick88nick88`。
  - 底部代理输入框也显示同一串 `abNci1c2k388nick88nick88`。
  - 这张图能直接证明“源输入可见内容”和“独立代理输入内容”一致，不再是只在底部代理里显示。

### 2. 密码位点：运行时值链已同步，焦点态截图受系统限制

- 焦点截图路径：`D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\password-focused.png`
- 输入后截图路径：`D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\password-typed.png`
- UI 树路径：
  - `D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\password-focused.xml`
  - `D:\gongzuo\webgame\BoardGame\temp\mobile-debug\auto8\password-typed.xml`
- 运行时观察：
  - `password-focused.png` / `password-typed.png` 在密码焦点态下只截到状态栏和黑屏内容，不能单独作为视觉验收图。
  - 但同一时刻 `password-typed.xml` 中存在两处 `abc123`：
    - 源密码输入 `android.widget.EditText [168,1170][894,1287]`
    - 底部代理输入 `android.widget.EditText [36,1350][1044,1467] focused=true`
  - 这说明密码位点在运行时值链上已经是“源输入 + 代理输入”同值，不再只有代理层单边变化。

## 当前结论

- `bug2` 本轮针对性修复点是“冻结时不再主动隐藏源输入”；昵称位点已有真实截图证明同步可见。
- 密码位点受 Android 焦点态截屏限制，当前证据以同一时刻 UI dump 为主；值链已同步，但若后续还需纯视觉证据，需要换真机录像或现场手测确认。
