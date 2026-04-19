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
    buildValidatedMoveEvents,
    buildStandardDrawEvents,
    createSkipOption,
    getMinionPower,
    grantContextualExtraAction,
    grantContextualExtraMinion,
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { MinionReturnedEvent, SmashUpEvent } from '../domain/types';
import { getBaseDef, getCardDef } from '../data/cards';

type MinionChoice = { minionUid?: string; baseIndex?: number; defId?: string; skip?: boolean };
type BaseChoice = { baseIndex?: number; skip?: boolean };

type MoveContinuation = {
    fromBaseIndex: number;
    minionUid: string;
    minionDefId: string;
    reason: string;
    grantExtraAction?: boolean;
};

type SirenSongBaseContinuation = {
    fromBaseIndex: number;
};

function collectMinionsOnBase(
    state: AbilityContext['state'],
    baseIndex: number,
    predicate: (controller: PlayerId) => boolean,
) {
    const base = state.bases[baseIndex];
    if (!base) return [];
    const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
    return base.minions
        .filter(minion => predicate(minion.controller))
        .map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex,
            label: `${getCardDef(minion.defId)?.name ?? minion.defId} @ ${baseName}`,
        }));
}

function collectAllMinions(state: AbilityContext['state']) {
    return state.bases.flatMap((base, baseIndex) => {
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        return base.minions.map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex,
            label: `${getCardDef(minion.defId)?.name ?? minion.defId} @ ${baseName}`,
        }));
    });
}

function getOtherBases(state: AbilityContext['state'], fromBaseIndex: number) {
    return state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
        }))
        .filter(base => base.baseIndex !== fromBaseIndex);
}

function buildMoveMinionOptions(
    ctx: AbilityContext,
    targets: ReturnType<typeof collectMinionsOnBase>,
    includeSkip: boolean = false,
) {
    return [
        ...(includeSkip ? [createSkipOption('跳过（不移动）')] : []),
        ...buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'move',
            sourceKind: 'action',
            respectActionProtection: true,
        }),
    ];
}

