import type { GameEvent, MatchState, PlayerId } from '../../../engine/types';
import type { ResolutionFrame } from '../../../engine/types';
import {
    clearResolutionFrame,
    clearResolutionFrameBlock,
    getResolutionFrame,
    setResolutionFrameBlock,
    updateResolutionFrame,
    upsertResolutionFrame,
} from '../../../engine/systems/resolutionStack';
import type {
    MinionPlayedEvent,
    PendingPostScoringAction,
    SmashUpCore,
    SmashUpEvent,
    TitanPlayedEvent,
} from './types';
import { SU_EVENT_TYPES } from './types';
import { buildValidatedMoveEvents, getTitanByController } from './abilityHelpers';

export interface SmashUpScoringBaseRef {
    slotIndex: number;
    baseDefId: string;
}

export type SerializedPostScoringEvent = {
    type: string;
    payload: unknown;
    timestamp: number;
};

export type SmashUpScoringStep =
    | 'idle'
    | 'resolving-base'
    | 'awaiting-interactions'
    | 'awaiting-response-window'
    | 'awaiting-post-reduce';

export interface SmashUpScoringSession {
    lockedBaseRefs: SmashUpScoringBaseRef[];
    completedBaseRefs: SmashUpScoringBaseRef[];
    currentBaseRef?: SmashUpScoringBaseRef;
    currentStep: SmashUpScoringStep;
}

type SmashUpScoringStateCarrier = MatchState<SmashUpCore>['sys'] & {
    scoredBaseIndices?: number[];
};

const SMASHUP_SCORING_RESOLUTION_FRAME_ID = 'smashup:score-bases';

type ScoringResolutionMetadata = {
    smashupScoringSession?: SmashUpScoringSession;
} & Record<string, unknown>;

function getScoringResolutionFrame(state: MatchState<SmashUpCore>): ResolutionFrame | undefined {
    return getResolutionFrame(state, SMASHUP_SCORING_RESOLUTION_FRAME_ID);
}

export function getSmashUpScoringResolutionFrame(
    state: MatchState<SmashUpCore>,
): ResolutionFrame | undefined {
    return getScoringResolutionFrame(state);
}

function getScoringSessionFromResolution(state: MatchState<SmashUpCore>): SmashUpScoringSession | undefined {
    const metadata = getScoringResolutionFrame(state)?.metadata as ScoringResolutionMetadata | undefined;
    return metadata?.smashupScoringSession;
}

function buildScoringResolutionFrame(
    state: MatchState<SmashUpCore>,
    session: SmashUpScoringSession,
): ResolutionFrame {
    const existing = getScoringResolutionFrame(state);
    return {
        id: SMASHUP_SCORING_RESOLUTION_FRAME_ID,
        kind: 'smashup:score-bases',
        ownerGame: 'smashup',
        ownerSystem: 'smashup-scoring',
        ordering: existing?.ordering ?? 'explicit',
        status: existing?.status ?? 'running',
        step: session.currentStep,
        phase: 'scoreBases',
        phaseGate: 'block-advance-when-blocked',
        blockedBy: existing?.blockedBy,
        deferredEvents: existing?.deferredEvents,
        deferredActions: existing?.deferredActions,
        metadata: {
            ...(existing?.metadata ?? {}),
            smashupScoringSession: session,
        },
    };
}

function updateScoringResolutionFrame(
    state: MatchState<SmashUpCore>,
    updater: (frame: ResolutionFrame) => ResolutionFrame,
): MatchState<SmashUpCore> {
    const frame = getScoringResolutionFrame(state);
    if (!frame) return state;
    return updateResolutionFrame(
        state,
        SMASHUP_SCORING_RESOLUTION_FRAME_ID,
        current => current ? updater(current) : current,
        { makeActive: state.sys.resolution?.activeFrameId === SMASHUP_SCORING_RESOLUTION_FRAME_ID },
    );
}

