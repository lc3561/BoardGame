## ADDED Requirements

### Requirement: DiceThrone SHALL model every rules-modifiable roll through a unified active dice context
DiceThrone SHALL treat main roll dice, targeting roll dice, rules-modifiable extra ability dice, bonus dice groups, and compare/duel rolls as typed active dice contexts when those rolls can still be modified, rerolled, or otherwise interfered with by game rules.

#### Scenario: Targeting roll enters the active dice context
- **GIVEN** a 2v2 attack has entered `targetingRoll`
- **WHEN** the attacker rolls the targeting die
- **THEN** the result is represented as the current active dice context instead of a display-only recap
- **AND** any rule-legal dice modification window uses that same context

#### Scenario: Ability extra roll remains interactive when the rules still allow interference
- **GIVEN** an ability or card effect triggers an extra die roll during attack resolution
- **AND** the rules do not mark that roll as locked or unmodifiable
- **WHEN** the roll result appears
- **THEN** the system MUST keep it in a modifiable active dice context
- **AND** MUST NOT immediately collapse it into display-only settlement

### Requirement: DiceThrone SHALL reserve display-only dice presentation for non-interactive or post-resolution outcomes
DiceThrone SHALL use display-only bonus-dice presentation only for outcomes that are already fully resolved, explicitly unmodifiable by rules, or purely informational summaries.

#### Scenario: Resolved recap may use display-only presentation
- **GIVEN** a temporary roll has already completed all rule interactions and no further dice modification is legal
- **WHEN** the UI replays or summarizes that result
- **THEN** the system MAY use display-only presentation
- **AND** that presentation SHALL NOT be the only carrier of unresolved game logic

#### Scenario: Rules-modifiable roll may not skip into display-only mode
- **GIVEN** a temporary roll still has a legal modify/reroll/interference window
- **WHEN** the system prepares its UI and flow state
- **THEN** it MUST NOT mark that roll as display-only
- **AND** it MUST block resolution until the dice context is resolved or skipped according to rules

### Requirement: DiceThrone SHALL apply a single policy matrix for owner, opponent, and Ultimate interference
DiceThrone SHALL resolve who may modify a roll from a single policy source that accounts for roll kind, acting player, target player, current phase, and Ultimate lock state.

#### Scenario: Ultimate lock removes illegal opponent interference while preserving legal self-resolution
- **GIVEN** an Ultimate attack has already successfully activated
- **WHEN** a subsequent roll belongs to an Ultimate-locked context
- **THEN** the system MUST reject opponent interference that the rules disallow
- **AND** MUST only allow the remaining rule-legal actor set for that context

#### Scenario: Multiplayer target ownership is explicit
- **GIVEN** a temporary roll occurs in a multiplayer or 2v2 context
- **WHEN** the UI, validation layer, and execution layer evaluate legal dice actions
- **THEN** they SHALL all read the same owner/target/interference policy from the active dice context
- **AND** MUST NOT each infer different legal actors from local heuristics

### Requirement: DiceThrone SHALL block and resume phase flow around unresolved interactive temporary rolls
DiceThrone SHALL halt phase progression while a rules-modifiable temporary roll remains unresolved, and SHALL only resume once that dice context has been confirmed, skipped, or otherwise legally settled.

#### Scenario: Interactive extra roll halts the phase
- **GIVEN** an attack effect creates a temporary roll that is still legally modifiable
- **WHEN** the roll result is produced
- **THEN** phase flow MUST halt before damage/status follow-up that depends on the final roll result
- **AND** the game MUST resume only after that dice context resolves

#### Scenario: Non-interactive recap does not halt the phase
- **GIVEN** a temporary roll is already fully resolved and shown only as a recap
- **WHEN** the UI displays its display-only summary
- **THEN** phase flow MAY continue
- **AND** that recap MUST NOT create a false interactive blocker
