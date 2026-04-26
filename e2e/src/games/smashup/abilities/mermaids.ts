import type { PlayerId } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler, type InteractionHandler } from '../domain/abilityInteractionHandlers';
import { registerTrigger } from '../domain/ongoingEffects';
import type { TriggerContext } from '../domain/ongoingEffects';
import {
    addTempPower,
    buildAbilityFeedback,
    buildBaseTargetOptions,
    buildMinionTargetOptions,
    buildStandardDrawEvents,
    buildValidatedMoveEvents,
    changeMinionController,
    createSkipOption,
    getMinionPower,
    grantContextualExtraAction,
    grantContextualExtraMinion,
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type {
    MinionMetadataUpdatedEvent,
    OngoingAttachedEvent,
    OngoingDetachedEvent,
    SmashUpCore,
    SmashUpEvent,
} from '../domain/types';
import { getBaseDef, getCardDef } from '../data/cards';

type MinionChoice = { minionUid?: string; baseIndex?: number; defId?: string; skip?: boolean };
type BaseChoice = { baseIndex?: number; skip?: boolean };
type ModeChoice = { mode?: 'move' | 'control'; skip?: boolean };
type HandMinionChoice = { cardUid?: string; defId?: string; power?: number; skip?: boolean };

type CharmerMoveContinuation = {
    charmerUid: string;
    charmerDefId: string;
    fromBaseIndex: number;
};

type CharmerTargetContinuation = {
    targetBaseIndex: number;
};

type MermaidQueenMoveContinuation = {
    targetBaseIndex: number;
};

type MermaidQueenControlContinuation = {
    targetBaseIndex: number;
};

type MermaidQueenModeContinuation = {
    targetBaseIndex: number;
};

type CaptiveAudienceContinuation = {
    bonusPower: number;
};

type UltimateSongContinuation = {
    casterPlayerId: PlayerId;
    targetBaseIndex: number;
    remainingPlayerIds: PlayerId[];
    forcedPlayerId: PlayerId;
};

type SirenSongDestinationContinuation = {
    fromBaseIndex: number;
    remainingPlayerIds: PlayerId[];
};

type SirenSongTargetContinuation = {
    fromBaseIndex: number;
    toBaseIndex: number;
    remainingPlayerIds: PlayerId[];
};

type OngoingMoveContinuation = {
    cardUid: string;
    defId: string;
    ownerId: PlayerId;
    fromBaseIndex: number;
    reason: string;
};

type CharmedContinuation = {
    minionUid: string;
    minionDefId: string;
    fromBaseIndex: number;
};

const MERMAIDS_CHARMED_SUPPRESSED_TURN_META = 'mermaidsCharmedSuppressedTurn';
const MERMAIDS_TEMP_CONTROL_CONTROLLER_META = 'mermaidsTemporaryControlOriginalController';
const MERMAIDS_TEMP_CONTROL_PLAYER_META = 'mermaidsTemporaryControlPlayerId';
const MERMAIDS_TEMP_CONTROL_TURN_META = 'mermaidsTemporaryControlTurn';

function getBaseLabel(state: SmashUpCore, baseIndex: number): string {
    return getBaseDef(state.bases[baseIndex]?.defId ?? '')?.name ?? `基地 ${baseIndex + 1}`;
}

function getOtherPlayers(state: SmashUpCore, playerId: PlayerId): PlayerId[] {
    return state.turnOrder.filter(candidate => candidate !== playerId);
}

function getOtherBases(state: SmashUpCore, fromBaseIndex: number) {
    return state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseLabel(state, baseIndex),
        }))
        .filter(base => base.baseIndex !== fromBaseIndex);
}

function collectBasesWithOwnMinions(state: SmashUpCore, playerId: PlayerId, excludeBaseIndex?: number) {
    return state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseLabel(state, baseIndex),
            hasOwnMinion: base.minions.some(minion => minion.controller === playerId),
        }))
        .filter(base => base.hasOwnMinion && base.baseIndex !== excludeBaseIndex)
        .map(({ baseIndex, label }) => ({ baseIndex, label }));
}

function collectMinions(
    state: SmashUpCore,
    predicate: (minion: SmashUpCore['bases'][number]['minions'][number], baseIndex: number) => boolean,
) {
    return state.bases.flatMap((base, baseIndex) => {
        const baseLabel = getBaseLabel(state, baseIndex);
        return base.minions
            .filter(minion => predicate(minion, baseIndex))
            .map(minion => ({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                controller: minion.controller,
                owner: minion.owner,
                label: `${getCardDef(minion.defId)?.name ?? minion.defId} @ ${baseLabel}`,
            }));
    });
}