function syncScoredBaseIndices(
    sys: SmashUpScoringStateCarrier,
    session: SmashUpScoringSession | undefined,
): SmashUpScoringStateCarrier {
    const scoredBaseIndices = session?.completedBaseRefs.map((ref) => ref.slotIndex) ?? [];
    const shouldMirrorCurrentBase = session?.currentBaseRef
        && (session.currentStep === 'awaiting-interactions'
            || session.currentStep === 'awaiting-response-window'
            || session.currentStep === 'awaiting-post-reduce');
    if (shouldMirrorCurrentBase && !scoredBaseIndices.includes(session.currentBaseRef.slotIndex)) {
        scoredBaseIndices.push(session.currentBaseRef.slotIndex);
    }

    return {
        ...sys,
        scoredBaseIndices,
    };
}

export function createScoringBaseRef(core: SmashUpCore, slotIndex: number): SmashUpScoringBaseRef | undefined {
    const base = core.bases[slotIndex];
    if (!base) return undefined;
    return {
        slotIndex,
        baseDefId: base.defId,
    };
}

export function isSameScoringBaseRef(
    left: SmashUpScoringBaseRef | undefined,
    right: SmashUpScoringBaseRef | undefined,
): boolean {
    if (!left || !right) return false;
    return left.slotIndex === right.slotIndex && left.baseDefId === right.baseDefId;
}

export function createScoringSession(core: SmashUpCore, lockedBaseIndices: number[]): SmashUpScoringSession {
    return {
        lockedBaseRefs: lockedBaseIndices
            .map((slotIndex) => createScoringBaseRef(core, slotIndex))
            .filter((ref): ref is SmashUpScoringBaseRef => !!ref),
        completedBaseRefs: [],
        currentStep: 'idle',
    };
}

export function getScoringSession(state: MatchState<SmashUpCore>): SmashUpScoringSession | undefined {
    return getScoringSessionFromResolution(state);
}

export function setScoringSession(
    state: MatchState<SmashUpCore>,
    session: SmashUpScoringSession | undefined,
): MatchState<SmashUpCore> {
    const sys = state.sys as SmashUpScoringStateCarrier;
    const mirroredState: MatchState<SmashUpCore> = {
        ...state,
        sys: syncScoredBaseIndices(sys, session),
    };
    const activeFrameId = state.sys.resolution?.activeFrameId;
    if (!session) {
        return clearResolutionFrame(mirroredState, SMASHUP_SCORING_RESOLUTION_FRAME_ID);
    }
    return upsertResolutionFrame(
        mirroredState,
        buildScoringResolutionFrame(state, session),
        { makeActive: activeFrameId === undefined || activeFrameId === SMASHUP_SCORING_RESOLUTION_FRAME_ID },
    );
}

export function updateScoringSession(
    state: MatchState<SmashUpCore>,
    updater: (session: SmashUpScoringSession | undefined) => SmashUpScoringSession | undefined,
): MatchState<SmashUpCore> {
    return setScoringSession(state, updater(getScoringSession(state)));
}

export function clearScoringSession(state: MatchState<SmashUpCore>): MatchState<SmashUpCore> {
    return setScoringSession(state, undefined);
}

export function getScoringDeferredEvents(
    state: MatchState<SmashUpCore>,
): SerializedPostScoringEvent[] | undefined {
    return getScoringResolutionFrame(state)?.deferredEvents as SerializedPostScoringEvent[] | undefined;
}

export function setScoringDeferredEvents(
    state: MatchState<SmashUpCore>,
    deferredEvents: SerializedPostScoringEvent[] | undefined,
): MatchState<SmashUpCore> {
    return updateScoringResolutionFrame(state, frame => ({
        ...frame,
        deferredEvents: deferredEvents && deferredEvents.length > 0 ? deferredEvents : undefined,
    }));
}

export function getPendingPostScoringActions(
    state: MatchState<SmashUpCore>,
): PendingPostScoringAction[] | undefined {
    return getScoringResolutionFrame(state)?.deferredActions as PendingPostScoringAction[] | undefined;
}

export function setPendingPostScoringActions(
    state: MatchState<SmashUpCore>,
    actions: PendingPostScoringAction[] | undefined,
): MatchState<SmashUpCore> {
    return updateScoringResolutionFrame(state, frame => ({
        ...frame,
        deferredActions: actions && actions.length > 0 ? actions : undefined,
    }));
}

