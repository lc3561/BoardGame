import type { MatchState, PlayerId } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { InteractionHandler } from '../domain/abilityInteractionHandlers';
import {
    addPermanentPower,
    buildActionMinionTargetOptions,
    buildBaseTargetOptions,
    buildStandardDrawEvents,
    buildValidatedReturnEvents,
    buildAbilityFeedback,
    createSkipOption,
    findMinionOnBases,
    getAvailableSpiritOfTheForestOrTitan,
    getTitanByController,
    grantContextualExtraAction,
    grantContextualExtraMinion,
    markSpiritOfTheForestOrUsed,
    playTitan,
} from '../domain/abilityHelpers';
import { registerProtection, registerRestriction } from '../domain/ongoingEffects';
import type { ProtectionCheckContext, RestrictionCheckContext } from '../domain/ongoingEffects';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpCore, SmashUpEvent, OngoingAttachedEvent, OngoingDetachedEvent } from '../domain/types';
import { getBaseDef, getCardDef } from '../data/cards';

type MinionChoice = {
    minionUid?: string;
    baseIndex?: number;
    defId?: string;
    choice?: 'return_minion';
};

type ButtonChoice = {
    choice?:
        | 'extra_minion'
        | 'extra_action'
        | 'draw_card'
        | 'draw_two'
        | 'draw_one_and_action'
        | 'discard_others'
        | 'destroy_actions'
        | 'play_spirit'
        | 'self_bonus'
        | 'plus'
        | 'minus';
    skip?: boolean;
};

type AttachedActionSnapshot = {
    metadata?: Record<string, unknown>;
    talentUsed?: boolean;
};

type AttachedActionState = {
    cardUid: string;
    defId: string;
    ownerId: PlayerId;
    baseIndex: number;
    minionUid: string;
    snapshot?: AttachedActionSnapshot;
};

function appendTimedPowerModifier(
    matchState: MatchState<SmashUpCore>,
    minionUid: string,
    amount: number,
    reason: string,
): MatchState<SmashUpCore> {
    const expiresOnTurnNumber = matchState.core.turnNumber + matchState.core.turnOrder.length;
    return {
        ...matchState,
        core: {
            ...matchState.core,
            timedPowerModifiers: [
                ...(matchState.core.timedPowerModifiers ?? []),
                { minionUid, amount, expiresOnTurnNumber, reason },
            ],
        },
    };
}

function findAttachedActionState(
    state: SmashUpCore,
    cardUid: string,
): AttachedActionState | undefined {
    for (let baseIndex = 0; baseIndex < state.bases.length; baseIndex++) {
        const base = state.bases[baseIndex];
        for (const minion of base.minions) {
            const attached = minion.attachedActions.find(action => action.uid === cardUid) as
                | (typeof minion.attachedActions[number] & { metadata?: Record<string, unknown> })
                | undefined;
            if (!attached) continue;
            return {
                cardUid: attached.uid,
                defId: attached.defId,
                ownerId: attached.ownerId,
                baseIndex,
                minionUid: minion.uid,
                snapshot: {
                    ...(attached.metadata ? { metadata: attached.metadata } : {}),
                    ...(attached.talentUsed !== undefined ? { talentUsed: attached.talentUsed } : {}),
                },
            };
        }
    }
    return undefined;
}

function buildTransferAttachedActionEvents(
    attached: AttachedActionState,
    targetBaseIndex: number,
    targetMinionUid: string,
    reason: string,
    timestamp: number,
): SmashUpEvent[] {
    return [
        {
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: {
                cardUid: attached.cardUid,
                defId: attached.defId,
                ownerId: attached.ownerId,
                reason,
            },
            timestamp,
        } as OngoingDetachedEvent,
        {
            type: SU_EVENTS.ONGOING_ATTACHED,
            payload: {
                cardUid: attached.cardUid,
                defId: attached.defId,
                ownerId: attached.ownerId,
                targetType: 'minion',
                targetBaseIndex,
                targetMinionUid,
                ...(attached.snapshot?.metadata ? { metadata: attached.snapshot.metadata } : {}),
                ...(attached.snapshot?.talentUsed !== undefined ? { talentUsed: attached.snapshot.talentUsed } : {}),
            },
            timestamp,
        } as OngoingAttachedEvent,
    ];
}

