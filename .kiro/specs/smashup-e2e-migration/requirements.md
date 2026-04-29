# Requirements Document

## Introduction

本文档定义 Smash Up E2E 测试框架迁移的需求。项目已完成状态注入服务端同步功能，现在需要将所有 Smash Up E2E 测试从旧框架（Fixture 方式、旧 Helper 函数、直接操作 TestHarness）迁移到新框架（"三板斧"模式：新框架 + 专用测试模式 + 状态注入）。

目标是统一测试风格，提高可维护性，通过状态注入减少测试时间，并为未来的测试编写建立标准模板。

## Glossary

- **TestHarness**: 测试工具集，提供状态注入、骰子控制、命令执行等能力，通过 `window.__BG_TEST_HARNESS__` 访问
- **三板斧模式**: 新框架的标准测试模式，包含三个核心步骤：① 使用新框架 `import { test } from './framework'` ② 导航到专用测试路由 `/play/smashup` ③ 使用 `game.setupScene()` 进行状态注入
- **GameTestContext**: 新框架提供的 `game` fixture，封装了 `setupScene()`、`screenshot()`、`waitForTestHarness()` 等方法
- **状态注入**: 通过 `game.setupScene()` 跳过派系选择，直接构造测试场景（玩家手牌、场上随从、基地状态等）
- **旧 Fixture 方式**: 使用 `import { test } from './fixtures'` 和 `smashupMatch` fixture 的旧测试模式
- **旧 Helper 函数**: `setupSmashUpOnlineMatch`、`readCoreState`、`applyCoreState` 等旧 API
- **半迁移测试**: 已使用新框架但仍包含旧代码痕迹（如 `harness.state.patch()` 直接调用）的测试
- **核心交互测试**: 验证核心游戏机制（如忍者渗透、法师传送门、多基地计分）的测试，优先级最高

## Requirements

### Requirement 1: 迁移核心交互测试

**User Story:** 作为开发者，我希望核心交互测试使用新框架，以便验证关键游戏机制的正确性并建立标准模板。

#### Acceptance Criteria

1. WHEN 迁移 `smashup-ninja-infiltrate.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建忍者渗透场景
2. WHEN 迁移 `smashup-wizard-portal.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建法师传送门场景
3. WHEN 迁移 `smashup-multi-base-scoring-complete.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建多基地计分场景
4. WHEN 迁移 `smashup-multi-base-scoring-simple.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建简化多基地计分场景
5. WHEN 迁移 `smashup-pirate-cove-scoring-bug.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建海盗湾计分场景
6. WHEN 迁移 `smashup-innsmouth-locals-reveal.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建印斯茅斯本地人展示场景
7. WHEN 迁移 `smashup-base-minion-selection.e2e.ts`，THE Migration_System SHALL 使用 `game.setupScene()` 构建基地随从选择场景
8. WHEN 迁移 `smashup-afterscoring-simple-complete.e2e.ts`，THE Migration_System SHALL 清理旧代码痕迹并使用纯三板斧模式
9. FOR ALL 核心交互测试，THE Migration_System SHALL 确保测试通过且截图清晰
10. FOR ALL 核心交互测试，THE Migration_System SHALL 确保测试无超时错误

### Requirement 2: 清理半迁移测试

**User Story:** 作为开发者，我希望半迁移测试完全使用新框架，以便消除旧代码痕迹并统一测试风格。

#### Acceptance Criteria

1. WHEN 清理 `smashup-robot-hoverbot-chain.e2e.ts`，THE Migration_System SHALL 移除所有 `harness.state.patch()` 直接调用
2. WHEN 清理 `smashup-zombie-lord.e2e.ts`，THE Migration_System SHALL 移除所有旧 API 调用
3. WHEN 清理 `smashup-complex-multi-base-scoring.e2e.ts`，THE Migration_System SHALL 统一使用 `game.setupScene()`
4. WHEN 清理 `smashup-phase-transition-simple.e2e.ts`，THE Migration_System SHALL 移除旧 helper 函数调用
5. WHEN 清理 `smashup-response-window-pass-test.e2e.ts`，THE Migration_System SHALL 使用 `game.screenshot()` 替代手动截图
6. WHEN 清理 `smashup-robot-hoverbot-new.e2e.ts`，THE Migration_System SHALL 确保使用纯三板斧模式
7. FOR ALL 半迁移测试，THE Migration_System SHALL 确保无旧代码痕迹且测试通过

