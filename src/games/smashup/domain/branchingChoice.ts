import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import {
    createSimpleChoice,
    queueInteraction,
    type PromptOption,
    type SimpleChoiceTargetType,
} from '../../../engine/systems/InteractionSystem';
import type { SmashUpCore, SmashUpEvent } from './types';
import { reduce } from './reduce';

type PromptDisplayMode = 'card' | 'button';

export interface BranchingChoiceOption {
    id: string;
    branchId: string;
    label: string;
    value?: Record<string, unknown>;
    displayMode?: PromptDisplayMode;
    disabled?: boolean;
    disabledReason?: string;
    _ai?: PromptOption['_ai'];
}

export interface BranchingChoiceUpgrade {
    mode: 'optional-both';
    consumeEvents?: SmashUpEvent[];
}

export interface QueueBranchingChoiceArgs {
    matchState: MatchState<SmashUpCore>;
    playerId: PlayerId;
    now: number;
    sourceId: string;
    title: string;
    options: BranchingChoiceOption[];
    targetType?: SimpleChoiceTargetType;
    continuationContext?: Record<string, unknown>;
    upgrade?: BranchingChoiceUpgrade;
}

type BranchingChoiceSelectionValue = Record<string, unknown> & { branchId?: unknown };

interface BranchingChoiceMeta {
    planContext?: Record<string, unknown>;
    upgrade?: BranchingChoiceUpgrade;
}

interface PendingBranchPlan {
    remainingSelections: Array<Record<string, unknown>>;
    planContext?: Record<string, unknown>;
}

const BRANCHING_CHOICE_META_KEY = '_branchingChoiceMeta';
const BRANCHING_CHOICE_PLAN_KEY = '_branchingChoicePlan';

export interface BranchExecutionResult {
    state: MatchState<SmashUpCore>;
    events: SmashUpEvent[];
}

export type BranchExecutor = (args: {
    state: MatchState<SmashUpCore>;
    playerId: PlayerId;
    selection: Record<string, unknown>;
    planContext: Record<string, unknown> | undefined;
    random: RandomFn;
    timestamp: number;
}) => BranchExecutionResult | undefined;

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
}

function getContinuationContext(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    return asRecord(data?.continuationContext);
}

function getBranchingChoiceMeta(data: Record<string, unknown> | undefined): BranchingChoiceMeta | undefined {
    const continuationContext = getContinuationContext(data);
    const meta = continuationContext ? asRecord(continuationContext[BRANCHING_CHOICE_META_KEY]) : undefined;
    if (!meta) return undefined;
    return {
        planContext: asRecord(meta.planContext),
        upgrade: asRecord(meta.upgrade) as BranchingChoiceUpgrade | undefined,
    };
}

function getPendingBranchPlan(data: Record<string, unknown> | undefined): PendingBranchPlan | undefined {
    const continuationContext = getContinuationContext(data);
    const raw = continuationContext ? asRecord(continuationContext[BRANCHING_CHOICE_PLAN_KEY]) : undefined;
    if (!raw) return undefined;
    const remainingSelections = Array.isArray(raw.remainingSelections)
        ? raw.remainingSelections.map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => !!entry)
        : [];
    return {
        remainingSelections,
        planContext: asRecord(raw.planContext),
    };
}

function hasPendingInteraction(state: MatchState<SmashUpCore>): boolean {
    return !!state.sys.interaction?.current || (state.sys.interaction?.queue?.length ?? 0) > 0;
}

function attachPendingBranchPlan(
    state: MatchState<SmashUpCore>,
    plan: PendingBranchPlan,
): MatchState<SmashUpCore> {
    const interactionState = state.sys.interaction;
    if (!interactionState) return state;

    const patchInteraction = (interaction: typeof interactionState.current) => {
        if (!interaction || !interaction.data || typeof interaction.data !== 'object') return interaction;
        const data = interaction.data as Record<string, unknown>;
        const continuationContext = asRecord(data.continuationContext) ?? {};
        return {
            ...interaction,
            data: {
                ...data,
                continuationContext: {
                    ...continuationContext,
                    [BRANCHING_CHOICE_PLAN_KEY]: plan,
                },
            },
        };
    };

    if (interactionState.current) {
        return {
            ...state,
            sys: {
                ...state.sys,
                interaction: {
                    ...interactionState,
                    current: patchInteraction(interactionState.current),
                },
            },
        };
    }

    if ((interactionState.queue?.length ?? 0) > 0) {
        const [first, ...rest] = interactionState.queue;
        return {
            ...state,
            sys: {
                ...state.sys,
                interaction: {
                    ...interactionState,
                    queue: [patchInteraction(first), ...rest],
                },
            },
        };
    }

    return state;
}

function applyEventsToState(
    state: MatchState<SmashUpCore>,
    events: SmashUpEvent[],
): MatchState<SmashUpCore> {
    if (events.length === 0) return state;
    return {
        ...state,
        core: events.reduce((core, event) => reduce(core, event), state.core),
    };
}

function stripAppliedCore(
    baseState: MatchState<SmashUpCore>,
    derivedState: MatchState<SmashUpCore>,
): MatchState<SmashUpCore> {
    return {
        ...derivedState,
        core: baseState.core,
    };
}

