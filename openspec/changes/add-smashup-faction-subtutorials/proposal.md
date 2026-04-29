# Change: 大杀四方派系机制子教程与入口

## Why
当前教程系统默认每个游戏只有一套主教程，无法把“某个派系的核心机制”做成可直接深链进入的专项教程。与此同时，大杀四方的派系详情面板虽然能展示卡牌与描述，但缺少直接跳转到机制教学的入口，玩家想理解牛仔“决斗”时仍需要从完整基础教程或外部说明里绕过去找。

## What Changes
- 扩展教程加载与路由能力：每个游戏可以声明一套教程目录，包含 1 个默认教程与若干可通过 `tutorialId` 深链进入的子教程。
- 保持旧游戏兼容：现有仅导出单个 `TutorialManifest` 的游戏无需改造即可继续使用 `/play/:gameId/tutorial`。
- 为大杀四方新增“派系机制教程”接线：派系详情标题右侧只在存在机制教程时显示入口，不预留空白占位。
- 落地首个子教程：新增“牛仔：决斗”专项教程，聚焦决斗流程、决斗牌、平克顿/副警长等关键交互。

## Impact
- Affected specs: `tutorial-engine`, `smashup-tutorials`
- Affected code:
  - `src/engine/types.ts`
  - `src/core/types.ts`
  - `src/games/manifest.client.types.ts`
  - `src/games/registry.ts`
  - `src/hooks/useGameImplementationReady.ts`
  - `src/App.tsx`
  - `src/pages/MatchRoom.tsx`
  - `src/games/smashup/ui/FactionSelection.tsx`
  - `src/games/smashup/ui/factionMeta.ts`
  - `src/games/smashup/tutorial*.ts`
  - `public/locales/*/game-smashup.json`
  - 相关测试 / E2E / evidence
