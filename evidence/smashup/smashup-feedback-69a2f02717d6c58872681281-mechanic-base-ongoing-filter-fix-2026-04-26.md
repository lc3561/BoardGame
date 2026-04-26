# SmashUp 反馈 69a2f02717d6c58872681281 修复证据（机械师弃牌堆筛选）

- feedbackId: `69a2f02717d6c58872681281`
- 游戏: `smashup`
- 反馈摘要: 机械师会把“打到随从上的战术”也列进弃牌堆可选项；期望只允许“打到基地上的战术”。

## 根因

- 机械师这条链路的“候选生成”和“玩家点选后的落地校验”原本是两段分散条件。
- 线上反馈暴露的问题本质是：这条能力只应该接受“可打到基地上的 ongoing 行动卡”，不能把附着到随从上的 ongoing 混进候选或在 handler 中接受。
- 本次把该规则收敛为同一个 helper，避免候选筛选与 handler 校验再次漂移。

## 修复

1. 在 `src/games/smashup/abilities/steampunks.ts` 新增 `isMechanicReplayableDiscardAction(...)`。
2. `steampunkMechanic` 的弃牌堆候选改为统一走该 helper。
3. `steampunk_mechanic` interaction handler 的前置校验也改为统一走该 helper。
4. 在 `src/games/smashup/__tests__/expansionOngoing.test.ts` 补充 feedback 级回归：
   - `ninja_smoke_bomb` / `ninja_assassination` 这类“附着到随从上的 ongoing”不会进入机械师候选。
   - 即使伪造交互选择这类卡，handler 也必须拒绝，不产生事件。

## 定向测试

命令：

```bash
node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/expansionOngoing.test.ts --config vitest.config.ts --pool threads --no-file-parallelism --maxWorkers 1 -t "steampunk_mechanic|机械师|69a2f027|只能选择打出到基地上的行动牌"
```

结果：

- `1` 个测试文件通过
- `8 passed`, `56 skipped`
- 退出码 `0`

## 反馈原始证据

- 反馈原始截图已从反馈导出并落到本地：`D:\gongzuo\webgame\BoardGame\temp\feedback-69a2f02717d6c58872681281.jpg`
- 我实际核对到的原始卡图文案为：机械师应“选择一个在你弃牌堆中可以被打出到基地上的战术，将其作为一个额外战术打出”。
- 该文案与本次修复后的筛选口径一致：只能接受“打到基地上的战术”。

## 结论

- 当前代码与回归测试一致，已将机械师的弃牌堆筛选口径稳定收敛到“仅基地 ongoing”。
- 该反馈可标记为 `resolved`。
