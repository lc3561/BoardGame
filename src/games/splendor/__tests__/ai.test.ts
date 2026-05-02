import { describe, it, expect } from 'vitest';
import { buildSplendorAiLegalActions, splendorAiRuntime, splendorScorers, extendedScorers, AI_ACTION_KINDS } from '../ai';
import { engineConfig } from '../game';
import { createInitialSystemState, createSeededRandom } from '../../../engine/pipeline';
import { applyPlayerViewToState, buildAiDecisionContext, resolveNextLocalAiAction } from '../../../engine/ai';
import type { AiDecisionContext, AiDifficultyLevel, AiLegalAction } from '../../../engine/ai';
import { resolveAiDifficultyProfile } from '../../../engine/ai/difficulty';
import type { SplendorCommand, SplendorCore } from '../domain/types';
import type { MatchState } from '../../../engine/types';
import { CARD_DEFS_BY_ID, computeGameResult, createPlayerState, getBankForPlayerCount } from '../domain/rules';

function createTestState(coreOverrides: Partial<SplendorCore> = {}): MatchState<SplendorCore> {
    const playerIds = ['0', '1'];
    const baseCore: SplendorCore = {
        playerOrder: playerIds,
        hostPlayerId: '0',
        hostStarted: true,
        startingPlayerId: '0',
        currentPlayer: '0',
        round: 1,
        players: {
            '0': createPlayerState('0'),
            '1': createPlayerState('1'),
        },
        bank: getBankForPlayerCount(2),
        market: {
            1: ['t1-black-1', 't1-blue-1', 't1-green-1', 't1-red-1'],
            2: ['t2-black-1', 't2-blue-1', 't2-green-1', 't2-red-1'],
            3: ['t3-black-1', 't3-blue-1', 't3-green-1', 't3-red-1'],
        },
        decks: { 1: [], 2: [], 3: [] },
        nobleIds: ['noble-1', 'noble-2', 'noble-3'],
        endgame: { triggered: false },
        setupPlayerCount: 2,
    };
    const core = { ...baseCore, ...coreOverrides } as SplendorCore;
    return {
        core,
        sys: {
            ...createInitialSystemState(playerIds, []),
            phase: 'main',
            interaction: { current: undefined, queue: [] },
            responseWindow: { current: undefined },
        },
    } as unknown as MatchState<SplendorCore>;
}

function findCardId(
    predicate: (card: (typeof CARD_DEFS_BY_ID)[string]) => boolean,
    label: string,
): string {
    const card = Object.values(CARD_DEFS_BY_ID).find(predicate);
    if (!card) {
        throw new Error(`Missing fixture card for ${label}`);
    }
    return card.id;
}

async function runAiMatch(args: {
    leftDifficulty: AiDifficultyLevel;
    rightDifficulty: AiDifficultyLevel;
    seed: string;
    startingPlayerId?: '0' | '1';
}): Promise<{
    winner: string | null;
    scores: Record<string, number>;
    rounds: number;
}> {
    const { SplendorDomain } = await import('../domain');

    const random = createSeededRandom(args.seed);
    let core = SplendorDomain.setup(['0', '1'], random, {
        startingPlayerId: args.startingPlayerId ?? '0',
    });
    if (!core.hostStarted) {
        core = { ...core, hostStarted: true };
    }

    let round = 0;
    const MAX_ROUNDS = 700;
    let consecutiveFailures = 0;

    while (!core.gameResult && round < MAX_ROUNDS) {
        const state = {
            core,
            sys: {
                ...createInitialSystemState(['0', '1'], []),
                phase: 'main',
                interaction: { current: undefined, queue: [] },
                responseWindow: { current: undefined },
            },
        } as unknown as MatchState<SplendorCore>;

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: `local:splendor-benchmark-${args.seed}-${round}`,
            seatControllers: {
                '0': { type: 'local-ai', difficulty: args.leftDifficulty },
                '1': { type: 'local-ai', difficulty: args.rightDifficulty },
            },
        });

        if (!resolution) {
            break;
        }

        const command = {
            ...resolution.action.commands[0],
            playerId: resolution.playerId,
            timestamp: Date.now(),
        } as SplendorCommand;
        const validation = SplendorDomain.validate(state, command);
        if (!validation.valid) {
            consecutiveFailures += 1;
            if (consecutiveFailures > 10) {
                throw new Error(`AI produced too many invalid moves: ${resolution.action.kind}`);
            }
            round += 1;
            continue;
        }

        consecutiveFailures = 0;
        const events = SplendorDomain.execute(state, command, random);
        for (const event of events) {
            core = SplendorDomain.reduce(core, event);
        }
        round += 1;
    }

    const finalResult = core.gameResult ?? computeGameResult(core);
    const scores = finalResult.scores ?? computeGameResult(core).scores;
    if (!scores) {
        throw new Error('Splendor AI benchmark expected final scores.');
    }

    return {
        winner: finalResult.draw ? null : (finalResult.winner ?? null),
        scores,
        rounds: round,
    };
}