function collectMinionsOnBase(
    state: SmashUpCore,
    baseIndex: number,
    predicate: (minion: SmashUpCore['bases'][number]['minions'][number]) => boolean,
) {
    const base = state.bases[baseIndex];
    if (!base) return [];
    const baseLabel = getBaseLabel(state, baseIndex);
    return base.minions
        .filter(minion => predicate(minion))
        .map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex,
            controller: minion.controller,
            owner: minion.owner,
            label: `${getCardDef(minion.defId)?.name ?? minion.defId} @ ${baseLabel}`,
        }));
}

function buildHandMinionOptions(state: SmashUpCore, playerId: PlayerId, maxPower?: number) {
    const hand = state.players[playerId]?.hand ?? [];
    return hand
        .filter(card => {
            if (card.type !== 'minion') return false;
            const def = getCardDef(card.defId);
            if (!def || def.type !== 'minion') return false;
            return maxPower === undefined || def.power <= maxPower;
        })
        .map((card, index) => {
            const def = getCardDef(card.defId);
            const power = def && def.type === 'minion' ? def.power : 0;
            return {
                id: `hand-${playerId}-${index}`,
                label: `${def?.name ?? card.defId} (力量 ${power})`,
                value: { cardUid: card.uid, defId: card.defId, power },
                _source: 'hand' as const,
                displayMode: 'card' as const,
            };
        });
}

function buildMermaidsMetadataUpdatedEvent(
    minionUid: string,
    baseIndex: number,
    metadataUpdate: Record<string, unknown>,
    reason: string,
    timestamp: number,
): MinionMetadataUpdatedEvent {
    return {
        type: SU_EVENTS.MINION_METADATA_UPDATED,
        payload: {
            minionUid,
            baseIndex,
            metadataUpdate,
            reason,
        },
        timestamp,
    };
}

function buildMoveOngoingEvents(
    cardUid: string,
    defId: string,
    ownerId: PlayerId,
    targetBaseIndex: number,
    reason: string,
    timestamp: number,
): SmashUpEvent[] {
    return [
        {
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: {
                cardUid,
                defId,
                ownerId,
                reason,
            },
            timestamp,
        } as OngoingDetachedEvent,
        {
            type: SU_EVENTS.ONGOING_ATTACHED,
            payload: {
                cardUid,
                defId,
                ownerId,
                targetType: 'base',
                targetBaseIndex,
            },
            timestamp,
        } as OngoingAttachedEvent,
    ];
}

function queueCharmerTargetPrompt(
    matchState: AbilityContext['matchState'],
    state: SmashUpCore,
    playerId: PlayerId,
    targetBaseIndex: number,
    now: number,
): AbilityResult {
    const candidates = collectMinions(
        state,
        (minion, baseIndex) => (
            minion.controller !== playerId
            && baseIndex !== targetBaseIndex
            && getMinionPower(state, minion, baseIndex) <= 3
        ),
    );
    if (candidates.length === 0) {
        return { events: [] };
    }
    const interaction = createSimpleChoice(
        `mermaids_charmer_target_${now}`,
        playerId,
        '迷人的人：你可以把另一个玩家一个力量 3 或以下的随从移到这里',
        [
            createSkipOption('不移动别人的随从'),
            ...buildMinionTargetOptions(candidates, {
                state,
                sourcePlayerId: playerId,
                sourceDefId: 'mermaids_charmer',
                effectType: 'move',
            }),
        ],
        { sourceId: 'mermaids_charmer_target', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: CharmerTargetContinuation }).continuationContext = {
        targetBaseIndex,
    };
    return { events: [], matchState: queueInteraction(matchState, interaction) };
}

