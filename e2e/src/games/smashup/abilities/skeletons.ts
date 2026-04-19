import type { PlayerId } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler, type InteractionHandler } from '../domain/abilityInteractionHandlers';
import { registerTrigger } from '../domain/ongoingEffects';
import type { TriggerContext } from '../domain/ongoingEffects';
import { buildBuryCardEvents, uncoverBuriedCard } from '../domain/bury';
import {
    buildAbilityFeedback,
    buildBaseTargetOptions,
    buildMinionTargetOptions,
    buildValidatedDestroyEvents,
    createSkipOption,
    recoverCardsFromDiscard,
} from '../domain/abilityHelpers';
import { getBaseDef, getCardDef } from '../data/cards';
import { SU_EVENTS } from '../domain/types';
import type { CardInstance, MinionCardDef, MinionMetadataUpdatedEvent, SmashUpCore, SmashUpEvent } from '../domain/types';

type CardChoice = { cardUid?: string; defId?: string; skip?: boolean };
type BaseChoice = { baseIndex?: number; skip?: boolean };
type BuriedChoice = { cardUid?: string; baseIndex?: number; defId?: string; skip?: boolean };
type MinionChoice = { minionUid?: string; baseIndex?: number; defId?: string; skip?: boolean };

type BuryContinuation = {
    cardUid: string;
    defId: string;
    targetBaseIndex: number;
};

type GraveyardContinuation = {
    targetBaseIndex: number;
};

type HearseFleetContinuation = {
    targetBaseIndex: number;
};

type GravestonesContinuation = {
    cardUid: string;
    defId: string;
};

type RevenantContinuation = {
    sourceRevenantUid: string;
    sourceRevenantBaseIndex: number;
    cardUid: string;
    defId: string;
    ownerId: PlayerId;
};

const SKELETONS_REVENANT_TRIGGERED_TURN_META = 'skeletonsRevenantTriggeredTurn';

function isLowPowerMinionDefId(defId: string, maxPower: number = 3): boolean {
    const def = getCardDef(defId) as MinionCardDef | undefined;
    return !!def && def.type === 'minion' && def.power <= maxPower;
}

function getLowPowerHandCards(state: SmashUpCore, playerId: PlayerId, maxPower: number = 3): CardInstance[] {
    const player = state.players[playerId];
    if (!player) return [];
    return player.hand.filter(card => card.type === 'minion' && isLowPowerMinionDefId(card.defId, maxPower));
}

function getLowPowerDiscardCards(state: SmashUpCore, playerId: PlayerId, maxPower: number = 3): CardInstance[] {
    const player = state.players[playerId];
    if (!player) return [];
    return player.discard.filter(card => card.type === 'minion' && isLowPowerMinionDefId(card.defId, maxPower));
}

function collectOwnedBuriedCards(
    state: SmashUpCore,
    playerId: PlayerId,
    options?: { baseIndex?: number; maxPower?: number },
): Array<{ cardUid: string; defId: string; baseIndex: number; label: string }> {
    const maxPower = options?.maxPower ?? 3;
    const result: Array<{ cardUid: string; defId: string; baseIndex: number; label: string }> = [];
    state.bases.forEach((base, baseIndex) => {
        if (options?.baseIndex !== undefined && options.baseIndex !== baseIndex) return;
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        (base.buriedCards ?? []).forEach((buried) => {
            if (buried.controllerId !== playerId) return;
            if (!isLowPowerMinionDefId(buried.defId, maxPower)) return;
            const cardName = getCardDef(buried.defId)?.name ?? buried.defId;
            result.push({
                cardUid: buried.uid,
                defId: buried.defId,
                baseIndex,
                label: `${cardName} @ ${baseName}`,
            });
        });
    });
    return result;
}