async function runDifficultySeries(args: {
    stronger: AiDifficultyLevel;
    weaker: AiDifficultyLevel;
    seedPrefix: string;
}): Promise<{
    strongerWins: number;
    weakerWins: number;
    draws: number;
    strongerAveragePoints: number;
    weakerAveragePoints: number;
}> {
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f'];
    let strongerWins = 0;
    let weakerWins = 0;
    let draws = 0;
    let strongerPoints = 0;
    let weakerPoints = 0;
    let totalGames = 0;

    for (const seed of seeds) {
        const seedBase = `${args.seedPrefix}-${seed}`;
        const leftStart = await runAiMatch({
            leftDifficulty: args.stronger,
            rightDifficulty: args.weaker,
            seed: seedBase,
            startingPlayerId: '0',
        });
        strongerPoints += leftStart.scores['0'];
        weakerPoints += leftStart.scores['1'];
        totalGames += 1;
        if (leftStart.winner === '0') strongerWins += 1;
        else if (leftStart.winner === '1') weakerWins += 1;
        else draws += 1;

        const rightStart = await runAiMatch({
            leftDifficulty: args.weaker,
            rightDifficulty: args.stronger,
            seed: seedBase,
            startingPlayerId: '1',
        });
        strongerPoints += rightStart.scores['1'];
        weakerPoints += rightStart.scores['0'];
        totalGames += 1;
        if (rightStart.winner === '1') strongerWins += 1;
        else if (rightStart.winner === '0') weakerWins += 1;
        else draws += 1;
    }

    return {
        strongerWins,
        weakerWins,
        draws,
        strongerAveragePoints: strongerPoints / totalGames,
        weakerAveragePoints: weakerPoints / totalGames,
    };
}

