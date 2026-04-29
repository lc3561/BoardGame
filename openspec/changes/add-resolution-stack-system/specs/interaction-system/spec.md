## MODIFIED Requirements
### Requirement: Interaction continuation context SHALL remain opaque to the generic interaction system
The generic interaction system SHALL treat per-game continuation context as opaque data and SHALL NOT inject, merge, or interpret game-specific settlement payloads when switching between interactions. When an interaction belongs to an active resolution frame, the generic interaction system MAY keep a generic frame reference, but it SHALL NOT own that frame's deferred follow-up payloads.

#### Scenario: resolving one interaction and opening the next keeps continuation data untouched
- **GIVEN** one interaction is resolved and another queued interaction becomes current
- **WHEN** the generic `InteractionSystem` refreshes options or advances the queue
- **THEN** it MAY update generic interaction metadata such as current/queue position or refreshed options
- **AND** it MUST NOT write or merge game-specific continuation payload fields on behalf of a game

#### Scenario: interaction blocks and unblocks a resolution frame without owning deferred follow-up
- **GIVEN** an interaction was created from an active resolution frame
- **WHEN** the interaction becomes current or later resolves
- **THEN** the generic interaction system MAY mark the referenced frame as blocked or unblocked
- **BUT** it MUST NOT decide when that frame's deferred settlement payloads are forwarded, consumed, or emitted
