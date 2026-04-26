# DiceThrone 反馈修复证据：69ec97789087da2a55c91c17

- 反馈内容：武士“三倍抽取”发成了“复制点数”。
- 修复结论：修正 `SAMURAI_COMMON_ATLAS_INDEX` 映射，`atlas 4` 正确发 `card-super-double`。

## 代码变更

- `src/games/dicethrone/domain/commonCards.ts`
- `e2e/src/games/dicethrone/domain/commonCards.ts`
- `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`
- `e2e/src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`

## 验证命令

- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native -t "samurai atlas 4 应发出 card-super-double，而不是 card-me-too"`

## 验证结果

- 定向用例通过：1 passed / 79 skipped。
- 线上反馈状态已回写为 `resolved`（2026-04-25）。