function queueUltimateSongPrompt(
    matchState: AbilityContext['matchState'],
    state: SmashUpCore,
    casterPlayerId: PlayerId,
    targetBaseIndex: number,
    remainingPlayerIds: PlayerId[],
    now: number,
): AbilityResult {
    const events: SmashUpEvent[] = [];
    const pending = [...remainingPlayerIds];

    while (pending.length > 0) {
        const forcedPlayerId = pending.shift()!;
        const options = buildHandMinionOptions(state, forcedPlayerId, 3);
        if (options.length === 0) {
            events.push(buildAbilityFeedback(forcedPlayerId, 'feedback.no_valid_targets', now));
            continue;
        }
        const interaction = createSimpleChoice(
            `mermaids_ultimate_song_hand_${forcedPlayerId}_${now}`,
            forcedPlayerId,
            '最后的歌声：选择一张力量 3 或以下的随从额外打出到目标基地',
            options,
            { sourceId: 'mermaids_ultimate_song_hand', targetType: 'hand' },
        );
        (interaction.data as { continuationContext?: UltimateSongContinuation }).continuationContext = {
            casterPlayerId,
            targetBaseIndex,
            remainingPlayerIds: pending,
            forcedPlayerId,
        };
        return { events, matchState: queueInteraction(matchState, interaction) };
    }

    events.push(
        grantContextualExtraMinion(
            { playerId: casterPlayerId, now, matchState },
            'mermaids_ultimate_song',
        ),
        grantContextualExtraAction(
            { playerId: casterPlayerId, now, matchState },
            'mermaids_ultimate_song',
        ),
    );
    return { events };
}

function queueSirenSongTargetPrompt(
    matchState: AbilityContext['matchState'],
    state: SmashUpCore,
    playerId: PlayerId,
    fromBaseIndex: number,
    toBaseIndex: number,
    remainingPlayerIds: PlayerId[],
    now: number,
): AbilityResult {
    const pending = [...remainingPlayerIds];

    while (pending.length > 0) {
        const targetPlayerId = pending.shift()!;
        const candidates = collectMinionsOnBase(
            state,
            fromBaseIndex,
            minion => minion.controller === targetPlayerId,
        );
        const options = buildMinionTargetOptions(candidates, {
            state,
            sourcePlayerId: playerId,
            sourceDefId: 'mermaids_siren_song',
            effectType: 'move',
        });
        if (options.length === 0) {
            continue;
        }
        const interaction = createSimpleChoice(
            `mermaids_siren_song_target_${targetPlayerId}_${now}`,
            playerId,
            `塞壬的歌声：选择玩家 ${targetPlayerId} 的一个随从移动`,
            options,
            { sourceId: 'mermaids_siren_song_target', targetType: 'minion' },
        );
        (interaction.data as { continuationContext?: SirenSongTargetContinuation }).continuationContext = {
            fromBaseIndex,
            toBaseIndex,
            remainingPlayerIds: pending,
        };
        return { events: [], matchState: queueInteraction(matchState, interaction) };
    }

    return { events: [] };
}

