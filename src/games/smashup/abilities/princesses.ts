import type { MatchState, PlayerId } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { InteractionHandler } from '../domain/abilityInteractionHandlers';
import {
    addTempPower,
    buildAbilityFeedback,
    buildBaseTargetOptions,
    buildMinionTargetOptions,
    buildStandardDrawEvents,
    buildValidatedCardToDeckBottomEvents,
    buildValidatedDestroyEvents,
    buildValidatedMoveEvents,
    createSkipOption,
    getMinionPower,
    peekDeckTop,
    recoverCardsFromDiscard,
} from '../domain/abilityHelpers';
import { registerInterceptor, registerTrigger } from '../domain/ongoingEffects';
import type { TriggerContext, TriggerResult } from '../domain/ongoingEffects';
import { getBaseDef, getCardDef } from '../data/cards';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, DeckReorderedEvent, OngoingDetachedEvent, SmashUpCore, SmashUpEvent } from '../domain/types';

type ButtonChoice = {
    choice?: 'draw' | 'buff' | 'move_to_bottom';
    skip?: boolean;
};

type MinionChoice = {
    minionUid?: string;
    baseIndex?: number;
    defId?: string;
    skip?: boolean;
};

type CardChoice = {
    cardUid?: string;
    defId?: string;
};

type BaseChoice = {
    baseIndex?: number;
    baseDefId?: string;
};

type MoveContinuation = {
    minionUid: string;
    defId: string;
    fromBaseIndex: number;
    reason: string;
};

type WoodlandHelpersContinuation = {
    cardUid: string;
    defId: string;
    ownerId: PlayerId;
};