function mermaidsCharmerTalent(ctx: AbilityContext): AbilityResult {
    const targets = collectMinionsOnBase(ctx.state, ctx.baseIndex, controller => controller !== ctx.playerId);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_charmer_${ctx.now}`,
        ctx.playerId,
        '魅惑者：选择另一位玩家在此基地的一个随从',
        buildMoveMinionOptions(ctx, targets),
        { sourceId: 'mermaids_charmer', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: Partial<MoveContinuation> }).continuationContext = {
        reason: 'mermaids_charmer',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsMermaidQueenOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectMinionsOnBase(ctx.state, ctx.baseIndex, controller => controller !== ctx.playerId);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_mermaid_queen_${ctx.now}`,
        ctx.playerId,
        '美人鱼女王：你可以将此基地的一张对手随从移动到另一个基地',
        buildMoveMinionOptions(ctx, targets, true),
        { sourceId: 'mermaids_mermaid_queen', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: Partial<MoveContinuation> }).continuationContext = {
        reason: 'mermaids_mermaid_queen',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsCaptiveAudienceOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectMinionsOnBase(ctx.state, ctx.baseIndex, controller => controller !== ctx.playerId);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_captive_audience_${ctx.now}`,
        ctx.playerId,
        '俘虏观众：选择另一位玩家在此基地的一个随从',
        buildMoveMinionOptions(ctx, targets),
        { sourceId: 'mermaids_captive_audience', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: Partial<MoveContinuation> }).continuationContext = {
        reason: 'mermaids_captive_audience',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsBecalmedShoresTalent(ctx: AbilityContext): AbilityResult {
    const targets = collectMinionsOnBase(ctx.state, ctx.baseIndex, controller => controller === ctx.playerId);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_becalmed_shores_${ctx.now}`,
        ctx.playerId,
        '静风海岸：选择你在此基地的一个随从并移动到另一个基地',
        buildMoveMinionOptions(ctx, targets),
        { sourceId: 'mermaids_becalmed_shores', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: Partial<MoveContinuation> }).continuationContext = {
        reason: 'mermaids_becalmed_shores',
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsUltimateSongOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectMinionsOnBase(ctx.state, ctx.baseIndex, controller => controller === ctx.playerId);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_ultimate_song_${ctx.now}`,
        ctx.playerId,
        '终极歌声：选择你在此基地的一个随从并移动到另一个基地',
        buildMoveMinionOptions(ctx, targets),
        { sourceId: 'mermaids_ultimate_song', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: Partial<MoveContinuation> }).continuationContext = {
        reason: 'mermaids_ultimate_song',
        grantExtraAction: true,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function mermaidsSirenSongOnPlay(ctx: AbilityContext): AbilityResult {
    const sourceBases = ctx.state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
            minionCount: base.minions.length,
        }))
        .filter(base => base.minionCount > 0);
    if (sourceBases.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `mermaids_siren_song_base_${ctx.now}`,
        ctx.playerId,
        '海妖之歌：选择一个包含随从的基地',
        buildBaseTargetOptions(sourceBases, ctx.state),
        { sourceId: 'mermaids_siren_song_base', targetType: 'base' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function buildDesertIslandReturnEvents(
    state: AbilityContext['state'],
    baseIndex: number,
    sourcePlayerId: PlayerId,
    now: number,
): SmashUpEvent[] {
    const base = state.bases[baseIndex];
    if (!base) return [];
    const events: SmashUpEvent[] = [];
    const minionsByController = new Map<PlayerId, typeof base.minions>();
    for (const minion of base.minions) {
        const list = minionsByController.get(minion.controller) ?? [];
        list.push(minion);
        minionsByController.set(minion.controller, list);
    }

    for (const [controllerId, minions] of minionsByController.entries()) {
        if (minions.length <= 1) continue;
        const overflow = minions.slice(1);
        for (const minion of overflow) {
            events.push({
                type: SU_EVENTS.MINION_RETURNED,
                payload: {
                    minionUid: minion.uid,
                    minionDefId: minion.defId,
                    fromBaseIndex: baseIndex,
                    toPlayerId: minion.owner,
                    reason: 'mermaids_desert_island_limit',
                    sourcePlayerId,
                    sourceDefId: 'mermaids_desert_island',
                    sourceControllerId: sourcePlayerId,
                    sourceBaseIndex: baseIndex,
                },
                timestamp: now,
            } as MinionReturnedEvent);
            const remaining = minionsByController.get(controllerId) ?? [];
            minionsByController.set(controllerId, remaining.filter(entry => entry.uid !== minion.uid));
        }
    }
    return events;
}

function mermaidsTollBayOnPlay(): AbilityResult {
    return { events: [] };
}

function mermaidsShipwreckCoveSpecial(): AbilityResult {
    return { events: [] };
}

function mermaidsDesertIslandOnPlay(ctx: AbilityContext): AbilityResult {
    return {
        events: buildDesertIslandReturnEvents(ctx.state, ctx.baseIndex, ctx.playerId, ctx.now),
    };
}

function mermaidsCharmedOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectAllMinions(ctx.state);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (targets.length === 1) {
        const minion = ctx.state.bases[targets[0].baseIndex]?.minions.find(entry => entry.uid === targets[0].uid);
        if (!minion) return { events: [] };
        const currentPower = getMinionPower(ctx.state, minion, targets[0].baseIndex);
        return {
            events: [
                addTempPower(targets[0].uid, targets[0].baseIndex, -currentPower, 'mermaids_charmed', ctx.now),
            ],
        };
    }

    const interaction = createSimpleChoice(
        `mermaids_charmed_${ctx.now}`,
        ctx.playerId,
        '蛊惑：选择一个随从，本回合其力量视为 0',
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

function mermaidsTollBayMovedTrigger(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.sourceControllerId === undefined || ctx.moveToBaseIndex === undefined || !ctx.triggerMinion) {
        return [];
    }
    if (ctx.triggerMinion.controller === ctx.sourceControllerId) return [];
    const targetBase = ctx.state.bases[ctx.moveToBaseIndex];
    if (!targetBase) return [];
    const hasOwnMinion = targetBase.minions.some(minion => minion.controller === ctx.sourceControllerId);
    if (!hasOwnMinion) return [];
    return buildStandardDrawEvents(ctx.state, ctx.sourceControllerId, 1, ctx.random, ctx.now);
}

function mermaidsShipwreckCoveAfterScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.sourceControllerId) return { events: [] };
    return {
        events: [
            grantContextualExtraMinion(
                { playerId: ctx.sourceControllerId, now: ctx.now, matchState: ctx.matchState },
                'mermaids_shipwreck_cove',
            ),
        ],
    };
}

function mermaidsDesertIslandOnMinionPlayed(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.sourceBaseIndex === undefined || ctx.baseIndex === undefined) return [];
    if (ctx.baseIndex !== ctx.sourceBaseIndex) return [];
    return buildDesertIslandReturnEvents(ctx.state, ctx.sourceBaseIndex, ctx.sourceControllerId ?? ctx.playerId, ctx.now);
}

function mermaidsDesertIslandOnMinionMoved(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.sourceBaseIndex === undefined || ctx.baseIndex === undefined) return [];
    if (ctx.baseIndex !== ctx.sourceBaseIndex) return [];
    return buildDesertIslandReturnEvents(ctx.state, ctx.sourceBaseIndex, ctx.sourceControllerId ?? ctx.playerId, ctx.now);
}

function mermaidsDesertIslandOnMinionAffected(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.affectType !== 'control_change') return [];
    if (ctx.sourceBaseIndex === undefined || ctx.baseIndex === undefined) return [];
    if (ctx.baseIndex !== ctx.sourceBaseIndex) return [];
    return buildDesertIslandReturnEvents(ctx.state, ctx.sourceBaseIndex, ctx.sourceControllerId ?? ctx.playerId, ctx.now);
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

    registerTrigger('mermaids_toll_bay', 'onMinionMoved', mermaidsTollBayMovedTrigger, { perInstance: true });
    registerTrigger('mermaids_shipwreck_cove', 'afterScoring', mermaidsShipwreckCoveAfterScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('mermaids_desert_island', 'onMinionPlayed', mermaidsDesertIslandOnMinionPlayed, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('mermaids_desert_island', 'onMinionMoved', mermaidsDesertIslandOnMinionMoved, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('mermaids_desert_island', 'onMinionAffected', mermaidsDesertIslandOnMinionAffected, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });
}

const handleMermaidsMoveMinion: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (selected.skip || !selected.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    const continuation = data?.continuationContext as Partial<MoveContinuation> | undefined;
    const destinationBases = getOtherBases(state.core, selected.baseIndex);
    if (destinationBases.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `mermaids_move_base_${timestamp}`,
        playerId,
        '选择要移动到的基地',
        buildBaseTargetOptions(destinationBases, state.core),
        { sourceId: 'mermaids_move_base', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: MoveContinuation }).continuationContext = {
        fromBaseIndex: selected.baseIndex,
        minionUid: selected.minionUid,
        minionDefId: selected.defId,
        reason: continuation?.reason ?? 'mermaids_move',
        grantExtraAction: continuation?.grantExtraAction,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsMoveBase: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as MoveContinuation | undefined;
    if (selected.baseIndex === undefined || !continuation) return { state, events: [] };
    const moveEvents = buildValidatedMoveEvents(state, {
        minionUid: continuation.minionUid,
        minionDefId: continuation.minionDefId,
        fromBaseIndex: continuation.fromBaseIndex,
        toBaseIndex: selected.baseIndex,
        reason: continuation.reason,
        now: timestamp,
    });
    return {
        state,
        events: [
            ...moveEvents,
            ...(moveEvents.length > 0 && continuation.grantExtraAction
                ? [grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, continuation.reason)]
                : []),
        ],
    };
};

const handleMermaidsSirenSongBase: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as BaseChoice;
    if (selected.baseIndex === undefined) return { state, events: [] };
    const targets = collectMinionsOnBase(state.core, selected.baseIndex, () => true);
    if (targets.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `mermaids_siren_song_minion_${timestamp}`,
        playerId,
        '海妖之歌：选择要移动的随从',
        buildMinionTargetOptions(targets, {
            state: state.core,
            sourcePlayerId: playerId,
            sourceDefId: 'mermaids_siren_song',
            effectType: 'move',
            sourceKind: 'action',
            respectActionProtection: true,
        }),
        { sourceId: 'mermaids_siren_song_minion', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: SirenSongBaseContinuation }).continuationContext = {
        fromBaseIndex: selected.baseIndex,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsSirenSongMinion: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    const continuation = data?.continuationContext as SirenSongBaseContinuation | undefined;
    if (!selected.minionUid || !selected.defId || continuation?.fromBaseIndex === undefined) return { state, events: [] };
    const destinationBases = getOtherBases(state.core, continuation.fromBaseIndex);
    if (destinationBases.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `mermaids_siren_song_destination_${timestamp}`,
        playerId,
        '海妖之歌：选择目标基地',
        buildBaseTargetOptions(destinationBases, state.core),
        { sourceId: 'mermaids_siren_song_destination', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: MoveContinuation }).continuationContext = {
        fromBaseIndex: continuation.fromBaseIndex,
        minionUid: selected.minionUid,
        minionDefId: selected.defId,
        reason: 'mermaids_siren_song',
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleMermaidsCharmed: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion) return { state, events: [] };
    const currentPower = getMinionPower(state.core, minion, selected.baseIndex);
    return {
        state,
        events: [
            addTempPower(selected.minionUid, selected.baseIndex, -currentPower, 'mermaids_charmed', timestamp),
        ],
    };
};

export function registerMermaidsInteractionHandlers(): void {
    registerInteractionHandler('mermaids_charmer', handleMermaidsMoveMinion);
    registerInteractionHandler('mermaids_mermaid_queen', handleMermaidsMoveMinion);
    registerInteractionHandler('mermaids_captive_audience', handleMermaidsMoveMinion);
    registerInteractionHandler('mermaids_becalmed_shores', handleMermaidsMoveMinion);
    registerInteractionHandler('mermaids_ultimate_song', handleMermaidsMoveMinion);
    registerInteractionHandler('mermaids_move_base', handleMermaidsMoveBase);
    registerInteractionHandler('mermaids_siren_song_base', handleMermaidsSirenSongBase);
    registerInteractionHandler('mermaids_siren_song_minion', handleMermaidsSirenSongMinion);
    registerInteractionHandler('mermaids_siren_song_destination', handleMermaidsMoveBase);
    registerInteractionHandler('mermaids_charmed', handleMermaidsCharmed);
}