function mermaidsCharmerTalent(ctx: AbilityContext): AbilityResult {
    const otherBases = getOtherBases(ctx.state, ctx.baseIndex);
    const hasMoveTarget = otherBases.length > 0;
    const hasPullTarget = collectMinions(
        ctx.state,
        (minion, baseIndex) => (
            minion.controller !== ctx.playerId
            && baseIndex !== ctx.baseIndex
            && getMinionPower(ctx.state, minion, baseIndex) <= 3
        ),
    ).length > 0;
    if (!hasMoveTarget && !hasPullTarget) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `mermaids_charmer_move_${ctx.now}`,
        ctx.playerId,
        '迷人的人：你可以先移动这个随从',
        [
            createSkipOption('不移动这个随从'),
            ...buildBaseTargetOptions(otherBases, ctx.state),
        ],
        { sourceId: 'mermaids_charmer_move', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: CharmerMoveContinuation }).continuationContext = {
        charmerUid: ctx.cardUid,
        charmerDefId: ctx.defId,
        fromBaseIndex: ctx.baseIndex,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsMermaidQueenOnPlay(ctx: AbilityContext): AbilityResult {
    const moveTargets = collectMinions(
        ctx.state,
        (minion, baseIndex) => minion.controller !== ctx.playerId && baseIndex !== ctx.baseIndex,
    );
    const controlTargets = collectMinionsOnBase(
        ctx.state,
        ctx.baseIndex,
        minion => minion.controller !== ctx.playerId && getMinionPower(ctx.state, minion, ctx.baseIndex) <= 3,
    );

    if (moveTargets.length === 0 && controlTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    if (moveTargets.length > 0 && controlTargets.length === 0) {
        const interaction = createSimpleChoice(
            `mermaids_mermaid_queen_move_${ctx.now}`,
            ctx.playerId,
            '人鱼女王：选择一个其他玩家的随从移到这里',
            buildMinionTargetOptions(moveTargets, {
                state: ctx.state,
                sourcePlayerId: ctx.playerId,
                sourceDefId: ctx.defId,
                effectType: 'move',
            }),
            { sourceId: 'mermaids_mermaid_queen_move', targetType: 'minion' },
        );
        (interaction.data as { continuationContext?: MermaidQueenMoveContinuation }).continuationContext = {
            targetBaseIndex: ctx.baseIndex,
        };
        return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
    }

    if (moveTargets.length === 0) {
        const interaction = createSimpleChoice(
            `mermaids_mermaid_queen_control_${ctx.now}`,
            ctx.playerId,
            '人鱼女王：选择这里一个力量 3 或以下的随从，直到回合结束获得其控制权',
            buildMinionTargetOptions(controlTargets, {
                state: ctx.state,
                sourcePlayerId: ctx.playerId,
                sourceDefId: ctx.defId,
                effectType: 'affect',
            }),
            { sourceId: 'mermaids_mermaid_queen_control', targetType: 'minion' },
        );
        (interaction.data as { continuationContext?: MermaidQueenControlContinuation }).continuationContext = {
            targetBaseIndex: ctx.baseIndex,
        };
        return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
    }

    const interaction = createSimpleChoice(
        `mermaids_mermaid_queen_mode_${ctx.now}`,
        ctx.playerId,
        '人鱼女王：选择要执行的效果',
        [
            { id: 'move', label: '把一个其他玩家的随从移到这里', value: { mode: 'move' }, displayMode: 'button' as const },
            { id: 'control', label: '直到回合结束获得这里一个力量 3 或以下随从的控制权', value: { mode: 'control' }, displayMode: 'button' as const },
        ],
        { sourceId: 'mermaids_mermaid_queen_mode', targetType: 'static' },
    );
    (interaction.data as { continuationContext?: MermaidQueenModeContinuation }).continuationContext = {
        targetBaseIndex: ctx.baseIndex,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsCaptiveAudienceOnPlay(ctx: AbilityContext): AbilityResult {
    const targetBase = ctx.state.bases[ctx.baseIndex];
    if (!targetBase) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const bonusPower = targetBase.minions.filter(minion => minion.controller !== ctx.playerId).length;
    const ownMinions = collectMinionsOnBase(
        ctx.state,
        ctx.baseIndex,
        minion => minion.controller === ctx.playerId,
    );
    if (bonusPower <= 0 || ownMinions.length === 0) {
        return {
            events: [grantContextualExtraAction({ playerId: ctx.playerId, now: ctx.now, matchState: ctx.matchState }, 'mermaids_captive_audience')],
        };
    }

    const interaction = createSimpleChoice(
        `mermaids_captive_audience_${ctx.now}`,
        ctx.playerId,
        `迷倒观众：选择你的一个随从，获得 +${bonusPower} 力量直到回合结束`,
        buildMinionTargetOptions(ownMinions, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
        }),
        { sourceId: 'mermaids_captive_audience', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: CaptiveAudienceContinuation }).continuationContext = {
        bonusPower,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsBecalmedShoresTalent(ctx: AbilityContext): AbilityResult {
    const baseTargets = getOtherBases(ctx.state, ctx.baseIndex);
    if (baseTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_becalmed_shores_${ctx.now}`,
        ctx.playerId,
        '安静的海岸：把这张牌移到另一个基地',
        buildBaseTargetOptions(baseTargets, ctx.state),
        { sourceId: 'mermaids_becalmed_shores', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: OngoingMoveContinuation }).continuationContext = {
        cardUid: ctx.cardUid,
        defId: ctx.defId,
        ownerId: ctx.playerId,
        fromBaseIndex: ctx.baseIndex,
        reason: 'mermaids_becalmed_shores',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsUltimateSongOnPlay(ctx: AbilityContext): AbilityResult {
    const baseTargets = collectBasesWithOwnMinions(ctx.state, ctx.playerId);
    if (baseTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_ultimate_song_base_${ctx.now}`,
        ctx.playerId,
        '最后的歌声：选择目标基地',
        buildBaseTargetOptions(baseTargets, ctx.state),
        { sourceId: 'mermaids_ultimate_song_base', targetType: 'base' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsSirenSongOnPlay(ctx: AbilityContext): AbilityResult {
    const destinationBases = collectBasesWithOwnMinions(ctx.state, ctx.playerId);
    if (destinationBases.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const sourceBases = ctx.state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseLabel(ctx.state, baseIndex),
            opponentMinionCount: base.minions.filter(minion => minion.controller !== ctx.playerId).length,
        }))
        .filter(base => base.opponentMinionCount > 0);
    if (sourceBases.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `mermaids_siren_song_base_${ctx.now}`,
        ctx.playerId,
        '塞壬的歌声：选择来源基地',
        buildBaseTargetOptions(sourceBases, ctx.state),
        { sourceId: 'mermaids_siren_song_base', targetType: 'base' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsTollBayOnPlay(ctx: AbilityContext): AbilityResult {
    const targetBase = ctx.state.bases[ctx.baseIndex];
    if (!targetBase) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const opponentMinionCount = targetBase.minions.filter(minion => minion.controller !== ctx.playerId).length;
    return {
        events: buildStandardDrawEvents(ctx.state, ctx.playerId, opponentMinionCount, ctx.random, ctx.now),
    };
}

function mermaidsShipwreckCoveSpecial(): AbilityResult {
    return { events: [] };
}

function mermaidsDesertIslandOnPlay(): AbilityResult {
    return { events: [] };
}

function mermaidsCharmedOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectMinions(ctx.state, (minion, baseIndex) => getMinionPower(ctx.state, minion, baseIndex) <= 3);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_charmed_${ctx.now}`,
        ctx.playerId,
        '魅惑：选择一个力量 3 或以下的随从',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'affect',
        }),
        { sourceId: 'mermaids_charmed', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsShipwreckCoveAfterScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.sourceCardUid || !ctx.sourceControllerId || ctx.sourceBaseIndex === undefined) {
        return { events: [] };
    }
    const baseTargets = getOtherBases(ctx.state, ctx.sourceBaseIndex);
    if (baseTargets.length === 0) {
        return { events: [] };
    }
    const interaction = createSimpleChoice(
        `mermaids_shipwreck_cove_after_scoring_${ctx.now}`,
        ctx.sourceControllerId,
        '沉船湾：你可以把这张牌移到另一个基地',
        [
            createSkipOption('不移动沉船湾'),
            ...buildBaseTargetOptions(baseTargets, ctx.state),
        ],
        { sourceId: 'mermaids_shipwreck_cove_after_scoring', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: OngoingMoveContinuation }).continuationContext = {
        cardUid: ctx.sourceCardUid,
        defId: 'mermaids_shipwreck_cove',
        ownerId: ctx.sourceControllerId,
        fromBaseIndex: ctx.sourceBaseIndex,
        reason: 'mermaids_shipwreck_cove',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsDesertIslandOnTurnStart(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.sourceCardUid || !ctx.sourceControllerId) return [];
    if (ctx.playerId !== ctx.sourceControllerId) return [];
    return [{
        type: SU_EVENTS.ONGOING_DETACHED,
        payload: {
            cardUid: ctx.sourceCardUid,
            defId: 'mermaids_desert_island',
            ownerId: ctx.sourceControllerId,
            reason: 'mermaids_desert_island',
        },
        timestamp: ctx.now,
    } as OngoingDetachedEvent];
}

export function registerMermaidsAbilities(): void {
    registerAbility('mermaids_charmer', 'talent', mermaidsCharmerTalent);
    registerAbility('mermaids_mermaid_queen', 'onPlay', mermaidsMermaidQueenOnPlay);
    registerAbility('mermaids_ultimate_song', 'onPlay', mermaidsUltimateSongOnPlay);
    registerAbility('mermaids_captive_audience', 'onPlay', mermaidsCaptiveAudienceOnPlay);
    registerAbility('mermaids_becalmed_shores', 'talent', mermaidsBecalmedShoresTalent);
    registerAbility('mermaids_siren_song', 'onPlay', mermaidsSirenSongOnPlay);
    registerAbility('mermaids_toll_bay', 'onPlay', mermaidsTollBayOnPlay);
    registerAbility('mermaids_shipwreck_cove', 'special', mermaidsShipwreckCoveSpecial);
    registerAbility('mermaids_charmed', 'onPlay', mermaidsCharmedOnPlay);
    registerAbility('mermaids_desert_island', 'onPlay', mermaidsDesertIslandOnPlay);

    registerTrigger('mermaids_shipwreck_cove', 'afterScoring', mermaidsShipwreckCoveAfterScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('mermaids_desert_island', 'onTurnStart', mermaidsDesertIslandOnTurnStart, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });
}

const handleMermaidsCharmerMove: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as CharmerMoveContinuation | undefined;
    if (!continuation) return { state, events: [] };

    const targetBaseIndex = selected.skip || selected.baseIndex === undefined
        ? continuation.fromBaseIndex
        : selected.baseIndex;
    const moveEvents = (!selected.skip && selected.baseIndex !== undefined)
        ? buildValidatedMoveEvents(state, {
            minionUid: continuation.charmerUid,
            minionDefId: continuation.charmerDefId,
            fromBaseIndex: continuation.fromBaseIndex,
            toBaseIndex: selected.baseIndex,
            reason: 'mermaids_charmer',
            now: timestamp,
        })
        : [];

    const queued = queueCharmerTargetPrompt(state, state.core, playerId, targetBaseIndex, timestamp);
    return {
        state: queued.matchState ?? state,
        events: [...moveEvents, ...queued.events],
    };
};

const handleMermaidsCharmerTarget: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    const continuation = data?.continuationContext as CharmerTargetContinuation | undefined;
    if (!continuation || selected.skip || !selected.minionUid || selected.baseIndex === undefined || !selected.defId) {
        return { state, events: [] };
    }
    return {
        state,
        events: buildValidatedMoveEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            toBaseIndex: continuation.targetBaseIndex,
            reason: 'mermaids_charmer',
            now: timestamp,
        }),
    };
};

const handleMermaidsMermaidQueenMode: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as ModeChoice;
    const continuation = data?.continuationContext as MermaidQueenModeContinuation | undefined;
    if (!continuation || !selected.mode) return { state, events: [] };

    if (selected.mode === 'move') {
        const moveTargets = collectMinions(
            state.core,
            (minion, baseIndex) => minion.controller !== playerId && baseIndex !== continuation.targetBaseIndex,
        );
        if (moveTargets.length === 0) {
            return { state, events: [buildAbilityFeedback(playerId, 'feedback.no_valid_targets', timestamp)] };
        }
        const interaction = createSimpleChoice(
            `mermaids_mermaid_queen_move_${timestamp}`,
            playerId,
            '人鱼女王：选择一个其他玩家的随从移到这里',
            buildMinionTargetOptions(moveTargets, {
                state: state.core,
                sourcePlayerId: playerId,
                sourceDefId: 'mermaids_mermaid_queen',
                effectType: 'move',
            }),
            { sourceId: 'mermaids_mermaid_queen_move', targetType: 'minion' },
        );
        (interaction.data as { continuationContext?: MermaidQueenMoveContinuation }).continuationContext = {
            targetBaseIndex: continuation.targetBaseIndex,
        };
        return { state: queueInteraction(state, interaction), events: [] };
    }

    const controlTargets = collectMinionsOnBase(
        state.core,
        continuation.targetBaseIndex,
        minion => minion.controller !== playerId && getMinionPower(state.core, minion, continuation.targetBaseIndex) <= 3,
    );
    if (controlTargets.length === 0) {
        return { state, events: [buildAbilityFeedback(playerId, 'feedback.no_valid_targets', timestamp)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_mermaid_queen_control_${timestamp}`,
        playerId,
        '人鱼女王：选择这里一个力量 3 或以下的随从，直到回合结束获得其控制权',
        buildMinionTargetOptions(controlTargets, {
            state: state.core,
            sourcePlayerId: playerId,
            sourceDefId: 'mermaids_mermaid_queen',
            effectType: 'affect',
        }),
        { sourceId: 'mermaids_mermaid_queen_control', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: MermaidQueenControlContinuation }).continuationContext = {
        targetBaseIndex: continuation.targetBaseIndex,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsMermaidQueenMove: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    const continuation = data?.continuationContext as MermaidQueenMoveContinuation | undefined;
    if (!continuation || !selected.minionUid || selected.baseIndex === undefined || !selected.defId) {
        return { state, events: [] };
    }
    return {
        state,
        events: buildValidatedMoveEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            toBaseIndex: continuation.targetBaseIndex,
            reason: 'mermaids_mermaid_queen',
            now: timestamp,
        }),
    };
};

const handleMermaidsMermaidQueenControl: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined || !selected.defId) {
        return { state, events: [] };
    }
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion || minion.controller === playerId) {
        return { state, events: [] };
    }
    return {
        state,
        events: [
            changeMinionController(
                minion.uid,
                minion.defId,
                selected.baseIndex,
                minion.owner,
                minion.controller,
                playerId,
                playerId,
                'mermaids_mermaid_queen',
                timestamp,
            ),
            buildMermaidsMetadataUpdatedEvent(
                minion.uid,
                selected.baseIndex,
                {
                    [MERMAIDS_TEMP_CONTROL_CONTROLLER_META]: minion.controller,
                    [MERMAIDS_TEMP_CONTROL_PLAYER_META]: playerId,
                    [MERMAIDS_TEMP_CONTROL_TURN_META]: state.core.turnNumber,
                },
                'mermaids_mermaid_queen',
                timestamp,
            ),
        ],
    };
};

const handleMermaidsCaptiveAudience: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    const continuation = data?.continuationContext as CaptiveAudienceContinuation | undefined;
    if (!continuation || !selected.minionUid || selected.baseIndex === undefined) {
        return {
            state,
            events: [grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'mermaids_captive_audience')],
        };
    }
    return {
        state,
        events: [
            addTempPower(selected.minionUid, selected.baseIndex, continuation.bonusPower, 'mermaids_captive_audience', timestamp),
            grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'mermaids_captive_audience'),
        ],
    };
};