export function clearPendingPostScoringActions(
    state: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    return setPendingPostScoringActions(state, undefined);
}

export function getPendingPostScoringActionsCompatibility(
    state: MatchState<SmashUpCore>,
): PendingPostScoringAction[] | undefined {
    return getScoringSession(state)
        ? undefined
        : state.core.pendingPostScoringActions;
}

export function clearPendingPostScoringActionsCompatibility(
    state: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    if (!state.core.pendingPostScoringActions?.length) {
        return state;
    }
    return {
        ...state,
        core: {
            ...state.core,
            pendingPostScoringActions: undefined,
        },
    };
}

export function markScoringSessionAwaitingPostReduce(
    state: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    const nextState = updateScoringSession(state, (session) => session
        ? {
            ...session,
            currentStep: 'awaiting-post-reduce',
        }
        : session,
    );
    return setPendingPostScoringActions(setResolutionFrameBlock(nextState, SMASHUP_SCORING_RESOLUTION_FRAME_ID, {
        type: 'post-reduce',
        reason: 'awaiting-post-reduce',
    }), undefined);
}

export function clearScoringSessionPostReduceBlock(
    state: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    const unblockedState = clearResolutionFrameBlock(
        state,
        SMASHUP_SCORING_RESOLUTION_FRAME_ID,
        'post-reduce',
    );
    return updateScoringSession(unblockedState, (session) => {
        if (!session || session.currentStep !== 'awaiting-post-reduce') {
            return session;
        }
        return {
            ...session,
            currentStep: 'idle',
        };
    });
}

export function isScoringSessionAwaitingPostReduce(
    state: MatchState<SmashUpCore>,
): boolean {
    const scoringFrame = getScoringResolutionFrame(state);
    if (scoringFrame?.blockedBy?.type === 'post-reduce') {
        return true;
    }
    return getScoringSession(state)?.currentStep === 'awaiting-post-reduce';
}

export function mirrorDeferredPostScoringToFirstInteraction(
    state: MatchState<SmashUpCore>,
    deferredEvents: SerializedPostScoringEvent[] | undefined,
): MatchState<SmashUpCore> {
    if (getScoringSession(state)) {
        return state;
    }
    if (!deferredEvents?.length) {
        return state;
    }

    const current = state.sys.interaction?.current;
    if (current) {
        const data = (current.data ?? {}) as Record<string, unknown>;
        const continuationContext = (data.continuationContext ?? {}) as Record<string, unknown>;
        if (!continuationContext._deferredPostScoringEvents) {
            return {
                ...state,
                sys: {
                    ...state.sys,
                    interaction: {
                        ...state.sys.interaction,
                        current: {
                            ...current,
                            data: {
                                ...data,
                                continuationContext: {
                                    ...continuationContext,
                                    _deferredPostScoringEvents: deferredEvents,
                                },
                            },
                        },
                    },
                },
            };
        }
        return state;
    }

    const firstQueued = state.sys.interaction?.queue?.[0];
    if (!firstQueued) {
        return state;
    }

    const data = (firstQueued.data ?? {}) as Record<string, unknown>;
    const continuationContext = (data.continuationContext ?? {}) as Record<string, unknown>;
    if (continuationContext._deferredPostScoringEvents) {
        return state;
    }

    return {
        ...state,
        sys: {
            ...state.sys,
            interaction: {
                ...state.sys.interaction,
                queue: [
                    {
                        ...firstQueued,
                        data: {
                            ...data,
                            continuationContext: {
                                ...continuationContext,
                                _deferredPostScoringEvents: deferredEvents,
                            },
                        },
                    },
                    ...(state.sys.interaction?.queue?.slice(1) ?? []),
                ],
            },
        },
    };
}

export function getRemainingScoringBaseRefs(state: MatchState<SmashUpCore>): SmashUpScoringBaseRef[] {
    const session = getScoringSession(state);
    if (!session) return [];
    return session.lockedBaseRefs.filter((ref) =>
        !session.completedBaseRefs.some((completed) => isSameScoringBaseRef(completed, ref)),
    );
}

