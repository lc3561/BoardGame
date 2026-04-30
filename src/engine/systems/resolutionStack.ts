import type { MatchState, ResolutionBlocker, ResolutionFrame, ResolutionState } from '../types';

function cloneResolutionState(resolution: ResolutionState | undefined): ResolutionState {
    return {
        frames: resolution?.frames ? [...resolution.frames] : [],
        activeFrameId: resolution?.activeFrameId,
    };
}

export function getResolutionState<TCore>(state: MatchState<TCore>): ResolutionState | undefined {
    return state.sys.resolution;
}

export function getActiveResolutionFrame<TCore>(state: MatchState<TCore>): ResolutionFrame | undefined {
    const resolution = getResolutionState(state);
    if (!resolution?.activeFrameId) return undefined;
    return resolution.frames.find((frame) => frame.id === resolution.activeFrameId);
}

export function getResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frameId: string,
): ResolutionFrame | undefined {
    return getResolutionState(state)?.frames.find((frame) => frame.id === frameId);
}

function normalizeResolutionFrameStatus(
    frame: ResolutionFrame,
    options?: { preserveSuspended?: boolean },
): ResolutionFrame['status'] {
    if (frame.status === 'completed') {
        return 'completed';
    }
    if (options?.preserveSuspended && frame.status === 'suspended') {
        return 'suspended';
    }
    return frame.blockedBy ? 'blocked' : 'running';
}

function replaceResolutionFrame(
    frames: ResolutionFrame[],
    frame: ResolutionFrame,
): ResolutionFrame[] {
    const existingIndex = frames.findIndex((candidate) => candidate.id === frame.id);
    if (existingIndex < 0) {
        return [...frames, frame];
    }
    const nextFrames = [...frames];
    nextFrames[existingIndex] = frame;
    return nextFrames;
}

function writeResolutionState<TCore>(
    state: MatchState<TCore>,
    resolution: ResolutionState | undefined,
): MatchState<TCore> {
    return {
        ...state,
        sys: {
            ...state.sys,
            resolution,
        },
    };
}

export function upsertResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frame: ResolutionFrame,
    options?: { makeActive?: boolean },
): MatchState<TCore> {
    const resolution = cloneResolutionState(state.sys.resolution);
    const nextFrames = replaceResolutionFrame(resolution.frames, frame);
    const nextActiveFrameId = options?.makeActive === false
        ? (resolution.activeFrameId ?? nextFrames[nextFrames.length - 1]?.id)
        : frame.id;
    return writeResolutionState(state, {
        frames: nextFrames,
        activeFrameId: nextActiveFrameId,
    });
}

export function upsertActiveResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frame: ResolutionFrame,
): MatchState<TCore> {
    return upsertResolutionFrame(state, frame, { makeActive: true });
}

export function updateActiveResolutionFrame<TCore>(
    state: MatchState<TCore>,
    updater: (frame: ResolutionFrame | undefined) => ResolutionFrame | undefined,
): MatchState<TCore> {
    const current = getActiveResolutionFrame(state);
    const updated = updater(current);
    if (!updated) {
        return clearResolutionFrame(state, current?.id);
    }
    return upsertActiveResolutionFrame(state, updated);
}

export function updateResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frameId: string,
    updater: (frame: ResolutionFrame | undefined) => ResolutionFrame | undefined,
    options?: { makeActive?: boolean },
): MatchState<TCore> {
    const current = getResolutionFrame(state, frameId);
    const updated = updater(current);
    if (!updated) {
        return clearResolutionFrame(state, frameId);
    }
    return upsertResolutionFrame(state, updated, options);
}

export function clearResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frameId?: string,
): MatchState<TCore> {
    const resolution = state.sys.resolution;
    if (!resolution) return state;
    const targetId = frameId ?? resolution.activeFrameId;
    if (!targetId) return state;
    const targetFrame = resolution.frames.find((frame) => frame.id === targetId);
    if (!targetFrame) return state;

    const nextFrames = resolution.frames
        .filter((frame) => frame.id !== targetId)
        .map((frame) => (
            frame.id === targetFrame.parentFrameId
                ? {
                    ...frame,
                    status: normalizeResolutionFrameStatus(frame),
                }
                : frame
        ));
    const restoredParentId = nextFrames.some((frame) => frame.id === targetFrame.parentFrameId)
        ? targetFrame.parentFrameId
        : undefined;
    const nextActiveFrameId = resolution.activeFrameId === targetId
        ? (restoredParentId ?? nextFrames[nextFrames.length - 1]?.id)
        : resolution.activeFrameId;

    return writeResolutionState(
        state,
        nextFrames.length > 0
            ? {
                frames: nextFrames,
                activeFrameId: nextActiveFrameId,
            }
            : undefined,
    );
}