function queueTransferSelfPrompt(
    ctx: AbilityContext,
    sourceId: 'fairies_ladybug' | 'fairies_leaf_armor',
    title: string,
): AbilityResult {
    const attached = findAttachedActionState(ctx.state, ctx.cardUid);
    if (!attached) return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };

    const candidates: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    for (let baseIndex = 0; baseIndex < ctx.state.bases.length; baseIndex++) {
        const base = ctx.state.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const minion of base.minions) {
            if (baseIndex === attached.baseIndex && minion.uid === attached.minionUid) continue;
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            candidates.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${minionName} @ ${baseName}`,
            });
        }
    }

    if (candidates.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `${sourceId}_${ctx.now}`,
        ctx.playerId,
        title,
        buildActionMinionTargetOptions(candidates, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            effectType: 'affect',
        }),
        { sourceId, targetType: 'minion', autoResolveIfSingle: false },
    );

    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, {
            ...interaction,
            data: { ...interaction.data, continuationContext: attached },
        }),
    };
}

function queueGlymmerPrompt(ctx: AbilityContext): AbilityResult {
    const current = findMinionOnBases(ctx.state, ctx.cardUid);
    if (!current) return { events: [] };

    const minionOptions = [];
    for (let baseIndex = 0; baseIndex < ctx.state.bases.length; baseIndex++) {
        const base = ctx.state.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const minion of base.minions) {
            if (minion.uid === ctx.cardUid) continue;
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            minionOptions.push({
                id: `minion-${minion.uid}`,
                label: `${minionName} @ ${baseName}`,
                value: { choice: 'target_other', minionUid: minion.uid, baseIndex, defId: minion.defId },
                _source: 'field' as const,
                displayMode: 'card' as const,
            });
        }
    }

    const options = [
        { id: 'self', label: '本随从直到你的下回合开始时 +1 力量', value: { choice: 'self_bonus' }, displayMode: 'button' as const },
        ...minionOptions,
    ];

    const interaction = createSimpleChoice(
        `fairies_glymmer_${ctx.now}`,
        ctx.playerId,
        'Glymmer：选择另一个随从直到你的下回合开始时 -4 力量，或让本随从直到你的下回合开始时 +1 力量',
        options,
        { sourceId: 'fairies_glymmer', targetType: 'generic', autoResolveIfSingle: false },
    );

    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, {
            ...interaction,
            data: {
                ...interaction.data,
                continuationContext: {
                    sourceCardUid: ctx.cardUid,
                    sourceBaseIndex: current.baseIndex,
                },
            },
        }),
    };
}

function buildTitaniaReturnOptions(state: SmashUpCore) {
    const options = [];
    for (let baseIndex = 0; baseIndex < state.bases.length; baseIndex++) {
        const base = state.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const minion of base.minions) {
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            options.push({
                id: `return-${minion.uid}`,
                label: `${minionName} @ ${baseName}`,
                value: { choice: 'return_minion' as const, minionUid: minion.uid, baseIndex, defId: minion.defId },
                _source: 'field' as const,
                displayMode: 'card' as const,
            });
        }
    }
    return options;
}

function buildPlayfulTricksActionOptions(state: SmashUpCore) {
    const options = [];
    for (let baseIndex = 0; baseIndex < state.bases.length; baseIndex++) {
        const base = state.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const ongoing of base.ongoingActions) {
            const actionName = getCardDef(ongoing.defId)?.name ?? ongoing.defId;
            options.push({
                id: `base-${ongoing.uid}`,
                label: `${actionName} @ ${baseName}`,
                value: { cardUid: ongoing.uid, defId: ongoing.defId, ownerId: ongoing.ownerId },
                _source: 'field' as const,
                displayMode: 'card' as const,
            });
        }
        for (const minion of base.minions) {
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            for (const attached of minion.attachedActions) {
                const actionName = getCardDef(attached.defId)?.name ?? attached.defId;
                options.push({
                    id: `minion-${attached.uid}`,
                    label: `${actionName} @ ${minionName} @ ${baseName}`,
                    value: { cardUid: attached.uid, defId: attached.defId, ownerId: attached.ownerId },
                    _source: 'field' as const,
                    displayMode: 'card' as const,
                });
            }
        }
    }
    return options;
}

function getOwnedSetAsideSpiritOfTheForest(state: SmashUpCore, playerId: PlayerId) {
    return (state.titans ?? []).find((titan) =>
        titan.defId === 'fairies_spirit_of_the_forest'
        && titan.ownerId === playerId
        && titan.location.zone === 'setaside',
    );
}

function queuePlayfulTricksDestroyPrompt(
    ctx: AbilityContext,
    options: Array<{ id: string; label: string; value: { cardUid: string; defId: string; ownerId: PlayerId }; _source: 'field'; displayMode: 'card' }>,
    continuationContext?: Record<string, unknown>,
): AbilityResult {
    const interaction = createSimpleChoice(
        `fairies_playful_tricks_${ctx.now}`,
        ctx.playerId,
        '有趣的把戏：选择至多两张打在基地或随从上的行动卡并摧毁它们',
        options,
        {
            sourceId: 'fairies_playful_tricks',
            targetType: 'generic',
            multi: { min: 0, max: Math.min(2, options.length) },
            autoResolveIfSingle: false,
        },
    );

    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, continuationContext
            ? {
                ...interaction,
                data: {
                    ...interaction.data,
                    continuationContext,
                },
            }
            : interaction),
    };
}

function queuePlayfulTricksSpiritBasePrompt(
    matchState: MatchState<SmashUpCore>,
    playerId: PlayerId,
    titanUid: string,
    now: number,
    continuationContext?: Record<string, unknown>,
) {
    const options = buildBaseTargetOptions(
        matchState.core.bases.map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
        })),
        matchState.core,
    );
    const interaction = createSimpleChoice(
        `fairies_playful_tricks_spirit_base_${now}`,
        playerId,
        '有趣的把戏：选择一个基地来打出丛林之灵',
        options,
        {
            sourceId: 'fairies_playful_tricks_spirit_base',
            targetType: 'base',
            autoResolveIfSingle: false,
        },
    );

    return queueInteraction(matchState, {
        ...interaction,
        data: {
            ...interaction.data,
            continuationContext: {
                titanUid,
                ...(continuationContext ?? {}),
            },
        },
    });
}

export function registerFairiesAbilities(): void {
    registerAbility('fairies_titania', 'onPlay', fairiesTitania);
    registerAbility('fairies_glymmer', 'talent', fairiesGlymmer);
    registerAbility('fairies_puck', 'onPlay', fairiesPuck);
    registerAbility('fairies_tinx', 'onPlay', fairiesTinx);
    registerAbility('fairies_ladybug', 'talent', fairiesLadybug);
    registerAbility('fairies_leaf_armor', 'talent', fairiesLeafArmor);
    registerAbility('fairies_magic_acorns', 'onPlay', fairiesMagicAcorns);
    registerAbility('fairies_playful_tricks', 'onPlay', fairiesPlayfulTricks);
    registerAbility('fairies_enchantment', 'onPlay', fairiesEnchantment);
    registerAbility('fairies_fairy_ballet', 'onPlay', fairiesFairyBallet);

    registerProtection('fairies_ladybug', 'destroy', fairiesLadybugProtectionChecker);
    registerRestriction('fairies_magic_ward', 'play_action', fairiesMagicWardRestrictionChecker);
}

function fairiesTitania(ctx: AbilityContext): AbilityResult {
    const options = [
        {
            id: 'extra-minion',
            label: '额外打出一个随从',
            value: { choice: 'extra_minion' },
            displayMode: 'button' as const,
        },
    ];
    options.push(...buildTitaniaReturnOptions(ctx.state));

    const interaction = createSimpleChoice(
        `fairies_titania_${ctx.now}`,
        ctx.playerId,
        'Titania：将一个随从移回其拥有者手牌，或额外打出一个随从',
        options,
        { sourceId: 'fairies_titania', targetType: 'generic', autoResolveIfSingle: false },
    );

    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function fairiesGlymmer(ctx: AbilityContext): AbilityResult {
    return queueGlymmerPrompt(ctx);
}

function fairiesPuck(ctx: AbilityContext): AbilityResult {
    const interaction = createSimpleChoice(
        `fairies_puck_${ctx.now}`,
        ctx.playerId,
        'Puck：额外打出一张行动卡，或抽一张牌',
        [
            { id: 'extra-action', label: '额外打出一张行动卡', value: { choice: 'extra_action' }, displayMode: 'button' as const },
            { id: 'draw-card', label: '抽一张牌', value: { choice: 'draw_card' }, displayMode: 'button' as const },
        ],
        { sourceId: 'fairies_puck', targetType: 'button', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function fairiesTinx(ctx: AbilityContext): AbilityResult {
    const current = findMinionOnBases(ctx.state, ctx.cardUid);
    if (!current) return { events: [] };

    const options = [createSkipOption()];
    for (let baseIndex = 0; baseIndex < ctx.state.bases.length; baseIndex++) {
        const base = ctx.state.bases[baseIndex];
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        for (const minion of base.minions) {
            if (minion.uid === ctx.cardUid) continue;
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            for (const attached of minion.attachedActions) {
                const actionName = getCardDef(attached.defId)?.name ?? attached.defId;
                options.push({
                    id: `attached-${attached.uid}`,
                    label: `${actionName} @ ${minionName} @ ${baseName}`,
                    value: { cardUid: attached.uid },
                    _source: 'field' as const,
                    displayMode: 'card' as const,
                });
            }
        }
    }

    if (options.length === 1) return { events: [] };

    const interaction = createSimpleChoice(
        `fairies_tinx_${ctx.now}`,
        ctx.playerId,
        'Tinx：你可以将另一个随从上的一张行动卡移到这张牌上',
        options,
        { sourceId: 'fairies_tinx', targetType: 'generic', autoResolveIfSingle: false },
    );

    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, {
            ...interaction,
            data: { ...interaction.data, continuationContext: { targetBaseIndex: current.baseIndex, targetMinionUid: ctx.cardUid } },
        }),
    };
}

function fairiesLadybug(ctx: AbilityContext): AbilityResult {
    return queueTransferSelfPrompt(ctx, 'fairies_ladybug', 'Ladybug：选择另一个随从来转移这张牌');
}

function fairiesLeafArmor(ctx: AbilityContext): AbilityResult {
    return queueTransferSelfPrompt(ctx, 'fairies_leaf_armor', '叶之甲：选择另一个随从来转移这张牌');
}

function fairiesMagicAcorns(ctx: AbilityContext): AbilityResult {
    const interaction = createSimpleChoice(
        `fairies_magic_acorns_${ctx.now}`,
        ctx.playerId,
        '魔法橡子：选择让每位其他玩家随机弃一张牌，或抽一张牌并额外打出一张行动卡',
        [
            { id: 'discard-others', label: '每位其他玩家随机弃一张牌', value: { choice: 'discard_others' }, displayMode: 'button' as const },
            { id: 'draw-and-action', label: '抽一张牌并额外打出一张行动卡', value: { choice: 'draw_one_and_action' }, displayMode: 'button' as const },
        ],
        { sourceId: 'fairies_magic_acorns', targetType: 'button', autoResolveIfSingle: false },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function fairiesPlayfulTricks(ctx: AbilityContext): AbilityResult {
    const actionOptions = buildPlayfulTricksActionOptions(ctx.state);
    const setAsideSpirit = getOwnedSetAsideSpiritOfTheForest(ctx.state, ctx.playerId);
    const canPlaySpirit = !!setAsideSpirit && !getTitanByController(ctx.state, ctx.playerId);

    if (!canPlaySpirit) {
        if (actionOptions.length === 0) return { events: [] };
        return queuePlayfulTricksDestroyPrompt(ctx, actionOptions);
    }

    const branchOptions = [
        { id: 'destroy-actions', label: '消灭至多两张行动卡', value: { choice: 'destroy_actions' }, displayMode: 'button' as const },
        { id: 'play-spirit', label: '打出丛林之灵', value: { choice: 'play_spirit' }, displayMode: 'button' as const },
    ];
    const interaction = createSimpleChoice(
        `fairies_playful_tricks_mode_${ctx.now}`,
        ctx.playerId,
        '有趣的把戏：选择消灭至多两张行动卡，或打出丛林之灵',
        branchOptions,
        { sourceId: 'fairies_playful_tricks_mode', targetType: 'button', autoResolveIfSingle: false },
    );
    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, {
            ...interaction,
            data: {
                ...interaction.data,
                continuationContext: {
                    titanUid: setAsideSpirit?.uid,
                    hasActionTargets: actionOptions.length > 0,
                },
            },
        }),
    };
}

function fairiesEnchantment(ctx: AbilityContext): AbilityResult {
    const interaction = createSimpleChoice(
        `fairies_enchantment_${ctx.now}`,
        ctx.playerId,
        '结果：选择让此基地所有随从 +1 力量，或所有随从 -1 力量',
        [
            { id: 'plus', label: '所有随从 +1 力量', value: { choice: 'plus' }, displayMode: 'button' as const },
            { id: 'minus', label: '所有随从 -1 力量', value: { choice: 'minus' }, displayMode: 'button' as const },
        ],
        { sourceId: 'fairies_enchantment', targetType: 'button', autoResolveIfSingle: false },
    );

    return {
        events: [],
        matchState: queueInteraction(ctx.matchState, {
            ...interaction,
            data: { ...interaction.data, continuationContext: { baseIndex: ctx.baseIndex } },
        }),
    };
}

function fairiesFairyBallet(ctx: AbilityContext): AbilityResult {
    const interaction = createSimpleChoice(
        `fairies_fairy_ballet_${ctx.now}`,
        ctx.playerId,
        '精灵芭蕾：抽两张牌，或抽一张牌并额外打出一张行动卡',
        [
            { id: 'draw-two', label: '抽两张牌', value: { choice: 'draw_two' }, displayMode: 'button' as const },
            { id: 'draw-one-action', label: '抽一张牌并额外打出一张行动卡', value: { choice: 'draw_one_and_action' }, displayMode: 'button' as const },
        ],
        { sourceId: 'fairies_fairy_ballet', targetType: 'button', autoResolveIfSingle: false },
    );

    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function fairiesLadybugProtectionChecker(ctx: ProtectionCheckContext): boolean {
    return ctx.targetMinion.attachedActions.some(action => action.defId === 'fairies_ladybug' || action.defId === 'fairies_ladybug_pod');
}

function fairiesMagicWardRestrictionChecker(ctx: RestrictionCheckContext): boolean {
    const ward = ctx.state.bases[ctx.baseIndex]?.ongoingActions.find(action =>
        action.defId === 'fairies_magic_ward' || action.defId === 'fairies_magic_ward_pod',
    );
    if (!ward) return false;
    return ward.ownerId !== ctx.playerId;
}

const handleFairiesTitania: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice & ButtonChoice;
    const spirit = getAvailableSpiritOfTheForestOrTitan(state.core, playerId);

    if (selected.choice === 'extra_minion') {
        const extraMinionEvent = grantContextualExtraMinion({ playerId, now: timestamp, matchState: state }, 'fairies_titania');
        if (!spirit) {
            return {
                state,
                events: [extraMinionEvent],
            };
        }

        const returnOptions = buildTitaniaReturnOptions(state.core);
        if (returnOptions.length === 0) {
            return {
                state,
                events: [
                    extraMinionEvent,
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ],
            };
        }

        const interaction = createSimpleChoice(
            `fairies_titania_spirit_return_${timestamp}`,
            playerId,
            '丛林之灵：再将一个随从移回其拥有者手牌',
            returnOptions,
            { sourceId: 'fairies_titania_spirit_return', targetType: 'generic', autoResolveIfSingle: false },
        );
        return {
            state: queueInteraction(state, interaction),
            events: [
                extraMinionEvent,
                markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
            ],
        };
    }
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const returnEvents = buildValidatedReturnEvents(state, {
        minionUid: selected.minionUid,
        minionDefId: selected.defId ?? '',
        fromBaseIndex: selected.baseIndex,
        reason: 'fairies_titania',
        now: timestamp,
        sourcePlayerId: playerId,
    });
    if (spirit) {
        return {
            state,
            events: [
                ...returnEvents,
                grantContextualExtraMinion({ playerId, now: timestamp, matchState: state }, 'fairies_titania'),
                markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
            ],
        };
    }
    return {
        state,
        events: returnEvents,
    };
};

const handleFairiesTitaniaSpiritReturn: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    return {
        state,
        events: buildValidatedReturnEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId ?? '',
            fromBaseIndex: selected.baseIndex,
            reason: 'fairies_titania_spirit',
            now: timestamp,
            sourcePlayerId: playerId,
        }),
    };
};

const handleFairiesGlymmer: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice & ButtonChoice;
    const continuation = (_data?.continuationContext as { sourceCardUid?: string; sourceBaseIndex?: number } | undefined);
    if (!continuation?.sourceCardUid || continuation.sourceBaseIndex === undefined) {
        return { state, events: [] };
    }
    const glymmer = state.core.bases[continuation.sourceBaseIndex]?.minions.find(
        minion => minion.uid === continuation.sourceCardUid,
    );
    if (!glymmer) return { state, events: [] };

    if (selected.choice === 'self_bonus') {
        return {
            state: appendTimedPowerModifier(state, glymmer.uid, 1, 'fairies_glymmer'),
            events: [addPermanentPower(glymmer.uid, continuation.sourceBaseIndex, 1, 'fairies_glymmer', timestamp)],
        };
    }

    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const target = state.core.bases[selected.baseIndex]?.minions.find(minion => minion.uid === selected.minionUid);
    if (!target) return { state, events: [] };
    return {
        state: appendTimedPowerModifier(state, target.uid, -4, 'fairies_glymmer'),
        events: [addPermanentPower(target.uid, selected.baseIndex, -4, 'fairies_glymmer', timestamp)],
    };
};

const handleFairiesPuck: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as ButtonChoice;
    const spirit = getAvailableSpiritOfTheForestOrTitan(state.core, playerId);
    if (selected.choice === 'extra_action') {
        return {
            state,
            events: spirit
                ? [
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_puck'),
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ]
                : [grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_puck')],
        };
    }
    if (selected.choice === 'draw_card') {
        return {
            state,
            events: spirit
                ? [
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_puck'),
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ]
                : buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
        };
    }
    return { state, events: [] };
};

const handleFairiesTinx: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as { skip?: boolean; cardUid?: string };
    const continuation = (data?.continuationContext as { targetBaseIndex?: number; targetMinionUid?: string } | undefined);
    if (selected.skip || !selected.cardUid || continuation?.targetBaseIndex === undefined || !continuation.targetMinionUid) {
        return { state, events: [] };
    }
    const attached = findAttachedActionState(state.core, selected.cardUid);
    if (!attached || (attached.baseIndex === continuation.targetBaseIndex && attached.minionUid === continuation.targetMinionUid)) {
        return { state, events: [] };
    }
    return {
        state,
        events: buildTransferAttachedActionEvents(
            attached,
            continuation.targetBaseIndex,
            continuation.targetMinionUid,
            'fairies_tinx',
            timestamp,
        ),
    };
};

function handleTransferSelfTalent(sourceId: 'fairies_ladybug' | 'fairies_leaf_armor', reason: string): InteractionHandler {
    return (state, _playerId, value, data, _random, timestamp) => {
        const selected = value as MinionChoice;
        const continuation = data?.continuationContext as AttachedActionState | undefined;
        if (!continuation || !selected.minionUid || selected.baseIndex === undefined) {
            return { state, events: [] };
        }
        const liveAttached = findAttachedActionState(state.core, continuation.cardUid);
        if (!liveAttached) return { state, events: [] };
        if (selected.baseIndex === liveAttached.baseIndex && selected.minionUid === liveAttached.minionUid) {
            return { state, events: [] };
        }
        return {
            state,
            events: buildTransferAttachedActionEvents(liveAttached, selected.baseIndex, selected.minionUid, reason, timestamp),
        };
    };
}

const handleFairiesMagicAcorns: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as ButtonChoice;
    const spirit = getAvailableSpiritOfTheForestOrTitan(state.core, playerId);
    if (selected.choice === 'discard_others') {
        const events: SmashUpEvent[] = [];
        for (const [targetPlayerId, player] of Object.entries(state.core.players)) {
            if (targetPlayerId === playerId || player.hand.length === 0) continue;
            const discardIndex = Math.floor(random.random() * player.hand.length);
            events.push({
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId: targetPlayerId, cardUids: [player.hand[discardIndex].uid] },
                timestamp,
            } as SmashUpEvent);
        }
        if (spirit) {
            events.push(
                ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_magic_acorns'),
                markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
            );
        }
        return { state, events };
    }
    if (selected.choice === 'draw_one_and_action') {
        return {
            state,
            events: spirit
                ? [
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_magic_acorns'),
                    ...Object.entries(state.core.players)
                        .filter(([targetPlayerId, player]) => targetPlayerId !== playerId && player.hand.length > 0)
                        .map(([targetPlayerId, player]) => ({
                            type: SU_EVENTS.CARDS_DISCARDED,
                            payload: { playerId: targetPlayerId, cardUids: [player.hand[Math.floor(random.random() * player.hand.length)].uid] },
                            timestamp,
                        } as SmashUpEvent)),
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ]
                : [
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_magic_acorns'),
                ],
        };
    }
    return { state, events: [] };
};

const handleFairiesPlayfulTricks: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const rawSelections = Array.isArray(value)
        ? value as Array<{ cardUid?: string; defId?: string; ownerId?: string }>
        : [];
    const unique = new Map<string, { cardUid: string; defId: string; ownerId: string }>();
    for (const selection of rawSelections) {
        if (!selection.cardUid || !selection.defId || !selection.ownerId) continue;
        unique.set(selection.cardUid, {
            cardUid: selection.cardUid,
            defId: selection.defId,
            ownerId: selection.ownerId,
        });
    }

    const events: SmashUpEvent[] = [];
    for (const selection of unique.values()) {
        events.push({
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: {
                cardUid: selection.cardUid,
                defId: selection.defId,
                ownerId: selection.ownerId,
                reason: 'fairies_playful_tricks',
            },
            timestamp,
        } as OngoingDetachedEvent);
    }

    return { state, events };
};

const handleFairiesPlayfulTricksMode: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as ButtonChoice;
    const continuation = data?.continuationContext as { titanUid?: string; hasActionTargets?: boolean } | undefined;
    if (selected.choice === 'destroy_actions') {
        if (!continuation?.hasActionTargets) return { state, events: [] };
        const actionOptions = buildPlayfulTricksActionOptions(state.core);
        if (actionOptions.length === 0) return { state, events: [] };
        const interaction = createSimpleChoice(
            `fairies_playful_tricks_${timestamp}`,
            playerId,
            '有趣的把戏：选择至多两张打在基地或随从上的行动卡并摧毁它们',
            actionOptions,
            {
                sourceId: 'fairies_playful_tricks',
                targetType: 'generic',
                multi: { min: 0, max: Math.min(2, actionOptions.length) },
                autoResolveIfSingle: false,
            },
        );
        return { state: queueInteraction(state, interaction), events: [] };
    }
    if (selected.choice === 'play_spirit' && continuation?.titanUid) {
        return {
            state: queuePlayfulTricksSpiritBasePrompt(state, playerId, continuation.titanUid, timestamp),
            events: [],
        };
    }
    return { state, events: [] };
};

const handleFairiesPlayfulTricksSpiritBase: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as { baseIndex?: number; baseDefId?: string };
    const continuation = data?.continuationContext as { titanUid?: string } | undefined;
    if (selected.baseIndex === undefined || !continuation?.titanUid || getTitanByController(state.core, playerId)) {
        return { state, events: [] };
    }
    const titan = state.core.titans?.find((candidate) =>
        candidate.uid === continuation.titanUid
        && candidate.ownerId === playerId
        && candidate.location.zone === 'setaside',
    );
    if (!titan) return { state, events: [] };
    return {
        state,
        events: [
            playTitan(
                titan,
                playerId,
                selected.baseIndex,
                'fairies_playful_tricks_spirit',
                timestamp,
                selected.baseDefId,
            ),
        ],
    };
};

const handleFairiesEnchantment: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as ButtonChoice;
    const continuation = data?.continuationContext as { baseIndex?: number } | undefined;
    if (!continuation || continuation.baseIndex === undefined) return { state, events: [] };
    if (selected.choice !== 'plus' && selected.choice !== 'minus') return { state, events: [] };

    const attached = state.core.bases[continuation.baseIndex]?.ongoingActions.find(action =>
        action.ownerId === playerId && (action.defId === 'fairies_enchantment' || action.defId === 'fairies_enchantment_pod'),
    );
    if (!attached) return { state, events: [] };
    const spirit = getAvailableSpiritOfTheForestOrTitan(state.core, playerId);
    const fairiesEnchantmentMode = spirit ? 'both' : selected.choice;

    return {
        state,
        events: [
            {
                type: SU_EVENTS.ONGOING_ATTACHED,
                payload: {
                    cardUid: attached.uid,
                    defId: attached.defId,
                    ownerId: attached.ownerId,
                    targetType: 'base',
                    targetBaseIndex: continuation.baseIndex,
                    metadata: { fairiesEnchantmentMode },
                    talentUsed: attached.talentUsed,
                },
                timestamp,
            } as OngoingAttachedEvent,
            ...(spirit ? [markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp)] : []),
        ],
    };
};

const handleFairiesFairyBallet: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as ButtonChoice;
    const spirit = getAvailableSpiritOfTheForestOrTitan(state.core, playerId);
    if (selected.choice === 'draw_two') {
        return {
            state,
            events: spirit
                ? [
                    ...buildStandardDrawEvents(state.core, playerId, 2, random, timestamp),
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_fairy_ballet'),
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ]
                : buildStandardDrawEvents(state.core, playerId, 2, random, timestamp),
        };
    }
    if (selected.choice === 'draw_one_and_action') {
        return {
            state,
            events: spirit
                ? [
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_fairy_ballet'),
                    ...buildStandardDrawEvents(state.core, playerId, 2, random, timestamp),
                    markSpiritOfTheForestOrUsed(spirit.uid, state.core.turnNumber, timestamp),
                ]
                : [
                    ...buildStandardDrawEvents(state.core, playerId, 1, random, timestamp),
                    grantContextualExtraAction({ playerId, now: timestamp, matchState: state }, 'fairies_fairy_ballet'),
                ],
        };
    }
    return { state, events: [] };
};

export function registerFairiesInteractionHandlers(): void {
    registerInteractionHandler('fairies_titania', handleFairiesTitania);
    registerInteractionHandler('fairies_titania_spirit_return', handleFairiesTitaniaSpiritReturn);
    registerInteractionHandler('fairies_glymmer', handleFairiesGlymmer);
    registerInteractionHandler('fairies_puck', handleFairiesPuck);
    registerInteractionHandler('fairies_tinx', handleFairiesTinx);
    registerInteractionHandler('fairies_ladybug', handleTransferSelfTalent('fairies_ladybug', 'fairies_ladybug'));
    registerInteractionHandler('fairies_leaf_armor', handleTransferSelfTalent('fairies_leaf_armor', 'fairies_leaf_armor'));
    registerInteractionHandler('fairies_magic_acorns', handleFairiesMagicAcorns);
    registerInteractionHandler('fairies_playful_tricks_mode', handleFairiesPlayfulTricksMode);
    registerInteractionHandler('fairies_playful_tricks', handleFairiesPlayfulTricks);
    registerInteractionHandler('fairies_playful_tricks_spirit_base', handleFairiesPlayfulTricksSpiritBase);
    registerInteractionHandler('fairies_enchantment', handleFairiesEnchantment);
    registerInteractionHandler('fairies_fairy_ballet', handleFairiesFairyBallet);
}
