# SmashUp 人类 open 反馈 14 条收口证据（2026-04-22）

- 口径：**线上真实反馈（生产 Mongo）**
- 拉取时间：2026-04-22 00:37:42 +08:00（`temp/feedback-closeout/remote-human-unresolved-20260421-163730.json`）
- 本批目标：14 条 `reporterType=user && source=feedback-modal && status=open`

## 本轮验证命令（已执行）

1. 规则/能力回归（覆盖工厂、疯人院、疯狂山脉、神秘花园、天守阁、武士先祖、隐蔽迷雾、世界冠军/美人鱼）：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseAbilityIntegration.test.ts src/games/smashup/__tests__/expansionBaseAbilities.test.ts src/games/smashup/__tests__/newBaseAbilities.test.ts src/games/smashup/__tests__/newFactionAbilities.test.ts src/games/smashup/__tests__/baseFactionOngoing.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 -t "base_the_factory|base_the_asylum|base_mountains_of_madness|base_secret_garden|base_shoguns_palace|samurai_honor_the_ancestors|trickster_enshrouding_mist|world_champs_|mermaids_"
```

结果：5 文件通过，30 passed。

2. 神秘花园额外随从限制回归：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/baseRestrictions.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1 -t "base_secret_garden"
```

结果：1 文件通过，7 passed。

3. SmashUp 冒烟全量：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1
```

结果：119 passed。

4. E2E：结束回合链路：

```bash
npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "简单阶段转换 - 点击结束回合"
```

结果：1 passed。

5. E2E：AI 阵营选择不被 watchdog 跳过：

```bash
npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "回归：在线 AI 在 factionSelect 阶段 seat state 延迟就绪时，不得被 watchdog 跳过到空牌对局"
```

结果：1 passed。

## E2E 关键截图（绝对路径）

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\简单阶段转换-点击结束回合\01-initial-state.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\简单阶段转换-点击结束回合\02-after-finish-turn.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-host-picked-first.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局\回归：在线-AI-在-factionSelect-阶段-seat-state-延迟就绪时，不得被-watchdog-跳过到空牌对局-online-ai-faction-select-final-playcards.png`

## 14 条 open 反馈收口映射

- 工厂计分链路：`69e22782fa0a796a40c9e049`、`69e0dd3d2d58d60778110c79`、`69df6af7e7810aa62a067d95`
- 武士/天守阁/先祖链路：`69e2e751b4fb09cc957800ee`、`69e2e77cb4fb09cc957800f0`、`69e0daa82d58d60778110b1c`
- 神秘花园/隐蔽迷雾“额外随从后卡死”链路：`69e39b5771c7009bc289c1fc`、`69e0d8f82d58d60778110a25`
- 疯人院/疯狂山脉链路：`69e3adf271c7009bc289c31e`、`69e0ed612d58d607781112b5`
- 阵营选择/结束回合卡死链路：`69e25c30fa0a796a40c9e401`、`69e0cc142d58d6077811036c`、`69e0e9f02d58d607781112b1`
- 世界冠军/美人鱼卡牌效果链路：`69e61a97ec9760fc42d2f46e`

结论：以上 14 条与现有实现和本轮验证结果一致，按“已修复并验证”执行闭环回写为 `closed`。

## 失效修订（2026-04-25）

- `69e61a97ec9760fc42d2f46e` 的旧关闭结论失效。
- 失效原因：
  - 该条原始反馈是“世界冠军/美人鱼卡牌效果全错”的总括性投诉，但本页只引用了 `world_champs_|mermaids_` 的批量单测过滤结果，没有逐卡、逐症状、逐交互链的对应证据。
  - 本页列出的两张 E2E 截图与该条反馈无直接对应关系，只覆盖“结束回合”和“AI 选阵营”。
  - 因此该条最多只能证明“相关测试集合当时通过”，不能证明“用户所指的具体错卡/串效果问题已排除”。
- 2026-04-25 追加核对：
  - 引擎层确认 `world_champs_samurai_chan` 仅注册离场抓牌触发，没有 `onPlay`；`world_champs_akye_the_turtle` 才有打出交互。
  - 已补充回归测试：`world_champs_samurai_chan 打出时不应触发海龟阿凯式 onPlay 交互`，用于证明引擎触发链没有把武士酱直接当成海龟阿凯。
- 当前口径：
  - 该反馈如再出现“打出武士酱却出现海龟阿凯效果”之类现象，应优先按“卡面/预览映射与底层 defId 不一致”方向继续排查，不能继续引用本页作为已收口证明。

## 修复补记（2026-04-25 11:55）

- 已定位到具体根因：`src/games/smashup/data/factions/world_champs.ts` 的 `previewRef.index` 整组录错。
- 图集实核文件：
  - `D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\compressed\wangling.webp`
- 关键对位：
  - `武士酱` 卡面实际在 `cards7 index 27`，修复前却绑定给了 `world_champs_akye_the_turtle`
  - `斯通福德` 卡面实际在 `cards7 index 31`，修复前却绑定给了 `world_champs_mummy`
- 这正好解释了两类用户症状：
  - 看起来像打出 `武士酱`，实际底层是 `海龟阿凯`，所以会弹 `海龟阿凯` 的打出交互
  - 看起来像打出 `斯通福德`，实际底层是 `木乃伊`，所以不会触发 `斯通福德` 的打出检索
- 本次修复后新增证据：
  - `evidence/smashup/smashup-feedback-69e61a97-world-champs-card-index-fix-2026-04-25.md`
- 本次验证：
  1. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/smashup.smoke.test.ts --configLoader native --maxWorkers 1`
     - 结果：`122 passed`
  2. `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/newFactionAbilities.test.ts --configLoader native --maxWorkers 1 --testNamePattern "world_champs_akye_the_turtle 可交给对手一张手牌并抽两张|world_champs_samurai_chan 打出时不应触发海龟阿凯式 onPlay 交互|world_champs_stoneford 从牌库检索行动卡后加入手牌并洗牌"`
     - 结果：`3 passed`
  3. `npm run i18n:check`
     - 结果：通过
- 更新后口径：
  - 这条反馈的真实根因已从“泛化的世界冠军/美人鱼效果全错”收敛为“`世界冠军` 卡面图集索引错位”。
  - 旧 `closed` 结论无效，但在本次修复与验证后，这条反馈现在具备重新收口依据。
