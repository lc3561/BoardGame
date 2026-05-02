import type {
    AiDecisionContext,
    AiDifficultyLevel,
    AiLegalAction,
    BuildGameAiFeatureSnapshotArgs,
    BuildGameAiLegalActionsArgs,
    GameAiRuntime,
    LocalAiActionScorer,
    LocalAiPolicy,
} from '../../engine/ai';
import {
    buildDeterministicAiNoise,
    createAiLegalActionId,
    evaluateLocalAiActions,
} from '../../engine/ai';
import type { CardTier, GemColor, SplendorCore, SplendorPlayerState, TokenColor } from './domain/types';
import { SPLENDOR_COMMANDS } from './domain/types';
import {
    CARD_DEFS_BY_ID,
    CARD_TIERS,
    GEM_COLORS,
    NOBLE_DEFS_BY_ID,
    MAX_RESERVED_CARDS,
    calculatePoints,
    calculateDiscounts,
    calculateEffectiveCost,
    canAffordCard,
    getMissingColors,
    getMissingTokenCount,
    getMissingNobleRequirementCount,
    getPaymentTokens,
    getTokenCount,
} from './domain/rules';
import type { AiActionDecision, LocalAiActionEvaluation } from '../../engine/ai/types';
import type { MatchState } from '../../engine/types';

type SplendorState = MatchState<SplendorCore>;

export const AI_ACTION_KINDS = {
    TAKE_THREE: 'take-three',
    TAKE_TWO: 'take-two',
    RESERVE_OPEN: 'reserve-open',
    RESERVE_DECK: 'reserve-deck',
    BUY_OPEN: 'buy-open',
    BUY_RESERVED: 'buy-reserved',
    DISCARD: 'discard',
    CHOOSE_NOBLE: 'choose-noble',
} as const;

// --- Scoring weights ---
const W_POINTS = 100;
const W_BUY_BASE = 20;
const W_TIER_BONUS = 10;
const W_NOBLE_ALIGN = 80;
const W_CHEAP_BUY = 30;
const W_CHEAP_COST_FACTOR = 3;
const W_GEM_IMPORTANCE_TIER = 10;
const W_TAKE_TWO_BONUS = 10;
const W_RESERVE_POINTS = 30;
const W_RESERVE_CLOSE_2 = 40;
const W_RESERVE_CLOSE_4 = 20;
const W_RESERVE_TIER = 15;
const W_DECK_TIER = 10;
const W_DECK_BASE = 5;
const W_DISCARD_NEED_TIER = 5;
const W_DISCARD_BASE = 100;
const W_EVAL_NOBLE_BASE = 30;
const W_EVAL_NOBLE_MISSING = 5;

// --- Difficulty configuration ---

interface SplendorDifficultyConfig {
    /** 购买卡牌时分数权重倍率 */
    pointsMultiplier: number;
    /** 贵族对齐权重倍率 */
    nobleMultiplier: number;
    /** 对手威胁权重 (0 = 不考虑对手) */
    opponentThreatWeight: number;
    /** 终局加速：接近 15 分时直接得分额外加权 */
    endgamePointsBonus: number;
    /** 终局触发分数阈值 */
    endgameThreshold: number;
    /** 保留卡用于卡人的权重 */
    blockReserveWeight: number;
    /** 目标卡考虑数量 (影响拿宝石决策的前瞻范围) */
    targetCardCount: number;
    /** 红利价值权重 */
    bonusValueWeight: number;
    /** 投影分值倍率 */
    projectionScale: number;
    /** 动作后链式购买奖励权重 */
    chainWeight: number;
    /** 干扰对手节奏的额外权重 */
    threatProjectionWeight: number;
    /** 预留位占用惩罚 */
    reserveSlotPenalty: number;
    /** 盲抽预留的期望价值 */
    deckReserveValue: number;
}

const DIFFICULTY_CONFIGS: Record<AiDifficultyLevel, SplendorDifficultyConfig> = {
    easy: {
        pointsMultiplier: 0.9,
        nobleMultiplier: 0.15,
        opponentThreatWeight: 0,
        endgamePointsBonus: 0,
        endgameThreshold: 15,
        blockReserveWeight: 0,
        targetCardCount: 4,
        bonusValueWeight: 0.45,
        projectionScale: 0.14,
        chainWeight: 0.6,
        threatProjectionWeight: 0,
        reserveSlotPenalty: 12,
        deckReserveValue: 10,
    },
    normal: {
        pointsMultiplier: 1.15,
        nobleMultiplier: 0.8,
        opponentThreatWeight: 20,
        endgamePointsBonus: 40,
        endgameThreshold: 12,
        blockReserveWeight: 10,
        targetCardCount: 8,
        bonusValueWeight: 1.0,
        projectionScale: 0.2,
        chainWeight: 0.85,
        threatProjectionWeight: 0.5,
        reserveSlotPenalty: 15,
        deckReserveValue: 13,
    },
    hard: {
        pointsMultiplier: 1.45,
        nobleMultiplier: 1.35,
        opponentThreatWeight: 90,
        endgamePointsBonus: 120,
        endgameThreshold: 9,
        blockReserveWeight: 55,
        targetCardCount: 16,
        bonusValueWeight: 1.75,
        projectionScale: 0.3,
        chainWeight: 1.05,
        threatProjectionWeight: 1.25,
        reserveSlotPenalty: 24,
        deckReserveValue: 20,
    },
    expert: {
        pointsMultiplier: 1.82,
        nobleMultiplier: 1.5,
        opponentThreatWeight: 110,
        endgamePointsBonus: 350,
        endgameThreshold: 7,
        blockReserveWeight: 68,
        targetCardCount: 24,
        bonusValueWeight: 2.15,
        projectionScale: 1.2,
        chainWeight: 2.2,
        threatProjectionWeight: 1.45,
        reserveSlotPenalty: 36,
        deckReserveValue: 18,
    },
};

function getDifficultyConfig(context: AiDecisionContext): SplendorDifficultyConfig {
    return DIFFICULTY_CONFIGS[context.difficulty.level] ?? DIFFICULTY_CONFIGS.normal;
}

function isGemColor(value: unknown): value is GemColor {
    return typeof value === 'string' && (GEM_COLORS as readonly string[]).includes(value);
}

function resolveScorerContext(context: AiDecisionContext): { core: SplendorCore; player: SplendorPlayerState } | null {
    const state = context.visibleState as SplendorState;
    const core = state.core;
    const player = core.players[context.playerId];
    if (!player) return null;
    return { core, player };
}

