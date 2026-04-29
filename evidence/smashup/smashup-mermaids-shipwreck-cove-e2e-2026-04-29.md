# Smash Up 美人鱼《沉船湾》真实入口 E2E 证据（2026-04-29）

## 审计范围

- 游戏：`Smash Up / 大杀四方`
- 派系：`Mermaids / 美人鱼`
- 对象：`mermaids_shipwreck_cove / 沉船湾`
- 卡图基线：`evidence/smashup/smashup-10th-anniversary-reintake-2026-04-25.md` 中《沉船湾》重录条目
- 本轮目标：
  1. 证明《沉船湾》在真实计分链路里会进入 `afterScoring` 反应窗；
  2. 证明它不是只弹出提示，而是真的能从原基地移到另一个基地；
  3. 回写本轮场景错误根因，避免再次把“没进计分”误判成实现缺陷。

## 本轮修正

- 文件：`e2e/smashup/smashup-robot-hoverbot-new.e2e.ts`
- 修正点：
  1. 旧场景把 `robot_microbot_alpha` 伪造成 `4` 力实例，且总力量仍不足 `base_the_jungle` 的 `12` 点计分阈值。
  2. 本轮改为真实卡面强度组合：`dino_king_rex (7)` + `dino_war_raptor (4)`，再由《沉船湾》持续效果把基地总力量推到 `14`。
- 结论：这次暴露的是 **E2E 场景注入错误**，不是《沉船湾》实现错误。

## 运行命令

```powershell
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
$env:NODE_OPTIONS='--max-old-space-size=4096'
node scripts/infra/run-e2e-single.mjs ci e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "沉船湾应在基地计分后可移到另一个基地"
```

## 结果

- 浏览器级真实入口 E2E：`1 passed`

## 关键截图与肉眼结论

### 1. 计分后提示已真实进入《沉船湾》迁移选择

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-shipwreck-cove-after-scoring-prompt-2026-04-29.png`
- 我实际看到：
  1. 左侧《绿洲丛林》已经灰掉，分数角标显示 `14 / 12`，说明基地确实进入了计分链路，不是伪 prompt。
  2. 顶部提示条明确写着《沉船湾》可移到别的基地。
  3. 中间与右侧两个基地出现绿色高亮，代表真实可选迁移目标。
  4. 左上还能看到《沉船湾》牌本体挂在已计分的原基地附近。
- 是否达到验收标准：
  - **达到。** 这张图证明《沉船湾》不是靠状态注入硬切 `interactionSourceId`，而是从真实计分链路进入迁移选择。

### 2. 结算后《沉船湾》已不在原基地，并真实出现在新基地

- 路径：`D:\gongzuo\webgame\BoardGame\e2e\evidence\screenshots\smashup-mermaids-shipwreck-cove-moved-2026-04-29.png`
- 我实际看到：
  1. 左侧基地已经翻成新的《Mermaid Pool / 人鱼池塘》，说明原计分基地已完成替换。
  2. 画面上方中间位置能直接看到《沉船湾》小卡本体，位置已不在左侧原基地。
  3. 左侧原基地下方只剩两张恐龙随从，不再保留《沉船湾》。
- 是否达到验收标准：
  - **达到。** 这张图配合最终状态断言证明《沉船湾》确实完成了“计分后移到另一个基地”，不是只出过提示。

## 状态断言补充

- `resolvedCore.bases[0].ongoingActions` 中已不存在 `shipwreck-cove-live`
- `resolvedCore.bases[1].ongoingActions` 中已存在 `shipwreck-cove-live`

## 结论

- 《沉船湾》当前已补齐一条浏览器级 L3：`计分 -> 反应窗选择 -> 持续牌迁移到另一基地`
- 本轮额外回写了 1 条测试场景错误：旧场景没有满足计分阈值，导致把“没进 afterScoring”误看成实现问题。
- `Mermaids` 整派系与三新派系整包仍然 **未收口**，这里只是补齐《沉船湾》的对象级真实入口证据。
