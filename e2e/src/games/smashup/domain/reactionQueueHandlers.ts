import { registerInteractionHandler } from './abilityInteractionHandlers';
import { resolveSmashUpReactionChoice } from './reactionSession';

function keepSysUpdatesOnly(state: any, updatedState: any) {
    if (!updatedState || updatedState.core === state.core) return updatedState;
    return {
        ...updatedState,
        core: state.core,
    };
}

export function registerReactionQueueInteractionHandlers(): void {
    registerInteractionHandler('smashup_reaction_choose', (state, _playerId, value, _iData, random, timestamp) => {
        const resolved = resolveSmashUpReactionChoice(state, random, timestamp, (value ?? { kind: 'pass' }) as any);
        return {
            ...resolved,
            state: keepSysUpdatesOnly(state, resolved.state),
        };
    });
}