function createTakeThreeAction(colors: GemColor[]): AiLegalAction {
    const sortedColors = [...colors].sort();
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.TAKE_THREE, sortedColors.join('-')),
        kind: AI_ACTION_KINDS.TAKE_THREE,
        label: `拿取3枚不同宝石: ${sortedColors.join(', ')}`,
        commands: [{
            type: SPLENDOR_COMMANDS.TAKE_THREE_DIFFERENT_GEMS,
            payload: { colors: sortedColors },
        }],
        metadata: { colors: sortedColors },
    };
}

function createTakeTwoAction(color: GemColor): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.TAKE_TWO, color),
        kind: AI_ACTION_KINDS.TAKE_TWO,
        label: `拿取2枚${color}宝石`,
        commands: [{
            type: SPLENDOR_COMMANDS.TAKE_TWO_SAME_GEMS,
            payload: { color },
        }],
        metadata: { color },
    };
}

function createReserveOpenAction(tier: CardTier, cardId: string): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.RESERVE_OPEN, `t${tier}`, cardId),
        kind: AI_ACTION_KINDS.RESERVE_OPEN,
        label: `预留公开卡牌 ${cardId}`,
        commands: [{
            type: SPLENDOR_COMMANDS.RESERVE_OPEN_CARD,
            payload: { tier, cardId },
        }],
        metadata: { tier, cardId },
    };
}

function createReserveDeckAction(tier: CardTier): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.RESERVE_DECK, `t${tier}`),
        kind: AI_ACTION_KINDS.RESERVE_DECK,
        label: `预留牌堆${tier}层顶牌`,
        commands: [{
            type: SPLENDOR_COMMANDS.RESERVE_DECK_TOP_CARD,
            payload: { tier },
        }],
        metadata: { tier },
    };
}

function createBuyOpenAction(tier: CardTier, cardId: string): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.BUY_OPEN, `t${tier}`, cardId),
        kind: AI_ACTION_KINDS.BUY_OPEN,
        label: `购买公开卡牌 ${cardId}`,
        commands: [{
            type: SPLENDOR_COMMANDS.BUY_OPEN_CARD,
            payload: { tier, cardId },
        }],
        metadata: { tier, cardId },
    };
}

function createBuyReservedAction(cardId: string): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.BUY_RESERVED, cardId),
        kind: AI_ACTION_KINDS.BUY_RESERVED,
        label: `购买预留卡牌 ${cardId}`,
        commands: [{
            type: SPLENDOR_COMMANDS.BUY_RESERVED_CARD,
            payload: { cardId },
        }],
        metadata: { cardId },
    };
}

function createDiscardAction(color: TokenColor): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.DISCARD, color),
        kind: AI_ACTION_KINDS.DISCARD,
        label: `丢弃1枚${color}宝石`,
        commands: [{
            type: SPLENDOR_COMMANDS.DISCARD_GEMS_TO_LIMIT,
            payload: { color },
        }],
        metadata: { color },
    };
}

function createChooseNobleAction(nobleId: string): AiLegalAction {
    return {
        actionId: createAiLegalActionId(AI_ACTION_KINDS.CHOOSE_NOBLE, nobleId),
        kind: AI_ACTION_KINDS.CHOOSE_NOBLE,
        label: `选择贵族 ${nobleId}`,
        commands: [{
            type: SPLENDOR_COMMANDS.CHOOSE_NOBLE,
            payload: { nobleId },
        }],
        metadata: { nobleId },
    };
}

function getAvailableGemColors(bank: Record<TokenColor, number>): GemColor[] {
    return GEM_COLORS.filter((color) => bank[color] > 0);
}

function generateThreeColorCombos(available: GemColor[]): GemColor[][] {
    const combos: GemColor[][] = [];
    for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
            for (let k = j + 1; k < available.length; k++) {
                combos.push([available[i], available[j], available[k]]);
            }
        }
    }
    return combos;
}

function getCardDef(cardId: string) {
    return CARD_DEFS_BY_ID[cardId] ?? null;
}

interface SplendorCardInsight {
    cardId: string;
    tier: CardTier;
    points: number;
    bonus: GemColor;
    missingTokens: number;
    missingColors: GemColor[];
    nobleRelevance: number;
    bonusDemand: number;
    utility: number;
    affordable: boolean;
}

interface SplendorOpponentThreatSnapshot {
    playerId: string;
    points: number;
    imminentEndgame: boolean;
    buyableOpenCardIds: string[];
    closeOpenCardIds: string[];
    keyNeededColors: GemColor[];
    topThreatCardId: string | null;
    topThreatValue: number;
}

interface SplendorFeatureSnapshot {
    marketCards: SplendorCardInsight[];
    reservedCards: SplendorCardInsight[];
    cardById: Record<string, SplendorCardInsight>;
    targetCards: SplendorCardInsight[];
    demandByColor: Record<GemColor, number>;
    nobleNeedByColor: Record<GemColor, number>;
    opponentThreats: SplendorOpponentThreatSnapshot[];
    hotColors: GemColor[];
}

interface SplendorProjectedPlayerState {
    nextPlayer: SplendorPlayerState;
    removedOpenCardId: string | null;
}

interface SplendorOpportunitySummary {
    affordableCount: number;
    closeCount: number;
    topAffordableUtility: number;
    topCloseUtility: number;
    topFutureUtility: number;
}

function createGemColorRecord(initialValue = 0): Record<GemColor, number> {
    return {
        white: initialValue,
        blue: initialValue,
        green: initialValue,
        red: initialValue,
        black: initialValue,
    };
}

function roundScore(value: number): number {
    return Number(value.toFixed(3));
}

function buildNobleNeedByColor(core: SplendorCore, player: SplendorPlayerState): Record<GemColor, number> {
    const discounts = calculateDiscounts(player);
    const needByColor = createGemColorRecord();
    for (const nobleId of core.nobleIds) {
        const noble = NOBLE_DEFS_BY_ID[nobleId];
        if (!noble) continue;
        for (const color of GEM_COLORS) {
            needByColor[color] += Math.max(0, noble.requirement[color] - discounts[color]);
        }
    }
    return needByColor;
}

function buildDemandByColor(core: SplendorCore): Record<GemColor, number> {
    const demandByColor = createGemColorRecord();
    for (const tier of CARD_TIERS) {
        for (const cardId of core.market[tier]) {
            const card = getCardDef(cardId);
            if (!card) continue;
            const weight = 1 + card.points * 0.8 + card.tier * 0.5;
            for (const color of GEM_COLORS) {
                if (card.cost[color] > 0) {
                    demandByColor[color] += card.cost[color] * weight;
                }
            }
        }
    }
    return demandByColor;
}