function normalizeSelections(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
        return value.map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => !!entry);
    }
    const record = asRecord(value);
    return record ? [record] : [];
}

function runBranchPlan(args: {
    state: MatchState<SmashUpCore>;
    playerId: PlayerId;
    selections: Array<Record<string, unknown>>;
    planContext: Record<string, unknown> | undefined;
    random: RandomFn;
    timestamp: number;
    executeBranch: BranchExecutor;
    prefixEvents?: SmashUpEvent[];
}): BranchExecutionResult {
    const allEvents: SmashUpEvent[] = [...(args.prefixEvents ?? [])];
    let executionState = applyEventsToState(args.state, args.prefixEvents ?? []);
    const remainingSelections = [...args.selections];

    while (remainingSelections.length > 0) {
        const selection = remainingSelections.shift()!;
        const result = args.executeBranch({
            state: executionState,
            playerId: args.playerId,
            selection,
            planContext: args.planContext,
            random: args.random,
            timestamp: args.timestamp,
        }) ?? { state: executionState, events: [] };

        allEvents.push(...result.events);

        if (remainingSelections.length > 0 && hasPendingInteraction(result.state)) {
            return {
                state: attachPendingBranchPlan(stripAppliedCore(args.state, result.state), {
                    remainingSelections,
                    planContext: args.planContext,
                }),
                events: allEvents,
            };
        }

        executionState = applyEventsToState(result.state, result.events);
    }

    return {
        state: stripAppliedCore(args.state, executionState),
        events: allEvents,
    };
}

export function queueBranchingChoice(args: QueueBranchingChoiceArgs): MatchState<SmashUpCore> {
    const options: PromptOption[] = args.options.map((option) => ({
        id: option.id,
        label: option.label,
        value: {
            branchId: option.branchId,
            ...(option.value ?? {}),
        },
        ...(option.displayMode ? { displayMode: option.displayMode } : {}),
        ...(option.disabled !== undefined ? { disabled: option.disabled } : {}),
        ...(option.disabledReason ? { disabledReason: option.disabledReason } : {}),
        ...(option._ai ? { _ai: option._ai } : {}),
    }));

    const interaction = createSimpleChoice(
        `${args.sourceId}_${args.now}`,
        args.playerId,
        args.title,
        options,
        {
            sourceId: args.sourceId,
            targetType: args.targetType ?? 'button',
            autoResolveIfSingle: false,
            multi: args.upgrade?.mode === 'optional-both' && options.length > 1
                ? { min: 1, max: Math.min(2, options.length), ordered: true }
                : undefined,
        },
    );

    return queueInteraction(args.matchState, {
        ...interaction,
        data: {
            ...interaction.data,
            continuationContext: {
                ...(args.continuationContext ?? {}),
                [BRANCHING_CHOICE_META_KEY]: {
                    planContext: args.continuationContext ?? {},
                    ...(args.upgrade ? { upgrade: args.upgrade } : {}),
                },
            },
        },
    });
}

export function resolveBranchingChoiceSelection(args: {
    state: MatchState<SmashUpCore>;
    playerId: PlayerId;
    value: unknown;
    interactionData: Record<string, unknown> | undefined;
    random: RandomFn;
    timestamp: number;
    executeBranch: BranchExecutor;
}): BranchExecutionResult | undefined {
    const meta = getBranchingChoiceMeta(args.interactionData);
    if (!meta) return undefined;

    const selections = normalizeSelections(args.value);
    if (selections.length === 0) {
        return { state: args.state, events: [] };
    }

    const prefixEvents = meta.upgrade?.mode === 'optional-both' && selections.length > 1
        ? meta.upgrade.consumeEvents ?? []
        : [];

    return runBranchPlan({
        state: args.state,
        playerId: args.playerId,
        selections,
        planContext: meta.planContext,
        random: args.random,
        timestamp: args.timestamp,
        executeBranch: args.executeBranch,
        prefixEvents,
    });
}

export function resumeBranchingChoicePlan(args: {
    state: MatchState<SmashUpCore>;
    playerId: PlayerId;
    interactionData: Record<string, unknown> | undefined;
    random: RandomFn;
    timestamp: number;
    executeBranch: BranchExecutor;
    prefixEvents?: SmashUpEvent[];
}): BranchExecutionResult | undefined {
    const plan = getPendingBranchPlan(args.interactionData);
    if (!plan || plan.remainingSelections.length === 0) return undefined;

    return runBranchPlan({
        state: args.state,
        playerId: args.playerId,
        selections: plan.remainingSelections,
        planContext: plan.planContext,
        random: args.random,
        timestamp: args.timestamp,
        executeBranch: args.executeBranch,
        prefixEvents: args.prefixEvents,
    });
}

export function hasBranchingChoiceSelection(value: unknown): boolean {
    const selections = normalizeSelections(value);
    return selections.some((selection) => typeof selection.branchId === 'string');
}

export function getSelectedBranchIds(value: unknown): string[] {
    return normalizeSelections(value)
        .map((selection) => selection.branchId)
        .filter((branchId): branchId is string => typeof branchId === 'string');
}