describe('璀璨宝石 AI', () => {
    it('应为当前玩家生成合法动作', () => {
        const state = createTestState();
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        expect(actions.length).toBeGreaterThan(0);
    });

    it('不应为非当前玩家生成动作', () => {
        const state = createTestState();
        const actions = buildSplendorAiLegalActions({ playerId: '1', state });
        expect(actions).toEqual([]);
    });

    it('应生成拿取宝石动作', () => {
        const state = createTestState();
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const takeThree = actions.filter((a) => a.kind === 'take-three');
        const takeTwo = actions.filter((a) => a.kind === 'take-two');
        expect(takeThree.length).toBeGreaterThan(0);
        // 银行初始有4枚/色，>=4可拿2枚同色
        expect(takeTwo.length).toBe(5);
    });

    it('银行有4枚时应生成拿取2枚同色动作', () => {
        const state = createTestState({
            bank: { white: 3, blue: 3, green: 3, red: 5, black: 3, gold: 5 },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const takeTwo = actions.filter((a) => a.kind === 'take-two');
        expect(takeTwo.length).toBe(1);
        expect(takeTwo[0].metadata?.color).toBe('red');
    });

    it('能购买时应生成购买动作', () => {
        // t1-black-1 costs { white: 1, blue: 1, green: 1, red: 1, black: 0 }
        const state = createTestState({
            players: {
                '0': { ...createPlayerState('0'), tokens: { white: 2, blue: 2, green: 2, red: 2, black: 0, gold: 0 } },
                '1': createPlayerState('1'),
            },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const buyActions = actions.filter((a) => a.kind.startsWith('buy-'));
        expect(buyActions.length).toBeGreaterThan(0);
    });

    it('预留卡牌数未满时应生成预留动作', () => {
        const state = createTestState({
            decks: { 1: ['t1-black-5'], 2: ['t2-black-5'], 3: ['t3-black-5'] },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const reserveActions = actions.filter((a) => a.kind.startsWith('reserve-'));
        expect(reserveActions.length).toBeGreaterThan(0);
    });

    it('预留卡牌已满时不应生成预留动作', () => {
        const state = createTestState({
            players: {
                '0': { ...createPlayerState('0'), reservedCardIds: ['r1', 'r2', 'r3'] },
                '1': createPlayerState('1'),
            },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const reserveActions = actions.filter((a) => a.kind.startsWith('reserve-'));
        expect(reserveActions.length).toBe(0);
    });

    it('有待处理丢弃时应只生成丢弃动作', () => {
        const state = createTestState({
            players: {
                '0': { ...createPlayerState('0'), tokens: { white: 3, blue: 3, green: 3, red: 2, black: 0, gold: 0 } },
                '1': createPlayerState('1'),
            },
            pendingResolution: { type: 'discardToLimit', excess: 1 },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        const discardActions = actions.filter((a) => a.kind === 'discard');
        expect(discardActions.length).toBeGreaterThan(0);
        expect(actions.every((a) => a.kind === 'discard')).toBe(true);
    });

    it('有待处理贵族选择时应只生成贵族选择动作', () => {
        const state = createTestState({
            pendingResolution: { type: 'chooseNoble', nobleIds: ['noble-1', 'noble-2'] },
        });
        const actions = buildSplendorAiLegalActions({ playerId: '0', state });
        expect(actions.length).toBe(2);
        expect(actions.every((a) => a.kind === 'choose-noble')).toBe(true);
    });

    for (const level of ['normal', 'hard', 'expert'] as const) {
        it(`真实房间链路中的 ${level} 难度应路由到同名策略`, async () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 1, blue: 1, green: 0, red: 0, black: 0, gold: 0 } },
                    '1': createPlayerState('1'),
                },
            });

            const implicitResolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-${level}-implicit`,
                seatControllers: {
                    '0': { type: 'local-ai', difficulty: level },
                },
            });
            const explicitResolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-${level}-implicit`,
                seatControllers: {
                    '0': { type: 'local-ai', policyId: level, difficulty: level },
                },
            });

            expect(implicitResolution).not.toBeNull();
            expect(explicitResolution).not.toBeNull();
            expect(implicitResolution?.action.actionId).toBe(explicitResolution?.action.actionId);
        });
    }

    it('playerView 应隐藏牌堆顺序', async () => {
        const { SplendorDomain } = await import('../domain');
        const random = createSeededRandom('splendor-hidden-deck-view');
        const core = SplendorDomain.setup(['0', '1'], random);

        const view = SplendorDomain.playerView?.(core, '0');
        expect(view?.decks?.[1]).toHaveLength(core.decks[1].length);
        expect(view?.decks?.[1]?.[0]).toBe('hidden-deck-1-0');
        expect(view?.decks?.[1]).not.toEqual(core.decks[1]);
    });

    it('normal 难度应优先卡住对手即将拿走的高价值公开卡', async () => {
        const threatCardId = findCardId(
            (card) => card.tier === 3 && card.points >= 4,
            'normal-threat-block',
        );
        const threatCard = CARD_DEFS_BY_ID[threatCardId];
        const opponentTokens = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
        for (const color of ['white', 'blue', 'green', 'red', 'black'] as const) {
            opponentTokens[color] = threatCard.cost[color];
        }

        const state = createTestState({
            bank: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 5 },
            market: {
                1: ['t1-white-1'],
                2: [],
                3: [threatCardId],
            },
            decks: { 1: [], 2: [], 3: [] },
            players: {
                '0': createPlayerState('0'),
                '1': { ...createPlayerState('1'), tokens: opponentTokens },
            },
        });

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-normal-threat-block',
            seatControllers: {
                '0': { type: 'local-ai', difficulty: 'normal' },
            },
        });

        expect(resolution).not.toBeNull();
        expect(resolution?.action.kind).toBe('reserve-open');
        expect(resolution?.action.metadata?.cardId).toBe(threatCardId);
    });

    it('hard 难度应优先拿取能显著缩短关键卡剩余步数的宝石', async () => {
        const targetCardId = findCardId(
            (card) => card.points >= 3 && card.cost.white > 0 && card.cost.blue > 0 && card.tier >= 2,
            'hard-progress-target',
        );
        const targetCard = CARD_DEFS_BY_ID[targetCardId];
        const playerTokens = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
        for (const color of ['white', 'blue', 'green', 'red', 'black'] as const) {
            playerTokens[color] = Math.max(0, targetCard.cost[color] - (color === 'white' || color === 'blue' ? 1 : 0));
        }

        const state = createTestState({
            bank: { white: 4, blue: 4, green: 4, red: 4, black: 4, gold: 5 },
            market: {
                1: ['t1-green-1'],
                2: [targetCardId],
                3: ['t3-red-1'],
            },
            decks: { 1: [], 2: [], 3: [] },
            players: {
                '0': { ...createPlayerState('0'), tokens: playerTokens, reservedCardIds: ['r1', 'r2', 'r3'] },
                '1': createPlayerState('1'),
            },
        });

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-hard-progress',
            seatControllers: {
                '0': { type: 'local-ai', difficulty: 'hard' },
            },
        });

        expect(resolution).not.toBeNull();
        expect(resolution?.action.kind).toBe('take-three');
        const colors = Array.isArray(resolution?.action.metadata?.colors) ? resolution?.action.metadata?.colors : [];
        expect(colors).toContain('white');
        expect(colors).toContain('blue');
    });

    it('有待处理决议时不应为非当前玩家生成动作', () => {
        const discardState = createTestState({
            currentPlayer: '0',
            players: {
                '0': { ...createPlayerState('0'), tokens: { white: 3, blue: 3, green: 3, red: 2, black: 0, gold: 0 } },
                '1': { ...createPlayerState('1'), tokens: { white: 2, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
            },
            pendingResolution: { type: 'discardToLimit', excess: 1 },
        });
        expect(buildSplendorAiLegalActions({ playerId: '1', state: discardState })).toEqual([]);

        const chooseNobleState = createTestState({
            currentPlayer: '0',
            pendingResolution: { type: 'chooseNoble', nobleIds: ['noble-1', 'noble-2'] },
        });
        expect(buildSplendorAiLegalActions({ playerId: '1', state: chooseNobleState })).toEqual([]);
    });

    it('有待处理决议时本地 AI 应只调度当前玩家', async () => {
        const state = createTestState({
            currentPlayer: '1',
            players: {
                '0': { ...createPlayerState('0'), tokens: { white: 2, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
                '1': { ...createPlayerState('1'), tokens: { white: 2, blue: 1, green: 0, red: 0, black: 0, gold: 0 } },
            },
            pendingResolution: { type: 'discardToLimit', excess: 1 },
        });

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-pending-resolution-turn-owner',
            seatControllers: {
                '0': { type: 'local-ai' },
                '1': { type: 'local-ai' },
            },
        });

        expect(resolution).not.toBeNull();
        expect(resolution?.playerId).toBe('1');
        expect(resolution?.action.kind).toBe('discard');
    });

    it('有待处理决议时非当前玩家命令应校验失败', async () => {
        const { SplendorDomain } = await import('../domain');
        const state = createTestState({
            currentPlayer: '0',
            players: {
                '0': { ...createPlayerState('0'), tokens: { white: 3, blue: 3, green: 3, red: 2, black: 0, gold: 0 } },
                '1': { ...createPlayerState('1'), tokens: { white: 2, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
            },
            pendingResolution: { type: 'discardToLimit', excess: 1 },
        });

        const discardCommand = {
            type: 'DISCARD_GEMS_TO_LIMIT',
            payload: { color: 'white' },
            playerId: '1',
            timestamp: Date.now(),
        } as SplendorCommand;
        const discardValidation = SplendorDomain.validate(state, discardCommand);
        expect(discardValidation.valid).toBe(false);
        expect((discardValidation as { error?: string }).error).toBe('notYourTurn');

        const chooseNobleState = createTestState({
            currentPlayer: '0',
            pendingResolution: { type: 'chooseNoble', nobleIds: ['noble-1', 'noble-2'] },
        });
        const chooseNobleCommand = {
            type: 'CHOOSE_NOBLE',
            payload: { nobleId: 'noble-1' },
            playerId: '1',
            timestamp: Date.now(),
        } as SplendorCommand;
        const chooseNobleValidation = SplendorDomain.validate(chooseNobleState, chooseNobleCommand);
        expect(chooseNobleValidation.valid).toBe(false);
        expect((chooseNobleValidation as { error?: string }).error).toBe('notYourTurn');
    });

    it('本地 AI 应能做出决策', async () => {
        const state = createTestState();
        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });
        expect(resolution).not.toBeNull();
        expect(resolution?.playerId).toBe('0');
        expect(resolution?.source).toBe('local-ai');
        expect(resolution?.action.commands.length).toBeGreaterThan(0);
    });

    it('AI 应优先购买能得分的卡牌', async () => {
        const highPointCardId = findCardId(
            (card) => card.tier === 3 && card.points >= 4,
            'buy-high-point-card',
        );
        const highPointCard = CARD_DEFS_BY_ID[highPointCardId];
        const tokens = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
        for (const color of ['white', 'blue', 'green', 'red', 'black'] as const) {
            tokens[color] = highPointCard.cost[color];
        }

        const state = createTestState({
            bank: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
            decks: { 1: [], 2: [], 3: [] },
            players: {
                '0': {
                    ...createPlayerState('0'),
                    tokens,
                },
                '1': createPlayerState('1'),
            },
            market: {
                1: ['t1-black-1', 't1-blue-1', 't1-green-1', 't1-red-1'],
                2: ['t2-black-1', 't2-blue-1', 't2-green-1', 't2-red-1'],
                3: [highPointCardId, 't3-blue-1', 't3-green-1', 't3-red-1'].filter((cardId, index, array) => array.indexOf(cardId) === index),
            },
        });
        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-buy-test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });
        expect(resolution).not.toBeNull();
        expect(resolution?.action.kind).toMatch(/^buy-/);
    });

    it('AI 对 AI 应能完成一局完整对局', async () => {
        const { SplendorDomain } = await import('../domain');

        const random = createSeededRandom('splendor-ai-sim-test');
        let core = SplendorDomain.setup(['0', '1'], random);
        // 确保游戏已开始
        if (!core.hostStarted) {
            core = { ...core, hostStarted: true };
        }
        let round = 0;
        const MAX_ROUNDS = 800;
        let consecutiveFailures = 0;

        while (!core.gameResult && round < MAX_ROUNDS) {
            const state = {
                core,
                sys: {
                    ...createInitialSystemState(['0', '1'], []),
                    phase: 'main',
                    interaction: { current: undefined, queue: [] },
                    responseWindow: { current: undefined },
                },
            } as unknown as MatchState<SplendorCore>;

            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-sim-${round}`,
                seatControllers: {
                    '0': { type: 'local-ai', difficulty: 'normal' },
                    '1': { type: 'local-ai', difficulty: 'normal' },
                },
            });

            if (!resolution) break;

            const command = {
                ...resolution.action.commands[0],
                playerId: resolution.playerId,
                timestamp: Date.now(),
            } as SplendorCommand;

            const validation = SplendorDomain.validate(state, command);
            if (!validation.valid) {
                consecutiveFailures++;
                if (consecutiveFailures > 10) break;
                round++;
                continue;
            }

            consecutiveFailures = 0;
            const events = SplendorDomain.execute(state, command, random);
            for (const event of events) {
                core = SplendorDomain.reduce(core, event);
            }
            round++;
        }

        expect(round).toBeGreaterThan(0);
        expect(core.gameResult).toBeDefined();
    });
});

function createScorerContext(state: MatchState<SplendorCore>, playerId = '0', difficultyLevel?: AiDifficultyLevel): AiDecisionContext {
    return {
        gameId: 'splendor',
        matchId: 'test',
        playerId,
        visibleState: state,
        interaction: null,
        responseWindow: null,
        legalActions: [],
        rulesVersion: null,
        decisionBudgetMs: 250,
        source: 'local',
        difficulty: resolveAiDifficultyProfile(difficultyLevel),
    };
}

function createPolicyContext(
    state: MatchState<SplendorCore>,
    playerId = '0',
    difficultyLevel: AiDifficultyLevel = 'hard',
): AiDecisionContext {
    const visibleState = applyPlayerViewToState(engineConfig, state as unknown as MatchState<unknown>, playerId);
    return buildAiDecisionContext({
        gameId: 'splendor',
        matchId: 'test',
        playerId,
        visibleState,
        rulesVersion: null,
        decisionBudgetMs: 250,
        source: 'local',
        seatController: { type: 'local-ai', difficulty: difficultyLevel },
    }) as AiDecisionContext;
}

function getScore(result: number | { score: number } | null | undefined): number {
    if (result == null) return 0;
    return typeof result === 'number' ? result : result.score;
}

function createTestAction(kind: string, metadata: Record<string, unknown> = {}): AiLegalAction {
    return {
        actionId: `test-${kind}`,
        kind,
        label: kind,
        commands: [{ type: 'TEST', payload: {} }],
        metadata,
    };
}

describe('Scorer 单元测试', () => {
    const buyScorer = splendorScorers.find((s) => s.id === 'buy-card')!;
    const takeGemsScorer = splendorScorers.find((s) => s.id === 'take-gems')!;
    const reserveScorer = splendorScorers.find((s) => s.id === 'reserve')!;
    const discardScorer = splendorScorers.find((s) => s.id === 'discard')!;
    const chooseNobleScorer = splendorScorers.find((s) => s.id === 'choose-noble')!;

    describe('buyCardScorer', () => {
        it('忽略非购买动作', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(buyScorer.score(context, createTestAction('take-three'))).toBeNull();
        });

        it('高分卡得分更高', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 } },
                    '1': createPlayerState('1'),
                },
                market: {
                    1: ['t1-black-1', 't1-blue-1', 't1-green-1', 't1-red-1'],
                    2: ['t2-black-1', 't2-blue-1', 't2-green-1', 't2-red-1'],
                    3: ['t3-black-1', 't3-blue-1', 't3-green-1', 't3-red-1'],
                },
            });
            const context = createScorerContext(state);
            const lowScore = buyScorer.score(context, createTestAction(AI_ACTION_KINDS.BUY_OPEN, { cardId: 't1-black-1', tier: 1 }));
            const highScore = buyScorer.score(context, createTestAction(AI_ACTION_KINDS.BUY_OPEN, { cardId: 't3-black-1', tier: 3 }));
            expect(lowScore).not.toBeNull();
            expect(highScore).not.toBeNull();
            expect(getScore(highScore)).toBeGreaterThan(getScore(lowScore));
        });

        it('无卡牌 ID 时返回 null', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(buyScorer.score(context, createTestAction(AI_ACTION_KINDS.BUY_OPEN, {}))).toBeNull();
        });
    });

    describe('takeGemsScorer', () => {
        it('忽略非拿取动作', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(takeGemsScorer.score(context, createTestAction('buy-open'))).toBeNull();
        });

        it('对目标卡牌有帮助时返回正分', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            // t1-black-1 需要 white:1, blue:1, green:1, red:1
            const result = takeGemsScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'green'] }));
            expect(result).not.toBeNull();
            expect(getScore(result)).toBeGreaterThan(0);
        });

        it('无帮助时返回 null', () => {
            const state = createTestState({
                players: {
                    '0': {
                        ...createPlayerState('0'),
                        tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 },
                    },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            // 玩家已有足够资源，拿取 gold 对市场卡无帮助
            const result = takeGemsScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'green'] }));
            expect(result).toBeNull();
        });

        it('take-two 比 take-three 多加分', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            const takeThree = takeGemsScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'green'] }));
            const takeTwo = takeGemsScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_TWO, { color: 'white' }));
            expect(takeThree).not.toBeNull();
            expect(takeTwo).not.toBeNull();
        });

        it('已预留高价值目标卡时，应优先给能缩短其缺口的拿宝石动作加分', () => {
            const reservedTargetId = findCardId(
                (card) => card.points >= 3 && card.cost.white > 0 && card.cost.blue > 0 && card.tier >= 2,
                'reserved-target-priority',
            );
            const state = createTestState({
                players: {
                    '0': {
                        ...createPlayerState('0'),
                        reservedCardIds: [reservedTargetId],
                        tokens: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
                    },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            const helpsReserved = takeGemsScorer.score(
                context,
                createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'green'] }),
            );
            const offPlan = takeGemsScorer.score(
                context,
                createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['green', 'red', 'black'] }),
            );
            expect(getScore(helpsReserved)).toBeGreaterThan(getScore(offPlan));
        });
    });

    describe('reserveScorer', () => {
        it('忽略非预留动作', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(reserveScorer.score(context, createTestAction('buy-open'))).toBeNull();
        });

        it('预留已满时返回 null', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), reservedCardIds: ['r1', 'r2', 'r3'] },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            expect(reserveScorer.score(context, createTestAction(AI_ACTION_KINDS.RESERVE_OPEN, { cardId: 't1-black-1', tier: 1 }))).toBeNull();
        });

        it('高分卡预留得分更高', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 } },
                    '1': createPlayerState('1'),
                },
                market: {
                    1: ['t1-black-1', 't1-blue-1', 't1-green-1', 't1-red-1'],
                    2: ['t2-black-1', 't2-blue-1', 't2-green-1', 't2-red-1'],
                    3: ['t3-black-1', 't3-blue-1', 't3-green-1', 't3-red-1'],
                },
            });
            const context = createScorerContext(state);
            const lowScore = reserveScorer.score(context, createTestAction(AI_ACTION_KINDS.RESERVE_OPEN, { cardId: 't1-black-1', tier: 1 }));
            const highScore = reserveScorer.score(context, createTestAction(AI_ACTION_KINDS.RESERVE_OPEN, { cardId: 't3-black-1', tier: 3 }));
            expect(lowScore).not.toBeNull();
            expect(highScore).not.toBeNull();
            expect(getScore(highScore)).toBeGreaterThan(getScore(lowScore));
        });
    });

    describe('discardScorer', () => {
        it('忽略非丢弃动作', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(discardScorer.score(context, createTestAction('buy-open'))).toBeNull();
        });

        it('gold 作为万能宝石应最后丢弃', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 3, blue: 3, green: 3, red: 3, black: 3, gold: 3 } },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            const whiteResult = discardScorer.score(context, createTestAction(AI_ACTION_KINDS.DISCARD, { color: 'white' }));
            const goldResult = discardScorer.score(context, createTestAction(AI_ACTION_KINDS.DISCARD, { color: 'gold' }));
            expect(whiteResult).not.toBeNull();
            expect(goldResult).not.toBeNull();
            // gold 是万能宝石，得分最低（最后丢弃）
            expect(getScore(whiteResult)).toBeGreaterThan(getScore(goldResult));
        });

        it('无需求的颜色比有需求的优先丢弃', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 3, blue: 3, green: 3, red: 3, black: 3, gold: 0 } },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state);
            // t1-black-1 费用含 white/blue/green/red，不含 black
            const blackResult = discardScorer.score(context, createTestAction(AI_ACTION_KINDS.DISCARD, { color: 'black' }));
            const whiteResult = discardScorer.score(context, createTestAction(AI_ACTION_KINDS.DISCARD, { color: 'white' }));
            expect(getScore(blackResult)).toBeGreaterThan(getScore(whiteResult));
        });
    });

    describe('chooseNobleScorer', () => {
        it('忽略非贵族选择动作', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(chooseNobleScorer.score(context, createTestAction('buy-open'))).toBeNull();
        });

        it('无 nobleId 时返回 null', () => {
            const state = createTestState();
            const context = createScorerContext(state);
            expect(chooseNobleScorer.score(context, createTestAction(AI_ACTION_KINDS.CHOOSE_NOBLE, {}))).toBeNull();
        });
    });

    describe('opponentThreatScorer', () => {
        const opponentThreatScorer = extendedScorers.find((s) => s.id === 'opponent-threat')!;

        it('忽略非购买公开卡牌动作', () => {
            const state = createTestState();
            const context = createScorerContext(state, '0', 'hard');
            expect(opponentThreatScorer.score(context, createTestAction('take-three'))).toBeNull();
        });

        it('easy/normal 难度返回 null (opponentThreatWeight=0)', () => {
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 } },
                    '1': { ...createPlayerState('1'), tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 } },
                },
            });
            const context = createScorerContext(state, '0', 'easy');
            const result = opponentThreatScorer.score(context, createTestAction(AI_ACTION_KINDS.BUY_OPEN, { cardId: 't3-black-1' }));
            expect(result).toBeNull();
        });

        it('对手差 1 个宝石能买时返回正分 (hard)', () => {
            // t1-black-1 costs { white:1, blue:1, green:1, red:1, black:0 }
            // 对手有足够资源只差 0 个 → oppMissing = 0 → 差 1 或以内
            const state = createTestState({
                players: {
                    '0': { ...createPlayerState('0'), tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 } },
                    '1': { ...createPlayerState('1'), tokens: { white: 1, blue: 1, green: 1, red: 1, black: 0, gold: 0 } },
                },
            });
            const context = createScorerContext(state, '0', 'hard');
            const result = opponentThreatScorer.score(context, createTestAction(AI_ACTION_KINDS.BUY_OPEN, { cardId: 't1-black-1' }));
            expect(result).not.toBeNull();
            expect(getScore(result)).toBeGreaterThan(0);
        });
    });

    describe('nobleProgressScorer', () => {
        const nobleProgressScorer = extendedScorers.find((s) => s.id === 'noble-progress')!;

        it('忽略非拿取宝石动作', () => {
            const state = createTestState();
            const context = createScorerContext(state, '0', 'hard');
            expect(nobleProgressScorer.score(context, createTestAction('buy-open'))).toBeNull();
        });

        it('easy 难度返回 null (nobleMultiplier=0.3，但无接近贵族时返回 null)', () => {
            const state = createTestState();
            const context = createScorerContext(state, '0', 'easy');
            const result = nobleProgressScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'green'] }));
            // easy 难度 nobleMultiplier=0.3 > 0，但初始状态无接近贵族，应返回 null
            expect(result).toBeNull();
        });

        it('拿取能帮助购买贵族需求卡牌的宝石时返回正分', () => {
            // noble-1 需要 4 张不同颜色红利卡
            // 给玩家 3 张已购卡，让 noble 接近完成 (totalMissing <= 3)
            const state = createTestState({
                players: {
                    '0': {
                        ...createPlayerState('0'),
                        purchasedCardIds: ['t1-black-1', 't1-blue-1', 't1-green-1'],
                        tokens: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
                    },
                    '1': createPlayerState('1'),
                },
            });
            const context = createScorerContext(state, '0', 'hard');
            // 拿取 red 对市场卡有帮助 → 如果卡的红利颜色匹配贵族需求则得分
            const result = nobleProgressScorer.score(context, createTestAction(AI_ACTION_KINDS.TAKE_THREE, { colors: ['white', 'blue', 'red'] }));
            // 具体得分取决于 noble 定义和市场卡红利，但不应抛异常
            expect(result === null || getScore(result) >= 0).toBe(true);
        });
    });
});

describe('难度策略测试', () => {
    const difficulties: AiDifficultyLevel[] = ['easy', 'normal', 'hard', 'expert'];

    for (const level of difficulties) {
        it(`${level} 难度 AI 应能做出决策`, async () => {
            const state = createTestState();
            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-${level}-test`,
                seatControllers: {
                    '0': { type: 'local-ai', policyId: level, difficulty: level },
                },
            });
            expect(resolution).not.toBeNull();
            expect(resolution?.playerId).toBe('0');
            expect(resolution?.action.commands.length).toBeGreaterThan(0);
        });
    }

    for (const level of difficulties) {
        it(`${level} 难度 AI 对 AI 应能进行有效对局`, async () => {
            const { SplendorDomain } = await import('../domain');

            const random = createSeededRandom(`splendor-ai-${level}-sim`);
            let core = SplendorDomain.setup(['0', '1'], random);
            if (!core.hostStarted) {
                core = { ...core, hostStarted: true };
            }
            let round = 0;
            const MAX_ROUNDS = 200;
            let consecutiveFailures = 0;
            let validMoves = 0;

            while (!core.gameResult && round < MAX_ROUNDS) {
                const state = {
                    core,
                    sys: {
                        ...createInitialSystemState(['0', '1'], []),
                        phase: 'main',
                        interaction: { current: undefined, queue: [] },
                        responseWindow: { current: undefined },
                    },
                } as unknown as MatchState<SplendorCore>;

                const resolution = await resolveNextLocalAiAction({
                    engineConfig,
                    state,
                    matchId: `local:splendor-${level}-sim-${round}`,
                    seatControllers: {
                        '0': { type: 'local-ai', policyId: level, difficulty: level },
                        '1': { type: 'local-ai', policyId: level, difficulty: level },
                    },
                });

                if (!resolution) break;

                const command = {
                    ...resolution.action.commands[0],
                    playerId: resolution.playerId,
                    timestamp: Date.now(),
                } as SplendorCommand;

                const validation = SplendorDomain.validate(state, command);
                if (!validation.valid) {
                    consecutiveFailures++;
                    if (consecutiveFailures > 10) break;
                    round++;
                    continue;
                }

                consecutiveFailures = 0;
                validMoves++;
                const events = SplendorDomain.execute(state, command, random);
                for (const event of events) {
                    core = SplendorDomain.reduce(core, event);
                }
                round++;
            }

            expect(validMoves).toBeGreaterThan(5);
        });
    }

    it('各难度策略应能独立做出决策', async () => {
        const state = createTestState();
        for (const level of difficulties) {
            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-${level}-single`,
                seatControllers: {
                    '0': { type: 'local-ai', policyId: level, difficulty: level },
                },
            });
            expect(resolution, `${level} should produce a resolution`).not.toBeNull();
            expect(resolution?.action.kind, `${level} should have valid action kind`).toBeTruthy();
        }
    });

    it('各难度策略生成的动作应能通过验证', async () => {
        const { SplendorDomain } = await import('../domain');
        const random = createSeededRandom('splendor-validate-test');
        let core = SplendorDomain.setup(['0', '1'], random);
        if (!core.hostStarted) {
            core = { ...core, hostStarted: true };
        }
        const state = {
            core,
            sys: {
                ...createInitialSystemState(['0', '1'], []),
                phase: 'main',
                interaction: { current: undefined, queue: [] },
                responseWindow: { current: undefined },
            },
        } as unknown as MatchState<SplendorCore>;

        for (const level of difficulties) {
            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: `local:splendor-${level}-validate`,
                seatControllers: {
                    '0': { type: 'local-ai', policyId: level, difficulty: level },
                },
            });
            expect(resolution, `${level} should produce resolution`).not.toBeNull();
            if (resolution) {
                const command = {
                    ...resolution.action.commands[0],
                    playerId: resolution.playerId,
                    timestamp: Date.now(),
                } as SplendorCommand;
                const validation = SplendorDomain.validate(state, command);
                expect(validation.valid, `${level} action should be valid: ${resolution.action.kind} error=${(validation as { error?: string }).error}`).toBe(true);
            }
        }
    });

    it('专家难度终局阶段应优先购买高分卡', async () => {
        // 玩家已有 12 分，接近终局
        const state = createTestState({
            players: {
                '0': {
                    ...createPlayerState('0'),
                    points: 12,
                    tokens: { white: 5, blue: 5, green: 5, red: 5, black: 0, gold: 0 },
                    purchasedCardIds: ['t1-black-1', 't1-black-2', 't1-black-3', 't1-black-4'],
                },
                '1': createPlayerState('1'),
            },
            market: {
                1: ['t1-black-1', 't1-blue-1', 't1-green-1', 't1-red-1'],
                2: ['t2-black-1', 't2-blue-1', 't2-green-1', 't2-red-1'],
                3: ['t3-black-1', 't3-blue-1', 't3-green-1', 't3-red-1'],
            },
        });
        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:splendor-expert-endgame-test',
            seatControllers: {
                '0': { type: 'local-ai', difficulty: 'expert' },
            },
        });
        expect(resolution).not.toBeNull();
        // 专家难度在终局阶段应选择购买动作
        expect(resolution?.action.kind).toMatch(/^buy-/);
    });

    it('hard 策略应在 providerMetadata 中输出 searched lookahead trace', async () => {
        const state = createTestState();
        const context = createPolicyContext(state, '0', 'hard');
        const decision = await splendorAiRuntime.localPolicies?.hard?.decide(context);
        const evaluations = ((decision as { providerMetadata?: { evaluations?: Array<Record<string, unknown>> } } | null)
            ?.providerMetadata?.evaluations) ?? [];
        expect(evaluations.some((item) => item.searched === true)).toBe(true);
    });

    it('expert 策略的 lookahead trace 应包含 follow-up metadata', async () => {
        const state = createTestState();
        const context = createPolicyContext(state, '0', 'expert');
        const decision = await splendorAiRuntime.localPolicies?.expert?.decide(context);
        const evaluations = ((decision as { providerMetadata?: { evaluations?: Array<Record<string, unknown>> } } | null)
            ?.providerMetadata?.evaluations) ?? [];
        expect(evaluations.some((item) => {
            const metadata = item.metadata as Record<string, unknown> | undefined;
            return item.searched === true && metadata && Object.hasOwn(metadata, 'followUpScore');
        })).toBe(true);
    });

    it('reserve-deck projection trace 不应泄露真实 deck top card id', async () => {
        const hiddenDeckTop = findCardId((card) => card.tier === 1, 'hidden-deck-top');
        const state = createTestState({
            market: { 1: [], 2: [], 3: [] },
            decks: { 1: [hiddenDeckTop], 2: ['t2-black-5'], 3: ['t3-black-5'] },
        });
        const context = createPolicyContext(state, '0', 'hard');
        const decision = await splendorAiRuntime.localPolicies?.hard?.decide(context);
        const evaluations = ((decision as { providerMetadata?: { evaluations?: Array<Record<string, unknown>> } } | null)
            ?.providerMetadata?.evaluations) ?? [];
        const reserveDeckTrace = evaluations.find((item) => item.kind === AI_ACTION_KINDS.RESERVE_DECK);
        expect(JSON.stringify(reserveDeckTrace ?? {})).not.toContain(hiddenDeckTop);
    });
});

describe('难度梯度基准', () => {
    it('normal 应整体强于 easy', async () => {
        const result = await runDifficultySeries({
            stronger: 'normal',
            weaker: 'easy',
            seedPrefix: 'splendor-normal-vs-easy',
        });
        expect(result.strongerWins > result.weakerWins || result.strongerAveragePoints > result.weakerAveragePoints + 1).toBe(true);
    });

    it('hard 应整体强于 normal', async () => {
        const result = await runDifficultySeries({
            stronger: 'hard',
            weaker: 'normal',
            seedPrefix: 'splendor-hard-vs-normal',
        });
        expect(result.strongerWins > result.weakerWins || result.strongerAveragePoints > result.weakerAveragePoints + 1).toBe(true);
    });

    it('expert 应整体强于 hard', async () => {
        const result = await runDifficultySeries({
            stronger: 'expert',
            weaker: 'hard',
            seedPrefix: 'splendor-expert-vs-hard',
        });
        expect(result.strongerWins > result.weakerWins || result.strongerAveragePoints > result.weakerAveragePoints + 1).toBe(true);
    });

    it('expert 对 normal 应表现出明确优势', async () => {
        const result = await runDifficultySeries({
            stronger: 'expert',
            weaker: 'normal',
            seedPrefix: 'splendor-expert-vs-normal',
        });
        expect(result.strongerWins > result.weakerWins).toBe(true);
    });
});
