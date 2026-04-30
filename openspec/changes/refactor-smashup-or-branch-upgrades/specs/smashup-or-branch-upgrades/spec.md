## ADDED Requirements

### Requirement: Smash Up OR Branching Ability Builder
Smash Up SHALL provide a unified builder for abilities whose rules text asks the player to choose one effect branch from an `OR` ability.

#### Scenario: OR ability uses unified builder instead of ad-hoc prompt
- **GIVEN** a Smash Up card ability whose rules text says the player may do `A` or `B`
- **WHEN** the ability is implemented in the rules layer
- **THEN** the implementation SHALL use the unified branching ability builder
- **AND** the branch metadata SHALL remain available to follow-up handlers through continuation context

### Requirement: OR Upgrade Provider Can Offer Both Effects
Smash Up SHALL allow approved upgrade providers to upgrade a branching OR ability from single-branch selection to optional multi-branch execution.

#### Scenario: Upgrade provider changes one-of to optional both
- **GIVEN** a branching OR ability is being resolved
- **AND** an eligible upgrade provider is available for that player and ability instance
- **WHEN** the player opens the branch selection interaction
- **THEN** the system SHALL allow the player to choose either one branch or both branches according to the provider rule
- **AND** the upgrade provider SHALL not automatically force both branches unless the card text explicitly requires that behavior

### Requirement: Both-In-Any-Order Resolution Uses Branch Plan
Smash Up SHALL resolve upgraded OR abilities through a resumable branch plan so that each selected branch can complete its own targeting and then continue in player-chosen order.

#### Scenario: First branch opens sub-target prompt before second branch
- **GIVEN** a branching OR ability has been upgraded to resolve both branches in any order
- **AND** the player chooses branch order `A` then `B`
- **AND** branch `A` opens a follow-up targeting interaction
- **WHEN** branch `A` finishes resolving
- **THEN** the system SHALL resume the branch plan and continue with branch `B`
- **AND** the second branch SHALL not be lost or silently reordered
