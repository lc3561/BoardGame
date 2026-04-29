# 冲突解决汇报：worktree-smashup-input-mode-preferences

## 1. 背景
- base: `main`
- head: `worktree-smashup-input-mode-preferences`
- 触发命令: `git cherry-pick 75bccfa088bca3cfec83c937d9b2baa7465ea01c`

## 2. 冲突文件
- `apps/api/src/modules/user-settings/schemas/user-ui-settings.schema.ts`
- `apps/api/src/modules/user-settings/user-settings.service.ts`
- `src/games/smashup/Board.tsx`
- `src/pages/LocalMatchRoom.tsx`
- `src/pages/MatchRoom.tsx`

## 3. 解决策略
### `apps/api/src/modules/user-settings/schemas/user-ui-settings.schema.ts`
- 策略：保留双方字段。
- 原因：主线的本地 AI 偏好与该分支的大杀四方输入偏好是两个独立能力，不应互相覆盖。

### `apps/api/src/modules/user-settings/user-settings.service.ts`
- 策略：保留双方读写方法。
- 原因：同一用户设置服务需要同时支持本地 AI 偏好和大杀四方输入模式偏好。

### `src/games/smashup/Board.tsx`
- 策略：合并主线后续的泰坦/基地主动能力/`action-minion` 支持，与本分支的拖拽箭头和输入模式逻辑。
- 原因：两边都是真实增量，机械取任一侧都会引入回归。

### `src/pages/LocalMatchRoom.tsx`
- 策略：保留主线的本地局 seed / setup / session 持久化，同时包上 `SmashUpOverlayProvider`。
- 原因：主线的本地局恢复链路不能回退，拖拽偏好上下文也必须保留。

### `src/pages/MatchRoom.tsx`
- 策略：保留主线较新的联机房间实现，只补入观战遮罩和大杀四方偏好上下文。
- 原因：主线包含更晚的连接加载态与在线 AI 桥接，分支版本较旧。

## 4. 风险与验证
- 风险点：`SmashUpBoard` 交互模式合并后需要回归点击/拖拽两套路径。
- 验证命令：
  - 尚未运行；当前先完成合并收口。
- 结论：本次按“主线后续能力不回退，分支偏好功能继续吸收”的原则解决冲突。
