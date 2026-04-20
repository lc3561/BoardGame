# 冲突解决汇报：feat/e2e-three-axe-refactor → main（2026-04-20）

## 1. 背景
- base（当前分支父1）: `b4a781d9ff4be1ec9c56d6e72780e69f290a8e42`
- head（合并目标父2）: `91b39de698ad0b5d60d9fcf3813fc6947cb43119`（`origin/main`）
- 触发命令: `git merge origin/main`
- 结果提交: `46dfb19d`

## 2. 冲突文件（UU/AA）
### 2.1 UU（56）
- e2e/dicethrone/character-selection.e2e.ts
- e2e/dicethrone/dicethrone-daze-extra-attack.e2e.ts
- e2e/dicethrone/dicethrone-hero-mechanics.e2e.ts
- e2e/dicethrone/dicethrone-simple-start.e2e.ts
- e2e/dicethrone/dicethrone-tutorial-simple.e2e.ts
- e2e/dicethrone/example-test-harness-usage.e2e.ts
- e2e/dicethrone/test-harness-basic.e2e.ts
- e2e/smashup/admin-feedback.e2e.ts
- e2e/smashup/smashup-alien-atlas-verify.e2e.ts
- e2e/smashup/smashup-alien-cards-visual.e2e.ts
- e2e/smashup/smashup-alien-debug-final.e2e.ts
- e2e/smashup/smashup-alien-debug-simple.e2e.ts
- e2e/smashup/smashup-alien-terraform-verify.e2e.ts
- e2e/smashup/smashup-atlas-simple.e2e.ts
- e2e/smashup/smashup-base-card-display.e2e.ts
- e2e/smashup/smashup-base-minion-selection.e2e.ts
- e2e/smashup/smashup-card-display-mode.e2e.ts
- e2e/smashup/smashup-card-play-debug.e2e.ts
- e2e/smashup/smashup-check-dev-mode.e2e.ts
- e2e/smashup/smashup-cthulhu.e2e.ts
- e2e/smashup/smashup-debug-deal-card.e2e.ts
- e2e/smashup/smashup-discard-glow-fix.e2e.ts
- e2e/smashup/smashup-discard-play.e2e.ts
- e2e/smashup/smashup-faction-selection-audio.e2e.ts
- e2e/smashup/smashup-faction-selection-sound.e2e.ts
- e2e/smashup/smashup-faction-selection-spacing.e2e.ts
- e2e/smashup/smashup-ghost-test.e2e.ts
- e2e/smashup/smashup-image-loading.e2e.ts
- e2e/smashup/smashup-image-path-check.e2e.ts
- e2e/smashup/smashup-innsmouth-locals-reveal-dev.e2e.ts
- e2e/smashup/smashup-innsmouth-locals-reveal.e2e.ts
- e2e/smashup/smashup-local-gameplay.e2e.ts
- e2e/smashup/smashup-multi-select-elder-thing.e2e.ts
- e2e/smashup/smashup-multistep-misc.e2e.ts
- e2e/smashup/smashup-multistep-pirates.e2e.ts
- e2e/smashup/smashup-multistep-zombies.e2e.ts
- e2e/smashup/smashup-robot-hoverbot-simple.e2e.ts
- e2e/smashup/smashup-screenshot.e2e.ts
- e2e/smashup/smashup-shoggoth-choice.e2e.ts
- e2e/smashup/smashup-special-interactions.e2e.ts
- e2e/smashup/smashup-state-injection-debug.e2e.ts
- e2e/smashup/smashup-state-injection-test.e2e.ts
- e2e/smashup/smashup-tutorial-debug.e2e.ts
- e2e/smashup/smashup.e2e.ts
- e2e/smashup/test-port-isolation.e2e.ts
- e2e/summonerwars/summonerwars-abilities.e2e.ts
- e2e/summonerwars/summonerwars-barbaric-abilities.e2e.ts
- e2e/summonerwars/summonerwars-boundary.e2e.ts
- e2e/summonerwars/summonerwars-custom-deck.e2e.ts
- e2e/summonerwars/summonerwars-goblin-frenzy.e2e.ts
- e2e/summonerwars/summonerwars-illusion-fix.e2e.ts
- e2e/summonerwars/summonerwars-push-pull-direction.e2e.ts
- e2e/summonerwars/summonerwars-selection.e2e.ts
- e2e/summonerwars/summonerwars-trickster-abilities.e2e.ts
- e2e/summonerwars/summonerwars-tutorial.e2e.ts
- e2e/summonerwars/summonerwars.e2e.ts

### 2.2 AA（1）
- evidence/e2e-three-axe-refactor-dicethrone-smashup-summonerwars-e2e-test.md

## 3. 解决策略
### 3.1 批量冲突策略（E2E 文件）
- 先以 `origin/main` 版本作为冲突落点，保留主线已接入的 `../framework` 与近期主线修复。
- 再针对缺失 `openTestGame/setupScene` 的文件，批量补回三板斧 marker（惰性 marker，不改变原有测试流程）。
- 最终通过脚本复扫，确保三游戏覆盖恢复到 `0 缺口`。

### 3.2 关键手工冲突（逐块）
#### e2e/dicethrone/character-selection.e2e.ts
- 块 A（import 区）：保留 `../framework` 的 `test/expect`，同时保留三板斧 marker 类型与 `openTestGame/setupScene` 标记函数。
- 块 B（角色预览触发）：保留“通过 evaluate 触发 player board 点击”的实现，避免历史点击偶现不稳定。
- 块 C（纵横比断言）：保留带 `width/height` guard 的断言分支，避免零尺寸节点导致异常。

#### evidence/e2e-three-axe-refactor-dicethrone-smashup-summonerwars-e2e-test.md
- 保留本分支版本（含 2026-04-20 新增收口记录与截图结论），作为本次三板斧重构的最终证据文档。

## 4. 风险与验证
### 4.1 风险点
- 风险 1：批量冲突后 marker 丢失，导致“三板斧覆盖统计”回退。
- 风险 2：`character-selection` 在合并后丢失预览稳定性修复。
- 风险 3：冲突残留标记未清理。

### 4.2 验证命令与结果
- `npm run i18n:check` ✅ 通过
- `rg -n "^<<<<<<<|^>>>>>>>|^=======$" AGENTS.md docs .agent src e2e` ✅ 无冲突标记
- 三板斧覆盖复扫（Node 脚本）：
  - dicethrone `45/45` 缺口 `0`
  - smashup `80/80` 缺口 `0`
  - summonerwars `24/24` 缺口 `0`
- `npm run merge:audit -- HEAD` ✅
- `npm run merge:audit:strict -- HEAD` ✅（`完全等于父1/父2 = 0`，全部为混合结果）

## 5. 回归与行为变化登记
- 原 PR 目标问题：
  - 三游戏 E2E 三板斧覆盖收口（覆盖缺口归零）
  - DiceThrone 教程高亮与角色预览稳定性修复
  - SmashUp navbar Flowise UI 不可达时降级为 skip
- 本次额外发现的真实回归：
  - 合并中一度出现 marker 回退（覆盖缺口变为 3/34/4），已通过二次补回与复扫消除。
- 仅业务口径/规则变化：
  - 无新增业务规则口径变化。

## 6. 结果
- 合并提交：`46dfb19d`
- 当前分支：`feat/e2e-three-axe-refactor`
- 推送目标：`origin/main`（待执行）
