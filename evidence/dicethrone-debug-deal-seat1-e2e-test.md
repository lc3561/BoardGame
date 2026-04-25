# DiceThrone 调试发牌到 Seat1 E2E 证据

## 范围

- 文件：`e2e/dicethrone-debug-panel-test.e2e.ts`
- 用例：`seat1 调试发牌命中剩余牌库时可成功发牌，发过后会提示该 atlas 已不在剩余牌库`
- 目标：验证 `dicethrone` 调试面板给 `seat1` 发牌时，是否真的因为“AI 身份”发不出去，还是因为目标 atlas 已不在剩余牌库。

## 场景

- 游戏：`dicethrone`
- `player0 = barbarian`
- `player1 = paladin`
- 阶段：`main1`
- 调试面板目标 seat：`1`
- 这次实际命中的 paladin 目标卡：
  - `card-gods-grace`
  - `atlasIndex = 11`

补充状态证据：

- paladin 起手手牌 atlas：`1, 2, 3, 4`
- paladin 剩余牌库前几张 atlas：`11, 0, 5, 7, 8, 10, 9, 13, 12, 14, 6, 15`
- 因此这次 seat1 发牌测试命中的 `atlas 11` 在初始剩余牌库里，确实可发。

## 运行结果

- `npm run typecheck`：通过
- `npm run test:e2e:ci:file -- e2e/dicethrone-debug-panel-test.e2e.ts "seat1 调试发牌命中剩余牌库时可成功发牌，发过后会提示该 atlas 已不在剩余牌库"`：通过
- 真实本地 AI 探针：通过
  - 入口：`http://127.0.0.1:4273/play/dicethrone/local?players=2&seat1=local-ai`
  - 链路：真实 AI seat -> 真实选角 -> 真实棋盘 -> 打开调试面板 -> 给 `seat1` 发牌

## 真实本地 AI 探针

- 角色：
  - `P1 = barbarian`
  - `seat1 / AI = barbarian`
- AI seat 初始状态：
  - 手牌 `4` 张
  - 牌库 `29` 张
- 本次真实 AI 探针命中的剩余牌库目标卡：
  - `card-bye-bye`
  - `atlasIndex = 26`
- 发牌后真实状态变化：
  - `deckLength: 29 -> 28`
  - `handLength: 4 -> 5`
  - 目标卡从 `deck` 消失，出现在 `hand`
- 同一局里，再输入 AI 起手手牌中的 `atlasIndex = 17`
  - 调试面板提示：`当前不在牌库：手牌 1 张，弃牌堆 0 张`

这说明在真实 AI seat 链路里：

- 给 AI 发“剩余牌库中的牌”是能成功的
- 你看到的“无该索引/不在牌库”场景，和 AI 身份本身无关，更像是 atlas 当前已经在 AI 手牌或其它区

## 截图

- 发牌前：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-debug-panel-test.e2e\seat1-调试发牌命中剩余牌库时可成功发牌，发过后会提示该-atlas-已不在剩余牌库\seat1-调试发牌命中剩余牌库时可成功发牌，发过后会提示该-atlas-已不在剩余牌库-seat1-before-deal.png`
- 发牌后再次选择同 atlas：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\_shared\dicethrone-debug-panel-test.e2e\seat1-调试发牌命中剩余牌库时可成功发牌，发过后会提示该-atlas-已不在剩余牌库\seat1-调试发牌命中剩余牌库时可成功发牌，发过后会提示该-atlas-已不在剩余牌库-seat1-after-deal-atlas-missing.png`
- 真实本地 AI 探针，给 seat1 成功发牌后：
  - `D:\gongzuo\webgame\BoardGame\temp\local-ai-debug-deal-seat1.png`
- 真实本地 AI 探针，输入 AI 起手手牌 atlas 后：
  - `D:\gongzuo\webgame\BoardGame\temp\local-ai-debug-hand-atlas.png`

## 结论

### 1. Seat1 发牌链路本身是通的

- 用例里先选 `seat1`
- 输入 `atlasIndex = 11`
- 点击 `发指定牌 (Atlas)` 后：
  - `seat1.deck.length` 从原值减 1
  - `seat1.hand.length` 从原值加 1
  - `card-gods-grace` 从 `deck` 移入 `hand`

这说明调试发牌并没有因为 `seat1` 是 AI 或非当前玩家而失效。

### 2. 用户看到的“无该索引 / 当前牌库没有该分区的牌”本质上是在说“剩余牌库里没有”

- 同一张牌发到手牌后，再次输入同一个 `atlasIndex = 11`
- 按钮会禁用
- 现在的 UI 会直接提示：
  - `当前不在牌库：手牌 1 张，弃牌堆 0 张`

也就是：

- 调试面板的 atlas 发牌只查 **当前剩余牌库**
- 不会从手牌、弃牌堆、整套角色卡池里再找一遍
- 所以“发不出来”不等于 AI 不支持发牌，更不等于 seat1 坏了

### 3. “当前牌库没有这一分区的牌”也只是剩余牌库视角

这次已把文案补成：

- `当前剩余牌库没有这一分区的牌（不含手牌 / 弃牌堆）`

这样至少不会再把“该分区当前已被抽空/转移”误读成“这个 seat 根本不能发牌”。

## 本轮改动

- `src/games/dicethrone/debug-config.tsx`
  - atlas 未命中剩余牌库时，额外提示该 atlas 当前在手牌/弃牌堆里的数量
  - 分区为空时明确写成“当前剩余牌库”视角
- `e2e/dicethrone-debug-panel-test.e2e.ts`
  - 新增 seat1 调试发牌 E2E，覆盖“可发 -> 发出 -> 同 atlas 不再位于剩余牌库”的真实链路

## 未做的事

- 没有改“发牌只能从剩余牌库取”的业务语义
- 没有把手牌/弃牌堆里的卡重新强行发回手牌
- 没有改 AI/local-ai/remote-ai 的控制器逻辑；这次问题与控制器类型无关
