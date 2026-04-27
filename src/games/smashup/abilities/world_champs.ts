import type { PlayerId } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler, type InteractionHandler } from '../domain/abilityInteractionHandlers';
import { registerInterceptor, registerTrigger } from '../domain/ongoingEffects';
import type { TriggerContext } from '../domain/ongoingEffects';
import { canStartDuel, startDuel } from '../domain/duel';
import { registerDiscardSpecialProvider } from '../domain/discardSpecialAbilities';
import { buildBuryCardEvents } from '../domain/bury';
import {
    addPowerCounter,
    addTempPower,
    buildAbilityFeedback,
    buildBaseTargetOptions,
    buildMinionTargetOptions,
    buildPlayerTargetOptions,
    buildValidatedMoveEvents,
    buildStandardDrawEvents,
    createSkipOption,
    getMinionPower,
    grantContextualExtraAction,
    peekDeckTop,
    recoverCardsFromDiscard,
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type {
    MinionDestroyedEvent,
    MinionMetadataUpdatedEvent,
    MinionMovedEvent,
    MinionReturnedEvent,
    OngoingAttachedEvent,
    CardTransferredEvent,
    CardsDrawnEvent,
    MinionCardDef,
    PowerCounterAddedEvent,
    PowerCounterRemovedEvent,
    SmashUpCore,
    SmashUpEvent,
    TempPowerAddedEvent,
    PermanentPowerAddedEvent,
} from '../domain/types';
import { getBaseDef, getCardDef } from '../data/cards';

type MinionChoice = { minionUid?: string; baseIndex?: number; defId?: string; skip?: boolean };
type PlayerChoice = { targetPlayerId?: PlayerId; skip?: boolean };
type StonefordChoice = { cardUid?: string; defId?: string };
type CardChoice = { cardUid?: string; defId?: string; skip?: boolean };
type BaseChoice = { baseIndex?: number; baseDefId?: string; skip?: boolean };

type SheriffContinuation = {
    friendlyMinionUid: string;
    casterPlayerId: PlayerId;
};

type MummyContinuation = {
    cardUid: string;
};

type AkyeContinuation = {
    targetPlayerId: PlayerId;
};

type HighSpeedChaseContinuation = {
    sourceBaseIndex: number;
    minionUid: string;
    minionDefId: string;
};

type MouseBirdAndSausageContinuation = {
    baseIndex: number;
    faction: string;
};

type EhContinuation = {
    sourceCardUid: string;
};

type SharkTattooContinuation = {
    sourceCardUid: string;
};

type OngoingAttachContinuation = {
    sourceCardUid: string;
};

type BewitchedTransferContinuation = {
    sourceCardUid: string;
    sourceDefId: string;
    ownerId: PlayerId;
};

type SmartSetUpAttachContinuation = {
    sourceCardUid: string;
};

const WORLD_CHAMPS_ARAMIS_TRIGGERED_TURN_META = 'worldChampsAramisTriggeredTurn';
const WORLD_CHAMPS_DIVA_TRIGGERED_TURN_META = 'worldChampsDivaTriggeredTurn';

function transferCard(
    cardUid: string,
    defId: string,
    fromPlayerId: PlayerId,
    toPlayerId: PlayerId,
    reason: string,
    timestamp: number,
): CardTransferredEvent {
    return {
        type: SU_EVENTS.CARD_TRANSFERRED,
        payload: { cardUid, defId, fromPlayerId, toPlayerId, reason },
        timestamp,
    };
}

function getOtherPlayers(state: SmashUpCore, playerId: PlayerId): PlayerId[] {
    return state.turnOrder.filter(pid => pid !== playerId);
}

function collectOwnMinions(state: SmashUpCore, playerId: PlayerId) {
    const minions: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    state.bases.forEach((base, baseIndex) => {
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        base.minions.forEach((minion) => {
            if (minion.controller !== playerId) return;
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            minions.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${minionName} @ ${baseName}`,
            });
        });
    });
    return minions;
}

function collectAllMinions(state: SmashUpCore): Array<{ uid: string; defId: string; baseIndex: number; label: string }> {
    const minions: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    state.bases.forEach((base, baseIndex) => {
        const baseName = getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`;
        base.minions.forEach((minion) => {
            const minionName = getCardDef(minion.defId)?.name ?? minion.defId;
            minions.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${minionName} @ ${baseName}`,
            });
        });
    });
    return minions;
}

function isActionDefId(defId?: string): boolean {
    if (!defId) return false;
    const def = getCardDef(defId);
    return !!def && def.type === 'action';
}

function isStandardActionDefId(defId?: string): boolean {
    if (!defId) return false;
    const def = getCardDef(defId);
    return !!def && def.type === 'action' && def.subtype === 'standard';
}

function buildMinionMetadataUpdatedEvent(
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

function buildEnemyMinionOptions(state: SmashUpCore, baseIndex: number, sourcePlayerId: PlayerId) {
    const base = state.bases[baseIndex];
    if (!base) return [];
    const targets = base.minions
        .filter(minion => minion.controller !== sourcePlayerId)
        .map((minion) => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex,
            label: `${getCardDef(minion.defId)?.name ?? minion.defId}（力量 ${getMinionPower(state, minion, baseIndex)}）`,
        }));
    return buildMinionTargetOptions(targets, {
        state,
        sourcePlayerId,
        sourceDefId: 'world_champs_sheriff',
        effectType: 'destroy',
    });
}

function worldChampsStonefordOnPlay(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionCards = player.deck.filter(card => card.type === 'action');
    if (actionCards.length === 0) {
        return {
            events: [
                buildAbilityFeedback(ctx.playerId, 'feedback.deck_search_no_match_no_shuffle', ctx.now),
            ],
        };
    }

    const options = actionCards.map((card, index) => ({
        id: `action-${index}`,
        label: getCardDef(card.defId)?.name ?? card.defId,
        value: { cardUid: card.uid, defId: card.defId },
        _source: 'deck' as const,
        displayMode: 'card' as const,
    }));
    const interaction = createSimpleChoice(
        `world_champs_stoneford_${ctx.now}`,
        ctx.playerId,
        '斯坦福：从牌库选择一张行动卡加入手牌',
        options,
        { sourceId: 'world_champs_stoneford', targetType: 'generic', autoRefresh: 'deck', responseValidationMode: 'live' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsShieldMaidenOnPlay(ctx: AbilityContext): AbilityResult {
    const opponents = getOtherPlayers(ctx.state, ctx.playerId).filter(
        pid => peekDeckTop(ctx.state, ctx.random, pid, 'all', 'world_champs_shield_maiden', ctx.now) !== undefined,
    );
    if (opponents.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const options = [
        createSkipOption('跳过（不揭示）'),
        ...buildPlayerTargetOptions(
            opponents.map((pid) => ({
                label: `玩家 ${pid}`,
                targetPlayerId: pid,
                displayMode: 'button' as const,
            })),
            { sourcePlayerId: ctx.playerId, effectIntent: 'inspect' },
        ),
    ];
    const interaction = createSimpleChoice(
        `world_champs_shield_maiden_${ctx.now}`,
        ctx.playerId,
        '盾牌少女：选择另一位玩家，展示其牌库顶的一张牌',
        options,
        { sourceId: 'world_champs_shield_maiden', targetType: 'generic' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsCalicoinOnPlay(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions
        .filter(minion => minion.uid !== ctx.cardUid)
        .map((minion) => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: ctx.baseIndex,
            label: getCardDef(minion.defId)?.name ?? minion.defId,
        }));
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (targets.length === 1) {
        return { events: [addPowerCounter(targets[0].uid, targets[0].baseIndex, 1, 'world_champs_calicoin', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `world_champs_calicoin_${ctx.now}`,
        ctx.playerId,
        '金币猫：选择一个其他随从放置 1 个 +1 力量指示物',
        buildMinionTargetOptions(targets, { state: ctx.state, sourcePlayerId: ctx.playerId, sourceDefId: ctx.defId }),
        { sourceId: 'world_champs_calicoin', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsRainbowGirlOnPlay(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const events = base.minions
        .filter(minion => minion.controller === ctx.playerId && minion.uid !== ctx.cardUid)
        .map(minion => addTempPower(minion.uid, ctx.baseIndex, 1, 'world_champs_rainbow_girl', ctx.now));
    return { events };
}

function worldChampsItsBlitzinTimeOnPlay(ctx: AbilityContext): AbilityResult {
    const ownMinions = collectOwnMinions(ctx.state, ctx.playerId);
    if (ownMinions.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (ownMinions.length === 1) {
        return { events: [addTempPower(ownMinions[0].uid, ownMinions[0].baseIndex, 3, 'world_champs_its_blitzin_time', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `world_champs_its_blitzin_time_${ctx.now}`,
        ctx.playerId,
        '现在是闪电时间！：选择你的一个随从，本回合力量 +3',
        buildMinionTargetOptions(ownMinions, { state: ctx.state, sourcePlayerId: ctx.playerId, sourceDefId: ctx.defId }),
        { sourceId: 'world_champs_its_blitzin_time', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsKaijuConflictOnPlay(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantContextualExtraAction(ctx, 'world_champs_kaiju_conflict'),
            grantContextualExtraAction(ctx, 'world_champs_kaiju_conflict'),
        ],
    };
}

function worldChampsFightingSpiritPrizeOnPlay(ctx: AbilityContext): AbilityResult {
    const drawEvents = buildStandardDrawEvents(ctx.state, ctx.playerId, 2, ctx.random, ctx.now);
    const ownMinions = collectOwnMinions(ctx.state, ctx.playerId);
    if (ownMinions.length === 0) {
        return { events: drawEvents };
    }
    if (ownMinions.length === 1) {
        return {
            events: [
                ...drawEvents,
                addPowerCounter(ownMinions[0].uid, ownMinions[0].baseIndex, 1, 'world_champs_fighting_spirit_prize', ctx.now),
                addPowerCounter(ownMinions[0].uid, ownMinions[0].baseIndex, 1, 'world_champs_fighting_spirit_prize', ctx.now),
            ],
        };
    }

    const interaction = createSimpleChoice(
        `world_champs_fighting_spirit_prize_${ctx.now}`,
        ctx.playerId,
        '战斗精神奖：选择 1-2 个你的随从分配 2 个 +1 力量指示物',
        buildMinionTargetOptions(ownMinions, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
        }),
        {
            sourceId: 'world_champs_fighting_spirit_prize',
            targetType: 'minion',
            multi: { min: 1, max: Math.min(2, ownMinions.length) },
        },
    );

    return {
        events: drawEvents,
        matchState: queueInteraction(ctx.matchState, interaction),
    };
}

function worldChampsAkyeTheTurtleOnPlay(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const opponents = getOtherPlayers(ctx.state, ctx.playerId);
    if (!player || player.hand.length === 0 || opponents.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const playerInteraction = createSimpleChoice(
        `world_champs_akye_the_turtle_player_${ctx.now}`,
        ctx.playerId,
        '海龟阿凯：选择一位玩家并交给其一张手牌（然后你抽两张牌）',
        [
            createSkipOption('跳过（不发动）'),
            ...buildPlayerTargetOptions(
                opponents.map(opponentId => ({
                    targetPlayerId: opponentId,
                    label: `玩家 ${opponentId}`,
                    displayMode: 'button' as const,
                })),
                { sourcePlayerId: ctx.playerId, effectIntent: 'affect' },
            ),
        ],
        { sourceId: 'world_champs_akye_the_turtle_player', targetType: 'generic' },
    );

    return { events: [], matchState: queueInteraction(ctx.matchState, playerInteraction) };
}

function worldChampsFastAsLightningOnPlay(ctx: AbilityContext): AbilityResult {
    const minions = collectAllMinions(ctx.state);
    if (minions.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    if (minions.length === 1) {
        return { events: [addTempPower(minions[0].uid, minions[0].baseIndex, 2, 'world_champs_fast_as_lightning', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `world_champs_fast_as_lightning_${ctx.now}`,
        ctx.playerId,
        '快如闪电：选择一个随从，本回合力量 +2',
        buildMinionTargetOptions(minions, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'affect',
        }),
        { sourceId: 'world_champs_fast_as_lightning', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsHighSpeedChaseTalent(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const ownMinionsHere = base.minions
        .filter(minion => minion.controller === ctx.playerId)
        .map((minion) => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: ctx.baseIndex,
            label: getCardDef(minion.defId)?.name ?? minion.defId,
        }));
    if (ownMinionsHere.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `world_champs_high_speed_chase_minion_${ctx.now}`,
        ctx.playerId,
        '高速追逐：选择你在此基地的一个随从',
        buildMinionTargetOptions(ownMinionsHere, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'move',
        }),
        { sourceId: 'world_champs_high_speed_chase_minion', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsMouseBirdAndSausageOnPlay(ctx: AbilityContext): AbilityResult {
    const minions = collectAllMinions(ctx.state);
    if (minions.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `world_champs_mouse_bird_and_sausage_anchor_${ctx.now}`,
        ctx.playerId,
        '老鼠、鸟和香肠：先选择同一基地同派系的一张随从',
        buildMinionTargetOptions(minions, {
            state: ctx.state,
            sourcePlayerId: ctx.playerId,
            sourceDefId: ctx.defId,
            effectType: 'affect',
        }),
        { sourceId: 'world_champs_mouse_bird_and_sausage_anchor', targetType: 'minion' },
    );

    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsSharkTattooOnPlay(ctx: AbilityContext): AbilityResult {
    if (!ctx.targetMinionUid) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const base = ctx.state.bases[ctx.baseIndex];
    const target = base?.minions.find(minion => minion.uid === ctx.targetMinionUid);
    if (!target || target.controller !== ctx.playerId) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    return {
        events: [addPowerCounter(target.uid, ctx.baseIndex, 1, 'world_champs_shark_tattoo', ctx.now)],
    };
}

function worldChampsBewitchedOnPlay(ctx: AbilityContext): AbilityResult {
    if (!ctx.targetMinionUid) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const base = ctx.state.bases[ctx.baseIndex];
    const target = base?.minions.find(minion => minion.uid === ctx.targetMinionUid);
    if (!target) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    return { events: [] };
}

function worldChampsSmartSetUpOnPlay(ctx: AbilityContext): AbilityResult {
    if (!ctx.targetMinionUid) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const base = ctx.state.bases[ctx.baseIndex];
    const target = base?.minions.find(minion => minion.uid === ctx.targetMinionUid);
    if (!target || target.controller === ctx.playerId) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.condition_not_met', ctx.now)] };
    }
    return { events: [] };
}

function worldChampsEhSpecial(ctx: AbilityContext): AbilityResult {
    const ownMinions = collectOwnMinions(ctx.state, ctx.playerId);
    if (ownMinions.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }

    const interaction = createSimpleChoice(
        `world_champs_eh_${ctx.now}`,
        ctx.playerId,
        '嗯？：选择你的一个随从，本回合力量 +1（并将此卡返回手牌）',
        [
            createSkipOption('跳过（不发动）'),
            ...buildMinionTargetOptions(ownMinions, {
                state: ctx.state,
                sourcePlayerId: ctx.playerId,
                sourceDefId: ctx.defId,
                effectType: 'affect',
            }),
        ],
        { sourceId: 'world_champs_eh', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: EhContinuation }).continuationContext = { sourceCardUid: ctx.cardUid };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsAramisOnMinionAffected(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.sourceCardUid || ctx.sourceBaseIndex === undefined || ctx.sourceControllerId === undefined) return [];
    if (ctx.triggerMinionUid !== ctx.sourceCardUid) return [];
    if (ctx.playerId !== ctx.sourceControllerId) return [];
    const currentPlayerId = ctx.state.turnOrder[ctx.state.currentPlayerIndex];
    if (currentPlayerId !== ctx.sourceControllerId) return [];
    const actionDefId = normalizeSourceDefIdFromReason(ctx.reason);
    if (!isActionDefId(actionDefId)) return [];

    const sourceMinion = ctx.state.bases[ctx.sourceBaseIndex]?.minions.find(minion => minion.uid === ctx.sourceCardUid);
    if (!sourceMinion) return [];
    const usedTurn = Number(sourceMinion.metadata?.[WORLD_CHAMPS_ARAMIS_TRIGGERED_TURN_META] ?? -1);
    if (usedTurn === ctx.state.turnNumber) return [];

    return [
        grantContextualExtraAction(
            { playerId: ctx.sourceControllerId, now: ctx.now, matchState: ctx.matchState },
            'world_champs_aramis',
        ),
        buildMinionMetadataUpdatedEvent(
            sourceMinion.uid,
            ctx.sourceBaseIndex,
            { [WORLD_CHAMPS_ARAMIS_TRIGGERED_TURN_META]: ctx.state.turnNumber },
            'world_champs_aramis_once_per_turn',
            ctx.now,
        ),
    ];
}

function worldChampsSmartSetUpOnMinionPlayed(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.sourceControllerId === undefined || ctx.sourceBaseIndex === undefined || !ctx.sourceCardUid) return [];
    if (ctx.baseIndex === undefined || ctx.baseIndex !== ctx.sourceBaseIndex) return [];
    const sourceBase = ctx.state.bases[ctx.sourceBaseIndex];
    const host = sourceBase?.minions.find(minion => minion.attachedActions.some(action => action.uid === ctx.sourceCardUid));
    if (!host || host.controller === ctx.sourceControllerId) return [];
    const totalPlayedOnBase = ctx.state.turnOrder.reduce(
        (sum, playerId) => sum + (ctx.state.players[playerId]?.minionsPlayedPerBase?.[ctx.baseIndex!] ?? 0),
        0,
    );
    if (totalPlayedOnBase !== 1) return [];
    return buildStandardDrawEvents(ctx.state, ctx.sourceControllerId, 1, ctx.random, ctx.now);
}

function worldChampsBewitchedTransferOnLeave(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || !ctx.sourceCardUid || ctx.sourceControllerId === undefined || !ctx.triggerMinionUid) {
        return { events: [] };
    }

    const minionOptions = collectAllMinions(ctx.state).filter(minion => minion.uid !== ctx.triggerMinionUid);
    if (minionOptions.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `world_champs_bewitched_transfer_${ctx.now}_${ctx.sourceCardUid}`,
        ctx.sourceControllerId,
        '着魔：宿主离场，选择另一个随从转移附着',
        buildMinionTargetOptions(minionOptions, {
            state: ctx.state,
            sourcePlayerId: ctx.sourceControllerId,
            sourceDefId: 'world_champs_bewitched',
            effectType: 'affect',
        }),
        { sourceId: 'world_champs_bewitched_transfer', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: BewitchedTransferContinuation }).continuationContext = {
        sourceCardUid: ctx.sourceCardUid,
        sourceDefId: 'world_champs_bewitched',
        ownerId: ctx.sourceControllerId,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function normalizeSourceDefIdFromReason(reason?: string): string | undefined {
    if (!reason) return undefined;
    return reason
        .replace(/_(self_destruct|destroy|discard|expired|return|returned|shuffle|shuffled|detach|detached)$/u, '')
        .replace(/_pod$/u, '_pod');
}

function resolveSourceDefIdFromEvent(event: SmashUpEvent): string | undefined {
    const payload = (event as { payload?: Record<string, unknown> }).payload;
    if (!payload) return undefined;
    const explicit = payload.sourceDefId;
    if (typeof explicit === 'string' && explicit.length > 0) return explicit;
    const reason = payload.reason;
    return typeof reason === 'string' ? normalizeSourceDefIdFromReason(reason) : undefined;
}

function buildDivaMirroredEvent(
    event: SmashUpEvent,
    divaUid: string,
    divaDefId: string,
    divaBaseIndex: number,
    divaControllerId: PlayerId,
): SmashUpEvent | undefined {
    switch (event.type) {
        case SU_EVENTS.POWER_COUNTER_ADDED: {
            const payload = (event as PowerCounterAddedEvent).payload;
            return {
                type: SU_EVENTS.POWER_COUNTER_ADDED,
                payload: {
                    ...payload,
                    minionUid: divaUid,
                    baseIndex: divaBaseIndex,
                    reason: 'world_champs_diva_copy_power_counter_added',
                    sourcePlayerId: divaControllerId,
                    sourceDefId: 'world_champs_diva',
                    sourceCardUid: divaUid,
                    sourceControllerId: divaControllerId,
                    sourceBaseIndex: divaBaseIndex,
                },
                timestamp: event.timestamp,
            } as PowerCounterAddedEvent;
        }
        case SU_EVENTS.POWER_COUNTER_REMOVED: {
            const payload = (event as PowerCounterRemovedEvent).payload;
            return {
                type: SU_EVENTS.POWER_COUNTER_REMOVED,
                payload: {
                    ...payload,
                    minionUid: divaUid,
                    baseIndex: divaBaseIndex,
                    reason: 'world_champs_diva_copy_power_counter_removed',
                    sourcePlayerId: divaControllerId,
                    sourceDefId: 'world_champs_diva',
                    sourceCardUid: divaUid,
                    sourceControllerId: divaControllerId,
                    sourceBaseIndex: divaBaseIndex,
                },
                timestamp: event.timestamp,
            } as PowerCounterRemovedEvent;
        }
        case SU_EVENTS.TEMP_POWER_ADDED: {
            const payload = (event as TempPowerAddedEvent).payload;
            return {
                type: SU_EVENTS.TEMP_POWER_ADDED,
                payload: {
                    ...payload,
                    minionUid: divaUid,
                    baseIndex: divaBaseIndex,
                    reason: 'world_champs_diva_copy_temp_power',
                },
                timestamp: event.timestamp,
            } as TempPowerAddedEvent;
        }
        case SU_EVENTS.PERMANENT_POWER_ADDED: {
            const payload = (event as PermanentPowerAddedEvent).payload;
            return {
                type: SU_EVENTS.PERMANENT_POWER_ADDED,
                payload: {
                    ...payload,
                    minionUid: divaUid,
                    baseIndex: divaBaseIndex,
                    reason: 'world_champs_diva_copy_permanent_power',
                },
                timestamp: event.timestamp,
            } as PermanentPowerAddedEvent;
        }
        case SU_EVENTS.MINION_DESTROYED: {
            const payload = (event as MinionDestroyedEvent).payload;
            return {
                type: SU_EVENTS.MINION_DESTROYED,
                payload: {
                    minionUid: divaUid,
                    minionDefId: divaDefId,
                    fromBaseIndex: divaBaseIndex,
                    ownerId: divaControllerId,
                    destroyerId: payload.destroyerId,
                    reason: 'world_champs_diva_copy_destroyed',
                },
                timestamp: event.timestamp,
            } as MinionDestroyedEvent;
        }
        case SU_EVENTS.MINION_MOVED: {
            const payload = (event as MinionMovedEvent).payload;
            return {
                type: SU_EVENTS.MINION_MOVED,
                payload: {
                    minionUid: divaUid,
                    minionDefId: divaDefId,
                    fromBaseIndex: divaBaseIndex,
                    toBaseIndex: payload.toBaseIndex,
                    toBaseDefId: payload.toBaseDefId,
                    reason: 'world_champs_diva_copy_moved',
                },
                timestamp: event.timestamp,
            } as MinionMovedEvent;
        }
        case SU_EVENTS.MINION_RETURNED: {
            const payload = (event as MinionReturnedEvent).payload;
            return {
                type: SU_EVENTS.MINION_RETURNED,
                payload: {
                    minionUid: divaUid,
                    minionDefId: divaDefId,
                    fromBaseIndex: divaBaseIndex,
                    toPlayerId: divaControllerId,
                    reason: 'world_champs_diva_copy_returned',
                    sourcePlayerId: payload.sourcePlayerId ?? divaControllerId,
                    sourceDefId: 'world_champs_diva',
                    sourceCardUid: divaUid,
                    sourceControllerId: divaControllerId,
                    sourceBaseIndex: divaBaseIndex,
                },
                timestamp: event.timestamp,
            } as MinionReturnedEvent;
        }
        case SU_EVENTS.ONGOING_ATTACHED: {
            // 标准行动通常不会附着；避免复用同一行动 uid 导致状态冲突
            return undefined;
        }
        default:
            return undefined;
    }
}

function worldChampsDivaInterceptor(state: SmashUpCore, event: SmashUpEvent): SmashUpEvent[] | undefined {
    const payload = (event as { payload?: Record<string, unknown> }).payload;
    if (!payload || typeof payload !== 'object') return undefined;
    const reason = payload.reason;
    if (typeof reason === 'string' && reason.includes('world_champs_diva_copy')) return undefined;

    const sourceDefId = resolveSourceDefIdFromEvent(event);
    if (!isStandardActionDefId(sourceDefId)) return undefined;

    let targetUid: string | undefined;
    let targetBaseIndex: number | undefined;
    switch (event.type) {
        case SU_EVENTS.POWER_COUNTER_ADDED:
        case SU_EVENTS.POWER_COUNTER_REMOVED:
        case SU_EVENTS.TEMP_POWER_ADDED:
        case SU_EVENTS.PERMANENT_POWER_ADDED:
            targetUid = payload.minionUid as string | undefined;
            targetBaseIndex = payload.baseIndex as number | undefined;
            break;
        case SU_EVENTS.MINION_DESTROYED:
            targetUid = payload.minionUid as string | undefined;
            targetBaseIndex = payload.fromBaseIndex as number | undefined;
            break;
        case SU_EVENTS.MINION_MOVED:
            targetUid = payload.minionUid as string | undefined;
            targetBaseIndex = payload.fromBaseIndex as number | undefined;
            break;
        case SU_EVENTS.MINION_RETURNED:
            targetUid = payload.minionUid as string | undefined;
            targetBaseIndex = payload.fromBaseIndex as number | undefined;
            break;
        default:
            return undefined;
    }
    if (!targetUid || targetBaseIndex === undefined) return undefined;
    const targetMinion = state.bases[targetBaseIndex]?.minions.find(minion => minion.uid === targetUid);
    if (!targetMinion) return undefined;

    const divaCandidates = state.bases[targetBaseIndex]?.minions.filter(minion =>
        minion.defId === 'world_champs_diva'
        && minion.controller === targetMinion.controller
        && minion.uid !== targetUid,
    ) ?? [];
    if (divaCandidates.length === 0) return undefined;

    const currentPlayerId = state.turnOrder[state.currentPlayerIndex];
    if (!currentPlayerId) return undefined;

    const mirroredEvents: SmashUpEvent[] = [];
    for (const diva of divaCandidates) {
        const usedTurn = Number(diva.metadata?.[WORLD_CHAMPS_DIVA_TRIGGERED_TURN_META] ?? -1);
        if (usedTurn === state.turnNumber) continue;
        if (currentPlayerId !== diva.controller) continue;

        const mirroredEvent = buildDivaMirroredEvent(event, diva.uid, diva.defId, targetBaseIndex, diva.controller);
        if (!mirroredEvent) continue;
        mirroredEvents.push(
            buildMinionMetadataUpdatedEvent(
                diva.uid,
                targetBaseIndex,
                { [WORLD_CHAMPS_DIVA_TRIGGERED_TURN_META]: state.turnNumber },
                'world_champs_diva_once_per_turn',
                event.timestamp,
            ),
            mirroredEvent,
        );
    }

    if (mirroredEvents.length === 0) return undefined;
    return [event, ...mirroredEvents];
}

function worldChampsSheriffBeforeScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || ctx.baseIndex === undefined || !ctx.sourceCardUid || !ctx.sourceControllerId) {
        return { events: [] };
    }
    if (!canStartDuel(ctx.state)) return { events: [] };
    const enemyOptions = buildEnemyMinionOptions(ctx.state, ctx.baseIndex, ctx.sourceControllerId);
    if (enemyOptions.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `world_champs_sheriff_before_scoring_${ctx.now}_${ctx.sourceCardUid}`,
        ctx.sourceControllerId,
        '警长：你可以令此随从与这里另一位玩家的一个随从决斗',
        [createSkipOption('跳过（不决斗）'), ...enemyOptions],
        { sourceId: 'world_champs_sheriff_before_scoring', targetType: 'minion' },
    );
    (interaction.data as { continuationContext?: SheriffContinuation }).continuationContext = {
        friendlyMinionUid: ctx.sourceCardUid,
        casterPlayerId: ctx.sourceControllerId,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsSamuraiChanTrigger(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.sourceControllerId || ctx.triggerMinionUid !== ctx.sourceCardUid) return [];
    return buildStandardDrawEvents(ctx.state, ctx.sourceControllerId, 1, ctx.random, ctx.now);
}

function worldChampsMummyAfterScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || !ctx.sourceCardUid || ctx.sourceControllerId === undefined || ctx.sourceBaseIndex === undefined) {
        return { events: [] };
    }
    const sourceBase = ctx.state.bases[ctx.sourceBaseIndex];
    if (!sourceBase?.minions.some(minion => minion.uid === ctx.sourceCardUid)) {
        return { events: [] };
    }
    const baseOptions = ctx.state.bases
        .map((base, baseIndex) => ({ baseIndex, label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}` }))
        .filter(base => base.baseIndex !== ctx.sourceBaseIndex);
    if (baseOptions.length === 0) return { events: [] };

    const interaction = createSimpleChoice(
        `world_champs_mummy_after_scoring_${ctx.now}_${ctx.sourceCardUid}`,
        ctx.sourceControllerId,
        '木乃伊：你可以将本随从埋葬到另一个基地',
        [createSkipOption('跳过（不埋葬）'), ...buildBaseTargetOptions(baseOptions, ctx.state)],
        { sourceId: 'world_champs_mummy_after_scoring', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: MummyContinuation }).continuationContext = {
        cardUid: ctx.sourceCardUid,
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function worldChampsSharkTattooTurnStart(ctx: TriggerContext): SmashUpEvent[] {
    if (!ctx.sourceCardUid || ctx.sourceBaseIndex === undefined || ctx.sourceControllerId === undefined) {
        return [];
    }
    if (ctx.playerId !== ctx.sourceControllerId) return [];
    const base = ctx.state.bases[ctx.sourceBaseIndex];
    if (!base) return [];
    const host = base.minions.find(minion => minion.attachedActions.some(action => action.uid === ctx.sourceCardUid));
    if (!host || host.controller !== ctx.sourceControllerId) return [];
    const ownMinions = base.minions.filter(minion => minion.controller === ctx.sourceControllerId);
    if (ownMinions.length !== 1) return [];
    return [addPowerCounter(host.uid, ctx.sourceBaseIndex, 1, 'world_champs_shark_tattoo', ctx.now)];
}

export function registerWorldChampsAbilities(): void {
    registerAbility('world_champs_bewitched', 'onPlay', worldChampsBewitchedOnPlay);
    registerAbility('world_champs_stoneford', 'onPlay', worldChampsStonefordOnPlay);
    registerAbility('world_champs_akye_the_turtle', 'onPlay', worldChampsAkyeTheTurtleOnPlay);
    registerAbility('world_champs_shield_maiden', 'onPlay', worldChampsShieldMaidenOnPlay);
    registerAbility('world_champs_calicoin', 'onPlay', worldChampsCalicoinOnPlay);
    registerAbility('world_champs_fast_as_lightning', 'onPlay', worldChampsFastAsLightningOnPlay);
    registerAbility('world_champs_rainbow_girl', 'onPlay', worldChampsRainbowGirlOnPlay);
    registerAbility('world_champs_its_blitzin_time', 'onPlay', worldChampsItsBlitzinTimeOnPlay);
    registerAbility('world_champs_kaiju_conflict', 'onPlay', worldChampsKaijuConflictOnPlay);
    registerAbility('world_champs_fighting_spirit_prize', 'onPlay', worldChampsFightingSpiritPrizeOnPlay);
    registerAbility('world_champs_high_speed_chase', 'talent', {
        execute: worldChampsHighSpeedChaseTalent,
        validateUse: (ctx) => {
            const base = ctx.state.bases[ctx.baseIndex];
            if (!base) return '当前没有可选择的目标';
            return base.minions.some(minion => minion.controller === ctx.playerId) ? null : '当前没有可选择的目标';
        },
    });
    registerAbility('world_champs_mouse_bird_and_sausage', 'onPlay', worldChampsMouseBirdAndSausageOnPlay);
    registerAbility('world_champs_shark_tattoo', 'onPlay', worldChampsSharkTattooOnPlay);
    registerAbility('world_champs_smart_set_up', 'onPlay', worldChampsSmartSetUpOnPlay);
    registerAbility('world_champs_eh', 'special', worldChampsEhSpecial);
    registerDiscardSpecialProvider({
        id: 'world_champs_eh',
        getActivatableCards(core, playerId) {
            const currentTurnPlayerId = core.turnOrder[core.currentPlayerIndex];
            if (!currentTurnPlayerId || currentTurnPlayerId !== playerId) return [];
            const player = core.players[playerId];
            if (!player) return [];
            if (player.actionsPlayed < 1) return [];
            if (player.usedDiscardPlayAbilities?.includes('world_champs_eh')) return [];
            if (collectOwnMinions(core, playerId).length === 0) return [];
            return player.discard
                .filter(card => card.defId === 'world_champs_eh')
                .map(card => ({
                    card,
                    allowedBaseIndices: 'all' as const,
                    sourceId: 'world_champs_eh',
                    defId: card.defId,
                    name: getCardDef(card.defId)?.name ?? card.defId,
                }));
        },
    });
    registerTrigger('world_champs_aramis', 'onMinionAffected', worldChampsAramisOnMinionAffected, {
        optional: true,
        perInstance: true,
    });
    registerTrigger('world_champs_sheriff', 'beforeScoring', worldChampsSheriffBeforeScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('world_champs_bewitched', 'onMinionDestroyed', worldChampsBewitchedTransferOnLeave, {
        perInstance: true,
    });
    registerTrigger('world_champs_bewitched', 'onMinionDiscardedFromBase', worldChampsBewitchedTransferOnLeave, {
        perInstance: true,
    });
    registerTrigger('world_champs_bewitched', 'onCardReturnedToHand', worldChampsBewitchedTransferOnLeave, {
        perInstance: true,
    });
    registerTrigger('world_champs_samurai_chan', 'onMinionDestroyed', worldChampsSamuraiChanTrigger, { perInstance: true });
    registerTrigger('world_champs_samurai_chan', 'onMinionDiscardedFromBase', worldChampsSamuraiChanTrigger, { perInstance: true });
    registerTrigger('world_champs_mummy', 'afterScoring', worldChampsMummyAfterScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('world_champs_shark_tattoo', 'onTurnStart', worldChampsSharkTattooTurnStart, { perInstance: true });
    registerTrigger('world_champs_smart_set_up', 'onMinionPlayed', worldChampsSmartSetUpOnMinionPlayed, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });

    registerInterceptor('world_champs_diva', worldChampsDivaInterceptor);
}

const handleWorldChampsStoneford: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as StonefordChoice;
    if (!selected.cardUid) return { state, events: [] };
    const player = state.core.players[playerId];
    const selectedCard = player.deck.find(card => card.uid === selected.cardUid && (!selected.defId || card.defId === selected.defId));
    if (!selectedCard || selectedCard.type !== 'action') return { state, events: [] };

    return {
        state,
        events: [
            {
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId, count: 1, cardUids: [selectedCard.uid] },
                timestamp,
            } as CardsDrawnEvent,
        ],
    };
};

const handleWorldChampsAkyePlayer: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as PlayerChoice;
    if (selected.skip || !selected.targetPlayerId) return { state, events: [] };
    const player = state.core.players[playerId];
    if (!player || player.hand.length === 0) return { state, events: [] };

    const interaction = createSimpleChoice(
        `world_champs_akye_the_turtle_card_${timestamp}`,
        playerId,
        '海龟阿凯：选择要交给对方的一张手牌',
        player.hand.map((card, index) => ({
            id: `card-${index}`,
            label: getCardDef(card.defId)?.name ?? card.defId,
            value: { cardUid: card.uid, defId: card.defId },
            _source: 'hand' as const,
            displayMode: 'card' as const,
        })),
        { sourceId: 'world_champs_akye_the_turtle_card', targetType: 'hand' },
    );
    (interaction.data as { continuationContext?: AkyeContinuation }).continuationContext = {
        targetPlayerId: selected.targetPlayerId,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleWorldChampsAkyeCard: InteractionHandler = (state, playerId, value, data, random, timestamp) => {
    const selected = value as CardChoice;
    const continuation = data?.continuationContext as AkyeContinuation | undefined;
    if (!selected.cardUid || !selected.defId || !continuation?.targetPlayerId) return { state, events: [] };
    return {
        state,
        events: [
            transferCard(selected.cardUid, selected.defId, playerId, continuation.targetPlayerId, 'world_champs_akye_the_turtle', timestamp),
            ...buildStandardDrawEvents(state, playerId, 2, random, timestamp),
        ],
    };
};

const handleWorldChampsShieldMaiden: InteractionHandler = (state, playerId, value, _data, random, timestamp) => {
    const selected = value as PlayerChoice;
    if (selected.skip || !selected.targetPlayerId) return { state, events: [] };
    const peek = peekDeckTop(state.core, random, selected.targetPlayerId, 'all', 'world_champs_shield_maiden', timestamp);
    if (!peek) return { state, events: [] };

    const events: SmashUpEvent[] = [...peek.events];
    const topCard = peek.card;
    let shouldGainCard = topCard.type === 'action';
    if (!shouldGainCard && topCard.type === 'minion') {
        const minionDef = getCardDef(topCard.defId) as MinionCardDef | undefined;
        shouldGainCard = (minionDef?.power ?? 99) <= 3;
    }
    if (shouldGainCard) {
        events.push(transferCard(topCard.uid, topCard.defId, selected.targetPlayerId, playerId, 'world_champs_shield_maiden', timestamp));
    }
    return { state, events };
};

const handleWorldChampsCalicoin: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    return {
        state,
        events: [addPowerCounter(selected.minionUid, selected.baseIndex, 1, 'world_champs_calicoin', timestamp)],
    };
};

const handleWorldChampsBewitched: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion) return { state, events: [] };
    const continuation = data?.continuationContext as OngoingAttachContinuation | undefined;
    if (!continuation?.sourceCardUid) return { state, events: [] };
    return {
        state,
        events: [{
            type: SU_EVENTS.ONGOING_ATTACHED,
            payload: {
                cardUid: continuation.sourceCardUid,
                defId: 'world_champs_bewitched',
                ownerId: playerId,
                targetType: 'minion',
                targetBaseIndex: selected.baseIndex,
                targetMinionUid: selected.minionUid,
            },
            timestamp,
        } as OngoingAttachedEvent],
    };
};

const handleWorldChampsBewitchedTransfer: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion) return { state, events: [] };
    const continuation = data?.continuationContext as BewitchedTransferContinuation | undefined;
    if (!continuation?.sourceCardUid || !continuation?.ownerId) return { state, events: [] };
    return {
        state,
        events: [{
            type: SU_EVENTS.ONGOING_ATTACHED,
            payload: {
                cardUid: continuation.sourceCardUid,
                defId: continuation.sourceDefId ?? 'world_champs_bewitched',
                ownerId: continuation.ownerId,
                targetType: 'minion',
                targetBaseIndex: selected.baseIndex,
                targetMinionUid: selected.minionUid,
                removeFromDiscard: true,
            },
            timestamp,
        } as OngoingAttachedEvent],
    };
};

const handleWorldChampsSmartSetUp: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion || minion.controller === playerId) return { state, events: [] };
    const continuation = data?.continuationContext as SmartSetUpAttachContinuation | undefined;
    if (!continuation?.sourceCardUid) return { state, events: [] };
    return {
        state,
        events: [{
            type: SU_EVENTS.ONGOING_ATTACHED,
            payload: {
                cardUid: continuation.sourceCardUid,
                defId: 'world_champs_smart_set_up',
                ownerId: playerId,
                targetType: 'minion',
                targetBaseIndex: selected.baseIndex,
                targetMinionUid: selected.minionUid,
            },
            timestamp,
        } as OngoingAttachedEvent],
    };
};

