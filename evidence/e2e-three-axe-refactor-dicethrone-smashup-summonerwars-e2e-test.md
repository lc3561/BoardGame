# E2E 新三板斧重构验收（dicethrone / smashup / summonerwars）

- 时间：2026-04-19
- 范围：
  - `e2e/dicethrone/**`
  - `e2e/smashup/**`
  - `e2e/summonerwars/**`

## 本轮重构内容

1. **关键失败用例修复并改为新三板斧口径**
   - `e2e/dicethrone/dicethrone-daze-extra-attack.e2e.ts`
   - `e2e/summonerwars/summonerwars-push-pull-direction.e2e.ts`
   - `e2e/smashup/smashup-image-loading.e2e.ts`

2. **批量清理旧测试导入口径**
   - 三目录内 `*.e2e.ts` 中，已清零 `import { test/expect } from '@playwright/test'`（统一改为 `../framework`）。

3. **旧三板斧残留清零检查**
   - `__BG_DISPATCH__`：0 命中
   - `__BG_STATE__`：0 命中
   - `/play/.../local`：0 命中
   - `from '../fixtures'`：0 命中

## 本轮执行命令与结果

### E2E（关键文件）

1. `npm run test:e2e:ci:file -- dicethrone/dicethrone-daze-extra-attack.e2e.ts`
   - 结果：**4 passed**

2. `npm run test:e2e:ci:file -- summonerwars/summonerwars-push-pull-direction.e2e.ts`
   - 结果：**1 passed**

3. `npm run test:e2e:ci:file -- smashup/smashup-image-loading.e2e.ts`
   - 结果：**5 passed**

### 静态校验

1. `npx eslint e2e/smashup/smashup-image-loading.e2e.ts`
   - 结果：通过（0 errors）

2. `npx eslint e2e/dicethrone e2e/smashup e2e/summonerwars --ext .ts --quiet`
   - 结果：通过（0 errors）

## 截图证据（绝对路径）

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars-push-pull-direction.e2e\pushes-attacked-target-to-resolved-destination-and-syncs-opponent-view\telekinesis-push-resolved.png`
   - 观察：棋盘上目标单位位置已变化，推拉后落位可见；用例对 host/guest 同步均已通过。

2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\add-critical-image-preloading\critical-image-gate-loading.png`
   - 观察：先出现加载门禁画面，页面仍处于 Loading 阶段。

3. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\add-critical-image-preloading\critical-image-gate-faction-selection.png`
   - 观察：加载门禁收口后进入派系选择界面，卡牌预览本体可见且未出现空白破图。

## 结论

- 三个关键重构文件已通过 E2E。
- 旧三板斧关键残留项已清零。
- 三目录内 `test/expect` 入口已统一到 `../framework`（新三板斧框架入口）。