function computeCardUtility(args: {
    player: SplendorPlayerState;
    card: NonNullable<ReturnType<typeof getCardDef>>;
    demandByColor: Record<GemColor, number>;
    nobleNeedByColor: Record<GemColor, number>;
}): number {
    const { player, card, demandByColor, nobleNeedByColor } = args;
    const missingTokens = getMissingTokenCount(player, card);
    const missingColors = getMissingColors(player, card);
    const readinessBonus = missingTokens === 0
        ? 42
        : missingTokens === 1
            ? 24
            : missingTokens === 2
                ? 10
                : 0;
    const bonusDemand = demandByColor[card.bonus] ?? 0;
    const nobleRelevance = nobleNeedByColor[card.bonus] ?? 0;
    const rawScore = (
        card.points * 92
        + card.tier * 16
        + bonusDemand * 3.2
        + nobleRelevance * 18
        + readinessBonus
        - missingTokens * 14
        - missingColors.length * 5
    );
    return roundScore(Math.max(0, rawScore));
}

function buildCardInsight(args: {
    player: SplendorPlayerState;
    cardId: string;
    demandByColor: Record<GemColor, number>;
    nobleNeedByColor: Record<GemColor, number>;
}): SplendorCardInsight | null {
    const card = getCardDef(args.cardId);
    if (!card) return null;
    const missingTokens = getMissingTokenCount(args.player, card);
    const missingColors = getMissingColors(args.player, card);
    const nobleRelevance = args.nobleNeedByColor[card.bonus] ?? 0;
    const bonusDemand = args.demandByColor[card.bonus] ?? 0;
    return {
        cardId: args.cardId,
        tier: card.tier,
        points: card.points,
        bonus: card.bonus,
        missingTokens,
        missingColors,
        nobleRelevance,
        bonusDemand,
        utility: computeCardUtility({
            player: args.player,
            card,
            demandByColor: args.demandByColor,
            nobleNeedByColor: args.nobleNeedByColor,
        }),
        affordable: canAffordCard(args.player, card),
    };
}

function computeThreatValue(opponent: SplendorPlayerState, card: NonNullable<ReturnType<typeof getCardDef>>): number {
    const missingTokens = getMissingTokenCount(opponent, card);
    const proximityBonus = missingTokens <= 0
        ? 56
        : missingTokens === 1
            ? 34
            : missingTokens === 2
                ? 16
                : 0;
    const endgameBonus = opponent.points >= 11 && card.points > 0 ? 28 : 0;
    return roundScore(card.points * 44 + card.tier * 12 + proximityBonus + endgameBonus);
}

function buildOpponentThreatSnapshot(core: SplendorCore, opponentId: string): SplendorOpponentThreatSnapshot | null {
    const opponent = core.players[opponentId];
    if (!opponent) return null;

    const keyNeededColors = new Set<GemColor>();
    const buyableOpenCardIds: string[] = [];
    const closeOpenCardIds: string[] = [];
    let topThreatCardId: string | null = null;
    let topThreatValue = 0;

    for (const tier of CARD_TIERS) {
        for (const cardId of core.market[tier]) {
            const card = getCardDef(cardId);
            if (!card) continue;
            const missingTokens = getMissingTokenCount(opponent, card);
            if (missingTokens <= 0) {
                buyableOpenCardIds.push(cardId);
            }
            if (missingTokens <= 2) {
                closeOpenCardIds.push(cardId);
                for (const color of getMissingColors(opponent, card)) {
                    keyNeededColors.add(color);
                }
            }

            const threatValue = computeThreatValue(opponent, card);
            if (threatValue > topThreatValue) {
                topThreatValue = threatValue;
                topThreatCardId = cardId;
            }
        }
    }

    return {
        playerId: opponentId,
        points: opponent.points,
        imminentEndgame: opponent.points >= 11,
        buyableOpenCardIds,
        closeOpenCardIds,
        keyNeededColors: [...keyNeededColors],
        topThreatCardId,
        topThreatValue,
    };
}

function getOpponentThreats(
    core: SplendorCore,
    playerId: string,
    snapshot?: SplendorFeatureSnapshot | null
): SplendorOpponentThreatSnapshot[] {
    return snapshot?.opponentThreats
        ?? (() => {
            const opponents = Object.entries(core.players)
                .filter(([oppId]) => oppId !== playerId);
            return opponents
                .map(([oppId]) => buildOpponentThreatSnapshot(core, oppId))
                .filter((item): item is SplendorOpponentThreatSnapshot => item !== null);
        })();
}

function buildSplendorFeatureSnapshot(args: BuildGameAiFeatureSnapshotArgs): SplendorFeatureSnapshot | null {
    const state = args.state as SplendorState;
    const core = state.core;
    const player = core.players[args.playerId];
    if (!player) return null;

    const demandByColor = buildDemandByColor(core);
    const nobleNeedByColor = buildNobleNeedByColor(core, player);
    const marketCards = CARD_TIERS.flatMap((tier) => core.market[tier])
        .map((cardId) => buildCardInsight({ player, cardId, demandByColor, nobleNeedByColor }))
        .filter((item): item is SplendorCardInsight => item !== null);
    const reservedCards = player.reservedCardIds
        .map((cardId) => buildCardInsight({ player, cardId, demandByColor, nobleNeedByColor }))
        .filter((item): item is SplendorCardInsight => item !== null);
    const cardById = Object.fromEntries(
        [...marketCards, ...reservedCards].map((insight) => [insight.cardId, insight]),
    ) as Record<string, SplendorCardInsight>;
    const targetCards = [...marketCards, ...reservedCards]
        .sort((left, right) => right.utility - left.utility)
        .slice(0, 12);
    const opponentThreats = getOpponentThreats(core, args.playerId);
    const hotColors = [...GEM_COLORS].sort((left, right) => demandByColor[right] - demandByColor[left]);

    return {
        marketCards,
        reservedCards,
        cardById,
        targetCards,
        demandByColor,
        nobleNeedByColor,
        opponentThreats,
        hotColors,
    };
}

function getSplendorFeatureSnapshot(context: AiDecisionContext): SplendorFeatureSnapshot | null {
    const snapshot = context.featureSnapshot as SplendorFeatureSnapshot | null | undefined;
    if (!snapshot || !Array.isArray(snapshot.marketCards) || !Array.isArray(snapshot.targetCards)) {
        return null;
    }
    return snapshot;
}

