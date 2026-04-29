## ADDED Requirements
### Requirement: Interaction continuation context SHALL remain opaque to the generic interaction system
The generic interaction system SHALL treat per-game continuation context as opaque data and SHALL NOT inject, merge, or interpret game-specific settlement payloads when switching between interactions.

#### Scenario: resolving one interaction and opening the next keeps continuation data untouched
- **GIVEN** one interaction is resolved and another queued interaction becomes current
- **WHEN** the generic `InteractionSystem` refreshes options or advances the queue
- **THEN** it MAY update generic interaction metadata such as current/queue position or refreshed options
- **AND** it MUST NOT write or merge game-specific continuation payload fields on behalf of a game

#### Scenario: game-specific deferred settlement payloads are owned outside the generic interaction system
- **GIVEN** a game needs to carry deferred settlement information across a chain of interactions
- **WHEN** those interactions resolve one by one
- **THEN** the game-specific settlement driver MUST own that deferred payload lifecycle
- **AND** the generic interaction system MUST NOT decide when that payload is forwarded, consumed, or emitted