const handleWorldChampsItsBlitzinTime: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    return {
        state,
        events: [addTempPower(selected.minionUid, selected.baseIndex, 3, 'world_champs_its_blitzin_time', timestamp)],
    };
};

const handleWorldChampsFightingSpiritPrize: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const picks = Array.isArray(value) ? value as MinionChoice[] : [value as MinionChoice];
    const validPicks = picks
        .filter(pick => !pick.skip && pick.minionUid && pick.baseIndex !== undefined)
        .slice(0, 2);
    if (validPicks.length === 0) return { state, events: [] };
    if (validPicks.length === 1) {
        const only = validPicks[0];
        return {
            state,
            events: [
                addPowerCounter(only.minionUid!, only.baseIndex!, 1, 'world_champs_fighting_spirit_prize', timestamp),
                addPowerCounter(only.minionUid!, only.baseIndex!, 1, 'world_champs_fighting_spirit_prize', timestamp),
            ],
        };
    }
    return {
        state,
        events: validPicks.map((pick) => addPowerCounter(
            pick.minionUid!,
            pick.baseIndex!,
            1,
            'world_champs_fighting_spirit_prize',
            timestamp,
        )),
    };
};

const handleWorldChampsFastAsLightning: InteractionHandler = (state, _playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    return {
        state,
        events: [addTempPower(selected.minionUid, selected.baseIndex, 2, 'world_champs_fast_as_lightning', timestamp)],
    };
};