function clonePlayerState(player: SplendorPlayerState): SplendorPlayerState {
    return {
        ...player,
        tokens: { ...player.tokens },
        reservedCardIds: [...player.reservedCardIds],
        purchasedCardIds: [...player.purchasedCardIds],
        nobleIds: [...player.nobleIds],
    };
}

function getKnownVisibleCardIds(core: SplendorCore, player: SplendorPlayerState, removedOpenCardId?: string | null): string[] {
    const marketCardIds = CARD_TIERS.flatMap((tier) => core.market[tier]).filter((cardId) => cardId !== removedOpenCardId);
    const reservedCardIds = player.reservedCardIds.filter((cardId) => getCardDef(cardId));
    return [...marketCardIds, ...reservedCardIds];
}

function evaluateOpportunitySummary(
    core: SplendorCore,
    player: SplendorPlayerState,
    visibleCardIds: string[],
    snapshot: SplendorFeatureSnapshot | null,
): SplendorOpportunitySummary {
    const demandByColor = snapshot?.demandByColor ?? buildDemandByColor(core);
    const nobleNeedByColor = buildNobleNeedByColor(core, player);
    const scored = visibleCardIds
        .map((cardId) => {
            const card = getCardDef(cardId);
            if (!card) return null;
            const utility = computeCardUtility({
                player,
                card,
                demandByColor,
                nobleNeedByColor,
            });
            return {
                utility,
                missingTokens: getMissingTokenCount(player, card),
            };
        })
        .filter((item): item is { utility: number; missingTokens: number } => item !== null);

    const affordable = scored.filter((item) => item.missingTokens <= 0).sort((left, right) => right.utility - left.utility);
    const close = scored.filter((item) => item.missingTokens <= 1).sort((left, right) => right.utility - left.utility);
    const future = [...scored].sort((left, right) => right.utility - left.utility);

    return {
        affordableCount: affordable.length,
        closeCount: close.length,
        topAffordableUtility: affordable.slice(0, 2).reduce((sum, item) => sum + item.utility, 0),
        topCloseUtility: close.slice(0, 2).reduce((sum, item) => sum + item.utility, 0),
        topFutureUtility: future.slice(0, 3).reduce((sum, item) => sum + item.utility, 0),
    };
}

function simulateProjectedPlayerState(
    core: SplendorCore,
    player: SplendorPlayerState,
    action: AiLegalAction,
): SplendorProjectedPlayerState | null {
    const nextPlayer = clonePlayerState(player);
    let removedOpenCardId: string | null = null;

    if (action.kind === AI_ACTION_KINDS.TAKE_THREE) {
        const colors = Array.isArray(action.metadata?.colors) ? action.metadata.colors.filter(isGemColor) : [];
        for (const color of colors) {
            nextPlayer.tokens[color] += 1;
        }
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.TAKE_TWO) {
        const color = isGemColor(action.metadata?.color) ? action.metadata.color : null;
        if (!color) return null;
        nextPlayer.tokens[color] += 2;
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) {
        const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
        const card = cardId ? getCardDef(cardId) : null;
        if (!card || !cardId) return null;
        const payment = getPaymentTokens(nextPlayer, card);
        for (const color of [...GEM_COLORS, 'gold' as const]) {
            nextPlayer.tokens[color] -= payment[color] ?? 0;
        }
        if (action.kind === AI_ACTION_KINDS.BUY_OPEN) {
            removedOpenCardId = cardId;
        }
        if (action.kind === AI_ACTION_KINDS.BUY_RESERVED) {
            nextPlayer.reservedCardIds = nextPlayer.reservedCardIds.filter((reservedId) => reservedId !== cardId);
        }
        nextPlayer.purchasedCardIds.push(cardId);
        nextPlayer.points = calculatePoints(nextPlayer);
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN) {
        const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
        if (!cardId) return null;
        removedOpenCardId = cardId;
        nextPlayer.reservedCardIds.push(cardId);
        if (core.bank.gold > 0) {
            nextPlayer.tokens.gold += 1;
        }
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.RESERVE_DECK) {
        const tier = typeof action.metadata?.tier === 'number' ? action.metadata.tier : null;
        if (!tier) return null;
        nextPlayer.reservedCardIds.push(`hidden-reserved-draw-${tier}`);
        if (core.bank.gold > 0) {
            nextPlayer.tokens.gold += 1;
        }
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.DISCARD) {
        const color = typeof action.metadata?.color === 'string' ? action.metadata.color as TokenColor : null;
        if (!color) return null;
        nextPlayer.tokens[color] -= 1;
        return { nextPlayer, removedOpenCardId };
    }

    if (action.kind === AI_ACTION_KINDS.CHOOSE_NOBLE) {
        const nobleId = typeof action.metadata?.nobleId === 'string' ? action.metadata.nobleId : null;
        if (!nobleId) return null;
        nextPlayer.nobleIds.push(nobleId);
        nextPlayer.points = calculatePoints(nextPlayer);
        return { nextPlayer, removedOpenCardId };
    }

    return null;
}

