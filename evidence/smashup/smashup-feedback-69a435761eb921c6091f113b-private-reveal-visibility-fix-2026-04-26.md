# SmashUp 反馈 69a435761eb921c6091f113b 修复证据

## 反馈

- 反馈 ID: `69a435761eb921c6091f113b`
- 原始描述: `对手能看到展示的牌，我自己看不到`
- 范围: SmashUp 展示牌浮层（`REVEAL_HAND` / `REVEAL_DECK_TOP`）的可见性归属

## 根因

- `src/games/smashup/Board.tsx` 一直把 `rootPid = playerID || '0'` 传给 `RevealOverlay`。
- 这在联机里会把“没有 `playerID` 的页面”错误当成 `0` 号位视角。
- `RevealOverlay` 原先只判断 `viewerPlayerId !== currentPlayerId`，没有区分“当前页根本没有明确归属玩家”。
- 结果是:
  - 私有展示发给 `0` 号位时，旁观页会被误判成 `0` 号位可见。
  - 私有展示发给 `1` 号位时，若当前页没有正确拿到 `playerID`，就会出现“对手能看见、自己看不见”的归属错位。

## 最小修复

- `src/games/smashup/Board.tsx`
  - 新增 `revealViewerId = isMultiplayer ? playerID : rootPid`
  - 联机模式下不再把缺失的 `playerID` 回退成 `'0'` 传给 `RevealOverlay`
- `src/games/smashup/ui/RevealOverlay.tsx`
  - `currentPlayerId` 改为 `PlayerId | null`
  - 私有展示改为仅在 `currentPlayerId != null && viewerPlayerId === currentPlayerId` 时显示
  - 补 `data-testid="reveal-overlay"` 和 `data-testid="reveal-card"`，用于稳定回归验证

## 回归测试

### 单测

- 文件: `src/games/smashup/__tests__/revealSystem.test.ts`
- 新增覆盖:
  - 无 `playerID` 页面看不到私有展示
  - 无 `playerID` 页面仍能看到公开展示
  - 归属玩家页面能看到私有展示

执行命令:

```bash
npx vitest run src/games/smashup/__tests__/revealSystem.test.ts
```

结果:

- `8 passed`

### E2E

- 文件: `e2e/smashup/smashup-innsmouth-locals-reveal.e2e.ts`
- 新增场景:
  - 在双人联机局外，再开一个无 `playerID` 的旁观页
  - 直接注入一条 `viewerPlayerId: '1'` 的私有 `REVEAL_HAND`
  - 断言:
    - `guest/player1` 页可见
    - `host/player0` 页不可见
    - 无 `playerID` 旁观页不可见
- 顺手修正了该文件里旧断言的两个问题:
  - 旧测试依赖不存在的 `[data-card-preview]`
  - 旧测试把“本地点击关闭浮层”误当成跨页面同步关闭

执行命令:

```bash
npm run test:e2e:ci:file -- e2e/smashup/smashup-innsmouth-locals-reveal.e2e.ts
```

结果:

- `3 passed`

## 截图证据

### 1. 归属玩家页面可见

- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a435761eb921c6091f113b-guest-private-reveal-visible.png`
- 我实际看到:
  - 中央存在展示浮层，标题是“玩家1的手牌”
  - 浮层中央可直接看到被展示的卡牌本体 `First Mate`
  - 画面其余 UI 仍是正常对局页，不是伪造单页快照
- 是否达到验收标准:
  - 达到。私有展示确实只在归属玩家 `P1` 页出现

### 2. 非归属玩家页面不可见

- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a435761eb921c6091f113b-host-private-reveal-hidden.png`
- 我实际看到:
  - 主对局页正常显示基地、手牌、结束回合按钮
  - 画面中央没有半透明遮罩，也没有展示卡牌浮层
  - 没有出现“玩家1的手牌”标题
- 是否达到验收标准:
  - 达到。`P0` 页没有误看到发给 `P1` 的私有展示

### 3. 无 `playerID` 旁观页不可见

- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\smashup-feedback-69a435761eb921c6091f113b-spectator-private-reveal-hidden.png`
- 我实际看到:
  - 页面正常渲染棋盘与手牌区，但中央没有任何展示浮层
  - 右上角仍是默认旁观式视角布局，没有被强行切成展示态
  - 没有看到被展示的 `First Mate` 卡面本体
- 是否达到验收标准:
  - 达到。无 `playerID` 页面不再被误判成 `0` 号位并偷看到私有展示

## 结论

- 本次问题已定位到“展示牌 viewer 归属回退到 `0` 号位”的错误。
- 修复范围仅限 SmashUp 展示浮层 viewer 判定与对应回归测试，属于最小修复。
- 基于当前代码验证与 E2E 证据，这条反馈可以标记为 `resolved`。

## 剩余风险

- `Board.tsx` 当前还有他人的未提交改动，本次未触碰其业务逻辑，只叠加了 `revealViewerId` 这一处最小变更。
- 这次修复只覆盖 EventStream 驱动的展示浮层；如果后续再出现“交互 prompt 卡面展示归属”问题，需要单独检查 `PromptOverlay / InteractionSystem` 链路。