const handleWorldChampsHighSpeedChaseMinion: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    const baseOptions = state.core.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? `基地 ${baseIndex + 1}`,
        }))
        .filter(base => base.baseIndex !== selected.baseIndex);
    if (baseOptions.length === 0) return { state, events: [] };

    const interaction = createSimpleChoice(
        `world_champs_high_speed_chase_base_${timestamp}`,
        playerId,
        '高速追逐：选择目标基地',
        buildBaseTargetOptions(baseOptions, state.core),
        { sourceId: 'world_champs_high_speed_chase_base', targetType: 'base' },
    );
    (interaction.data as { continuationContext?: HighSpeedChaseContinuation }).continuationContext = {
        sourceBaseIndex: selected.baseIndex,
        minionUid: selected.minionUid,
        minionDefId: selected.defId,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleWorldChampsHighSpeedChaseBase: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as BaseChoice;
    const continuation = data?.continuationContext as HighSpeedChaseContinuation | undefined;
    if (selected.baseIndex === undefined || !continuation) return { state, events: [] };

    const sourceBase = state.core.bases[continuation.sourceBaseIndex];
    const ongoing = sourceBase?.ongoingActions.find(action => action.defId === 'world_champs_high_speed_chase' && action.ownerId === playerId);
    if (!ongoing) return { state, events: [] };
    const moveEvents = buildValidatedMoveEvents(state, {
        minionUid: continuation.minionUid,
        minionDefId: continuation.minionDefId,
        fromBaseIndex: continuation.sourceBaseIndex,
        toBaseIndex: selected.baseIndex,
        reason: 'world_champs_high_speed_chase',
        now: timestamp,
    });

    return {
        state,
        events: [
            {
                type: SU_EVENTS.ONGOING_DETACHED,
                payload: {
                    cardUid: ongoing.uid,
                    defId: ongoing.defId,
                    ownerId: ongoing.ownerId,
                    reason: 'world_champs_high_speed_chase',
                },
                timestamp,
            } as SmashUpEvent,
            {
                type: SU_EVENTS.ONGOING_ATTACHED,
                payload: {
                    cardUid: ongoing.uid,
                    defId: ongoing.defId,
                    ownerId: ongoing.ownerId,
                    targetType: 'base',
                    targetBaseIndex: selected.baseIndex,
                    talentUsed: true,
                },
                timestamp,
            } as SmashUpEvent,
            ...moveEvents,
            ...(moveEvents.length > 0 ? [addTempPower(continuation.minionUid, selected.baseIndex, 3, 'world_champs_high_speed_chase', timestamp)] : []),
        ],
    };
};