export function buildSplendorAiLegalActions(args: BuildGameAiLegalActionsArgs): AiLegalAction[] {
    const { state, playerId } = args;
    const core = (state as SplendorState).core;
    const player = core.players[playerId];
    if (!player) return [];

    const actions: AiLegalAction[] = [];

    if (core.currentPlayer !== playerId) return [];

    if (core.pendingResolution) {
        if (core.pendingResolution.type === 'discardToLimit') {
            const tokenColors: TokenColor[] = [...GEM_COLORS, 'gold'];
            for (const color of tokenColors) {
                if (player.tokens[color] > 0) {
                    actions.push(createDiscardAction(color));
                }
            }
            return actions;
        }
        if (core.pendingResolution.type === 'chooseNoble') {
            for (const nobleId of core.pendingResolution.nobleIds) {
                actions.push(createChooseNobleAction(nobleId));
            }
            return actions;
        }
        return [];
    }

    // BUY actions — highest priority
    for (const tier of CARD_TIERS) {
        for (const cardId of core.market[tier]) {
            const card = getCardDef(cardId);
            if (card && canAffordCard(player, card)) {
                actions.push(createBuyOpenAction(tier, cardId));
            }
        }
    }
    for (const cardId of player.reservedCardIds) {
        const card = getCardDef(cardId);
        if (card && canAffordCard(player, card)) {
            actions.push(createBuyReservedAction(cardId));
        }
    }

    // TAKE GEMS actions — pre-compute missing colors per card to avoid redundant discount calculations
    const marketMissingCache = new Map<string, { card: NonNullable<ReturnType<typeof getCardDef>>; missing: GemColor[] }>();
    for (const tier of CARD_TIERS) {
        for (const cardId of core.market[tier]) {
            const card = getCardDef(cardId);
            if (card) {
                marketMissingCache.set(cardId, { card, missing: getMissingColors(player, card) });
            }
        }
    }

    const availableColors = getAvailableGemColors(core.bank);
    if (availableColors.length >= 3) {
        const combos = generateThreeColorCombos(availableColors);
        const scoredCombos = combos.map((combo) => {
            let score = 0;
            for (const [, entry] of marketMissingCache) {
                const overlap = combo.filter((c) => entry.missing.includes(c));
                score += overlap.length * (4 - entry.card.tier);
            }
            return { combo, score };
        });
        scoredCombos.sort((a, b) => b.score - a.score);
        const topCount = Math.min(10, scoredCombos.length);
        for (let i = 0; i < topCount; i++) {
            actions.push(createTakeThreeAction(scoredCombos[i].combo));
        }
    } else if (availableColors.length === 2) {
        actions.push(createTakeThreeAction(availableColors));
    }

    for (const color of GEM_COLORS) {
        if (core.bank[color] >= 4) {
            actions.push(createTakeTwoAction(color));
        }
    }

    // RESERVE actions
    if (player.reservedCardIds.length < MAX_RESERVED_CARDS) {
        for (const tier of CARD_TIERS) {
            for (const cardId of core.market[tier]) {
                const entry = marketMissingCache.get(cardId);
                if (!entry) continue;
                const missing = getMissingTokenCount(player, entry.card);
                if (entry.card.points >= 4 || (tier >= 2 && missing <= 3)) {
                    actions.push(createReserveOpenAction(tier, cardId));
                }
            }
        }
        for (const tier of CARD_TIERS) {
            if (core.decks[tier].length > 0) {
                actions.push(createReserveDeckAction(tier));
            }
        }
    }

    // Fallback: generate take-three with all available colors (valid when bank has >=1 colors)
    if (actions.length === 0 && availableColors.length > 0) {
        actions.push(createTakeThreeAction(availableColors.slice(0, Math.min(3, availableColors.length))));
    }

    return actions;
}

const buyCardScorer: LocalAiActionScorer = {
    id: 'buy-card',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.BUY_OPEN && action.kind !== AI_ACTION_KINDS.BUY_RESERVED) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;
        const config = getDifficultyConfig(context);
        const snapshot = getSplendorFeatureSnapshot(context);

        const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
        if (!cardId) return null;
        const card = getCardDef(cardId);
        if (!card) return null;

        let score = 0;
        // 终局加速：接近 15 分时，直接分数权重提高
        const endgameBonus = player.points >= config.endgameThreshold
            ? card.points * config.endgamePointsBonus
            : 0;
        score += card.points * W_POINTS * config.pointsMultiplier + endgameBonus;
        score += W_BUY_BASE;
        score += card.tier * W_TIER_BONUS;

        // 贵族对齐
        const newDiscounts = calculateDiscounts({ ...player, purchasedCardIds: [...player.purchasedCardIds, cardId] });
        for (const nobleId of core.nobleIds) {
            const noble = NOBLE_DEFS_BY_ID[nobleId];
            if (noble && GEM_COLORS.every((c) => newDiscounts[c] >= noble.requirement[c])) {
                score += W_NOBLE_ALIGN * config.nobleMultiplier;
            }
        }

        // 红利价值：购买后新增的红利对后续购买的帮助
        const oldDiscounts = calculateDiscounts(player);
        const bonusColor = card.bonus;
        const bonusDelta = newDiscounts[bonusColor] - oldDiscounts[bonusColor];
        if (bonusDelta > 0) {
            // 计算该颜色在市场卡中的需求量
            let bonusDemand = 0;
            for (const tier of CARD_TIERS) {
                for (const cid of core.market[tier]) {
                    const c = getCardDef(cid);
                    if (c && c.cost[bonusColor] > 0) bonusDemand++;
                }
            }
            score += bonusDelta * bonusDemand * W_GEM_IMPORTANCE_TIER * config.bonusValueWeight;
        }

        const totalCost = GEM_COLORS.reduce((s, c) => s + Math.max(0, card.cost[c] - oldDiscounts[c]), 0);
        score += Math.max(0, W_CHEAP_BUY - totalCost * W_CHEAP_COST_FACTOR);
        score += Math.max(0, getTokenCount(player) - 6) * 3;

        const simulated = simulateProjectedPlayerState(core, player, action);
        if (simulated) {
            const beforeVisibleCardIds = getKnownVisibleCardIds(core, player);
            const afterVisibleCardIds = getKnownVisibleCardIds(core, simulated.nextPlayer, simulated.removedOpenCardId);
            const beforeOpportunity = evaluateOpportunitySummary(core, player, beforeVisibleCardIds, snapshot);
            const afterOpportunity = evaluateOpportunitySummary(core, simulated.nextPlayer, afterVisibleCardIds, snapshot);
            score += (afterOpportunity.affordableCount - beforeOpportunity.affordableCount) * 26 * config.chainWeight;
            score += (afterOpportunity.topAffordableUtility - beforeOpportunity.topAffordableUtility) * 0.12 * config.chainWeight;
            score += (afterOpportunity.closeCount - beforeOpportunity.closeCount) * 8;
        }

        return { score, reason: `购买卡牌(价值${card.points}分, T${card.tier})` };
    },
};