const handleMermaidsOngoingMove: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as OngoingMoveContinuation | undefined;
    if (!continuation || selected.skip || selected.baseIndex === undefined || selected.baseIndex === continuation.fromBaseIndex) {
        return { state, events: [] };
    }
    return {
        state,
        events: buildMoveOngoingEvents(
            continuation.cardUid,
            continuation.defId,
            continuation.ownerId,
            selected.baseIndex,
            continuation.reason,
            timestamp,
        ),
    };
};

const handleMermaidsUltimateSongBase: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as BaseChoice;
    if (selected.baseIndex === undefined) return { state, events: [] };
    const queued = queueUltimateSongPrompt(
        state,
        state.core,
        playerId,
        selected.baseIndex,
        getOtherPlayers(state.core, playerId),
        timestamp,
    );
    return { state: queued.matchState ?? state, events: queued.events };
};

const handleMermaidsUltimateSongHand: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as HandMinionChoice;
    const continuation = data?.continuationContext as UltimateSongContinuation | undefined;
    if (!continuation || !selected.cardUid || !selected.defId) {
        return { state, events: [] };
    }

    const playedEvent: SmashUpEvent = {
        type: SU_EVENTS.MINION_PLAYED,
        payload: {
            playerId: continuation.forcedPlayerId,
            cardUid: selected.cardUid,
            defId: selected.defId,
            baseIndex: continuation.targetBaseIndex,
            baseDefId: state.core.bases[continuation.targetBaseIndex]?.defId,
            power: selected.power ?? 0,
            consumesNormalLimit: false,
            skipOnPlayAbility: true,
        },
        timestamp,
    };

    const queued = queueUltimateSongPrompt(
        state,
        state.core,
        continuation.casterPlayerId,
        continuation.targetBaseIndex,
        continuation.remainingPlayerIds,
        timestamp,
    );

    return {
        state: queued.matchState ?? state,
        events: [playedEvent, ...queued.events],
    };
};