const handleWorldChampsMouseBirdAndSausageAnchor: InteractionHandler = (state, playerId, value, _data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    const anchorDef = getCardDef(selected.defId);
    const faction = anchorDef?.faction;
    if (!faction) return { state, events: [] };
    const base = state.core.bases[selected.baseIndex];
    if (!base) return { state, events: [] };
    const candidates = base.minions
        .filter(minion => getCardDef(minion.defId)?.faction === faction)
        .map((minion) => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: selected.baseIndex,
            label: getCardDef(minion.defId)?.name ?? minion.defId,
        }));
    if (candidates.length === 0) return { state, events: [] };
    if (candidates.length <= 2) {
        return {
            state,
            events: candidates.map(minion => addTempPower(minion.uid, minion.baseIndex, 2, 'world_champs_mouse_bird_and_sausage', timestamp)),
        };
    }

    const interaction = createSimpleChoice(
        `world_champs_mouse_bird_and_sausage_targets_${timestamp}`,
        playerId,
        '老鼠、鸟和香肠：选择至多两张同派系随从',
        buildMinionTargetOptions(candidates, {
            state: state.core,
            sourcePlayerId: playerId,
            sourceDefId: 'world_champs_mouse_bird_and_sausage',
            effectType: 'affect',
        }),
        {
            sourceId: 'world_champs_mouse_bird_and_sausage_targets',
            targetType: 'minion',
            multi: { min: 1, max: 2 },
        },
    );
    (interaction.data as { continuationContext?: MouseBirdAndSausageContinuation }).continuationContext = {
        baseIndex: selected.baseIndex,
        faction,
    };
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleWorldChampsMouseBirdAndSausageTargets: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const continuation = data?.continuationContext as MouseBirdAndSausageContinuation | undefined;
    if (!continuation) return { state, events: [] };
    const picks = (Array.isArray(value) ? value : [value]) as MinionChoice[];
    const selected = picks
        .filter(pick => pick.minionUid && pick.baseIndex === continuation.baseIndex)
        .slice(0, 2);
    if (selected.length === 0) return { state, events: [] };
    return {
        state,
        events: selected.map(pick => addTempPower(
            pick.minionUid!,
            continuation.baseIndex,
            2,
            'world_champs_mouse_bird_and_sausage',
            timestamp,
        )),
    };
};