const takeGemsScorer: LocalAiActionScorer = {
    id: 'take-gems',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.TAKE_THREE && action.kind !== AI_ACTION_KINDS.TAKE_TWO) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;
        const config = getDifficultyConfig(context);

        const rawColors = action.kind === AI_ACTION_KINDS.TAKE_THREE
            ? action.metadata?.colors
            : action.metadata?.color;
        const colors: GemColor[] = action.kind === AI_ACTION_KINDS.TAKE_THREE
            ? (Array.isArray(rawColors) ? rawColors.filter(isGemColor) : [])
            : (isGemColor(rawColors) ? [rawColors] : []);
        const snapshot = getSplendorFeatureSnapshot(context);

        // 根据难度决定考虑多少张目标卡
        const targetLimit = config.targetCardCount;

        let score = 0;
        const targetCards = snapshot?.targetCards.slice(0, targetLimit)
            ?? (() => {
                const demandByColor = buildDemandByColor(core);
                const nobleNeedByColor = buildNobleNeedByColor(core, player);
                return [
                    ...CARD_TIERS.flatMap((tier) => core.market[tier]),
                    ...player.reservedCardIds,
                ]
                    .map((cardId) => {
                        const card = getCardDef(cardId);
                        return card ? buildCardInsight({
                            player,
                            cardId,
                            demandByColor,
                            nobleNeedByColor,
                        }) : null;
                    })
                    .filter((item): item is SplendorCardInsight => item !== null)
                    .slice(0, targetLimit);
            })();

        for (const target of targetCards) {
            const helpful = colors.filter((color) => target.missingColors.includes(color));
            if (helpful.length > 0) {
                score += helpful.length * ((target.utility * 0.1) + (target.points * 3));
            }
        }

        // 对手威胁：困难/专家难度考虑抢走对手需要的宝石
        if (config.opponentThreatWeight > 0) {
            const opponentThreats = getOpponentThreats(core, context.playerId, snapshot);
            for (const threat of opponentThreats) {
                for (const color of colors) {
                    if (threat.keyNeededColors.includes(color)) {
                        score += threat.imminentEndgame
                            ? config.opponentThreatWeight * 0.45
                            : config.opponentThreatWeight * 0.22;
                    }
                }
            }
        }

        const hotColorBonus = snapshot
            ? colors.reduce((sum, color) => sum + (snapshot.demandByColor[color] * 0.2), 0)
            : 0;
        score += hotColorBonus;
        const projectedTokenCount = getTokenCount(player) + (action.kind === AI_ACTION_KINDS.TAKE_TWO ? 2 : colors.length);
        score -= Math.max(0, projectedTokenCount - 8) * 28;

        if (action.kind === AI_ACTION_KINDS.TAKE_TWO) {
            score += W_TAKE_TWO_BONUS;
        }

        return score > 0 ? { score, reason: `收集宝石(帮助购买卡牌)` } : null;
    },
};

const reserveScorer: LocalAiActionScorer = {
    id: 'reserve',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.RESERVE_OPEN && action.kind !== AI_ACTION_KINDS.RESERVE_DECK) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;
        const config = getDifficultyConfig(context);
        const snapshot = getSplendorFeatureSnapshot(context);

        if (player.reservedCardIds.length >= MAX_RESERVED_CARDS) return null;

        let score = 0;

        if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN) {
            const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
            if (!cardId) return null;
            const card = getCardDef(cardId);
            if (!card) return null;
            const cardInsight = snapshot?.cardById[cardId] ?? (() => {
                const demandByColor = snapshot?.demandByColor ?? buildDemandByColor(core);
                const nobleNeedByColor = snapshot?.nobleNeedByColor ?? buildNobleNeedByColor(core, player);
                return buildCardInsight({
                    player,
                    cardId,
                    demandByColor,
                    nobleNeedByColor,
                });
            })();
            if (!cardInsight) return null;

            score += card.points * W_RESERVE_POINTS;
            const missing = cardInsight.missingTokens;
            if (missing <= 2) score += W_RESERVE_CLOSE_2;
            else if (missing <= 4) score += W_RESERVE_CLOSE_4;
            score += card.tier * W_RESERVE_TIER;
            score += cardInsight.utility * 0.12;

            // 对手威胁：困难/专家难度，如果对手即将能买到这张卡，提高预留价值
            if (config.blockReserveWeight > 0) {
                const opponentThreats = getOpponentThreats(core, context.playerId, snapshot);
                for (const threat of opponentThreats) {
                    if (threat.topThreatCardId === cardId || threat.buyableOpenCardIds.includes(cardId)) {
                        score += config.blockReserveWeight * (card.points + 1);
                    } else if (threat.closeOpenCardIds.includes(cardId)) {
                        score += config.blockReserveWeight * 0.6;
                    }
                }
            }
        } else {
            const tier = typeof action.metadata?.tier === 'number' ? action.metadata.tier : 1;
            const hotColorBonus = snapshot?.hotColors
                ? snapshot.hotColors.slice(0, Math.min(2, tier)).reduce((sum, color) => sum + (snapshot.demandByColor[color] * 0.08), 0)
                : 0;
            score += tier * W_DECK_TIER + W_DECK_BASE + config.deckReserveValue + hotColorBonus;
        }

        score -= player.reservedCardIds.length * (8 + config.reserveSlotPenalty * 0.35);

        return score > 0 ? { score, reason: `预留卡牌` } : null;
    },
};

const discardScorer: LocalAiActionScorer = {
    id: 'discard',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.DISCARD) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;

        const rawColor = action.metadata?.color;
        if (typeof rawColor !== 'string') return null;
        const color = rawColor as TokenColor;

        let needScore = 0;
        if (color === 'gold') {
            // gold 是万能宝石，价值高于任何单一颜色
            // 最大 market needScore = 12 cards * (4-1)*5 = 180，给 gold 更高值确保最后丢弃
            needScore = 200;
        } else {
            for (const tier of CARD_TIERS) {
                for (const cardId of core.market[tier]) {
                    const card = getCardDef(cardId);
                    if (!card) continue;
                    const effectiveCost = calculateEffectiveCost(player, card);
                    if (effectiveCost[color as GemColor] > 0) {
                        needScore += (4 - tier) * W_DISCARD_NEED_TIER;
                    }
                }
            }
        }
        const score = W_DISCARD_BASE - needScore;
        return { score, reason: `丢弃宝石(${color})` };
    },
};

const chooseNobleScorer: LocalAiActionScorer = {
    id: 'choose-noble',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.CHOOSE_NOBLE) return null;
        if (typeof action.metadata?.nobleId !== 'string') return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const noble = NOBLE_DEFS_BY_ID[action.metadata.nobleId];
        if (!noble) return null;
        const missing = getMissingNobleRequirementCount(resolved.player, noble);
        const score = W_EVAL_NOBLE_BASE - missing * W_EVAL_NOBLE_MISSING;
        return { score, reason: `选择贵族(3分)` };
    },
};

