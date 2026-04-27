# SmashUp 反馈 69e61a97 世界冠军卡面索引错位修复（2026-04-25）

## 反馈

- 反馈 ID：`69e61a97ec9760fc42d2f46e`
- 标题：`大杀四方的 世界冠军种族和美人鱼种族 卡牌效果是没对应卡牌的 全是错误效果`

## 本次结论

- `美人鱼` 图集索引未发现错位。
- `骷髅` 图集索引未发现错位。
- `世界冠军` 的 `previewRef.index` 整组录错，导致：
  - 底层 `defId / ability` 仍按正确卡执行；
  - UI 显示的是另一张卡的整张卡面；
  - 因此会出现“看起来像打出武士 陈，却触发海龟阿凯效果”这类现象。

这不是能力注册串线，根因是 `src/games/smashup/data/factions/world_champs.ts` 的图集索引录入错误。

## 直接证据

### 1. 图集实物核对

- 本地图集文件：
  - `D:\gongzuo\webgame\BoardGame\public\assets\i18n\zh-CN\smashup\cards\compressed\wangling.webp`
- 图集配置：
  - `src/games/smashup/domain/atlasCatalog.ts`
  - `cards7 = 5 行 x 9 列`

按图集实际排位，从左到右、从上到下，`世界冠军` 区段应为：

| 实际索引 | 实际卡面 |
|---|---|
| 24 | 彩虹女孩 |
| 25 | 木乃伊 |
| 26 | 金币猫 |
| 27 | 武士 陈 |
| 28 | 女主角 |
| 29 | 海龟阿凯 |
| 30 | 盾牌少女 |
| 31 | 斯坦福 |
| 32 | 阿拉密斯 |
| 33 | 警长 |
| 34 | 战斗精神奖 |
| 35 | 聪明Set-Up |
| 36 | 鲨鱼纹身 |
| 37 | 现在是闪电时间！ |
| 38 | 怪兽冲突 |
| 39 | 嗯？ |
| 40 | 快如闪电 |
| 41 | 着魔 |
| 42 | 鼠、鸟与香肠 |
| 43 | 高速追逐 |

### 2. 用户症状与错位的精确对应

- `武士 陈` 卡面实际在 `index 27`。
- 修复前代码把 `index 27` 绑定给了 `world_champs_akye_the_turtle`。
- 所以用户看到“武士 陈”卡面时，底层实际可能是 `海龟阿凯`，打出后就会弹出 `海龟阿凯` 的交给对手手牌并抽两张交互。

- `斯坦福` 卡面实际在 `index 31`。
- 修复前代码把 `index 31` 绑定给了 `world_champs_mummy`。
- 所以用户看到“斯坦福”卡面时，底层实际可能是 `木乃伊`，自然不会触发 `斯坦福` 的打出检索行动卡效果。

这两条和用户描述完全对上。

## 修复

- 文件：
  - `src/games/smashup/data/factions/world_champs.ts`
- 内容：
  - 将 `世界冠军` 全部 20 张卡的 `previewRef.index` 调整为与 `wangling.webp` 实际顺序一致。

## 验证

1. 图集索引回归
   - 文件：`src/games/smashup/__tests__/smashup.smoke.test.ts`
   - 新增断言锁定：
     - `彩虹女孩 -> 24`
     - `武士 陈 -> 27`
     - `海龟阿凯 -> 29`
     - `斯坦福 -> 31`
     - `警长 -> 33`
     - `高速追逐 -> 43`
2. 既有能力回归
   - `world_champs_samurai_chan 打出时不应触发海龟阿凯式 onPlay 交互`
   - 用于证明引擎层没有把 `武士 陈` 能力实现写错，错的是卡面映射。
3. 浏览器级负路径补证
   - `npm run test:e2e:ci:file -- e2e/smashup/smashup-robot-hoverbot-new.e2e.ts "武士 陈打出后不应触发海龟阿凯的交牌抽二交互"` → `1 passed`
   - 新证据：`evidence/smashup/smashup-world-champs-samurai-chan-no-akye-e2e-2026-04-26.md`
   - 用于证明在当前 UI 基线下，真实打出《武士 陈》后不会再重现“弹出海龟阿凯交牌抽二”的历史现象。

## 审计修订

- 旧“三派系已收口”口径失效原因已补回：
  - `evidence/smashup/smashup-10th-anniversary-factions-audit-20260419.md`
- 旧 open14 批量关闭文档已补失效与本次根因：
  - `evidence/feedback-closeout/smashup-human-open14-closeout-2026-04-22.md`

## 当前收口口径

- 这条反馈现在可以按“已定位根因并修复”为准继续收口。
- 根因明确是 `世界冠军 cards7 图集索引错位`，不是 `武士 陈 / 海龟阿凯 / 斯坦福` 的能力实现写错。
- 其中《武士 陈》的浏览器级负路径也已补齐：当前真实对局里打出它不会再错误触发《海龟阿凯》效果。
