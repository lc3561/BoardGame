# SmashUp 反馈 69a2f0c817d6c5887268128a 验证证据（2026-04-24）

- 反馈标题：`外星人牌组，麦田怪圈只有一张，未来捕捉才是两张`
- 反馈 ID：`69a2f0c817d6c5887268128a`
- 处理口径：核对“卡牌定义数量 + 实际构建牌堆数量”两层，确认是否仍有数量错误。

## 数据源核对

- 文件：`src/games/smashup/data/factions/aliens.ts`
  - `alien_crop_circles` 的 `count` = `1`
  - `alien_beam_up`（光束捕捉）的 `count` = `2`

## 运行时牌堆构建核对

- 执行命令：
  - `node node_modules/tsx/dist/cli.mjs -`（内联脚本调用 `buildDeck(['aliens','wizards'])` 统计）
- 实际输出：
  - `actionDefCount.alien_crop_circles = 1`
  - `actionDefCount.alien_beam_up = 2`
  - `deckCount.alien_crop_circles = 1`
  - `deckCount.alien_beam_up = 2`

## 结论

- 反馈提到的目标口径在当前版本已满足：`麦田怪圈=1`、`光束捕捉=2`。
- 本条建议更新为 `resolved`（当前无需新增代码改动）。