// --- 对手威胁评分器 (困难/专家) ---
const opponentThreatScorer: LocalAiActionScorer = {
    id: 'opponent-threat',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.BUY_OPEN) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core } = resolved;
        const config = getDifficultyConfig(context);
        if (config.opponentThreatWeight <= 0) return null;

        const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
        if (!cardId) return null;
        const card = getCardDef(cardId);
        if (!card) return null;

        // 检查对手是否也快能买到这张卡
        let threatBonus = 0;
        for (const [oppId, opponent] of Object.entries(core.players)) {
            if (oppId === context.playerId) continue;
            const oppMissing = getMissingTokenCount(opponent, card);
            if (oppMissing <= 1) {
                // 对手差 1 个宝石就能买，抢买价值高
                threatBonus += config.opponentThreatWeight * (card.points + 1);
            } else if (oppMissing <= 3) {
                // 对手接近购买
                threatBonus += config.opponentThreatWeight * 0.5;
            }
        }

        // 检查对手是否快到 15 分
        for (const [oppId, opponent] of Object.entries(core.players)) {
            if (oppId === context.playerId) continue;
            if (opponent.points >= 11 && card.points > 0) {
                // 对手接近终局，自己买有分卡更紧迫
                threatBonus += config.opponentThreatWeight * 0.5;
            }
        }

        return threatBonus > 0 ? { score: threatBonus, reason: `对手威胁(抢买高价值卡)` } : null;
    },
};

// --- 贵族进度评分器 ---
const nobleProgressScorer: LocalAiActionScorer = {
    id: 'noble-progress',
    score(context, action) {
        if (action.kind !== AI_ACTION_KINDS.TAKE_THREE && action.kind !== AI_ACTION_KINDS.TAKE_TWO) return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;
        const config = getDifficultyConfig(context);
        if (config.nobleMultiplier <= 0) return null;

        const rawColors = action.kind === AI_ACTION_KINDS.TAKE_THREE
            ? action.metadata?.colors
            : action.metadata?.color;
        const colors: GemColor[] = action.kind === AI_ACTION_KINDS.TAKE_THREE
            ? (Array.isArray(rawColors) ? rawColors.filter(isGemColor) : [])
            : (isGemColor(rawColors) ? [rawColors] : []);

        let score = 0;
        const discounts = calculateDiscounts(player);

        // 预计算接近完成的贵族所需的红利颜色
        const neededBonusColors = new Set<GemColor>();
        for (const nobleId of core.nobleIds) {
            const noble = NOBLE_DEFS_BY_ID[nobleId];
            if (!noble) continue;
            const totalMissing = getMissingNobleRequirementCount(player, noble);
            if (totalMissing <= 3) {
                for (const color of GEM_COLORS) {
                    if (noble.requirement[color] > 0 && discounts[color] < noble.requirement[color]) {
                        neededBonusColors.add(color);
                    }
                }
            }
        }

        // 检查拿取的宝石是否能帮助购买红利颜色匹配贵族需求的卡牌
        if (neededBonusColors.size > 0) {
            for (const tier of CARD_TIERS) {
                for (const cardId of core.market[tier]) {
                    const card = getCardDef(cardId);
                    if (!card || !neededBonusColors.has(card.bonus)) continue;
                    const missing = getMissingColors(player, card);
                    const helpful = colors.filter((c) => missing.includes(c));
                    if (helpful.length > 0) {
                        score += helpful.length * 5 * config.nobleMultiplier;
                    }
                }
            }
        }

        return score > 0 ? { score, reason: `贵族进度` } : null;
    },
};

const expertTempoScorer: LocalAiActionScorer = {
    id: 'expert-tempo',
    score(context, action) {
        if (context.difficulty.level !== 'expert') return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;

        const canBuyNow = CARD_TIERS.some((tier) => core.market[tier].some((cardId) => {
            const card = getCardDef(cardId);
            return card ? canAffordCard(player, card) : false;
        })) || player.reservedCardIds.some((cardId) => {
            const card = getCardDef(cardId);
            return card ? canAffordCard(player, card) : false;
        });
        const tokenCount = getTokenCount(player);
        let score = 0;

        if (canBuyNow) {
            if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) score += 92;
            if (action.kind === AI_ACTION_KINDS.TAKE_THREE || action.kind === AI_ACTION_KINDS.TAKE_TWO) score -= 68;
            if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN || action.kind === AI_ACTION_KINDS.RESERVE_DECK) score -= 42;
        }

        if (tokenCount >= 8) {
            if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) score += 28;
            if (action.kind === AI_ACTION_KINDS.TAKE_THREE || action.kind === AI_ACTION_KINDS.TAKE_TWO) score -= 52;
            if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN || action.kind === AI_ACTION_KINDS.RESERVE_DECK) score -= 18;
        }

        return score !== 0 ? { score, reason: '专家节奏控制' } : null;
    },
};

const expertEndgameRaceScorer: LocalAiActionScorer = {
    id: 'expert-endgame-race',
    score(context, action) {
        if (context.difficulty.level !== 'expert') return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;
        const maxOpponentPoints = Math.max(
            0,
            ...Object.entries(core.players)
                .filter(([playerId]) => playerId !== context.playerId)
                .map(([, opponent]) => opponent.points),
        );
        if (player.points < 7 && maxOpponentPoints < 9) return null;

        if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) {
            const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
            const card = cardId ? getCardDef(cardId) : null;
            if (!card) return null;
            let score = card.points * 74;
            if (player.points + card.points >= 15) {
                score += 160;
            }
            return { score, reason: '专家终局抢分' };
        }

        if (action.kind === AI_ACTION_KINDS.TAKE_THREE || action.kind === AI_ACTION_KINDS.TAKE_TWO) {
            return { score: -34, reason: '专家终局避免空转收集' };
        }

        if (action.kind === AI_ACTION_KINDS.RESERVE_DECK) {
            return { score: -26, reason: '专家终局避免盲抽预留' };
        }

        return null;
    },
};

const tempoScorer: LocalAiActionScorer = {
    id: 'tempo',
    score(context, action) {
        if (context.difficulty.level === 'easy') return null;
        const resolved = resolveScorerContext(context);
        if (!resolved) return null;
        const { core, player } = resolved;

        const canBuyNow = CARD_TIERS.some((tier) => core.market[tier].some((cardId) => {
            const card = getCardDef(cardId);
            return card ? canAffordCard(player, card) : false;
        })) || player.reservedCardIds.some((cardId) => {
            const card = getCardDef(cardId);
            return card ? canAffordCard(player, card) : false;
        });

        const tokenCount = getTokenCount(player);
        let score = 0;

        if (canBuyNow) {
            if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) score += 140;
            if (action.kind === AI_ACTION_KINDS.TAKE_THREE || action.kind === AI_ACTION_KINDS.TAKE_TWO) score -= 108;
            if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN || action.kind === AI_ACTION_KINDS.RESERVE_DECK) score -= 64;
        }

        if (tokenCount >= 8) {
            if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) score += 20;
            if (action.kind === AI_ACTION_KINDS.TAKE_THREE || action.kind === AI_ACTION_KINDS.TAKE_TWO) score -= 40;
            if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN || action.kind === AI_ACTION_KINDS.RESERVE_DECK) score -= 16;
        }

        return score !== 0 ? { score, reason: '节奏优先' } : null;
    },
};

