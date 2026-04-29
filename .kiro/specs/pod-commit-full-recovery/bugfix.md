# Bugfix Requirements Document: POD Commit Full Recovery

## Introduction

Commit 6ea1f9f (2026-02-28) titled "feat: add Smash Up POD faction support" incorrectly modified **512 files**, of which only **19 files (3.7%)** were POD-related. The remaining **493 files (96.3%)** contained unrelated deletions that caused numerous regressions across DiceThrone, SummonerWars, Engine layer, Framework layer, and other modules.

**Impact Severity**: Critical - affects all games and core systems

**Evidence**: 
- `evidence/_shared/pod-commit-scope-audit.md` - Original audit report
- `evidence/_shared/phase-a-complete-audit-plan.md` - Complete file inventory (512 files)
- `evidence/dicethrone/dicethrone-endgame-ui-deletion.md` - Endgame UI deletion analysis
- `evidence/_shared/pod-commit-incremental-fix-proposal.md` - Incremental fix proposal

**Known Issues** (from 3.7% audit coverage):
1. ✅ DiceThrone `hasDivergentVariants` effect type comparison deleted - Fixed
2. ❌ DiceThrone endgame UI completely deleted - Not fixed
3. ❌ Auto-response functionality deleted - Not fixed
4. ❌ Response window perspective auto-switch commented out - Not fixed
5. ❌ Taiji token per-turn limit deleted - Not fixed
6. ❌ Variant sorting logic deleted - Not fixed

**Unaudited Modules** (96.3%):
- DiceThrone: 105 files (only Board.tsx partially audited)
- SmashUp-Existing: 99 files (non-POD code)
- Engine: 20 files (18/20 audited)
- SummonerWars: 18 files
- i18n: 16 files
- Server: 6 files (1/6 audited)
- Framework: 5 files
- Other: ~234 files

## Bug Analysis

### Current Behavior (Defect)

#### 1. Scope Violation

1.1 WHEN commit 6ea1f9f was created THEN the system modified 512 files instead of ~21 POD-related files

1.2 WHEN commit 6ea1f9f was merged THEN 493 non-POD files (96.3%) were incorrectly modified

1.3 WHEN POD faction support was added THEN DiceThrone, SummonerWars, TicTacToe, Engine, Framework, and Server code were incorrectly deleted



#### 2. DiceThrone Regressions

2.1 WHEN game ends THEN the system does not display endgame UI (DiceThroneEndgameContent, RematchActions, renderDiceThroneButton deleted)

2.2 WHEN auto-response is enabled THEN the system does not automatically respond (auto-response logic deleted)

2.3 WHEN response window opens THEN the system does not switch perspective to active player (perspective switch commented out)

2.4 WHEN Taiji token is used THEN the system does not enforce per-turn limit (per-turn limit logic deleted)

2.5 WHEN ability variants are displayed THEN the system does not sort them correctly (variant sorting logic deleted)

#### 3. Engine Layer Regressions

3.1 WHEN engine layer files are modified in POD commit THEN unrelated games (DiceThrone, SummonerWars, TicTacToe) are affected

3.2 WHEN 20 engine files are modified THEN only 18 have been audited, leaving 2 files with unknown issues

#### 4. Unaudited Module Risks

4.1 WHEN 105 DiceThrone files remain unaudited THEN hundreds of potential issues may exist (6 issues found in 1.5 files audited)

4.2 WHEN 99 SmashUp non-POD files remain unaudited THEN existing faction abilities may have been incorrectly modified

4.3 WHEN 18 SummonerWars files remain unaudited THEN game functionality may be broken

4.4 WHEN 5 Framework files remain unaudited THEN all games' UI may be affected

4.5 WHEN 6 Server files remain unaudited (only 1/6 audited) THEN backend functionality may be broken

### Expected Behavior (Correct)

#### 1. Scope Compliance

