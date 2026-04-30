import type { MatchState, PlayerId, ResolutionFrame } from '../../../engine/types';
import { clearResolutionFrame, getActiveResolutionFrame, getResolutionFrame, upsertResolutionFrame } from '../../../engine/systems/resolutionStack';
import type { SmashUpCommand, SmashUpCore, SmashUpEvent, GamePhase } from './types';

export function buildTurnStartMainFrameId(playerId: PlayerId, turnNumber: number): string {
    return `smashup:turn-start:${playerId}:${turnNumber}`;
}

export function buildTurnEndMainFrameId(playerId: PlayerId, turnNumber: number): string {
    return `smashup:turn-end:${playerId}:${turnNumber}`;
}

export function buildEventBatchMainFrameId(events: SmashUpEvent[], playerId: PlayerId): string | undefined {
    const seed = events.find(event => typeof event.timestamp === 'number');
    if (!seed) return undefined;
    return `smashup:event-batch:${playerId}:${seed.type}:${seed.timestamp}`;
}

export function buildCommandMainFrameId(command: SmashUpCommand): string {
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;
    return `smashup:command:${command.playerId}:${command.type}:${timestamp}`;
}

export function ensureSmashUpMainResolutionFrame(
    state: MatchState<SmashUpCore>,
    frameId: string,
    kind: string,
    phase: GamePhase,
    step: string,
): MatchState<SmashUpCore> {
    const existing = getResolutionFrame(state, frameId);
    const frame: ResolutionFrame = {
        id: frameId,
        kind,
        ownerGame: 'smashup',
        ownerSystem: 'smashup-main',
        ordering: existing?.ordering ?? 'explicit',
        status: existing?.status ?? 'running',
        step,
        phase,
        phaseGate: 'block-advance-when-blocked',
        blockedBy: existing?.blockedBy,
        deferredEvents: existing?.deferredEvents,
        deferredActions: existing?.deferredActions,
        metadata: existing?.metadata,
    };
    return upsertResolutionFrame(state, frame, {
        makeActive: state.sys.resolution?.activeFrameId === undefined
            || state.sys.resolution?.activeFrameId === frameId,
    });
}

export function seedSmashUpCommandResolutionFrame(
    state: MatchState<SmashUpCore>,
    command: SmashUpCommand,
): MatchState<SmashUpCore> {
    if (getActiveResolutionFrame(state)) {
        return state;
    }
    return ensureSmashUpMainResolutionFrame(
        state,
        buildCommandMainFrameId(command),
        'smashup:command',
        (state.sys.phase as GamePhase) ?? 'playCards',
        `execute:${command.type}`,
    );
}

export function clearIdleSmashUpCommandResolutionFrame(
    state: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    const activeFrame = getActiveResolutionFrame(state);
    if (!activeFrame || activeFrame.kind !== 'smashup:command') {
        return state;
    }
    if (activeFrame.blockedBy || activeFrame.status !== 'running') {
        return state;
    }
    if (state.sys.interaction?.current || (state.sys.interaction?.queue?.length ?? 0) > 0) {
        return state;
    }
    if (state.sys.responseWindow?.current) {
        return state;
    }
    if ((state.sys as { smashupReactionSession?: unknown }).smashupReactionSession) {
        return state;
    }
    return clearResolutionFrame(state, activeFrame.id);
}
