# SmashUp 反馈 69b028aa36c755b464b0f4be 验证证据（2026-04-24）

- 反馈标题：`出牌怎么都没特写了`
- 反馈 ID：`69b028aa36c755b464b0f4be`
- 处理口径：按 bug 复测行动卡特写链路（本地模式双方都应出现特写）。

## 验证命令

- `npm run test:e2e:ci:file -- e2e/smashup/framework-pilot-simple.e2e.ts "本地模式双方打出行动卡都应显示特写"`

## 关键截图与观察

1. P0 出牌后的特写  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\framework-pilot-simple.e2e\本地模式双方打出行动卡都应显示特写\action-spotlight-p0.png`
   - 我实际看到：屏幕中央出现 `Mystic Studies` 大卡特写，右上角带“已打出”角标，右下角有对应缩略队列。  
   - 验收判定：达标（P0 行动卡特写存在）。

2. P1 出牌后的特写  
   - 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\framework-pilot-simple.e2e\本地模式双方打出行动卡都应显示特写\action-spotlight-p1.png`
   - 我实际看到：切换到另一方后再次出现同类型行动卡特写与“已打出”角标，说明双方出牌均能触发特写。  
   - 验收判定：达标（P1 行动卡特写存在）。

## 结论

- 当前版本未复现“出牌没有特写”。
- 行动卡特写在本地模式双方链路都可正常触发，建议状态更新为 `resolved`（保留观察，不直接 `closed`）。
