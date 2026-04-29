## ADDED Requirements
### Requirement: 教程目录与子教程寻址
系统 SHALL 支持每个游戏声明“默认教程 + 子教程”的教程目录，并允许通过 `tutorialId` 深链选择具体教程。

#### Scenario: 默认教程入口保持可用
- **GIVEN** 某游戏声明了教程目录且存在默认教程
- **WHEN** 用户访问 `/play/:gameId/tutorial`
- **THEN** 系统 MUST 加载该游戏的默认教程 manifest
- **AND** 现有单教程游戏 MUST 无需改造即可继续工作

#### Scenario: 子教程深链进入
- **GIVEN** 某游戏教程目录中声明了 `tutorialId='cowboys-duel'`
- **WHEN** 用户访问 `/play/:gameId/tutorial/cowboys-duel`
- **THEN** 系统 MUST 加载对应子教程 manifest
- **AND** MUST 以该子教程的首步启动教程流程

#### Scenario: 未知子教程显式失败
- **GIVEN** 用户访问了该游戏未声明的 `tutorialId`
- **WHEN** 系统解析教程目录
- **THEN** 系统 MUST 给出明确的无效教程反馈
- **AND** MUST NOT 静默回退到其他教程