const handleMermaidsSirenSongBase: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as BaseChoice;
    if (selected.baseIndex === undefined) return { state, events: [] };

    const destinationBases = collectBasesWithOwnMinions(state.core, playerId, selected.baseIndex);
    if (destinationBases.length === 0) {
        return { state, events: [buildAbilityFeedback(playerId, 'feedback.no_valid_targets', timestamp)] };
    }

    const interaction = createSimpleChoice(
        `mermaids_siren_song_destination_${timestamp}`,
        playerId,
        '塞壬的歌声：选择目标基地',
        buildBaseTargetOptions(destinationBases, state.core),
        { sourceId: 'mermaids_siren_song_destination', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: SirenSongDestinationContinuation }).continuationContext = {
        fromBaseIndex: selected.baseIndex,
        remainingPlayerIds: getOtherPlayers(state.core, playerId),
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsSirenSongDestination: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as SirenSongDestinationContinuation | undefined;
    if (!continuation || selected.baseIndex === undefined) return { state, events: [] };

    const queued = queueSirenSongTargetPrompt(
        state,
        state.core,
        playerId,
        continuation.fromBaseIndex,
        selected.baseIndex,
        continuation.remainingPlayerIds,
        timestamp,
    );
    return { state: queued.matchState ?? state, events: queued.events };
};

