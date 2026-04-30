# Smash Up Fairies / Princesses 英文环境手牌可见性 E2E 证据

## 状态

- `2026-05-01` 起，此文档**不再作为有效收口证据**。
- 原因：本文依赖 `e2e/smashup/smashup-local-gameplay.e2e.ts` 与 `/play/smashup` 单页测试入口，链路不符合项目当前 `online` 唯一支持模式要求。
- 该旧文件现已标记为 `describe.skip`，防止继续被当成真实 online 证据使用。

## 失效点

- 旧结论把“本地/测试页链路下的 Fairies + Princesses 英文手牌可见”当成了公主派系问题的收口依据。
- 用户后续明确指出：
  - 问题对象应以 `princesses`（公主）为主；
  - 不能再拿废弃本地模式或测试页模式充当真实对局验证。
- 因此，本文关于“已找到真实入口证据”“更像前端卡图资源链路问题”的表述全部失效。

## 替代证据

- 真实 online 房间链路请改看：
  - `evidence/smashup/smashup-princesses-online-opening-e2e-2026-05-01.md`