export function serializePostScoringEvents(events: SmashUpEvent[]): SerializedPostScoringEvent[] {
    return events.map((event) => ({
        type: event.type,
        payload: (event as GameEvent).payload,
        timestamp: typeof event.timestamp === 'number' ? event.timestamp : 0,
    }));
}

export function getDeferredPostScoringEvents(
    state: MatchState<SmashUpCore>,
    interactionData?: Record<string, unknown>,
): SerializedPostScoringEvent[] | undefined {
    const sessionDeferred = getScoringDeferredEvents(state);
    if (sessionDeferred && sessionDeferred.length > 0) {
        return sessionDeferred;
    }
    if (getScoringSession(state)) {
        return undefined;
    }
    const continuation = interactionData?.continuationContext as {
        _deferredPostScoringEvents?: SerializedPostScoringEvent[];
    } | undefined;
    return continuation?._deferredPostScoringEvents;
}

export function getDeferredReplacementBaseDefId(
    state: MatchState<SmashUpCore>,
    interactionData?: Record<string, unknown>,
): string | undefined {
    const replacementEvent = getDeferredPostScoringEvents(state, interactionData)?.find(
        (event) => event.type === 'su:base_replaced',
    );
    return (replacementEvent?.payload as { newBaseDefId?: string } | undefined)?.newBaseDefId;
}

export function flushDeferredPostScoringCompatibility(
    state: MatchState<SmashUpCore>,
    interactionData: Record<string, unknown> | undefined,
    timestamp: number,
): { state: MatchState<SmashUpCore>; events: SmashUpEvent[]; flushed: boolean } {
    if (getScoringSession(state)) {
        return { state, events: [], flushed: false };
    }

    const deferredEvents = getDeferredPostScoringEvents(state, interactionData);
    if (!deferredEvents?.length) {
        return { state, events: [], flushed: false };
    }

    const flushedEvents: SmashUpEvent[] = deferredEvents.map((event) => ({
        type: event.type,
        payload: event.payload,
        timestamp: event.timestamp,
    })) as SmashUpEvent[];

    flushedEvents.push(
        ...buildPendingPostScoringActionEvents(
            { core: state.core },
            getPendingPostScoringActionsCompatibility(state),
            timestamp,
        ),
    );

    return {
        state: clearPendingPostScoringActionsCompatibility(state),
        events: flushedEvents,
        flushed: true,
    };
}

export function appendPendingPostScoringActions(
    state: MatchState<SmashUpCore>,
    actions: PendingPostScoringAction[] | undefined,
): MatchState<SmashUpCore> {
    if (!actions?.length) {
        return state;
    }

    if (!getScoringSession(state)) {
        return state;
    }

    return setPendingPostScoringActions(state, [
        ...(getPendingPostScoringActions(state) ?? []),
        ...actions,
    ]);
}

export function appendPendingPostScoringActionsCompatibility(
    state: MatchState<SmashUpCore>,
    actions: PendingPostScoringAction[] | undefined,
): MatchState<SmashUpCore> {
    if (!actions?.length) {
        return state;
    }

    return {
        ...state,
        core: {
            ...state.core,
            pendingPostScoringActions: [
                ...(state.core.pendingPostScoringActions ?? []),
                ...actions,
            ],
        },
    };
}

export function mergeDeferredPostScoringCompatibility(
    state: MatchState<SmashUpCore>,
    interactionData: Record<string, unknown> | undefined,
    timestamp: number,
    options?: {
        primaryEvents?: SmashUpEvent[];
        primaryOrder?: 'before' | 'after';
        extraPendingActions?: PendingPostScoringAction[];
    },
): { state: MatchState<SmashUpCore>; events: SmashUpEvent[] } | undefined {
    if (getScoringSession(state)) {
        return undefined;
    }

    const nextState = appendPendingPostScoringActionsCompatibility(state, options?.extraPendingActions);
    const deferredEvents = getDeferredPostScoringEvents(nextState, interactionData);
    if (!deferredEvents?.length) {
        return options?.extraPendingActions?.length
            ? { state: nextState, events: [] }
            : undefined;
    }

    const flushed = flushDeferredPostScoringCompatibility(nextState, interactionData, timestamp);
    const primaryEvents = options?.primaryEvents ?? [];
    return {
        state: flushed.state,
        events: options?.primaryOrder === 'before'
            ? [...primaryEvents, ...flushed.events]
            : [...flushed.events, ...primaryEvents],
    };
}