function collectOpponentLowPowerMinions(state: SmashUpCore, playerId: PlayerId, maxPower: number = 3) {
    const targets: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    state.bases.forEach((base, baseIndex) => {
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        base.minions.forEach((minion) => {
            if (minion.controller === playerId) return;
            const def = getCardDef(minion.defId) as MinionCardDef | undefined;
            if (!def || def.power > maxPower) return;
            targets.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${def.name ?? def.id} @ ${baseName}`,
            });
        });
    });
    return targets;
}

function collectBasesWithOwnMinion(state: SmashUpCore, playerId: PlayerId): Array<{ baseIndex: number; label: string }> {
    return state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
            hasOwnMinion: base.minions.some(minion => minion.controller === playerId),
        }))
        .filter(entry => entry.hasOwnMinion)
        .map(({ baseIndex, label }) => ({ baseIndex, label }));
}

function buildHandMinionOptions(cards: CardInstance[]) {
    return cards.map((card, index) => ({
        id: `hand-${index}`,
        label: getCardDef(card.defId)?.name ?? card.defId,
        value: { cardUid: card.uid, defId: card.defId },
        _source: 'hand' as const,
        displayMode: 'card' as const,
    }));
}

function buildDiscardMinionOptions(cards: CardInstance[]) {
    return cards.map((card, index) => ({
        id: `discard-${index}`,
        label: getCardDef(card.defId)?.name ?? card.defId,
        value: { cardUid: card.uid, defId: card.defId },
        _source: 'discard' as const,
        displayMode: 'card' as const,
    }));
}

function queueDiscardSelectionForBury(
    matchState: AbilityContext['matchState'],
    playerId: PlayerId,
    sourceId: string,
    title: string,
    targetBaseIndex: number,
    cards: CardInstance[],
    now: number,
) {
    const interaction = createSimpleChoice(
        `${sourceId}_${now}`,
        playerId,
        title,
        [createSkipOption('跳过'), ...buildDiscardMinionOptions(cards)],
        { sourceId, targetType: 'discard' },
    );
    (interaction.data as { continuationContext?: GraveyardContinuation }).continuationContext = { targetBaseIndex };
    return queueInteraction(matchState, interaction);
}

function skeletonsReturnedOneOnPlay(ctx: AbilityContext): AbilityResult {
    const handTargets = getLowPowerHandCards(ctx.state, ctx.playerId, 3);
    if (handTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `skeletons_returned_one_${ctx.now}`,
        ctx.playerId,
        '归来者：你可以将一张力量 3 或以下的随从埋葬到此基地',
        [createSkipOption('跳过（不埋葬）'), ...buildHandMinionOptions(handTargets)],
        { sourceId: 'skeletons_returned_one', targetType: 'hand' },
    );
    (interaction.data as { continuationContext?: GraveyardContinuation }).continuationContext = { targetBaseIndex: ctx.baseIndex };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsPlaceEmDownOnPlay(ctx: AbilityContext): AbilityResult {
    const handTargets = getLowPowerHandCards(ctx.state, ctx.playerId, 3);
    if (handTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `skeletons_place_em_down_card_${ctx.now}`,
        ctx.playerId,
        '埋下去：选择一张力量 3 或以下的随从',
        [createSkipOption('跳过（不埋葬）'), ...buildHandMinionOptions(handTargets)],
        { sourceId: 'skeletons_place_em_down_card', targetType: 'hand' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsDigEmUpOnPlay(ctx: AbilityContext): AbilityResult {
    const buriedTargets = collectOwnedBuriedCards(ctx.state, ctx.playerId, { maxPower: 20 });
    if (buriedTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (buriedTargets.length === 1) {
        return uncoverBuriedCard({
            matchState: ctx.matchState,
            playerId: ctx.playerId,
            cardUid: buriedTargets[0].cardUid,
            baseIndex: buriedTargets[0].baseIndex,
            random: ctx.random,
            now: ctx.now,
            reason: 'skeletons_dig_em_up',
        });
    }

    const interaction = createSimpleChoice(
        `skeletons_dig_em_up_${ctx.now}`,
        ctx.playerId,
        '挖出来：选择一张你埋葬的牌并揭示打出',
        buriedTargets.map((target, index) => ({
            id: `buried-${index}`,
            label: target.label,
            value: { cardUid: target.cardUid, baseIndex: target.baseIndex, defId: target.defId },
            _source: 'static' as const,
            displayMode: 'card' as const,
        })),
        { sourceId: 'skeletons_dig_em_up', targetType: 'generic' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsBurstForthSpecial(ctx: AbilityContext): AbilityResult {
    const buriedTargets = collectOwnedBuriedCards(ctx.state, ctx.playerId, { baseIndex: ctx.baseIndex, maxPower: 20 });
    if (buriedTargets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (buriedTargets.length === 1) {
        return uncoverBuriedCard({
            matchState: ctx.matchState,
            playerId: ctx.playerId,
            cardUid: buriedTargets[0].cardUid,
            baseIndex: buriedTargets[0].baseIndex,
            random: ctx.random,
            now: ctx.now,
            reason: 'skeletons_burst_forth',
        });
    }
    const interaction = createSimpleChoice(
        `skeletons_burst_forth_${ctx.now}`,
        ctx.playerId,
        '破土而出：选择一张你埋葬在该基地的牌并揭示打出',
        buriedTargets.map((target, index) => ({
            id: `buried-${index}`,
            label: target.label,
            value: { cardUid: target.cardUid, baseIndex: target.baseIndex, defId: target.defId },
            _source: 'static' as const,
            displayMode: 'card' as const,
        })),
        { sourceId: 'skeletons_burst_forth', targetType: 'generic' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsGraveyardTalent(ctx: AbilityContext): AbilityResult {
    const cards = getLowPowerDiscardCards(ctx.state, ctx.playerId, 3);
    if (cards.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.discard_empty', ctx.now)] };
    }
    return {
        events: [],
        matchState: queueDiscardSelectionForBury(
            ctx.matchState,
            ctx.playerId,
            'skeletons_graveyard',
            '墓园：选择一张力量 3 或以下的随从埋葬到此基地',
            ctx.baseIndex,
            cards,
            ctx.now,
        ),
    };
}

function skeletonsLordOfBonesTalent(ctx: AbilityContext): AbilityResult {
    const cards = getLowPowerDiscardCards(ctx.state, ctx.playerId, 3);
    if (cards.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.discard_empty', ctx.now)] };
    }
    return {
        events: [],
        matchState: queueDiscardSelectionForBury(
            ctx.matchState,
            ctx.playerId,
            'skeletons_lord_of_bones',
            '白骨领主：选择一张力量 3 或以下的随从埋葬到此基地',
            ctx.baseIndex,
            cards,
            ctx.now,
        ),
    };
}

function skeletonsSpookyScaryOnPlay(ctx: AbilityContext): AbilityResult {
    const targets = collectOpponentLowPowerMinions(ctx.state, ctx.playerId, 3);
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (targets.length === 1) {
        return {
            events: buildValidatedDestroyEvents(ctx.matchState, {
                minionUid: targets[0].uid,
                minionDefId: targets[0].defId,
                fromBaseIndex: targets[0].baseIndex,
                destroyerId: ctx.playerId,
                reason: 'skeletons_spooky_scary',
                now: ctx.now,
                sourceKind: 'action',
            }),
        };
    }
    const interaction = createSimpleChoice(
        `skeletons_spooky_scary_${ctx.now}`,
        ctx.playerId,
        '阴森可怖：选择另一位玩家的一个力量 3 或以下随从，将其移入弃牌堆',
        buildMinionTargetOptions(targets, { state: ctx.state, sourcePlayerId: ctx.playerId, sourceDefId: ctx.defId }),
        { sourceId: 'skeletons_spooky_scary', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsGraveGoodsOnPlay(ctx: AbilityContext): AbilityResult {
    const cards = getLowPowerDiscardCards(ctx.state, ctx.playerId, 3);
    if (cards.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.discard_empty', ctx.now)] };
    }
    if (cards.length === 1) {
        return { events: [recoverCardsFromDiscard(ctx.playerId, [cards[0].uid], 'skeletons_grave_goods', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `skeletons_grave_goods_${ctx.now}`,
        ctx.playerId,
        '陪葬品：选择一张力量 3 或以下的随从从弃牌堆加入手牌',
        buildDiscardMinionOptions(cards),
        { sourceId: 'skeletons_grave_goods', targetType: 'discard' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsHearseFleetOnPlay(ctx: AbilityContext): AbilityResult {
    const cards = getLowPowerDiscardCards(ctx.state, ctx.playerId, 3);
    if (cards.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.discard_empty', ctx.now)] };
    }
    const bases = collectBasesWithOwnMinion(ctx.state, ctx.playerId);
    if (bases.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (bases.length === 1) {
        const interaction = createSimpleChoice(
            `skeletons_hearse_fleet_cards_${ctx.now}`,
            ctx.playerId,
            '灵车舰队：选择至多两张力量 3 或以下随从埋葬到该基地',
            buildDiscardMinionOptions(cards),
            { sourceId: 'skeletons_hearse_fleet_cards', targetType: 'discard', multi: { min: 0, max: Math.min(2, cards.length) } },
        );
        (interaction.data as { continuationContext?: HearseFleetContinuation }).continuationContext = { targetBaseIndex: bases[0].baseIndex };
        return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
    }

    const chooseBase = createSimpleChoice(
        `skeletons_hearse_fleet_base_${ctx.now}`,
        ctx.playerId,
        '灵车舰队：选择你有随从的一个基地',
        buildBaseTargetOptions(bases, ctx.state),
        { sourceId: 'skeletons_hearse_fleet_base', targetType: 'base' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, chooseBase) };
}

function skeletonsNoopSpecial(): AbilityResult {
    return { events: [] };
}

function buildRevenantMetadataUpdatedEvent(
    minionUid: string,
    baseIndex: number,
    metadataUpdate: Record<string, unknown>,
    timestamp: number,
): MinionMetadataUpdatedEvent {
    return {
        type: SU_EVENTS.MINION_METADATA_UPDATED,
        payload: {
            minionUid,
            baseIndex,
            metadataUpdate,
            reason: 'skeletons_revenant_once_per_turn',
        },
        timestamp,
    };
}

function skeletonsRevenantTriggered(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || !ctx.sourceCardUid || ctx.sourceControllerId === undefined || ctx.sourceBaseIndex === undefined) {
        return { events: [] };
    }
    if (!ctx.triggerMinion || !ctx.triggerMinionUid || !ctx.triggerMinionDefId || ctx.baseIndex === undefined) {
        return { events: [] };
    }
    if (ctx.baseIndex === ctx.sourceBaseIndex) return { events: [] };
    if (ctx.triggerMinion.owner !== ctx.sourceControllerId) return { events: [] };

    const triggerDef = getCardDef(ctx.triggerMinionDefId) as MinionCardDef | undefined;
    if (!triggerDef || triggerDef.type !== 'minion' || triggerDef.power > 3) return { events: [] };

    const revenant = ctx.state.bases[ctx.sourceBaseIndex]?.minions.find(minion => minion.uid === ctx.sourceCardUid);
    if (!revenant) return { events: [] };
    const usedTurn = Number(revenant.metadata?.[SKELETONS_REVENANT_TRIGGERED_TURN_META] ?? -1);
    if (usedTurn === ctx.state.turnNumber) return { events: [] };

    const baseOptions = ctx.state.bases.map((base, baseIndex) => ({
        baseIndex,
        label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
    }));
    if (baseOptions.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `skeletons_revenant_${ctx.now}_${ctx.sourceCardUid}`,
        ctx.sourceControllerId,
        '亡灵：你可以将该随从埋葬到任意基地',
        [createSkipOption('跳过（不埋葬）'), ...buildBaseTargetOptions(baseOptions, ctx.state)],
        { sourceId: 'skeletons_revenant', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: RevenantContinuation }).continuationContext = {
        sourceRevenantUid: ctx.sourceCardUid,
        sourceRevenantBaseIndex: ctx.sourceBaseIndex,
        cardUid: ctx.triggerMinionUid,
        defId: ctx.triggerMinionDefId,
        ownerId: ctx.triggerMinion.owner,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function skeletonsGravestonesAfterScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || ctx.sourceBaseIndex === undefined || !ctx.sourceControllerId) return { events: [] };
    const cards = getLowPowerDiscardCards(ctx.state, ctx.sourceControllerId, 3);
    if (cards.length === 0) return { events: [] };
    const targetBases = ctx.state.bases
        .map((base, baseIndex) => ({ baseIndex, label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}` }))
        .filter(base => base.baseIndex !== ctx.sourceBaseIndex);
    if (targetBases.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `skeletons_gravestones_after_scoring_card_${ctx.now}`,
        ctx.sourceControllerId,
        '墓碑群：选择一张力量 3 或以下随从（从弃牌堆埋葬到替换基地）',
        [createSkipOption('跳过（不埋葬）'), ...buildDiscardMinionOptions(cards)],
        { sourceId: 'skeletons_gravestones_after_scoring_card', targetType: 'discard' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

export function registerSkeletonAbilities(): void {
    registerAbility('skeletons_returned_one', 'onPlay', skeletonsReturnedOneOnPlay);
    registerAbility('skeletons_returned_one', 'special', skeletonsReturnedOneOnPlay);
    registerAbility('skeletons_revenant', 'special', skeletonsNoopSpecial);
    registerAbility('skeletons_place_em_down', 'onPlay', skeletonsPlaceEmDownOnPlay);
    registerAbility('skeletons_dig_em_up', 'onPlay', skeletonsDigEmUpOnPlay);
    registerAbility('skeletons_burst_forth', 'special', skeletonsBurstForthSpecial);
    registerAbility('skeletons_gravestones', 'special', skeletonsNoopSpecial);
    registerAbility('skeletons_graveyard', 'talent', skeletonsGraveyardTalent);
    registerAbility('skeletons_lord_of_bones', 'talent', skeletonsLordOfBonesTalent);
    registerAbility('skeletons_spooky_scary', 'onPlay', skeletonsSpookyScaryOnPlay);
    registerAbility('skeletons_grave_goods', 'onPlay', skeletonsGraveGoodsOnPlay);
    registerAbility('skeletons_hearse_fleet', 'onPlay', skeletonsHearseFleetOnPlay);
    registerAbility('skeletons_hearse_fleet', 'special', skeletonsHearseFleetOnPlay);

    registerTrigger('skeletons_gravestones', 'afterScoring', skeletonsGravestonesAfterScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('skeletons_revenant', 'onMinionDestroyed', skeletonsRevenantTriggered, {
        optional: true,
        perInstance: true,
    });
    registerTrigger('skeletons_revenant', 'onMinionDiscardedFromBase', skeletonsRevenantTriggered, {
        optional: true,
        perInstance: true,
    });
}

const handleSkeletonsReturnedOne: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selected = value as CardChoice;
    if (selected.skip || !selected.cardUid || !selected.defId) return { state, events: [] };
    const continuation = data?.continuationContext as GraveyardContinuation | undefined;
    if (!continuation) return { state, events: [] };
    return {
        state,
        events: buildBuryCardEvents({
            core: state.core,
            matchState: state,
            playerId,
            cardUid: selected.cardUid,
            defId: selected.defId,
            baseIndex: continuation.targetBaseIndex,
            trueOwnerId: playerId,
            buriedFrom: 'hand',
            reason: 'skeletons_returned_one',
            random,
            now,
        }),
    };
};

const handleSkeletonsPlaceEmDownCard: InteractionHandler = (state, playerId, value, _data, _random, now) => {
    const selected = value as CardChoice;
    if (selected.skip || !selected.cardUid || !selected.defId) return { state, events: [] };
    const baseOptions = state.core.bases.map((base, baseIndex) => ({
        baseIndex,
        label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
    }));
    const interaction = createSimpleChoice(
        `skeletons_place_em_down_base_${now}`,
        playerId,
        '埋下去：选择要埋葬到的基地',
        buildBaseTargetOptions(baseOptions, state.core),
        { sourceId: 'skeletons_place_em_down_base', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: BuryContinuation }).continuationContext = {
        cardUid: selected.cardUid,
        defId: selected.defId,
        targetBaseIndex: -1,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleSkeletonsPlaceEmDownBase: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selectedBase = value as BaseChoice;
    if (selectedBase.baseIndex === undefined) return { state, events: [] };
    const continuation = data?.continuationContext as BuryContinuation | undefined;
    if (!continuation) return { state, events: [] };
    return {
        state,
        events: buildBuryCardEvents({
            core: state.core,
            matchState: state,
            playerId,
            cardUid: continuation.cardUid,
            defId: continuation.defId,
            baseIndex: selectedBase.baseIndex,
            trueOwnerId: playerId,
            buriedFrom: 'hand',
            reason: 'skeletons_place_em_down',
            random,
            now,
        }),
    };
};

const handleSkeletonsDigEmUp: InteractionHandler = (state, playerId, value, _data, random, now) => {
    const selected = value as BuriedChoice;
    if (!selected.cardUid || selected.baseIndex === undefined) return { state, events: [] };
    return uncoverBuriedCard({
        matchState: state,
        playerId,
        cardUid: selected.cardUid,
        baseIndex: selected.baseIndex,
        random,
        now,
        reason: 'skeletons_dig_em_up',
    });
};

const handleSkeletonsBurstForth: InteractionHandler = (state, playerId, value, _data, random, now) => {
    const selected = value as BuriedChoice;
    if (!selected.cardUid || selected.baseIndex === undefined) return { state, events: [] };
    return uncoverBuriedCard({
        matchState: state,
        playerId,
        cardUid: selected.cardUid,
        baseIndex: selected.baseIndex,
        random,
        now,
        reason: 'skeletons_burst_forth',
    });
};

function buildDiscardBuryEvents(
    state: SmashUpCore,
    playerId: PlayerId,
    cardUid: string,
    defId: string,
    targetBaseIndex: number,
    random: TriggerContext['random'],
    now: number,
): SmashUpEvent[] {
    return buildBuryCardEvents({
        core: state,
        playerId,
        cardUid,
        defId,
        baseIndex: targetBaseIndex,
        trueOwnerId: playerId,
        buriedFrom: 'discard',
        reason: 'skeletons_bury_from_discard',
        random,
        now,
    });
}

const handleSkeletonsGraveyard: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selected = value as CardChoice;
    if (selected.skip || !selected.cardUid || !selected.defId) return { state, events: [] };
    const continuation = data?.continuationContext as GraveyardContinuation | undefined;
    if (!continuation) return { state, events: [] };
    return {
        state,
        events: buildDiscardBuryEvents(state.core, playerId, selected.cardUid, selected.defId, continuation.targetBaseIndex, random, now),
    };
};

const handleSkeletonsLordOfBones: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selected = value as CardChoice;
    if (selected.skip || !selected.cardUid || !selected.defId) return { state, events: [] };
    const continuation = data?.continuationContext as GraveyardContinuation | undefined;
    if (!continuation) return { state, events: [] };
    return {
        state,
        events: buildDiscardBuryEvents(state.core, playerId, selected.cardUid, selected.defId, continuation.targetBaseIndex, random, now),
    };
};

const handleSkeletonsSpookyScary: InteractionHandler = (state, playerId, value, _data, _random, now) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state,
        events: buildValidatedDestroyEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            destroyerId: playerId,
            reason: 'skeletons_spooky_scary',
            now,
            sourceKind: 'action',
        }),
    };
};

