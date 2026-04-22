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