export function resolveScoringBaseRefSlotIndex(
    state: MatchState<SmashUpCore>,
    baseRef: SmashUpScoringBaseRef | undefined,
): number | undefined {
    if (!baseRef) return undefined;
    const slotBase = state.core.bases[baseRef.slotIndex];
    if (slotBase?.defId === baseRef.baseDefId) {
        return baseRef.slotIndex;
    }
    return state.core.bases.findIndex((candidate) => candidate?.defId === baseRef.baseDefId) >= 0
        ? state.core.bases.findIndex((candidate) => candidate?.defId === baseRef.baseDefId)
        : undefined;
}

export function markScoringBaseCompleted(
    state: MatchState<SmashUpCore>,
    baseRef: SmashUpScoringBaseRef,
): MatchState<SmashUpCore> {
    const clearedSessionState = updateScoringSession(state, (session) => {
        if (!session) return session;
        const alreadyCompleted = session.completedBaseRefs.some((completed) => isSameScoringBaseRef(completed, baseRef));
        return {
            ...session,
            completedBaseRefs: alreadyCompleted
                ? session.completedBaseRefs
                : [...session.completedBaseRefs, baseRef],
            currentBaseRef: undefined,
        };
    });
    return setPendingPostScoringActions(
        setScoringDeferredEvents(clearedSessionState, undefined),
        undefined,
    );
}

export function buildPendingPostScoringActionEvents(
    state: { core: SmashUpCore },
    actions: PendingPostScoringAction[] | undefined,
    timestamp: number,
): SmashUpEvent[] {
    if (!actions || actions.length === 0) {
        return [];
    }

    const events: SmashUpEvent[] = [];
    for (const action of actions) {
        if (action.kind === 'playMinionOnReplacementBase') {
            const player = state.core.players[action.playerId];
            const cardStillInDeck = player?.deck.some(card =>
                card.uid === action.cardUid
                && card.defId === action.defId
                && card.type === 'minion',
            );
            if (!player || !cardStillInDeck) {
                continue;
            }
            events.push({
                type: SU_EVENT_TYPES.MINION_PLAYED,
                payload: {
                    playerId: action.playerId,
                    cardUid: action.cardUid,
                    defId: action.defId,
                    baseIndex: action.baseIndex,
                    baseDefId: action.targetBaseDefId,
                    power: action.power,
                    fromDeck: true,
                    consumesNormalLimit: false,
                },
                timestamp,
            } as MinionPlayedEvent);
            continue;
        }

        if (action.kind === 'playTitanOnReplacementBase') {
            const titan = (state.core.titans ?? []).find(candidate =>
                candidate.uid === action.titanUid
                && candidate.defId === action.defId
                && candidate.location.zone === 'setaside',
            );
            if (!titan || getTitanByController(state.core, action.controllerId)) {
                continue;
            }
            events.push({
                type: SU_EVENT_TYPES.TITAN_PLAYED,
                payload: {
                    titanUid: action.titanUid,
                    defId: action.defId,
                    ownerId: action.ownerId,
                    controllerId: action.controllerId,
                    baseIndex: action.baseIndex,
                    baseDefId: action.targetBaseDefId,
                    reason: action.reason,
                },
                timestamp,
            } as TitanPlayedEvent);
            continue;
        }

        events.push(...buildValidatedMoveEvents(state as MatchState<SmashUpCore>, {
            minionUid: action.minionUid,
            minionDefId: action.minionDefId,
            fromBaseIndex: action.fromBaseIndex,
            toBaseIndex: action.toBaseIndex,
            toBaseDefId: action.targetBaseDefId,
            reason: action.reason,
            now: timestamp,
        }));
    }

    return events;
}
