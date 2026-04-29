## ADDED Requirements
### Requirement: SmashUp scoreBases session SHALL be the single settlement authority
SmashUp SHALL use a dedicated scoring session to drive the full `scoreBases` settlement chain, including locked eligible bases, current base, remaining bases, completion state, deferred post-scoring events, and re-entry after interactions or response windows.

#### Scenario: 多基地计分在同一 session 中推进
- **GIVEN** `scoreBases` 阶段有多个已锁定的达标基地
- **WHEN** 玩家选择一个基地开始计分并在其 `afterScoring` 链中产生交互
- **THEN** 当前结算进度 MUST 保存在同一 scoring session 中
- **AND** 交互解决后 MUST 从该 session 继续当前基地或后续基地的结算
- **AND** MUST NOT 通过重新拼接 `flowHalted`、`scoredBaseIndices`、`multi_base_scoring` 队列来猜测下一步

#### Scenario: 单基地计分不再依赖全局回跳补链
- **GIVEN** `scoreBases` 阶段仅有一个基地达标
- **WHEN** 该基地的 `beforeScoring`、`afterScoring`、响应窗口与延迟清场链路发生暂停与恢复
- **THEN** 恢复逻辑 MUST 由同一 scoring session 驱动
- **AND** MUST NOT 依赖多个系统各自决定是否再次进入 `onPhaseExit('scoreBases')`

### Requirement: Deferred post-scoring cleanup SHALL be emitted exactly once by the scoring session
SmashUp SHALL let the scoring session own deferred `BASE_CLEARED` / `BASE_REPLACED` style post-scoring events and emit them exactly once after the current base has completed all `afterScoring` interactions, response windows, and required re-scoring.

#### Scenario: 链式 afterScoring 交互结束后只补发一次延迟事件
- **GIVEN** 某个基地计分后产生多个链式 `afterScoring` 交互
- **WHEN** 最后一个交互解决完成
- **THEN** scoring session MUST 补发一次且仅一次该基地对应的 deferred post-scoring events
- **AND** MUST NOT 由具体交互 handler 自行判断“最后一个交互”后补发
- **AND** MUST NOT 由通用 `InteractionSystem` 自动传递或补发游戏专属 deferred payload

#### Scenario: afterScoring 响应窗口关闭后再执行 deferred cleanup
- **GIVEN** 某个基地在 `BASE_SCORED` 后打开了 afterScoring 响应窗口
- **WHEN** 响应窗口关闭且当前基地无需再重算
- **THEN** scoring session MUST 在窗口关闭之后再补发 deferred post-scoring cleanup
- **AND** MUST 保证清场/换基地不会早于该窗口结束

### Requirement: AfterScoring response and rescoring SHALL stay in the same current-base session
SmashUp SHALL keep the post-score response window, power snapshot comparison, rescoring, and final cleanup inside the same current-base scoring session.

#### Scenario: afterScoring 改变力量后在同一 session 中重算
- **GIVEN** afterScoring 响应窗口中的行动改变了当前计分基地的玩家力量
- **WHEN** 响应窗口关闭
- **THEN** scoring session MUST 重新计算同一基地的计分结果后再决定是否进入 deferred cleanup
- **AND** MUST NOT 将这次重算当作一个全新的 scoreBases 流程重新启动

#### Scenario: afterScoring 未改变力量时直接进入 cleanup
- **GIVEN** afterScoring 响应窗口关闭后，当前基地力量对比没有变化
- **WHEN** scoring session 继续推进
- **THEN** session MUST 直接进入当前基地的 deferred cleanup
- **AND** MUST NOT 再额外发出重复的 `BASE_SCORED`

### Requirement: SmashUp scoring session SHALL use stable base references across replacement
SmashUp SHALL track the current and remaining scoring targets with stable scoring references so that base replacement during settlement does not corrupt continuation logic.

#### Scenario: 当前基地替换后仍能继续正确处理 replacement 后动作
- **GIVEN** 当前计分基地在 cleanup 中被 `BASE_REPLACED`
- **WHEN** 后续动作需要引用“当前计分槽位”或“替换后的新基地”
- **THEN** scoring session MUST 通过稳定引用区分原计分目标与替换结果
- **AND** MUST NOT 仅依赖裸 `baseIndex` 猜测当前目标语义

#### Scenario: 多基地剩余列表不会因为中途换基地而误新增目标
- **GIVEN** 多基地计分流程中，某个已计分基地已经完成 cleanup 并被新基地替换
- **WHEN** session 继续检查剩余待计分基地
- **THEN** 已完成的计分槽位 MUST NOT 被重新当作新的待计分目标
- **AND** 只允许继续推进原 session 锁定的剩余目标

### Requirement: AfterScoring interaction handlers SHALL remain local to their own business step
SmashUp `afterScoring` interaction handlers SHALL only emit the domain outcome for their own business step and SHALL NOT drive global scoring continuation decisions.

#### Scenario: 大副 handler 不再负责全局计分续链
- **GIVEN** `pirate_first_mate_choose_base` 交互被解决
- **WHEN** 玩家选择移动或跳过
- **THEN** handler MUST 只返回“大副移动/跳过”对应的本步领域结果
- **AND** MUST NOT 自行补发 deferred cleanup
- **AND** MUST NOT 自行判断剩余基地是否继续计分

#### Scenario: 基地能力 handler 不再自行判定是否最后一个交互
- **GIVEN** 任一基地 afterScoring handler 解决后仍有其它 afterScoring 交互或响应窗口待处理
- **WHEN** handler 返回结果
- **THEN** 全局续链决定 MUST 由 scoring session 统一处理
- **AND** handler 只关心当前能力自己的业务结果