const easyDriftScorer: LocalAiActionScorer = {
    id: 'easy-drift',
    score(context, action) {
        if (context.difficulty.level !== 'easy') return null;
        if (action.kind === AI_ACTION_KINDS.TAKE_THREE) {
            return { score: 26, reason: '简单难度更偏向先收集宝石' };
        }
        if (action.kind === AI_ACTION_KINDS.TAKE_TWO) {
            return { score: 18, reason: '简单难度偏好直接拿宝石' };
        }
        if (action.kind === AI_ACTION_KINDS.RESERVE_DECK) {
            return { score: 18, reason: '简单难度更容易盲抽预留' };
        }
        if (action.kind === AI_ACTION_KINDS.RESERVE_OPEN) {
            return { score: 8, reason: '简单难度容易提前预留' };
        }
        if (action.kind === AI_ACTION_KINDS.BUY_OPEN || action.kind === AI_ACTION_KINDS.BUY_RESERVED) {
            const cardId = typeof action.metadata?.cardId === 'string' ? action.metadata.cardId : null;
            const card = cardId ? getCardDef(cardId) : null;
            if (!card) return null;
            return { score: card.points > 0 ? -22 : -48, reason: '简单难度更容易错过更优购买时机' };
        }
        return null;
    },
};

export const splendorScorers: LocalAiActionScorer[] = [
    buyCardScorer,
    takeGemsScorer,
    reserveScorer,
    discardScorer,
    chooseNobleScorer,
];

// 扩展评分器列表 (困难/专家使用)
export const extendedScorers: LocalAiActionScorer[] = [
    ...splendorScorers,
    opponentThreatScorer,
    nobleProgressScorer,
    tempoScorer,
];

// expert 继承 extendedScorers（含 tempoScorer），expertTempoScorer 额外叠加 —— 有意强化节奏偏好
const expertScorers: LocalAiActionScorer[] = [
    ...extendedScorers,
    expertTempoScorer,
    expertEndgameRaceScorer,
];

// --- 策略工厂 ---

function createHeuristicDifficultyPolicy(args: {
    id: AiDifficultyLevel;
    scorers: LocalAiActionScorer[];
    effectiveRandomness?: number;
    weightedRandom?: boolean;
}): LocalAiPolicy {
    return {
        id: args.id,
        decide(context): AiActionDecision | null {
            if (context.legalActions.length === 0) return null;

            // 强制动作（丢弃/选贵族）直接选第一个
            if (context.interaction || context.legalActions.every((a) => a.kind === 'discard' || a.kind === 'choose-noble')) {
                return { actionId: context.legalActions[0].actionId };
            }

            const evaluations = evaluateLocalAiActions(context, args.scorers);
            if (evaluations.length === 0) return { actionId: context.legalActions[0].actionId };

            const effectiveRandomness = args.effectiveRandomness ?? context.difficulty.randomness;

            // 注入噪声
            const noisyEvaluations: LocalAiActionEvaluation[] = evaluations.map((evaluation) => {
                let noiseScore = 0;
                if (effectiveRandomness > 0) {
                    noiseScore = buildDeterministicAiNoise(context, evaluation.action) * effectiveRandomness;
                }
                return {
                    ...evaluation,
                    totalScore: evaluation.totalScore + noiseScore,
                };
            });

            // 按总分排序
            noisyEvaluations.sort((a, b) => b.totalScore - a.totalScore);

            // 根据 shortlistSize 从前 N 个中选择
            const shortlistSize = Math.max(1, Math.min(context.difficulty.shortlistSize, noisyEvaluations.length));
            const shortlist = noisyEvaluations.slice(0, shortlistSize);

            // 简单难度使用加权随机，其他难度选最高分
            if (args.weightedRandom === true && shortlist.length > 1) {
                let bestIdx = 0;
                let bestValue = -Infinity;
                for (let i = 0; i < shortlist.length; i++) {
                    const evaluation = shortlist[i];
                    const noise = buildDeterministicAiNoise(context, evaluation.action, 'easy-pick');
                    const weight = Math.max(1, evaluation.totalScore + 100);
                    // noise ∈ [-1,1]，value ∈ [0, 2*weight]，高分候选仍更可能被选中
                    const value = weight * (1 + noise);
                    if (value > bestValue) {
                        bestValue = value;
                        bestIdx = i;
                    }
                }
                return { actionId: shortlist[bestIdx].action.actionId };
            }

            const best = shortlist[0];
            return { actionId: best.action.actionId };
        },
    };
}

// --- Policies ---

const easyPolicy = createHeuristicDifficultyPolicy({
    id: 'easy',
    scorers: [
        ...splendorScorers,
        easyDriftScorer,
    ],
    effectiveRandomness: 26,
    weightedRandom: true,
});

const normalPolicy = createHeuristicDifficultyPolicy({
    id: 'normal',
    scorers: extendedScorers,
    effectiveRandomness: 0,
});

const hardPolicy = createHeuristicDifficultyPolicy({
    id: 'hard',
    scorers: extendedScorers,
    effectiveRandomness: 3,
});

const expertPolicy = createHeuristicDifficultyPolicy({
    id: 'expert',
    scorers: expertScorers,
    effectiveRandomness: 0,
});

const difficultyPolicyByLevel: Record<AiDifficultyLevel, LocalAiPolicy> = {
    easy: easyPolicy,
    normal: normalPolicy,
    hard: hardPolicy,
    expert: expertPolicy,
};

const baselineLocalPolicy: LocalAiPolicy = {
    id: 'baseline',
    decide(context) {
        const policy = difficultyPolicyByLevel[context.difficulty.level] ?? normalPolicy;
        return policy.decide(context);
    },
};

// --- Runtime ---

export const splendorAiRuntime: GameAiRuntime = {
    gameId: 'splendor',
    buildLegalActions: buildSplendorAiLegalActions,
    buildFeatureSnapshot(args) {
        return buildSplendorFeatureSnapshot(args) as Record<string, unknown> | null;
    },
    localPolicies: {
        baseline: baselineLocalPolicy,
        easy: easyPolicy,
        normal: normalPolicy,
        hard: hardPolicy,
        expert: expertPolicy,
    },
    defaultLocalPolicyId: 'baseline',
};