const handleMermaidsSirenSongTarget: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    const continuation = data?.continuationContext as SirenSongTargetContinuation | undefined;
    if (!continuation || !selected.minionUid || selected.baseIndex === undefined || !selected.defId) {
        return { state, events: [] };
    }

    const queued = queueSirenSongTargetPrompt(
        state,
        state.core,
        playerId,
        continuation.fromBaseIndex,
        continuation.toBaseIndex,
        continuation.remainingPlayerIds,
        timestamp,
    );

    return {
        state: queued.matchState ?? state,
        events: [
            ...buildValidatedMoveEvents(state, {
                minionUid: selected.minionUid,
                minionDefId: selected.defId,
                fromBaseIndex: selected.baseIndex,
                toBaseIndex: continuation.toBaseIndex,
                reason: 'mermaids_siren_song',
                now: timestamp,
            }),
            ...queued.events,
        ],
    };
};

const handleMermaidsCharmed: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion) return { state, events: [] };
    const destinationBases = collectBasesWithOwnMinions(state.core, playerId, selected.baseIndex);
    if (destinationBases.length === 0) {
        return {
            state,
            events: [
                buildMermaidsMetadataUpdatedEvent(
                    selected.minionUid,
                    selected.baseIndex,
                    { [MERMAIDS_CHARMED_SUPPRESSED_TURN_META]: state.core.turnNumber },
                    'mermaids_charmed',
                    timestamp,
                ),
                grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'mermaids_charmed'),
            ],
        };
    }
    const interaction = createSimpleChoice(
        `mermaids_charmed_destination_${timestamp}`,
        playerId,
        '魅惑：你可以把它移动到另一个你有随从的基地',
        [
            createSkipOption('不移动，直接完成'),
            ...buildBaseTargetOptions(destinationBases, state.core),
        ],
        { sourceId: 'mermaids_charmed_destination', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: CharmedContinuation }).continuationContext = {
        minionUid: selected.minionUid,
        minionDefId: minion.defId,
        fromBaseIndex: selected.baseIndex,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsCharmedDestination: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as CharmedContinuation | undefined;
    if (!continuation) return { state, events: [] };

    const metadataEvent = buildMermaidsMetadataUpdatedEvent(
        continuation.minionUid,
        continuation.fromBaseIndex,
        { [MERMAIDS_CHARMED_SUPPRESSED_TURN_META]: state.core.turnNumber },
        'mermaids_charmed',
        timestamp,
    );
    if (selected.skip || selected.baseIndex === undefined) {
        return {
            state,
            events: [
                metadataEvent,
                grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'mermaids_charmed'),
            ],
        };
    }
    return {
        state,
        events: [
            ...buildValidatedMoveEvents(state, {
                minionUid: continuation.minionUid,
                minionDefId: continuation.minionDefId,
                fromBaseIndex: continuation.fromBaseIndex,
                toBaseIndex: selected.baseIndex,
                reason: 'mermaids_charmed',
                now: timestamp,
            }),
            metadataEvent,
            grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'mermaids_charmed'),
        ],
    };
};