### Requirement 3: 迁移旧 Fixture 测试

**User Story:** 作为开发者，我希望旧 Fixture 测试迁移到新框架，以便统一测试风格并删除旧 Fixture 代码。

#### Acceptance Criteria

1. WHEN 识别旧 Fixture 测试，THE Migration_System SHALL 搜索 `import { test } from './fixtures'` 和 `smashupMatch` fixture
2. WHEN 迁移旧 Fixture 测试，THE Migration_System SHALL 替换为 `import { test } from './framework'`
3. WHEN 迁移旧 Fixture 测试，THE Migration_System SHALL 移除 `smashupMatch` fixture 使用
4. WHEN 迁移旧 Fixture 测试，THE Migration_System SHALL 使用 `game.setupScene()` 替代旧状态构建方式
5. FOR ALL 旧 Fixture 测试，THE Migration_System SHALL 确保测试通过且无旧 API 调用
6. WHEN 所有旧 Fixture 测试迁移完成，THE Migration_System SHALL 删除 `e2e/fixtures/` 目录

### Requirement 4: 迁移直接操作 TestHarness 的测试

**User Story:** 作为开发者，我希望直接操作 TestHarness 的测试使用新框架封装，以便提高代码可读性并减少重复代码。

#### Acceptance Criteria

1. WHEN 识别直接操作 TestHarness 的测试，THE Migration_System SHALL 搜索 `window.__BG_TEST_HARNESS__` 和 `harness.state.patch()`
2. WHEN 迁移直接操作 TestHarness 的测试，THE Migration_System SHALL 使用 `game.setupScene()` 替代 `harness.state.patch()`
3. WHEN 迁移直接操作 TestHarness 的测试，THE Migration_System SHALL 使用 `game.screenshot()` 替代手动截图
4. WHEN 迁移直接操作 TestHarness 的测试，THE Migration_System SHALL 使用 `game.waitForTestHarness()` 替代手动等待
5. FOR ALL 直接操作 TestHarness 的测试，THE Migration_System SHALL 确保测试通过且代码可读性提高

### Requirement 5: 建立迁移检查清单

**User Story:** 作为开发者，我希望有迁移检查清单，以便确保每个测试迁移后的质量一致性。

#### Acceptance Criteria

1. THE Migration_System SHALL 提供代码质量检查清单（使用新框架、无旧 API、无直接操作 TestHarness）
2. THE Migration_System SHALL 提供测试质量检查清单（测试通过、截图清晰、时间 < 60 秒、无 flaky 行为）
3. THE Migration_System SHALL 提供文档检查清单（测试名称清晰、有注释、截图有描述性文件名）
4. WHEN 迁移每个测试，THE Developer SHALL 使用检查清单验证迁移质量
5. THE Migration_System SHALL 在 `evidence/smashup/smashup-e2e-migration-progress.md` 中记录每个测试的迁移状态

### Requirement 6: 删除旧代码和更新文档

**User Story:** 作为开发者，我希望迁移完成后删除旧代码并更新文档，以便保持代码库整洁并为未来测试提供参考。

#### Acceptance Criteria