export function completeActiveResolutionFrame<TCore>(
    state: MatchState<TCore>,
): MatchState<TCore> {
    return clearResolutionFrame(state, state.sys.resolution?.activeFrameId);
}

export function pushChildResolutionFrame<TCore>(
    state: MatchState<TCore>,
    frame: ResolutionFrame,
    options?: { parentFrameId?: string },
): MatchState<TCore> {
    const parentFrameId = options?.parentFrameId ?? state.sys.resolution?.activeFrameId;
    let nextState = state;
    if (parentFrameId) {
        nextState = updateResolutionFrame(
            nextState,
            parentFrameId,
            (parentFrame) => parentFrame
                ? {
                    ...parentFrame,
                    status: 'suspended',
                }
                : parentFrame,
            { makeActive: false },
        );
    }
    return upsertActiveResolutionFrame(nextState, {
        ...frame,
        parentFrameId,
        status: normalizeResolutionFrameStatus(frame),
    });
}

export function setResolutionFrameBlock<TCore>(
    state: MatchState<TCore>,
    frameId: string,
    blocker: ResolutionBlocker,
): MatchState<TCore> {
    return updateResolutionFrame(state, frameId, (frame) => {
        if (!frame) return frame;
        if (
            frame.blockedBy?.type === blocker.type
            && frame.blockedBy?.id === blocker.id
            && frame.blockedBy?.reason === blocker.reason
        ) {
            return frame;
        }
        return {
            ...frame,
            status: frame.status === 'suspended' ? 'suspended' : 'blocked',
            blockedBy: blocker,
        };
    }, { makeActive: false });
}

export function clearResolutionFrameBlock<TCore>(
    state: MatchState<TCore>,
    frameId: string,
    blockerType?: ResolutionBlocker['type'],
): MatchState<TCore> {
    return updateResolutionFrame(state, frameId, (frame) => {
        if (!frame) return frame;
        if (blockerType && frame.blockedBy?.type !== blockerType) {
            return frame;
        }
        if (!frame.blockedBy) {
            return frame;
        }
        return {
            ...frame,
            blockedBy: undefined,
            status: frame.status === 'suspended' ? 'suspended' : 'running',
        };
    }, { makeActive: false });
}

export function setActiveResolutionBlock<TCore>(
    state: MatchState<TCore>,
    blocker: ResolutionBlocker,
): MatchState<TCore> {
    const activeFrameId = state.sys.resolution?.activeFrameId;
    return activeFrameId ? setResolutionFrameBlock(state, activeFrameId, blocker) : state;
}

export function clearActiveResolutionBlock<TCore>(
    state: MatchState<TCore>,
    blockerType?: ResolutionBlocker['type'],
): MatchState<TCore> {
    const activeFrameId = state.sys.resolution?.activeFrameId;
    return activeFrameId ? clearResolutionFrameBlock(state, activeFrameId, blockerType) : state;
}

export function syncActiveResolutionWithInteraction<TCore>(
    state: MatchState<TCore>,
): MatchState<TCore> {
    const frame = getActiveResolutionFrame(state);
    if (!frame) return state;
    if (state.sys.responseWindow?.current) {
        return state;
    }

    const currentInteraction = state.sys.interaction?.current;
    if (currentInteraction) {
        return setActiveResolutionBlock(state, {
            type: 'interaction',
            id: currentInteraction.id,
            reason: currentInteraction.kind,
        });
    }

    if (frame.blockedBy?.type === 'interaction') {
        return clearActiveResolutionBlock(state, 'interaction');
    }

    return state;
}

export function syncActiveResolutionWithResponseWindow<TCore>(
    state: MatchState<TCore>,
): MatchState<TCore> {
    const frame = getActiveResolutionFrame(state);
    if (!frame) return state;

    const currentWindow = state.sys.responseWindow?.current;
    if (currentWindow) {
        return setActiveResolutionBlock(state, {
            type: 'response-window',
            id: currentWindow.id,
            reason: currentWindow.windowType,
        });
    }

    if (frame.blockedBy?.type === 'response-window') {
        return clearActiveResolutionBlock(state, 'response-window');
    }

    return state;
}

export function hasBlockingResolutionFrame<TCore>(
    state: MatchState<TCore>,
    phase?: string,
): boolean {
    const frame = getActiveResolutionFrame(state);
    if (!frame) return false;
    if (frame.phaseGate !== 'block-advance-when-blocked') return false;
    if (frame.status !== 'blocked') return false;
    if (phase && frame.phase && frame.phase !== phase) return false;
    return true;
}
