# Change: Smash Up Princesses 派系正式接入

## Why

- 用户已明确要求继续处理同一张 `Pretty Pretty Smash Up` 混排图集中的 `Princesses / 公主`，并延续上一轮 Fairies 的交付口径做到“正式可玩”。
- 当前仓库主工作区尚未正式接入 `princesses`：缺少 faction id、静态 card/base 数据、locale、UI metadata、资源接线与玩法实现。
- 虽然旧 worktree 中存在 Princesses 的局部草稿，但其覆盖不完整，且不能直接视为本轮真相源；必须先锁图片合同、索引与范围，再决定复用哪些旧实现。

## What Changes

- 锁定 Princesses 的图片真相源、英文名称/效果文本真相源、混排 atlas 几何与 row-major 索引合同，并补齐 intake handoff。
- 正式接入 Princesses 的 faction metadata、card/base 静态数据、locale、UI metadata、关键图片预加载链路与运行时资源。
- 在尽量复用旧草稿的前提下，补齐 Princesses 缺失的能力实现、共享机制扩展与相关测试。
- 为本轮新增资源与玩法交付补齐 Vitest、E2E、evidence，并在资源进入运行时链路时完成压缩、上传与远端回查。
- 明确本轮只处理 `Princesses / 公主` 主派系闭环，不顺带把同图集的 `Kitty Cats / Mythic Horses` 一并实现。

## Impact

- Affected specs:
  - 新增 `smashup-princesses-faction`
- Affected code / docs:
  - `src/games/smashup/domain/{ids,atlasCatalog}.ts`
  - `src/games/smashup/data/{cards.ts,factions/**}`
  - `src/games/smashup/abilities/**`
  - `src/games/smashup/ui/factionMeta.ts`
  - `src/games/smashup/criticalImageResolver.ts`
  - `public/locales/{zh-CN,en}/game-smashup.json`
  - `public/assets/i18n/{zh-CN,en}/smashup/**`
  - `e2e/smashup/**`
  - `evidence/smashup/**`
- Key risks:
  - 用户提供的 card atlas 是 `Kitty Cats / Mythic Horses / Princesses / Fairies` 四派系混排图，Princesses 只能精确截取其 `24-38` 索引区间，不能误伤其他派系。
  - 旧 worktree 中的 Princesses 实现只覆盖少数能力，剩余未实现项必须逐张裁定，不能把“有草稿”当成“已完成”。
  - 根目录 `task_plan.md / findings.md / progress.md` 当前已被其他任务占用，本轮不得抢写。
