import type { MatchState } from '../types';
import type { AiSeatController, LocalAiActionVisibility } from './types';
import { resolveAiMinimumActionDelayMs } from './seatControllers';

export type LocalAiActionDelayPlan = {
    actionVisibility: LocalAiActionVisibility;
    minimumDelayMs: number;
    observedStateAgeMs: number;
    lastVisibleActionAt: number | null;
    visibleStepElapsedMs: number | null;
    delayBudgetElapsedMs: number;
    remainingDelayMs: number;
};

export function resolveLatestStateEventTimestamp(state: MatchState<unknown>): number | null {
    const eventStreamEntries = Array.isArray(state.sys?.eventStream?.entries)
        ? state.sys.eventStream.entries
        : [];
    for (let index = eventStreamEntries.length - 1; index >= 0; index -= 1) {
        const timestamp = (eventStreamEntries[index] as { event?: { timestamp?: unknown } })?.event?.timestamp;
        if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
            return timestamp;
        }
    }

    const actionLogEntries = Array.isArray(state.sys?.actionLog?.entries)
        ? state.sys.actionLog.entries
        : [];
    for (let index = actionLogEntries.length - 1; index >= 0; index -= 1) {
        const timestamp = (actionLogEntries[index] as { timestamp?: unknown })?.timestamp;
        if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
            return timestamp;
        }
    }

    return null;
}

export function resolveObservedStateAgeMs(state: MatchState<unknown>, now: number): number {
    const latestTimestamp = resolveLatestStateEventTimestamp(state);
    if (latestTimestamp === null) {
        return 0;
    }
    return Math.max(0, now - latestTimestamp);
}

export function resolveLocalAiActionDelayPlan(args: {
    controller: AiSeatController;
    actionVisibility: LocalAiActionVisibility;
    now: number;
    lastVisibleActionAt?: number | null;
    observedState?: MatchState<unknown> | null;
    extraElapsedBudgetMs?: Array<number | null | undefined>;
}): LocalAiActionDelayPlan {
    const lastVisibleActionAt = args.lastVisibleActionAt ?? null;
    const observedStateAgeMs = args.observedState
        ? resolveObservedStateAgeMs(args.observedState, args.now)
        : 0;
    const visibleStepElapsedMs = lastVisibleActionAt === null
        ? null
        : Math.max(0, args.now - lastVisibleActionAt);
    const extraElapsedBudgetMs = [
        observedStateAgeMs,
        ...(args.extraElapsedBudgetMs ?? []),
    ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
    const delayBudgetElapsedMs = args.actionVisibility === 'visible'
        ? Math.max(0, visibleStepElapsedMs ?? 0, ...extraElapsedBudgetMs)
        : 0;
    const minimumDelayMs = args.actionVisibility === 'visible'
        ? resolveAiMinimumActionDelayMs(args.controller)
        : 0;
    const remainingDelayMs = args.actionVisibility === 'visible'
        ? Math.max(0, minimumDelayMs - delayBudgetElapsedMs)
        : 0;

    return {
        actionVisibility: args.actionVisibility,
        minimumDelayMs,
        observedStateAgeMs,
        lastVisibleActionAt,
        visibleStepElapsedMs,
        delayBudgetElapsedMs,
        remainingDelayMs,
    };
}
