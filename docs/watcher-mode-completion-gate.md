# 监察者模式：Completion Gate

## 定义

监察者模式不是前置路由器，也不是定时发送 `continue` 的恢复脚本。

它是**每轮执行完成后的后置裁决层**：执行器先产出结果包，再由本地裁决层判断当前任务应该：

- `continue`：继续内部推进，不打扰用户
- `finish`：向用户输出结果并结束当前阶段

## 目标

- 把“是否该继续执行”与“是否该打扰老板”从执行器中拆开
- 让长任务具备稳定的继续/收口语义，而不是靠时间或人工盯守
- 确保最终总结不仅有结果，还有中间 `continue` 轨迹摘要

## 输入

每轮执行完成后，Completion Gate 至少接收以下输入：

- `task_goal`
- `step_result`
- `validation`
- `blockers`
- `has_explicit_next_step`
- `candidate_next_step`
- `draft_user_message`
- `evidence_refs`

## 输出

### continue

当目标尚未达成，且存在明确下一步时：

- `decision=continue`
- `reason`
- `next_instruction`
- `should_notify_user=false`
- `archive=true`

### finish

当任务达到自然收口、出现真实阻塞、或需要老板决策时：

- `decision=finish`
- `reason`
- `user_message`
- `should_notify_user=true`
- `archive=optional`

## Continue Record

每次 `continue` 都必须写入结构化留档，至少包含：

- 时间戳
- 当前目标
- 本轮执行摘要
- 裁决原因
- 下一步内部指令
- 证据引用

这些记录不是给用户即时看的聊天噪声，而是最终总结和恢复执行的依据。

## Finish Summary

`finish` 时的用户可见总结必须同时包含：

1. 最终结果 / 当前状态
2. 关键验证与证据
3. 风险或遗留项
4. `continue` 过程摘要

禁止只输出最后一轮结果，丢失之前的推进轨迹。

## 与旧 Kiro auto-continue 的边界

下列旧方案不再视为“监察者模式”本体：

- 固定间隔发送 `continue`
- 通过窗口标题判断是否中断
- 只解决 Kiro 网络中断恢复

这些方案最多只属于历史性的恢复辅助脚本，不等于任务后置裁决系统。

## 清理原则

### 保留

- checkpoint / resume 经验
- false-active 识别经验
- long task health 语义

### 清理或归档

- `send-continue` 一键恢复入口
- `kiro-auto-timer` 定时恢复入口
- 以“定时发 continue”冒充 watcher / supervisor 的文档

## 最小落地顺序

1. 执行器产出结构化 result packet
2. Completion Gate 输出 `continue | finish`
3. `continue` 写留档并生成内部下一步指令
4. `finish` 汇总 result + continue history 并对外发送