const handleWorldChampsSharkTattoo: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (!selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const minion = state.core.bases[selected.baseIndex]?.minions.find(entry => entry.uid === selected.minionUid);
    if (!minion || minion.controller !== playerId) return { state, events: [] };
    const continuation = data?.continuationContext as SharkTattooContinuation | undefined;
    if (!continuation?.sourceCardUid) return { state, events: [] };
    return {
        state,
        events: [
            {
                type: SU_EVENTS.ONGOING_ATTACHED,
                payload: {
                    cardUid: continuation.sourceCardUid,
                    defId: 'world_champs_shark_tattoo',
                    ownerId: playerId,
                    targetType: 'minion',
                    targetBaseIndex: selected.baseIndex,
                    targetMinionUid: selected.minionUid,
                },
                timestamp,
            } as SmashUpEvent,
            addPowerCounter(selected.minionUid, selected.baseIndex, 1, 'world_champs_shark_tattoo', timestamp),
        ],
    };
};

const handleWorldChampsEh: InteractionHandler = (state, playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (selected.skip || !selected.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const continuation = data?.continuationContext as EhContinuation | undefined;
    const events: SmashUpEvent[] = [
        {
            type: SU_EVENTS.DISCARD_ABILITY_USED,
            payload: {
                playerId,
                sourceId: 'world_champs_eh',
            },
            timestamp,
        },
        addTempPower(selected.minionUid, selected.baseIndex, 1, 'world_champs_eh', timestamp),
    ];
    if (continuation?.sourceCardUid) {
        events.push(recoverCardsFromDiscard(playerId, [continuation.sourceCardUid], 'world_champs_eh', timestamp));
    }
    return { state, events };
};

const handleWorldChampsSheriffBeforeScoring: InteractionHandler = (state, _playerId, value, data, _random, timestamp) => {
    const selected = value as MinionChoice;
    if (selected.skip || !selected.minionUid) return { state, events: [] };
    const ctx = data?.continuationContext as SheriffContinuation | undefined;
    if (!ctx) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: 'world_champs_sheriff_before_scoring',
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'destroy_loser',
            destroyReason: 'world_champs_sheriff',
        }, timestamp),
        events: [],
    };
};