function collectAllMinions(core: SmashUpCore) {
    const targets: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    for (let baseIndex = 0; baseIndex < core.bases.length; baseIndex++) {
        const base = core.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const minion of base.minions) {
            targets.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${getCardDef(minion.defId)?.name ?? minion.defId} @ ${baseName}`,
            });
        }
    }
    return targets;
}

function getOtherBaseChoices(core: SmashUpCore, fromBaseIndex: number) {
    return core.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
        }))
        .filter(candidate => candidate.baseIndex !== fromBaseIndex);
}

function queueMoveDestinationPrompt(
    matchState: MatchState<SmashUpCore>,
    playerId: PlayerId,
    now: number,
    sourceId: 'princesses_true_loves_kiss_base' | 'princesses_some_day_my_prince_will_come_base',
    title: string,
    continuation: MoveContinuation,
): MatchState<SmashUpCore> {
    const options = buildBaseTargetOptions(getOtherBaseChoices(matchState.core, continuation.fromBaseIndex), matchState.core);
    if (options.length === 0) return matchState;
    const interaction = createSimpleChoice(
        `${sourceId}_${now}`,
        playerId,
        title,
        options,
        { sourceId, targetType: 'base', autoResolveIfSingle: false },
    );
    (interaction.data as { continuationContext?: MoveContinuation }).continuationContext = continuation;
    return queueInteraction(matchState, interaction);
}

function shuffleCardIntoDeck(
    core: SmashUpCore,
    playerId: PlayerId,
    cardUid: string,
    defId: string,
    random: AbilityContext['random'] | TriggerContext['random'],
    now: number,
    reason: string,
): SmashUpEvent[] {
    const player = core.players[playerId];
    if (!player) return [];
    const existingDeck = player.deck.filter(card => card.uid !== cardUid);
    const shuffled = random.shuffle([
        ...existingDeck,
        {
            uid: cardUid,
            defId,
            type: (getCardDef(defId)?.type ?? 'minion') as 'minion' | 'action' | 'fusion' | 'titan',
            owner: playerId,
        },
    ]);
    return [
        ...buildValidatedCardToDeckBottomEvents(core, {
            cardUid,
            defId,
            ownerId: playerId,
            reason,
            now,
            expectedLocation: 'any',
        }),
        {
            type: SU_EVENTS.DECK_REORDERED,
            payload: {
                playerId,
                deckUids: shuffled.map(card => card.uid),
            },
            timestamp: now,
        } as SmashUpEvent,
    ];
}

function parseActionCardUid(sourceEventId?: string): string | undefined {
    if (!sourceEventId) return undefined;
    const match = /^action-played:([^:]+):/.exec(sourceEventId);
    return match?.[1];
}

function princessesHappilyEverAfter(ctx: TriggerContext): TriggerResult | SmashUpEvent[] {
    if (ctx.rankings?.some(ranking => ranking.playerId === ctx.playerId && ranking.vp > 0) !== true) {
        return [];
    }
    return [{
        type: SU_EVENTS.VP_AWARDED,
        payload: {
            playerId: ctx.playerId,
            amount: 1,
            reason: 'princesses_happily_ever_after',
        },
        timestamp: ctx.now,
    } as SmashUpEvent];
}

function princessesWoodlandHelpers(ctx: TriggerContext): TriggerResult | SmashUpEvent[] {
    if (!ctx.matchState) return [];
    const cardUid = parseActionCardUid(ctx.sourceEventId);
    if (!cardUid) return [];

    const player = ctx.state.players[ctx.playerId];
    const card = player?.discard.find(entry => entry.uid === cardUid);
    if (!player || !card || card.type !== 'action') return [];

    const cardName = getCardDef(card.defId)?.name ?? card.defId;
    const interaction = createSimpleChoice(
        `princesses_woodland_helpers_${cardUid}_${ctx.now}`,
        ctx.playerId,
        `丛林帮手：你可以将 ${cardName} 放到牌库底而不是留在弃牌堆`,
        [
            { id: 'move-bottom', label: '放到牌库底', value: { choice: 'move_to_bottom' }, displayMode: 'button' as const },
            createSkipOption('留在弃牌堆'),
        ],
        { sourceId: 'princesses_woodland_helpers', targetType: 'button', autoResolveIfSingle: false },
    );
    (interaction.data as { continuationContext?: WoodlandHelpersContinuation }).continuationContext = {
        cardUid,
        defId: card.defId,
        ownerId: ctx.playerId,
    };
    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, interaction),
    };
}

function princessesSleepingBeautyOnDestroyed(ctx: TriggerContext): TriggerResult | SmashUpEvent[] {
    if (ctx.triggerMinion?.uid !== ctx.sourceCardUid || !ctx.triggerMinionDefId || ctx.baseIndex === undefined) {
        return [];
    }
    return shuffleCardIntoDeck(
        ctx.state,
        ctx.triggerMinion.owner,
        ctx.triggerMinion.uid,
        ctx.triggerMinionDefId,
        ctx.random,
        ctx.now,
        'princesses_sleeping_beauty',
    );
}

function princessesSleepingBeautyOnDiscarded(ctx: TriggerContext): TriggerResult | SmashUpEvent[] {
    if (ctx.triggerMinionDefId !== 'princesses_sleeping_beauty' && ctx.triggerMinionDefId !== 'princesses_sleeping_beauty_pod') {
        return [];
    }
    const player = ctx.state.players[ctx.playerId];
    const card = player?.discard.find(entry => entry.uid === ctx.triggerMinionUid && entry.defId === ctx.triggerMinionDefId);
    if (!card || !ctx.triggerMinionUid) return [];

    const shuffled = ctx.random.shuffle([...player.deck, card]);
    return [{
        type: SU_EVENTS.DECK_REORDERED,
        payload: {
            playerId: ctx.playerId,
            deckUids: shuffled.map(entry => entry.uid),
        },
        timestamp: ctx.now,
    } as SmashUpEvent];
}

function princessesHeirloomInterceptor(_state: SmashUpCore, event: SmashUpEvent): SmashUpEvent | null | undefined {
    if (event.type !== SU_EVENTS.ONGOING_DETACHED) return undefined;
    const payload = (event as OngoingDetachedEvent).payload;
    if (payload.defId !== 'princesses_heirloom' && payload.defId !== 'princesses_heirloom_pod') return undefined;
    if (!payload.reason.includes('destroy')) return undefined;
    return null;
}

function princessesApricot(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions
        .filter(minion => minion.controller !== ctx.playerId)
        .filter(minion => getMinionPower(ctx.state, minion, ctx.baseIndex) <= 2)
        .map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: ctx.baseIndex,
            label: getCardDef(minion.defId)?.name ?? minion.defId,
        }));
    if (targets.length === 0) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const interaction = createSimpleChoice(
        `princesses_apricot_${ctx.now}`,
        ctx.playerId,
        '杏子公主：选择这里另一个玩家的一个力量为 2 或更小的仆从',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'destroy',
        }),
        { sourceId: 'princesses_apricot', targetType: 'minion', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesMarieDeGraw(ctx: AbilityContext): AbilityResult {
    const peeked = peekDeckTop(ctx.state, ctx.random, ctx.playerId, 'all', 'princesses_marie_degraw', ctx.now);
    if (!peeked) return { events: [] };
    if (peeked.card.type === 'minion') {
        return {
            events: [
                ...peeked.events,
                ...buildStandardDrawEvents(ctx.state, ctx.playerId, 1, ctx.random, ctx.now),
            ],
        };
    }
    return {
        events: [
            ...peeked.events,
            ...buildValidatedCardToDeckBottomEvents(ctx.state, {
                cardUid: peeked.card.uid,
                defId: peeked.card.defId,
                ownerId: ctx.playerId,
                reason: 'princesses_marie_degraw',
                now: ctx.now,
                expectedLocation: 'deck',
            }),
        ],
    };
}

function princessesDirectToDvdSequel(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (!player) return { events: [] };

    const options = player.discard
        .filter(card => card.type === 'minion')
        .map((card, index) => ({
            id: `discard-${index}`,
            label: getCardDef(card.defId)?.name ?? card.defId,
            value: { cardUid: card.uid, defId: card.defId },
            _source: 'discard' as const,
            displayMode: 'card' as const,
        }));
    if (options.length === 0) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const interaction = createSimpleChoice(
        `princesses_direct_to_dvd_sequel_${ctx.now}`,
        ctx.playerId,
        '直出结局：选择你弃牌堆中的一个仆从',
        options,
        { sourceId: 'princesses_direct_to_dvd_sequel', targetType: 'generic', autoRefresh: 'discard', responseValidationMode: 'live' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesFairyGodmother(ctx: AbilityContext): AbilityResult {
    const interaction = createSimpleChoice(
        `princesses_fairy_godmother_${ctx.now}`,
        ctx.playerId,
        '妖精奶奶：抽一张牌，或者让一个仆从获得 +2 力量直到回合结束',
        [
            { id: 'draw', label: '抽一张牌', value: { choice: 'draw' }, displayMode: 'button' as const },
            { id: 'buff', label: '给予 +2 力量', value: { choice: 'buff' }, displayMode: 'button' as const },
        ],
        { sourceId: 'princesses_fairy_godmother', targetType: 'button', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesSkillet(ctx: AbilityContext): AbilityResult {
    const targets = collectAllMinions(ctx.state)
        .filter(target => {
            const live = ctx.state.bases[target.baseIndex]?.minions.find(minion => minion.uid === target.uid);
            return !!live && getMinionPower(ctx.state, live, target.baseIndex) <= 2;
        });
    if (targets.length === 0) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const interaction = createSimpleChoice(
        `princesses_skillet_${ctx.now}`,
        ctx.playerId,
        '平底锅：选择一个力量为 2 或更小的仆从',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'destroy',
        }),
        { sourceId: 'princesses_skillet', targetType: 'minion', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesTrueLovesKiss(ctx: AbilityContext): AbilityResult {
    if (ctx.state.bases.length < 2) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const targets = collectAllMinions(ctx.state);
    if (targets.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `princesses_true_loves_kiss_${ctx.now}`,
        ctx.playerId,
        '真爱之吻：选择一个仆从移动到另一个基地',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'move',
        }),
        { sourceId: 'princesses_true_loves_kiss', targetType: 'minion', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesSomeDayMyPrinceWillCome(ctx: AbilityContext): AbilityResult {
    if (ctx.state.bases.length < 2) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.map(minion => ({
        uid: minion.uid,
        defId: minion.defId,
        baseIndex: ctx.baseIndex,
        label: getCardDef(minion.defId)?.name ?? minion.defId,
    }));
    if (targets.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `princesses_some_day_my_prince_will_come_${ctx.now}`,
        ctx.playerId,
        '总有一天我的王子会来的：选择一个仆从从这里移动到另一个基地',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'move',
        }),
        { sourceId: 'princesses_some_day_my_prince_will_come', targetType: 'minion', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesTaleAsOldAsTime(ctx: AbilityContext): AbilityResult {
    if (!ctx.state.bases[ctx.baseIndex]) return { events: [] };
    return {
        events: collectAllMinions(ctx.state)
            .filter(target => target.baseIndex !== ctx.baseIndex)
            .filter(target => ctx.state.bases[target.baseIndex]?.minions.some(
                minion => minion.uid === target.uid && minion.controller === ctx.playerId,
            ))
            .flatMap(target => buildValidatedMoveEvents(ctx.matchState, {
                minionUid: target.uid,
                minionDefId: target.defId,
                fromBaseIndex: target.baseIndex,
                toBaseIndex: ctx.baseIndex,
                toBaseDefId: ctx.state.bases[ctx.baseIndex]?.defId,
                reason: 'princesses_tale_as_old_as_time',
                now: ctx.now,
            })),
    };
}

function princessesSnowWhite(ctx: AbilityContext): AbilityResult {
    const targets = collectAllMinions(ctx.state).filter(target => target.baseIndex !== ctx.baseIndex);
    if (targets.length === 0) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const interaction = createSimpleChoice(
        `princesses_snow_white_${ctx.now}`,
        ctx.playerId,
        '白雪公主：选择另一个基地上的一个仆从移动到这里',
        buildMinionTargetOptions(targets, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'move',
        }),
        { sourceId: 'princesses_snow_white', targetType: 'minion', autoResolveIfSingle: false },
    );
    (interaction.data as { continuationContext?: { destinationBaseIndex?: number } }).continuationContext = {
        destinationBaseIndex: ctx.baseIndex,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function princessesGriselda(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (!player) return { events: [] };
    const heirlooms = player.discard
        .filter(card => card.defId === 'princesses_heirloom' || card.defId === 'princesses_heirloom_pod')
        .map((card, index) => ({
            id: `discard-${index}`,
            label: getCardDef(card.defId)?.name ?? card.defId,
            value: { cardUid: card.uid, defId: card.defId },
            _source: 'discard' as const,
            displayMode: 'card' as const,
        }));
    if (heirlooms.length === 0) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const interaction = createSimpleChoice(
        `princesses_griselda_${ctx.now}`,
        ctx.playerId,
        '格丽泽尔达：选择你弃牌堆中的一张传家宝回到手牌',
        heirlooms,
        { sourceId: 'princesses_griselda', targetType: 'generic', autoRefresh: 'discard', responseValidationMode: 'live' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

export function registerPrincessesAbilities(): void {
    registerAbility('princesses_apricot', 'talent', princessesApricot);
    registerAbility('princesses_marie_degraw', 'talent', princessesMarieDeGraw);
    registerAbility('princesses_direct_to_dvd_sequel', 'onPlay', princessesDirectToDvdSequel);
    registerAbility('princesses_fairy_godmother', 'onPlay', princessesFairyGodmother);
    registerAbility('princesses_skillet', 'onPlay', princessesSkillet);
    registerAbility('princesses_true_loves_kiss', 'onPlay', princessesTrueLovesKiss);
    registerAbility('princesses_some_day_my_prince_will_come', 'special', princessesSomeDayMyPrinceWillCome);
    registerAbility('princesses_tale_as_old_as_time', 'onPlay', princessesTaleAsOldAsTime);
    registerAbility('princesses_snow_white', 'talent', princessesSnowWhite);
    registerAbility('princesses_griselda', 'talent', princessesGriselda);

    registerTrigger('princesses_happily_ever_after', 'afterScoring', princessesHappilyEverAfter, {
        perInstance: true,
        sourceScope: 'triggerBase',
        playerContext: 'sourceController',
    });
    registerTrigger('princesses_woodland_helpers', 'onActionPlayed', princessesWoodlandHelpers, {
        perInstance: true,
        playerContext: 'sourceController',
        baseScoped: false,
    });
    registerTrigger('princesses_sleeping_beauty', 'onMinionDestroyed', princessesSleepingBeautyOnDestroyed, {
        phase: 'replacement',
        perInstance: true,
    });
    registerTrigger('princesses_sleeping_beauty', 'onMinionDiscardedFromBase', princessesSleepingBeautyOnDiscarded, {
        global: true,
        globalZones: ['discard'],
        playerContext: 'eventPlayer',
    });
    registerInterceptor('princesses_heirloom', princessesHeirloomInterceptor);
}

const handlePrincessesApricot: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state,
        events: buildValidatedDestroyEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            destroyerId: playerId,
            reason: 'princesses_apricot',
            now: timestamp,
        }),
    };
};

const handlePrincessesDirectToDvdSequel: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as CardChoice | undefined;
    if (!selected?.cardUid || !selected.defId) return { state, events: [] };
    const player = state.core.players[playerId];
    const card = player?.discard.find(entry => entry.uid === selected.cardUid && entry.defId === selected.defId);
    if (!player || !card) return { state, events: [] };

    const shuffledDeck = random.shuffle([...player.deck, card]);
    const events: SmashUpEvent[] = [{
        type: SU_EVENTS.DECK_REORDERED,
        payload: {
            playerId,
            deckUids: shuffledDeck.map(entry => entry.uid),
        },
        timestamp,
    } as DeckReorderedEvent];
    const drawCard = shuffledDeck[0];
    if (drawCard) {
        events.push({
            type: SU_EVENTS.CARDS_DRAWN,
            payload: {
                playerId,
                count: 1,
                cardUids: [drawCard.uid],
            },
            timestamp,
        } as CardsDrawnEvent);
    }
    return { state, events };
};

const handlePrincessesFairyGodmother: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as ButtonChoice | undefined;
    if (selected?.choice === 'draw') {
        return {
            state,
            events: buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
        };
    }
    if (selected?.choice !== 'buff') return { state, events: [] };

    const targets = collectAllMinions(state.core);
    if (targets.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `princesses_fairy_godmother_target_${timestamp}`,
        playerId,
        '妖精奶奶：选择一个仆从获得 +2 力量直到回合结束',
        buildMinionTargetOptions(targets, {
            state: state.core,
            sourcePlayerId: playerId,
            sourceDefId: 'princesses_fairy_godmother',
            effectType: 'power_change',
        }),
        { sourceId: 'princesses_fairy_godmother_target', targetType: 'minion', autoResolveIfSingle: false },
    );
    return { state: queueInteraction(state, interaction), events: [] };
};

const handlePrincessesFairyGodmotherTarget: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    return {
        state,
        events: [
            addTempPower(
                selected.minionUid,
                selected.baseIndex,
                2,
                'princesses_fairy_godmother',
                timestamp,
            ),
        ],
    };
};

const handlePrincessesSkillet: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state,
        events: [
            ...buildValidatedDestroyEvents(state, {
                minionUid: selected.minionUid,
                minionDefId: selected.defId,
                fromBaseIndex: selected.baseIndex,
                destroyerId: playerId,
                reason: 'princesses_skillet',
                now: timestamp,
            }),
            ...buildStandardDrawEvents(state.core, playerId, 3, random, timestamp),
        ],
    };
};

const handlePrincessesTrueLovesKiss: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state: queueMoveDestinationPrompt(
            state,
            playerId,
            timestamp,
            'princesses_true_loves_kiss_base',
            '真爱之吻：选择要移动到的基地',
            {
                minionUid: selected.minionUid,
                defId: selected.defId,
                fromBaseIndex: selected.baseIndex,
                reason: 'princesses_true_loves_kiss',
            },
        ),
        events: [],
    };
};

const handlePrincessesMoveToBase: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice | undefined;
    const continuation = data?.continuationContext as MoveContinuation | undefined;
    if (selected?.baseIndex === undefined || !continuation) return { state, events: [] };
    return {
        state,
        events: buildValidatedMoveEvents(state, {
            minionUid: continuation.minionUid,
            minionDefId: continuation.defId,
            fromBaseIndex: continuation.fromBaseIndex,
            toBaseIndex: selected.baseIndex,
            toBaseDefId: selected.baseDefId,
            reason: continuation.reason,
            now: timestamp,
        }),
    };
};

const handlePrincessesSomeDayMyPrinceWillCome: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state: queueMoveDestinationPrompt(
            state,
            playerId,
            timestamp,
            'princesses_some_day_my_prince_will_come_base',
            '总有一天我的王子会来的：选择要移动到的基地',
            {
                minionUid: selected.minionUid,
                defId: selected.defId,
                fromBaseIndex: selected.baseIndex,
                reason: 'princesses_some_day_my_prince_will_come',
            },
        ),
        events: [],
    };
};

const handlePrincessesSnowWhite: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice | undefined;
    const destinationBaseIndex = (data?.continuationContext as { destinationBaseIndex?: number } | undefined)?.destinationBaseIndex;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId || destinationBaseIndex === undefined) {
        return { state, events: [] };
    }
    return {
        state,
        events: buildValidatedMoveEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            toBaseIndex: destinationBaseIndex,
            toBaseDefId: state.core.bases[destinationBaseIndex]?.defId,
            reason: 'princesses_snow_white',
            now: timestamp,
        }),
    };
};

const handlePrincessesGriselda: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as CardChoice | undefined;
    if (!selected?.cardUid) return { state, events: [] };
    return {
        state,
        events: [recoverCardsFromDiscard(playerId, [selected.cardUid], 'princesses_griselda', timestamp)],
    };
};

const handlePrincessesWoodlandHelpers: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as ButtonChoice | undefined;
    const continuation = data?.continuationContext as WoodlandHelpersContinuation | undefined;
    if (!continuation || selected?.skip || selected?.choice !== 'move_to_bottom') return { state, events: [] };
    return {
        state,
        events: buildValidatedCardToDeckBottomEvents(state, {
            cardUid: continuation.cardUid,
            defId: continuation.defId,
            ownerId: continuation.ownerId,
            reason: 'princesses_woodland_helpers',
            now: timestamp,
            expectedLocation: 'discard',
        }),
    };
};

export function registerPrincessesInteractionHandlers(): void {
    registerInteractionHandler('princesses_apricot', handlePrincessesApricot);
    registerInteractionHandler('princesses_direct_to_dvd_sequel', handlePrincessesDirectToDvdSequel);
    registerInteractionHandler('princesses_fairy_godmother', handlePrincessesFairyGodmother);
    registerInteractionHandler('princesses_fairy_godmother_target', handlePrincessesFairyGodmotherTarget);
    registerInteractionHandler('princesses_skillet', handlePrincessesSkillet);
    registerInteractionHandler('princesses_true_loves_kiss', handlePrincessesTrueLovesKiss);
    registerInteractionHandler('princesses_true_loves_kiss_base', handlePrincessesMoveToBase);
    registerInteractionHandler('princesses_some_day_my_prince_will_come', handlePrincessesSomeDayMyPrinceWillCome);
    registerInteractionHandler('princesses_some_day_my_prince_will_come_base', handlePrincessesMoveToBase);
    registerInteractionHandler('princesses_snow_white', handlePrincessesSnowWhite);
    registerInteractionHandler('princesses_griselda', handlePrincessesGriselda);
    registerInteractionHandler('princesses_woodland_helpers', handlePrincessesWoodlandHelpers);
}