5.1 WHEN adding POD faction support THEN the system SHALL only modify POD-related files (~21 faction files + 2 UI components + 1 atlas mapping + POD i18n entries)

5.2 WHEN adding POD faction support THEN the system SHALL NOT modify DiceThrone, SummonerWars, TicTacToe, Engine, Framework, or Server files

5.3 WHEN adding POD faction support THEN the system SHALL follow single responsibility principle (one commit = one feature)

#### 2. DiceThrone Functionality Restoration

6.1 WHEN game ends THEN the system SHALL display complete endgame UI with DiceThroneEndgameContent, RematchActions, and renderDiceThroneButton

6.2 WHEN auto-response is enabled THEN the system SHALL automatically respond to opponent actions

6.3 WHEN response window opens THEN the system SHALL automatically switch perspective to active player

6.4 WHEN Taiji token is used THEN the system SHALL enforce per-turn limit (one use per turn)

6.5 WHEN ability variants are displayed THEN the system SHALL sort them by base ability first, then variants

#### 3. Systematic Audit Completion

7.1 WHEN auditing POD commit THEN the system SHALL audit all 512 files, not just 3.7%

7.2 WHEN auditing each file THEN the system SHALL use git history to determine if deletion was intentional

7.3 WHEN auditing each file THEN the system SHALL categorize as "should revert", "should keep", or "needs review"

7.4 WHEN auditing each file THEN the system SHALL prioritize by severity × impact (P0: critical UI/logic, P1: game logic, P2: tests/docs)

#### 4. Module-Specific Recovery

8.1 WHEN auditing DiceThrone (106 files) THEN the system SHALL restore all incorrectly deleted UI, game logic, hero abilities, and tests

8.2 WHEN auditing SmashUp (119 files) THEN the system SHALL distinguish POD-related (keep) from non-POD (revert) modifications

8.3 WHEN auditing SummonerWars (18 files) THEN the system SHALL revert all modifications (completely unrelated to POD)

8.4 WHEN auditing Engine (20 files) THEN the system SHALL complete audit of remaining 2 files and revert all modifications

8.5 WHEN auditing Framework (5 files) THEN the system SHALL revert all modifications (affects all games)

8.6 WHEN auditing Server (6 files) THEN the system SHALL complete audit of remaining 5 files and revert all modifications

### Unchanged Behavior (Regression Prevention)

#### 1. POD Functionality Preservation

9.1 WHEN reverting non-POD modifications THEN the system SHALL CONTINUE TO preserve all 21 POD faction data files

9.2 WHEN reverting non-POD modifications THEN the system SHALL CONTINUE TO preserve POD UI components (SmashUpCardRenderer, SmashUpOverlayContext)

9.3 WHEN reverting non-POD modifications THEN the system SHALL CONTINUE TO preserve POD atlas mapping (englishAtlasMap.json)

9.4 WHEN reverting non-POD modifications THEN the system SHALL CONTINUE TO preserve POD i18n entries

#### 2. Recent Fixes Preservation

10.1 WHEN reverting POD commit changes THEN the system SHALL CONTINUE TO preserve hasDivergentVariants fix (already restored in current session)

10.2 WHEN reverting POD commit changes THEN the system SHALL CONTINUE TO preserve any other fixes made after 6ea1f9f

#### 3. Test Coverage Preservation

11.1 WHEN reverting modifications THEN the system SHALL CONTINUE TO maintain existing test coverage

11.2 WHEN reverting modifications THEN the system SHALL CONTINUE TO pass all existing tests

#### 4. User Experience Preservation

12.1 WHEN reverting modifications THEN the system SHALL CONTINUE TO provide functional endgame UI for all games

12.2 WHEN reverting modifications THEN the system SHALL CONTINUE TO support auto-response and response window features

12.3 WHEN reverting modifications THEN the system SHALL CONTINUE TO enforce game-specific rules (Taiji token limit, variant sorting, etc.)