1. WHEN 所有测试迁移完成，THE Migration_System SHALL 删除 `e2e/fixtures/` 目录
2. WHEN 所有测试迁移完成，THE Migration_System SHALL 删除 `e2e/helpers/smashup.ts` 中的旧函数（`setupSmashUpOnlineMatch`、`readCoreState`、`applyCoreState`）
3. WHEN 所有测试迁移完成，THE Migration_System SHALL 更新 `docs/automated-testing.md` 文档
4. WHEN 所有测试迁移完成，THE Migration_System SHALL 在 `evidence/smashup/smashup-e2e-migration-progress.md` 中记录最终统计数据
5. THE Migration_System SHALL 确保 `npm run test:e2e:ci` 全部通过

### Requirement 7: 保留页面流和资源验证测试

**User Story:** 作为开发者，我希望页面流和资源验证测试保持原样，因为它们不需要迁移到 GameTestContext。

#### Acceptance Criteria

1. THE Migration_System SHALL 保留 `smashup.e2e.ts`（基本页面流程）不迁移
2. THE Migration_System SHALL 保留 `smashup-gameplay.e2e.ts`（游戏流程）不迁移
3. THE Migration_System SHALL 保留 `smashup-faction-selection-sound.e2e.ts`（派系选择音效）不迁移
4. THE Migration_System SHALL 保留 `smashup-image-loading.e2e.ts`（图片加载）不迁移
5. THE Migration_System SHALL 在迁移计划中明确标注这些测试不需要迁移

### Requirement 8: 迁移模板和示例

**User Story:** 作为开发者，我希望有标准迁移模板和示例，以便快速迁移测试并保持一致性。

#### Acceptance Criteria

1. THE Migration_System SHALL 提供标准迁移模板（包含导入、导航、等待、状态注入、测试逻辑、截图）
2. THE Migration_System SHALL 提供已完成的纯三板斧测试作为参考示例（`smashup-4p-layout-test.e2e.ts`、`smashup-alien-terraform.e2e.ts`、`smashup-crop-circles.e2e.ts`、`smashup-ghost-haunted-house-discard.e2e.ts`、`smashup-refresh-base.e2e.ts`）
3. THE Migration_System SHALL 在迁移计划中说明如何识别测试类型（旧 Fixture、旧 Helper、直接操作 TestHarness）
4. THE Migration_System SHALL 在迁移计划中说明如何替换为新框架（逐步替换步骤）
5. THE Migration_System SHALL 在迁移计划中说明如何验证迁移（运行测试、检查截图、验证代码质量）

### Requirement 9: 进度追踪和问题记录

**User Story:** 作为开发者，我希望追踪迁移进度并记录遇到的问题，以便了解迁移状态并分享解决方案。

#### Acceptance Criteria

1. THE Migration_System SHALL 在 `evidence/smashup/smashup-e2e-migration-progress.md` 中记录总体进度（已完成/总数、百分比）
2. THE Migration_System SHALL 在进度文档中记录每个优先级的迁移状态（第一优先级、第二优先级、第三优先级、第四优先级）
3. THE Migration_System SHALL 在进度文档中记录每日进度（日期、完成的测试、遇到的问题）
4. THE Migration_System SHALL 在进度文档中记录遇到的问题和解决方案（问题描述、解决方法、结果）
5. THE Migration_System SHALL 在进度文档中记录下一步行动（立即开始、今天目标、本周目标）

### Requirement 10: 性能和质量目标

**User Story:** 作为开发者，我希望迁移后的测试性能更好且质量更高，以便提高开发效率并减少测试维护成本。

#### Acceptance Criteria

1. FOR ALL 迁移后的测试，THE Migration_System SHALL 确保无超时错误（Playwright 默认 30 秒超时）
2. FOR ALL 迁移后的测试，THE Migration_System SHALL 确保无 flaky 行为（连续运行 3 次均通过）
3. FOR ALL 迁移后的测试，THE Migration_System SHALL 确保截图清晰且有意义
4. WHEN 所有测试迁移完成，THE Migration_System SHALL 确保 `npm run test:e2e:ci` 全部通过
5. FOR ALL 迁移后的测试，THE Migration_System SHALL 通过状态注入跳过前置步骤，减少测试时间（相比旧框架的手动操作方式）