const handleWorldChampsMummyAfterScoring: InteractionHandler = (state, _playerId, value, data, random, timestamp) => {
    const selected = value as { baseIndex?: number; skip?: boolean };
    if (selected.skip || selected.baseIndex === undefined) return { state, events: [] };
    const continuation = data?.continuationContext as MummyContinuation | undefined;
    if (!continuation?.cardUid) return { state, events: [] };

    const source = state.core.bases
        .map((base, baseIndex) => ({
            baseIndex,
            minion: base.minions.find(minion => minion.uid === continuation.cardUid),
        }))
        .find(entry => entry.minion !== undefined);
    if (!source?.minion) return { state, events: [] };

    return {
        state,
        events: buildBuryCardEvents({
            core: state.core,
            matchState: state,
            playerId: source.minion.controller,
            cardUid: source.minion.uid,
            defId: source.minion.defId,
            baseIndex: selected.baseIndex,
            trueOwnerId: source.minion.owner,
            buriedFrom: 'play',
            reason: 'world_champs_mummy',
            random,
            now: timestamp,
        }),
    };
};

export function registerWorldChampsInteractionHandlers(): void {
    registerInteractionHandler('world_champs_bewitched', handleWorldChampsBewitched);
    registerInteractionHandler('world_champs_bewitched_transfer', handleWorldChampsBewitchedTransfer);
    registerInteractionHandler('world_champs_stoneford', handleWorldChampsStoneford);
    registerInteractionHandler('world_champs_akye_the_turtle_player', handleWorldChampsAkyePlayer);
    registerInteractionHandler('world_champs_akye_the_turtle_card', handleWorldChampsAkyeCard);
    registerInteractionHandler('world_champs_shield_maiden', handleWorldChampsShieldMaiden);
    registerInteractionHandler('world_champs_calicoin', handleWorldChampsCalicoin);
    registerInteractionHandler('world_champs_smart_set_up', handleWorldChampsSmartSetUp);
    registerInteractionHandler('world_champs_fast_as_lightning', handleWorldChampsFastAsLightning);
    registerInteractionHandler('world_champs_its_blitzin_time', handleWorldChampsItsBlitzinTime);
    registerInteractionHandler('world_champs_fighting_spirit_prize', handleWorldChampsFightingSpiritPrize);
    registerInteractionHandler('world_champs_high_speed_chase_minion', handleWorldChampsHighSpeedChaseMinion);
    registerInteractionHandler('world_champs_high_speed_chase_base', handleWorldChampsHighSpeedChaseBase);
    registerInteractionHandler('world_champs_mouse_bird_and_sausage_anchor', handleWorldChampsMouseBirdAndSausageAnchor);
    registerInteractionHandler('world_champs_mouse_bird_and_sausage_targets', handleWorldChampsMouseBirdAndSausageTargets);
    registerInteractionHandler('world_champs_shark_tattoo', handleWorldChampsSharkTattoo);
    registerInteractionHandler('world_champs_eh', handleWorldChampsEh);
    registerInteractionHandler('world_champs_sheriff_before_scoring', handleWorldChampsSheriffBeforeScoring);
    registerInteractionHandler('world_champs_mummy_after_scoring', handleWorldChampsMummyAfterScoring);
}
