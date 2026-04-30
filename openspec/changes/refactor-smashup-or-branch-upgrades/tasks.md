## 1. Spec / Contract

- [ ] 1.1 为 Smash Up OR 分支能力新增统一 capability 规格
- [ ] 1.2 为 InteractionSystem 补充 ordered multi-selection 契约
- [ ] 1.3 为 Game AI 补充 ordered multi-selection 枚举契约

## 2. Engine / Shared Contract

- [ ] 2.1 扩展 `simple-choice` 数据结构，支持 ordered multi-selection 语义
- [ ] 2.2 确保交互响应链路按玩家选择顺序保留 `optionIds`
- [ ] 2.3 补充相关单元测试

## 3. Smash Up Refactor

- [ ] 3.1 新增 branching OR builder / resume helper
- [ ] 3.2 将 `Spirit of the Forest` 升级逻辑改为 upgrade provider 介入
- [ ] 3.3 迁移首批 Fairies OR 能力到新抽象

## 4. UI / AI

- [ ] 4.1 让 Smash Up UI 的 generic multi-select 支持顺序化显示与提交
- [ ] 4.2 让 Smash Up AI 对 ordered multi-select 枚举排列而不是仅枚举组合
- [ ] 4.3 补充相关测试

## 5. Verification

- [ ] 5.1 运行 `openspec validate refactor-smashup-or-branch-upgrades --strict --no-interactive`
- [ ] 5.2 运行受影响的 Smash Up 测试
