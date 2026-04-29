# merge 冲突/混合审计记录（2026-04-29）

## 背景

- 目标分支：`main`
- 合并来源：`origin/main`
- 触发命令：`git merge origin/main --no-commit --no-ff`
- 最终 merge commit：`ad763699696c7366f514933967b7c0ed18f447f0`

## 命中文件

本次 merge audit 判定双方同时改动、需要做混合审计的文件：

1. `e2e/src/games/smashup/__tests__/newOngoingAbilities.test.ts`
2. `e2e/src/games/smashup/abilities/pirates.ts`

## 实际裁决

- 这次没有出现文本冲突标记，但属于“双方都改到同一逻辑域”的高风险混合文件。
- `origin/main` 侧引入了 `pirate_first_mate` 的 `triggerBase` 作用域修复，以及对应的回归测试。
- 本地侧保留了当前工作树上已完成的其它游戏修复与证据提交，不覆盖远端这条 Pirates 修复。
- 最终结果是：
  - 保留远端的 `sourceScope: 'triggerBase'` 修复；
  - 保留远端新增的“大副只应在当前计分基地触发”的测试；
  - 同步把 `src/` 侧的这条修复镜像到 `e2e/src/`，避免 E2E 运行时镜像代码继续漂移。

## 为什么这样裁决

- `pirate_first_mate` 的作用域修复是远端新引入的有效行为修正，不能在本地 merge 时丢掉。
- `e2e/src/games/smashup/**` 是测试运行时镜像代码，如果只吃 `src/` 不吃镜像，同一条修复会在 E2E 与主实现之间产生不一致。
- 本地当前 3 个提交的核心内容集中在 DiceThrone / SummonerWars / 社交与证据补充，不与这条 Smash Up Pirates 作用域修复冲突，因此应做并集而不是单边覆盖。

## 冲突状态

- `git merge` 执行阶段：无 `UU` 文本冲突
- merge audit 结论：`2` 个文件为“混合结果”，不等于任一单边
- 处理方式：人工确认保留远端 Pirates 修复，并同步镜像文件

## 验证

- `npm run test:e2e:ci -- e2e/summonerwars/summonerwars-paladin-discard.e2e.ts`
  - 结果：`6/6 passed`
- `npm run quality:changed:pre-push`
  - 当前阻塞仅剩“merge commit 必须自带 `evidence/merge-conflict-*.md` 文档”这一门禁要求

## 备注

- 本文档的目的就是满足 merge guard 对 merge commit 冲突汇报的强制要求。
- 若将本文档补入最后一个 merge commit，再次运行 `quality:changed:pre-push` 时，该门禁应不再因缺少 evidence 文档失败。