export function registerMermaidsInteractionHandlers(): void {
    registerInteractionHandler('mermaids_charmer_move', handleMermaidsCharmerMove);
    registerInteractionHandler('mermaids_charmer_target', handleMermaidsCharmerTarget);
    registerInteractionHandler('mermaids_mermaid_queen_mode', handleMermaidsMermaidQueenMode);
    registerInteractionHandler('mermaids_mermaid_queen_move', handleMermaidsMermaidQueenMove);
    registerInteractionHandler('mermaids_mermaid_queen_control', handleMermaidsMermaidQueenControl);
    registerInteractionHandler('mermaids_captive_audience', handleMermaidsCaptiveAudience);
    registerInteractionHandler('mermaids_becalmed_shores', handleMermaidsOngoingMove);
    registerInteractionHandler('mermaids_shipwreck_cove_after_scoring', handleMermaidsOngoingMove);
    registerInteractionHandler('mermaids_ultimate_song_base', handleMermaidsUltimateSongBase);
    registerInteractionHandler('mermaids_ultimate_song_hand', handleMermaidsUltimateSongHand);
    registerInteractionHandler('mermaids_siren_song_base', handleMermaidsSirenSongBase);
    registerInteractionHandler('mermaids_siren_song_destination', handleMermaidsSirenSongDestination);
    registerInteractionHandler('mermaids_siren_song_target', handleMermaidsSirenSongTarget);
    registerInteractionHandler('mermaids_charmed', handleMermaidsCharmed);
    registerInteractionHandler('mermaids_charmed_destination', handleMermaidsCharmedDestination);
}