const handleSkeletonsGraveGoods: InteractionHandler = (state, playerId, value, _data, _random, now) => {
    const selected = value as CardChoice;
    if (!selected.cardUid) return { state, events: [] };
    return {
        state,
        events: [recoverCardsFromDiscard(playerId, [selected.cardUid], 'skeletons_grave_goods', now)],
    };
};

const handleSkeletonsHearseFleetBase: InteractionHandler = (state, playerId, value, _data, _random, now) => {
    const selected = value as BaseChoice;
    if (selected.baseIndex === undefined) return { state, events: [] };
    const cards = getLowPowerDiscardCards(state.core, playerId, 3);
    if (cards.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `skeletons_hearse_fleet_cards_${now}`,
        playerId,
        '灵车舰队：选择至多两张力量 3 或以下随从埋葬到该基地',
        buildDiscardMinionOptions(cards),
        { sourceId: 'skeletons_hearse_fleet_cards', targetType: 'discard', multi: { min: 0, max: Math.min(2, cards.length) } },
    );
    (interaction.data as { continuationContext?: HearseFleetContinuation }).continuationContext = { targetBaseIndex: selected.baseIndex };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleSkeletonsHearseFleetCards: InteractionHandler = (state, playerId, value, data, random, now) => {
    const continuation = data?.continuationContext as HearseFleetContinuation | undefined;
    if (!continuation) return { state, events: [] };
    const picks = Array.isArray(value) ? value as CardChoice[] : [value as CardChoice];
    const selectedCards = picks.filter(pick => !pick.skip && pick.cardUid && pick.defId).slice(0, 2);
    if (selectedCards.length === 0) return { state, events: [] };
    const events = selectedCards.flatMap((card) => buildDiscardBuryEvents(
        state.core,
        playerId,
        card.cardUid!,
        card.defId!,
        continuation.targetBaseIndex,
        random,
        now,
    ));
    return { state, events };
};

const handleSkeletonsGravestonesAfterScoringCard: InteractionHandler = (state, playerId, value, _data, _random, now) => {
    const selected = value as CardChoice;
    if (selected.skip || !selected.cardUid || !selected.defId) return { state, events: [] };
    const baseOptions = state.core.bases.map((base, baseIndex) => ({
        baseIndex,
        label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
    }));
    const interaction = createSimpleChoice(
        `skeletons_gravestones_after_scoring_base_${now}`,
        playerId,
        '墓碑群：选择替换基地',
        buildBaseTargetOptions(baseOptions, state.core),
        { sourceId: 'skeletons_gravestones_after_scoring_base', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: GravestonesContinuation }).continuationContext = {
        cardUid: selected.cardUid,
        defId: selected.defId,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleSkeletonsGravestonesAfterScoringBase: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selectedBase = value as BaseChoice;
    if (selectedBase.baseIndex === undefined) return { state, events: [] };
    const continuation = data?.continuationContext as GravestonesContinuation | undefined;
    if (!continuation) return { state, events: [] };
    return {
        state,
        events: buildDiscardBuryEvents(
            state.core,
            playerId,
            continuation.cardUid,
            continuation.defId,
            selectedBase.baseIndex,
            random,
            now,
        ),
    };
};

const handleSkeletonsRevenant: InteractionHandler = (state, playerId, value, data, random, now) => {
    const selectedBase = value as BaseChoice;
    if (selectedBase.skip || selectedBase.baseIndex === undefined) return { state, events: [] };
    const continuation = data?.continuationContext as RevenantContinuation | undefined;
    if (!continuation) return { state, events: [] };

    const revenant = state.core.bases[continuation.sourceRevenantBaseIndex]
        ?.minions.find(minion => minion.uid === continuation.sourceRevenantUid);
    if (!revenant || revenant.controller !== playerId) return { state, events: [] };

    const inPlay = state.core.bases
        .map((base, baseIndex) => ({
            baseIndex,
            minion: base.minions.find(minion => minion.uid === continuation.cardUid),
        }))
        .find(entry => entry.minion !== undefined);

    return {
        state,
        events: [
            ...buildBuryCardEvents({
                core: state.core,
                matchState: state,
                playerId,
                cardUid: continuation.cardUid,
                defId: continuation.defId,
                baseIndex: selectedBase.baseIndex,
                trueOwnerId: continuation.ownerId,
                buriedFrom: inPlay ? 'play' : 'discard',
                reason: 'skeletons_revenant',
                random,
                now,
            }),
            buildRevenantMetadataUpdatedEvent(
                continuation.sourceRevenantUid,
                continuation.sourceRevenantBaseIndex,
                { [SKELETONS_REVENANT_TRIGGERED_TURN_META]: state.core.turnNumber },
                now,
            ),
        ],
    };
};

export function registerSkeletonInteractionHandlers(): void {
    registerInteractionHandler('skeletons_returned_one', handleSkeletonsReturnedOne);
    registerInteractionHandler('skeletons_place_em_down_card', handleSkeletonsPlaceEmDownCard);
    registerInteractionHandler('skeletons_place_em_down_base', handleSkeletonsPlaceEmDownBase);
    registerInteractionHandler('skeletons_dig_em_up', handleSkeletonsDigEmUp);
    registerInteractionHandler('skeletons_burst_forth', handleSkeletonsBurstForth);
    registerInteractionHandler('skeletons_graveyard', handleSkeletonsGraveyard);
    registerInteractionHandler('skeletons_lord_of_bones', handleSkeletonsLordOfBones);
    registerInteractionHandler('skeletons_spooky_scary', handleSkeletonsSpookyScary);
    registerInteractionHandler('skeletons_grave_goods', handleSkeletonsGraveGoods);
    registerInteractionHandler('skeletons_hearse_fleet_base', handleSkeletonsHearseFleetBase);
    registerInteractionHandler('skeletons_hearse_fleet_cards', handleSkeletonsHearseFleetCards);
    registerInteractionHandler('skeletons_gravestones_after_scoring_card', handleSkeletonsGravestonesAfterScoringCard);
    registerInteractionHandler('skeletons_gravestones_after_scoring_base', handleSkeletonsGravestonesAfterScoringBase);
    registerInteractionHandler('skeletons_revenant', handleSkeletonsRevenant);
}
