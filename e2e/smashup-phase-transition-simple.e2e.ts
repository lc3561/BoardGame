/**
 * 大杀四方 - 阶段切换与行动卡特写回归
 */

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { test, expect } from './framework';
import { getEvidenceScreenshotPath } from './framework/evidenceScreenshots';
import { waitForSmashUpUI } from './helpers/smashup';
import { setupSmashUpMatchSkipSetup } from './helpers/smashup-skip-setup';
import {
    ensureGameServerAvailable,
    getGameServerBaseURL,
    initContext,
    seedMatchCredentials,
    waitForMatchAvailable,
} from './helpers/common';
import { getMatchState, injectMatchState } from './helpers/state-injection';

async function saveEvidenceScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
    const path = getEvidenceScreenshotPath(testInfo, name);
    await mkdir(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true });
}

async function applyOnlineMatchState(
    matchId: string,
    page: Page,
    updater: (state: any) => any,
): Promise<void> {
    const currentState = await getMatchState(matchId, page);
    const nextState = updater(currentState);
    await injectMatchState(matchId, nextState, page);
    await page.waitForTimeout(800);
}

async function setupSmashUpOnlineAiRoom(
    browser: Browser,
    baseURL: string | undefined,
): Promise<{
    hostPage: Page;
    hostContext: BrowserContext;
    matchId: string;
} | null> {
    const hostContext = await browser.newContext({ baseURL });
    await initContext(hostContext, { storageKey: '__su_storage_reset_ai', skipImageGate: true });
    const hostPage = await hostContext.newPage();

    await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
    await hostPage.waitForSelector('[data-game-id]', { timeout: 15000 }).catch(() => {});

    if (!(await ensureGameServerAvailable(hostPage))) {
        await hostContext.close();
        return null;
    }

    const guestId = `su_ai_e2e_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await hostPage.addInitScript(
        (id) => {
            localStorage.setItem('guest_id', id);
            sessionStorage.setItem('guest_id', id);
            document.cookie = `bg_guest_id=${encodeURIComponent(id)}; path=/; SameSite=Lax`;
        },
        guestId,
    );

    const base = getGameServerBaseURL();
    const createResponse = await hostPage.request.post(`${base}/games/smashup/create`, {
        data: {
            numPlayers: 2,
            setupData: {
                guestId,
                ownerKey: `guest:${guestId}`,
                ownerType: 'guest',
                seatControllers: {
                    '1': {
                        type: 'local-ai',
                        minimumActionDelayMs: 2000,
                    },
                },
            },
        },
    });
    if (!createResponse.ok()) {
        await hostContext.close();
        return null;
    }

    const createData = (await createResponse.json().catch(() => null)) as { matchID?: string } | null;
    const matchId = createData?.matchID;
    if (!matchId) {
        await hostContext.close();
        return null;
    }

    const claimResponse = await hostPage.request.post(`${base}/games/smashup/${matchId}/claim-seat`, {
        data: { playerID: '0', playerName: 'Host-SU-AI-E2E', guestId },
    });
    if (!claimResponse.ok()) {
        await hostContext.close();
        return null;
    }

    const claimData = (await claimResponse.json().catch(() => null)) as { playerCredentials?: string } | null;
    const credentials = claimData?.playerCredentials;
    if (!credentials) {
        await hostContext.close();
        return null;
    }

    await seedMatchCredentials(hostPage, 'smashup', matchId, '0', credentials);

    if (!(await waitForMatchAvailable(hostPage, 'smashup', matchId, 20000))) {
        await hostContext.close();
        return null;
    }

    await hostPage.goto(`/play/smashup/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });
    return { hostPage, hostContext, matchId };
}

async function waitForAiSeatCredential(
    page: Page,
    matchId: string,
    playerId: string,
): Promise<void> {
    await expect.poll(async () => {
        return page.evaluate(({ targetMatchId, targetPlayerId }) => {
            const raw = localStorage.getItem(`match_ai_creds_${targetMatchId}`);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                return typeof parsed[targetPlayerId] === 'string' ? parsed[targetPlayerId] as string : null;
            } catch {
                return null;
            }
        }, { targetMatchId: matchId, targetPlayerId: playerId });
    }, {
        timeout: 20000,
        message: `等待 AI seat ${playerId} 凭据超时`,
    }).not.toBeNull();

    await page.waitForTimeout(1200);
}

async function installSmashUpAiChoiceRejectPatch(
    page: Page,
    options: {
        targetPlayerId?: string;
        allowBatchKinds?: Array<'force-skip' | 'force-end-turn'>;
    } = {},
): Promise<void> {
    const {
        targetPlayerId = '1',
        allowBatchKinds = ['force-skip'],
    } = options;

    await page.evaluate(async ({ aiPlayerId, allowedFallbackKinds }) => {
        const globalWindow = window as Window & {
            __SU_AI_FORCE_SKIP_PATCH__?: {
                installed: boolean;
                aiPlayerId: string;
                rejectedCount: number;
                delegatedCount: number;
                lastBatchId: string | null;
                lastReason: string | null;
                forceSkipDelegated: boolean;
                forceEndTurnDelegated: boolean;
                latestInteractionKind: string | null;
                latestInteractionSourceId: string | null;
                latestInteractionPlayerId: string | null;
            };
        };
        if (globalWindow.__SU_AI_FORCE_SKIP_PATCH__?.installed) {
            return;
        }

        const transportModule = await import('/src/engine/transport/client.ts');
        const proto = transportModule.GameTransportClient?.prototype as {
            sendBatch?: (
                this: unknown,
                batchId: string,
                commands: Array<{ type: string; payload: unknown }>,
                onConfirmed?: (state: unknown) => void,
                onRejected?: (reason: string) => void,
            ) => void;
            updateLatestState?: (
                this: unknown,
                state: unknown,
            ) => void;
        } | undefined;
        if (!proto?.sendBatch) {
            throw new Error('GameTransportClient.sendBatch not available');
        }

        const originalSendBatch = proto.sendBatch;
        const originalUpdateLatestState = proto.updateLatestState;
        globalWindow.__SU_AI_FORCE_SKIP_PATCH__ = {
            installed: true,
            aiPlayerId,
            rejectedCount: 0,
            delegatedCount: 0,
            lastBatchId: null,
            lastReason: null,
            forceSkipDelegated: false,
            forceEndTurnDelegated: false,
            latestInteractionKind: null,
            latestInteractionSourceId: null,
            latestInteractionPlayerId: null,
        };

        if (originalUpdateLatestState) {
            proto.updateLatestState = function patchedUpdateLatestState(this: unknown, state: unknown) {
                const tracker = globalWindow.__SU_AI_FORCE_SKIP_PATCH__;
                const config = (this as { config?: { playerID?: string | null } }).config;
                if (
                    tracker
                    && config?.playerID === tracker.aiPlayerId
                    && state
                    && typeof state === 'object'
                ) {
                    const interaction = (state as {
                        sys?: {
                            interaction?: {
                                current?: {
                                    kind?: string;
                                    playerId?: string;
                                    data?: { sourceId?: string };
                                };
                            };
                        };
                    }).sys?.interaction?.current;
                    tracker.latestInteractionKind = interaction?.kind ?? null;
                    tracker.latestInteractionSourceId = interaction?.data?.sourceId ?? null;
                    tracker.latestInteractionPlayerId = interaction?.playerId ?? null;
                }
                return originalUpdateLatestState.call(this, state);
            };
        }

        proto.sendBatch = function patchedSendBatch(
            this: unknown,
            batchId: string,
            commands: Array<{ type: string; payload: unknown }>,
            onConfirmed?: (state: unknown) => void,
            onRejected?: (reason: string) => void,
        ) {
            const tracker = globalWindow.__SU_AI_FORCE_SKIP_PATCH__;
            const config = (this as { config?: { playerID?: string | null } }).config;
            const fallbackKind = batchId.includes('force-end-turn')
                ? 'force-end-turn'
                : (batchId.includes('force-skip') ? 'force-skip' : null);
            const isAllowedFallback = fallbackKind !== null && allowedFallbackKinds.includes(fallbackKind);

            if (
                tracker
                && config?.playerID === tracker.aiPlayerId
                && !isAllowedFallback
            ) {
                tracker.rejectedCount += 1;
                tracker.lastBatchId = batchId;
                tracker.lastReason = 'command_failed';
                onRejected?.('command_failed');
                return;
            }

            if (
                tracker
                && config?.playerID === tracker.aiPlayerId
            ) {
                tracker.delegatedCount += 1;
                tracker.lastBatchId = batchId;
                tracker.forceSkipDelegated = fallbackKind === 'force-skip';
                tracker.forceEndTurnDelegated = fallbackKind === 'force-end-turn';
            }

            return originalSendBatch.call(this, batchId, commands, onConfirmed, onRejected);
        };
    }, {
        aiPlayerId: targetPlayerId,
        allowedFallbackKinds: allowBatchKinds,
    });
}

async function readSmashUpAiChoiceRejectPatchStatus(page: Page): Promise<{
    installed: boolean;
    aiPlayerId: string;
    rejectedCount: number;
    delegatedCount: number;
    lastBatchId: string | null;
    lastReason: string | null;
    forceSkipDelegated: boolean;
    forceEndTurnDelegated: boolean;
    latestInteractionKind: string | null;
    latestInteractionSourceId: string | null;
    latestInteractionPlayerId: string | null;
} | null> {
    return page.evaluate(() => {
        return (window as Window & {
            __SU_AI_FORCE_SKIP_PATCH__?: {
                installed: boolean;
                aiPlayerId: string;
                rejectedCount: number;
                delegatedCount: number;
                lastBatchId: string | null;
                lastReason: string | null;
                forceSkipDelegated: boolean;
                forceEndTurnDelegated: boolean;
                latestInteractionKind: string | null;
                latestInteractionSourceId: string | null;
                latestInteractionPlayerId: string | null;
            };
        }).__SU_AI_FORCE_SKIP_PATCH__ ?? null;
    });
}

async function waitForTurnTracker(page: Page, side: 'YOU' | 'OPP'): Promise<void> {
    await expect(
        page.locator('[data-tutorial-id="su-turn-tracker"]').filter({ hasText: new RegExp(side, 'i') }),
    ).toBeVisible({ timeout: 8000 });
}

async function getPlayerActionUid(page: Page, playerId: '0' | '1', defId: string): Promise<string | null> {
    return page.evaluate(({ currentPlayerId, targetDefId }) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const state = harness?.state?.get?.();
        const hand = state?.core?.players?.[currentPlayerId]?.hand ?? [];
        return hand.find((card: any) => card.defId === targetDefId)?.uid ?? null;
    }, { currentPlayerId: playerId, targetDefId: defId });
}

async function getCurrentInteraction(page: Page): Promise<any> {
    return page.evaluate(() => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        return harness?.state?.get?.()?.sys?.interaction?.current ?? null;
    });
}

async function getCurrentInteractionOptions(page: Page): Promise<any[]> {
    return page.evaluate(() => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        return harness?.state?.get?.()?.sys?.interaction?.current?.data?.options ?? [];
    });
}

async function findCurrentInteractionOption(
    page: Page,
    predicate: (option: any) => boolean,
): Promise<any | undefined> {
    const options = await getCurrentInteractionOptions(page);
    return options.find(predicate);
}

async function respondCurrentInteraction(
    page: Page,
    payload: { optionId?: string; optionIds?: string[]; mergedValue?: unknown },
): Promise<void> {
    await page.evaluate((responsePayload) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const interaction = harness?.state?.get?.()?.sys?.interaction?.current;
        if (!interaction) {
            throw new Error('当前没有可响应的交互');
        }
        harness.command.dispatch({
            type: 'SYS_INTERACTION_RESPOND',
            playerId: interaction.playerId,
            payload: responsePayload,
        });
    }, payload);
    await page.waitForTimeout(300);
}

async function dispatchHarnessCommand(
    page: Page,
    playerId: '0' | '1',
    type: string,
    payload: Record<string, unknown>,
): Promise<void> {
    await page.evaluate(({ commandType, commandPayload, commandPlayerId }) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        harness.command.dispatch({
            type: commandType,
            playerId: commandPlayerId,
            payload: commandPayload,
        });
    }, {
        commandType: type,
        commandPayload: payload,
        commandPlayerId: playerId,
    });
    await page.waitForTimeout(300);
}

async function waitForSelectableMinion(page: Page, minionUid: string): Promise<void> {
    await expect.poll(async () => {
        return page.evaluate((uid) => {
            const node = document.querySelector(`[data-minion-uid="${uid}"]`);
            if (!(node instanceof HTMLElement)) return { exists: false, selectable: false, className: '' };
            return {
                exists: true,
                selectable: node.className.includes('ring-purple-400') || node.className.includes('ring-purple-300'),
                className: node.className,
            };
        }, minionUid);
    }, {
        timeout: 8000,
        message: `随从 ${minionUid} 未进入可选态`,
    }).toMatchObject({
        exists: true,
        selectable: true,
    });
}

async function dismissSpotlightIfVisible(page: Page): Promise<void> {
    const spotlightQueue = page.getByTestId('card-spotlight-queue');
    const isVisible = await spotlightQueue.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVisible) return;
    await spotlightQueue.click({ force: true });
    await expect(spotlightQueue).toBeHidden({ timeout: 5000 });
}

async function clickSelectableMinion(page: Page, minionUid: string): Promise<void> {
    await waitForSelectableMinion(page, minionUid);
    await page.locator(`[data-minion-uid="${minionUid}"]`).click({ force: true });
    await page.waitForTimeout(300);
}

async function expectDuelParticipantMinions(page: Page, minionUids: string[]): Promise<void> {
    for (const minionUid of minionUids) {
        await expect(page.locator(`[data-minion-uid="${minionUid}"][data-duel-participant="true"]`)).toHaveCount(1);
    }
}

const makeSmashUpCard = (uid: string, defId: string, type: 'action' | 'minion', owner: '0' | '1') => ({
    uid,
    defId,
    type,
    owner,
});

function buildActionSpotlightState(baseState: any, currentPlayerIndex: 0 | 1) {
    const nextState = JSON.parse(JSON.stringify(baseState));

    nextState.core.currentPlayerIndex = currentPlayerIndex;
    nextState.core.phase = 'playCards';
    nextState.core.factionSelection = undefined;
    nextState.core.players['0'] = {
        ...nextState.core.players['0'],
        hand: [makeSmashUpCard('p0-action-1', 'wizard_mystic_studies', 'action', '0')],
        deck: [
            makeSmashUpCard('p0-deck-1', 'wizard_neophyte', 'minion', '0'),
            makeSmashUpCard('p0-deck-2', 'wizard_apprentice', 'minion', '0'),
        ],
        discard: [],
        actionsPlayed: 0,
        actionLimit: 1,
        minionsPlayed: 0,
        minionLimit: 1,
        minionsPlayedPerBase: {},
        sameNameMinionDefId: null,
        factions: ['wizards', 'steampunks'],
    };
    nextState.core.players['1'] = {
        ...nextState.core.players['1'],
        hand: [makeSmashUpCard('p1-action-1', 'wizard_mystic_studies', 'action', '1')],
        deck: [
            makeSmashUpCard('p1-deck-1', 'wizard_chronomage', 'minion', '1'),
            makeSmashUpCard('p1-deck-2', 'wizard_archmage', 'minion', '1'),
        ],
        discard: [],
        actionsPlayed: 0,
        actionLimit: 1,
        minionsPlayed: 0,
        minionLimit: 1,
        minionsPlayedPerBase: {},
        sameNameMinionDefId: null,
        factions: ['wizards', 'steampunks'],
    };

    nextState.sys = {
        ...nextState.sys,
        turnOrder: Array.isArray(nextState.core.turnOrder) ? [...nextState.core.turnOrder] : nextState.sys.turnOrder,
        currentPlayerIndex,
        phase: 'playCards',
        interaction: nextState.sys.interaction
            ? { ...nextState.sys.interaction, current: undefined, queue: [], isBlocked: false }
            : nextState.sys.interaction,
        responseWindow: nextState.sys.responseWindow
            ? { ...nextState.sys.responseWindow, current: undefined }
            : nextState.sys.responseWindow,
        eventStream: nextState.sys.eventStream
            ? { ...nextState.sys.eventStream, entries: [], nextId: 1 }
            : nextState.sys.eventStream,
    };

    return nextState;
}

function buildFactionSelectStuckState(baseState: any) {
    const nextState = JSON.parse(JSON.stringify(baseState));

    nextState.core.currentPlayerIndex = 0;
    nextState.core.turnNumber = 1;
    nextState.core.factionSelection = undefined;
    nextState.core.players['0'] = {
        ...nextState.core.players['0'],
        factions: ['tricksters_pod', 'steampunks_pod'],
    };
    nextState.core.players['1'] = {
        ...nextState.core.players['1'],
        factions: ['vampires_pod', 'bear_cavalry_pod'],
    };

    nextState.sys = {
        ...nextState.sys,
        phase: 'factionSelect',
        interaction: {
            current: {
                id: 'starting_hand_mulligan_0_test',
                kind: 'simple-choice',
                playerId: '0',
                data: {
                    title: '起手无随从：是否重抽一次？（只能重抽一次）',
                    options: [
                        { id: 'keep', label: '保留手牌', value: { choice: 'keep' }, displayMode: 'button' },
                        { id: 'mulligan', label: '重抽一次', value: { choice: 'mulligan' }, displayMode: 'button' },
                    ],
                    sourceId: 'starting_hand_mulligan',
                    targetType: 'generic',
                },
            },
            queue: [],
            isBlocked: false,
        },
    };

    return nextState;
}

function buildOnlineAiHiddenSacrificeState(baseState: any) {
    const nextState = JSON.parse(JSON.stringify(baseState));
    const existingPlayers = nextState.core?.players ?? {};
    const existingBases = Array.isArray(nextState.core?.bases) ? nextState.core.bases : [];
    const primaryBase = existingBases[0] ?? { defId: 'base_temple_of_goju', minions: [], ongoingActions: [] };
    const turnOrder = Array.isArray(nextState.core?.turnOrder) && nextState.core.turnOrder.length > 0
        ? [...nextState.core.turnOrder]
        : ['0', '1'];

    nextState.core = {
        ...nextState.core,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 3,
        turnOrder,
        factionSelection: undefined,
        players: {
            ...existingPlayers,
            '0': {
                ...(existingPlayers['0'] ?? {}),
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
            },
            '1': {
                ...(existingPlayers['1'] ?? {}),
                hand: [],
                deck: [
                    { uid: 'ai-draw-1', defId: 'wizard_archmage', type: 'minion', owner: '1' },
                    { uid: 'ai-draw-2', defId: 'wizard_apprentice', type: 'minion', owner: '1' },
                    { uid: 'ai-draw-3', defId: 'wizard_enchantress', type: 'minion', owner: '1' },
                ],
                discard: [
                    { uid: 'ai-sacrifice-action', defId: 'wizard_sacrifice', type: 'action', owner: '1' },
                ],
                factions: ['wizards', 'ninjas'],
                minionsPlayed: 1,
                minionLimit: 1,
                actionsPlayed: 1,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
            },
        },
        bases: [
            {
                ...primaryBase,
                defId: primaryBase.defId ?? 'base_temple_of_goju',
                minions: [{
                    uid: 'ai-sacrifice-target',
                    defId: 'ninja_shinobi',
                    controller: '1',
                    owner: '1',
                    basePower: 3,
                    powerCounters: 0,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    playedThisTurn: true,
                    attachedActions: [],
                }],
                ongoingActions: Array.isArray(primaryBase.ongoingActions) ? primaryBase.ongoingActions : [],
            },
        ],
    };

    nextState.sys = {
        ...nextState.sys,
        turnOrder,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 3,
        flowHalted: false,
        interaction: {
            current: {
                id: 'wizard_sacrifice_hidden_choice',
                playerId: '1',
                kind: 'simple-choice',
                data: {
                    title: '选择要牺牲的随从（抽取等量力量的牌）',
                    sourceId: 'wizard_sacrifice',
                    targetType: 'minion',
                    options: [{
                        id: 'target-shinobi',
                        label: '影舞者',
                        value: { minionUid: 'ai-sacrifice-target', baseIndex: 0 },
                    }],
                },
            },
            queue: [],
            isBlocked: true,
        },
        responseWindow: {
            current: null,
            history: [],
        },
        eventStream: {
            ...(nextState.sys?.eventStream ?? {}),
            entries: [],
            nextId: 1,
        },
    };

    return nextState;
}

function buildOnlineAiHiddenHoverbotState(baseState: any) {
    const nextState = JSON.parse(JSON.stringify(baseState));
    const existingPlayers = nextState.core?.players ?? {};
    const existingBases = Array.isArray(nextState.core?.bases) ? nextState.core.bases : [];
    const primaryBase = existingBases[0] ?? { defId: 'base_tortuga', minions: [], ongoingActions: [] };
    const turnOrder = Array.isArray(nextState.core?.turnOrder) && nextState.core.turnOrder.length > 0
        ? [...nextState.core.turnOrder]
        : ['0', '1'];

    nextState.core = {
        ...nextState.core,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 3,
        turnOrder,
        factionSelection: undefined,
        players: {
            ...existingPlayers,
            '0': {
                ...(existingPlayers['0'] ?? {}),
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
            },
            '1': {
                ...(existingPlayers['1'] ?? {}),
                hand: [],
                deck: [
                    { uid: 'ai-top-zapbot', defId: 'robot_zapbot', type: 'minion', owner: '1' },
                    { uid: 'ai-next-minion', defId: 'robot_microbot_alpha', type: 'minion', owner: '1' },
                ],
                discard: [],
                factions: ['robots', 'wizards'],
                minionsPlayed: 1,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
            },
        },
        bases: [
            {
                ...primaryBase,
                defId: primaryBase.defId ?? 'base_tortuga',
                minions: [{
                    uid: 'ai-hoverbot-on-base',
                    defId: 'robot_hoverbot',
                    controller: '1',
                    owner: '1',
                    basePower: 1,
                    powerCounters: 0,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    playedThisTurn: true,
                    attachedActions: [],
                }],
                ongoingActions: Array.isArray(primaryBase.ongoingActions) ? primaryBase.ongoingActions : [],
            },
        ],
    };

    nextState.sys = {
        ...nextState.sys,
        turnOrder,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 3,
        flowHalted: false,
        interaction: {
            current: {
                id: 'robot_hoverbot_hidden_choice',
                playerId: '1',
                kind: 'simple-choice',
                data: {
                    title: '牌库顶是 cards.robot_zapbot.name（力量 2），是否作为额外随从打出？',
                    sourceId: 'robot_hoverbot',
                    targetType: 'generic',
                    responseValidationMode: 'live',
                    continuationContext: {
                        cardUid: 'ai-top-zapbot',
                        defId: 'robot_zapbot',
                        power: 2,
                    },
                    options: [
                        {
                            id: 'play',
                            label: '打出 cards.robot_zapbot.name',
                            value: { cardUid: 'ai-top-zapbot', defId: 'robot_zapbot', power: 2 },
                            displayMode: 'card',
                        },
                        {
                            id: 'skip',
                            label: '放回牌库顶',
                            value: { skip: true },
                            displayMode: 'button',
                        },
                    ],
                },
            },
            queue: [],
            isBlocked: true,
        },
        responseWindow: {
            current: null,
            history: [],
        },
        eventStream: {
            ...(nextState.sys?.eventStream ?? {}),
            entries: [],
            nextId: 1,
        },
    };

    return nextState;
}

function buildOnlineAiPassTurnState(baseState: any) {
    const nextState = JSON.parse(JSON.stringify(baseState));
    const existingPlayers = nextState.core?.players ?? {};
    const existingBases = Array.isArray(nextState.core?.bases) && nextState.core.bases.length > 0
        ? nextState.core.bases
        : [{ defId: 'base_jungle_oasis', minions: [], ongoingActions: [] }];
    const turnOrder = Array.isArray(nextState.core?.turnOrder) && nextState.core.turnOrder.length > 0
        ? [...nextState.core.turnOrder]
        : ['0', '1'];

    nextState.core = {
        ...nextState.core,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 4,
        turnOrder,
        factionSelection: undefined,
        players: {
            ...existingPlayers,
            '0': {
                ...(existingPlayers['0'] ?? {}),
                hand: [
                    { uid: 'host-card-1', defId: 'pirates_first_mate', type: 'minion', owner: '0' },
                    { uid: 'host-card-2', defId: 'pirates_broadside', type: 'action', owner: '0' },
                ],
                deck: [],
                discard: [],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
                vp: 3,
            },
            '1': {
                ...(existingPlayers['1'] ?? {}),
                hand: [],
                deck: [],
                discard: [],
                factions: ['wizards', 'ninjas'],
                minionsPlayed: 1,
                minionLimit: 1,
                actionsPlayed: 1,
                actionLimit: 1,
                minionsPlayedPerBase: {},
                sameNameMinionDefId: null,
                vp: 2,
            },
        },
        bases: existingBases.map((base: any, index: number) => ({
            ...base,
            defId: base.defId ?? (index === 0 ? 'base_jungle_oasis' : 'base_mushroom_kingdom'),
            minions: Array.isArray(base.minions) ? base.minions : [],
            ongoingActions: Array.isArray(base.ongoingActions) ? base.ongoingActions : [],
        })),
    };

    nextState.sys = {
        ...nextState.sys,
        turnOrder,
        currentPlayerIndex: 1,
        phase: 'playCards',
        turnNumber: 4,
        flowHalted: false,
        interaction: {
            current: undefined,
            queue: [],
            isBlocked: false,
        },
        responseWindow: {
            current: null,
            history: [],
        },
        eventStream: {
            ...(nextState.sys?.eventStream ?? {}),
            entries: [],
            nextId: 1,
        },
    };

    return nextState;
}

async function installUiRefreshMonitor(page: Page): Promise<void> {
    await page.evaluate(() => {
        const selectors = {
            turnTracker: '[data-tutorial-id="su-turn-tracker"]',
            scoreboard: '[data-tutorial-id="su-scoreboard"]',
            handArea: '[data-testid="su-hand-area"]',
        } as const;

        const refs = {
            turnTracker: document.querySelector(selectors.turnTracker),
            scoreboard: document.querySelector(selectors.scoreboard),
            handArea: document.querySelector(selectors.handArea),
        };

        const stats = {
            loadingVisibleSamples: 0,
            samples: 0,
            replacements: {
                turnTracker: 0,
                scoreboard: 0,
                handArea: 0,
            },
            disconnects: {
                turnTracker: 0,
                scoreboard: 0,
                handArea: 0,
            },
        };

        const sample = () => {
            stats.samples += 1;
            if (document.querySelector('[data-testid="loading-screen"]')) {
                stats.loadingVisibleSamples += 1;
            }

            for (const key of Object.keys(selectors) as Array<keyof typeof selectors>) {
                const current = refs[key];
                const next = document.querySelector(selectors[key]);
                if (current && !current.isConnected) {
                    stats.disconnects[key] += 1;
                }
                if (current && next && current !== next) {
                    stats.replacements[key] += 1;
                    refs[key] = next;
                } else if (!current && next) {
                    refs[key] = next;
                }
            }
        };

        sample();
        const timer = window.setInterval(sample, 50);
        (window as Window & {
            __SU_REFRESH_MONITOR__?: {
                stats: typeof stats;
                stop: () => typeof stats;
            };
        }).__SU_REFRESH_MONITOR__ = {
            stats,
            stop: () => {
                window.clearInterval(timer);
                sample();
                return stats;
            },
        };
    });
}

async function readUiRefreshMonitor(page: Page) {
    return page.evaluate(() => {
        const monitor = (window as Window & {
            __SU_REFRESH_MONITOR__?: {
                stop: () => unknown;
            };
        }).__SU_REFRESH_MONITOR__;
        if (!monitor) {
            throw new Error('UI refresh monitor not installed');
        }
        return monitor.stop();
    });
}

test('简单阶段转换 - 点击结束回合', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('/play/smashup');
    await page.waitForFunction(
        () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered(),
        { timeout: 15000 },
    );

    await game.setupScene({
        gameId: 'smashup',
        player0: {
            hand: [{ uid: 'card-1', defId: 'wizard_portal', type: 'action' }],
        },
        player1: {},
        bases: [{ breakpoint: 25, power: 0 }],
        currentPlayer: '0',
        phase: 'playCards',
    });

    await page.waitForTimeout(2000);
    await game.screenshot('01-initial-state', testInfo);

    const initialPhase = await page.evaluate(() => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        return harness.state.get().sys.phase;
    });
    console.log('[TEST] 初始阶段:', initialPhase);

    await game.advancePhase();

    await game.screenshot('02-after-finish-turn', testInfo);

    await expect.poll(async () => {
        const state = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            return harness.state.get();
        });
        return {
            phase: state.sys.phase,
            currentPlayerIndex: state.core.currentPlayerIndex,
        };
    }, { timeout: 10000 }).toEqual({
        phase: 'playCards',
        currentPlayerIndex: 1,
    });
});

test('Oops 四派系在派系选择与注入场景中都能显示资源', async ({ page, game }, testInfo) => {
    test.setTimeout(90000);

    await game.openTestGame('smashup');

    const factionHeading = page.locator('h1').filter({ hasText: /Draft Your Factions|选择你的派系/i });
    await expect(factionHeading).toBeVisible({ timeout: 15000 });

    const factionNames = [
        /Ancient Egyptians|古埃及人/i,
        /Cowboys|牛仔/i,
        /Samurai|武士/i,
        /Vikings|维京人/i,
    ];

    for (const namePattern of factionNames) {
        const card = page.getByText(namePattern).first();
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeVisible({ timeout: 10000 });
    }
    await expect.poll(async () => page.locator('.atlas-shimmer').count(), {
        timeout: 10000,
        message: 'Oops 四派系在派系选择界面中不应停留在 shimmer 占位态',
    }).toBe(0);

    await game.screenshot('oops-faction-selection-visible', testInfo);

    await game.setupScene({
        gameId: 'smashup',
        player0: {
            factions: ['vikings', 'samurai'],
            hand: [
                { uid: 'p0-viking-minion', defId: 'vikings_huscarl', type: 'minion' },
                { uid: 'p0-samurai-action', defId: 'samurai_yokai_attack', type: 'action' },
            ],
            deck: [
                { uid: 'p0-deck-1', defId: 'vikings_raider', type: 'minion' },
                { uid: 'p0-deck-2', defId: 'samurai_shogun', type: 'minion' },
            ],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['ancient_egyptians', 'cowboys'],
            hand: [],
            deck: [
                { uid: 'p1-deck-1', defId: 'ancient_egyptians_mummy', type: 'minion' },
                { uid: 'p1-deck-2', defId: 'cowboys_deputy', type: 'minion' },
            ],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [
            { defId: 'base_drakkar' },
            { defId: 'base_shoguns_palace' },
            { defId: 'base_pyramids' },
        ],
        extra: {
            core: {
                turnOrder: ['0', '1'],
                turnNumber: 1,
                nextUid: 5000,
                baseDeck: ['base_longhouse', 'base_saloon', 'base_sakura_garden'],
            },
        },
    });

    await waitForSmashUpUI(page);

    await expect(page.locator('[data-base-index="0"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-base-index="1"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-base-index="2"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-card-uid="p0-viking-minion"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-card-uid="p0-samurai-action"]')).toBeVisible({ timeout: 10000 });

    await expect.poll(async () => page.locator('.atlas-shimmer').count(), {
        timeout: 10000,
        message: 'Oops 四派系接入后的卡图/基地图不应停留在 shimmer 占位态',
    }).toBe(0);

    const state = await page.evaluate(() => (window as any).__BG_TEST_HARNESS__?.state?.get?.() ?? null);
    expect(state).toBeTruthy();
    expect(state.core.players['0'].factions).toEqual(['vikings', 'samurai']);
    expect(state.core.players['1'].factions).toEqual(['ancient_egyptians', 'cowboys']);
    expect(state.core.bases.map((base: any) => base.defId)).toEqual([
        'base_drakkar',
        'base_shoguns_palace',
        'base_pyramids',
    ]);

    await game.screenshot('oops-faction-intake-board', testInfo);
});

test('Oops Ancient Egyptians 埋葬条带与翻开交互应在浏览器中可完成', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await game.openTestGame('smashup');
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            factions: ['ancient_egyptians', 'robots'],
            hand: [
                { uid: 'seal-1', defId: 'ancient_egyptians_seal_the_tomb', type: 'action' },
            ],
            deck: [
                { uid: 'draw-1', defId: 'robot_microbot_alpha', type: 'minion' },
                { uid: 'draw-2', defId: 'robot_zapbot', type: 'minion' },
                { uid: 'draw-3', defId: 'robot_warbot', type: 'minion' },
            ],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['vikings', 'samurai'],
            hand: [],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [
            { defId: 'base_pyramids' },
            { defId: 'base_a' },
        ],
        extra: {
            core: {
                turnOrder: ['0', '1'],
                turnNumber: 1,
                nextUid: 5000,
                bases: [
                    {
                        defId: 'base_pyramids',
                        minions: [
                            {
                                uid: 'guard-1',
                                defId: 'robot_microbot_alpha',
                                owner: '0',
                                controller: '0',
                                basePower: 1,
                                counters: 0,
                                talentUsed: false,
                                attachedActions: [],
                            },
                        ],
                        ongoingActions: [],
                        buriedCards: [
                            {
                                uid: 'buried-yk',
                                defId: 'ancient_egyptians_you_can_take_it_with_you',
                                trueOwnerId: '0',
                                controllerId: '0',
                                buriedFrom: 'hand',
                            },
                        ],
                    },
                    {
                        defId: 'base_a',
                        minions: [],
                        ongoingActions: [],
                    },
                ],
            },
        },
    });

    await waitForSmashUpUI(page);
    await expect(page.locator('[data-buried-count="1"]').first()).toBeVisible({ timeout: 8000 });
    await saveEvidenceScreenshot(page, testInfo, 'oops-bury-strip-before-uncover');

    await page.locator('[data-testid="su-hand-area"] [data-card-uid="seal-1"]').click({ force: true });
    await page.waitForTimeout(300);
    await page.locator('[data-base-index="0"]').click({ force: true });

    await dismissSpotlightIfVisible(page);
    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('ancient_egyptians_seal_the_tomb_mode');
    await page.getByRole('button', { name: /翻开同一基地至多两张你的埋葬牌/i }).click();

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('ancient_egyptians_seal_the_tomb_uncover');
    await page.getByRole('button', { name: /随身带走 @ 金字塔|You Can Take It With You @ Pyramids/i }).click();
    await page.getByRole('button', { name: /^(确认|Confirm)(?:\s*\(\d+\))?$/i }).click();

    await expect.poll(async () => {
        const state = await game.getState();
        return state.core.bases[0].buriedCards?.length ?? 0;
    }, { timeout: 8000 }).toBe(0);

    await expect.poll(async () => {
        const state = await game.getState();
        return state.core.players['0'].hand.length;
    }, { timeout: 8000 }).toBe(3);

    await expect.poll(async () => {
        const state = await game.getState();
        return state.core.players['0'].discard.some((card: any) => card.defId === 'ancient_egyptians_you_can_take_it_with_you');
    }, { timeout: 8000 }).toBe(true);

    await saveEvidenceScreenshot(page, testInfo, 'oops-bury-strip-after-uncover');
});

test('Oops Sphinx 起始回合回收埋葬牌后，标准翻开阶段不应再出现刚消耗的埋葬牌', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await game.openTestGame('smashup');
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            factions: ['ancient_egyptians', 'robots'],
            hand: [],
            deck: [
                { uid: 'draw-1', defId: 'robot_microbot_alpha', type: 'minion' },
                { uid: 'draw-2', defId: 'robot_zapbot', type: 'minion' },
            ],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['vikings', 'samurai'],
            hand: [],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        currentPlayer: '1',
        phase: 'endTurn',
        bases: [
            { defId: 'base_pyramids' },
            { defId: 'base_a' },
        ],
        extra: {
            core: {
                turnOrder: ['0', '1'],
                turnNumber: 1,
                nextUid: 7000,
                bases: [
                    {
                        defId: 'base_pyramids',
                        minions: [],
                        ongoingActions: [],
                        buriedCards: [
                            {
                                uid: 'sphinx-buried-return',
                                defId: 'ancient_egyptians_lost_knowledge',
                                trueOwnerId: '0',
                                controllerId: '0',
                                buriedFrom: 'hand',
                            },
                            {
                                uid: 'sphinx-buried-keep',
                                defId: 'ancient_egyptians_you_can_take_it_with_you',
                                trueOwnerId: '0',
                                controllerId: '0',
                                buriedFrom: 'hand',
                            },
                        ],
                    },
                    {
                        defId: 'base_a',
                        minions: [],
                        ongoingActions: [],
                    },
                ],
                titans: [
                    {
                        uid: 'titan-sphinx-setaside',
                        defId: 'sphinx',
                        faction: 'ancient_egyptians',
                        ownerId: '0',
                        controllerId: '0',
                        powerCounters: 0,
                        talentUsed: false,
                        location: { zone: 'setaside' },
                    },
                ],
            },
        },
    });

    await waitForSmashUpUI(page);
    await expect(page.locator('[data-buried-count="2"]').first()).toBeVisible({ timeout: 8000 });

    await dispatchHarnessCommand(page, '1', 'ADVANCE_PHASE', {});

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('titan_sphinx_start_turn');
    await saveEvidenceScreenshot(page, testInfo, 'sphinx-real-start-turn-before-return');

    const initialOptionUids = await page.evaluate(() => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const options = harness?.state?.get?.()?.sys?.interaction?.current?.data?.options ?? [];
        return options
            .map((option: any) => option?.value?.cardUid)
            .filter((uid: unknown) => typeof uid === 'string');
    });
    expect(initialOptionUids).toEqual(['sphinx-buried-return', 'sphinx-buried-keep']);

    const returnOption = await findCurrentInteractionOption(
        page,
        (option) => option?.value?.cardUid === 'sphinx-buried-return',
    );
    expect(returnOption?.id).toBeTruthy();
    await respondCurrentInteraction(page, { optionId: returnOption.id });

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('bury_uncover_start_turn');

    await expect.poll(async () => {
        const interaction = await getCurrentInteraction(page);
        const options = interaction?.data?.options ?? [];
        return options
            .map((option: any) => option?.value?.cardUid)
            .filter((uid: unknown) => typeof uid === 'string');
    }, { timeout: 8000 }).toEqual(['sphinx-buried-keep']);

    await expect.poll(async () => {
        const state = await game.getState();
        return state.core.players['0'].hand.some((card: any) => card.uid === 'sphinx-buried-return');
    }, { timeout: 8000 }).toBe(true);

    await expect(page.locator('[data-buried-card-uid="sphinx-buried-return"]')).toHaveCount(0);
    await expect(page.locator('[data-buried-card-uid="sphinx-buried-keep"]')).toHaveCount(1);
    await saveEvidenceScreenshot(page, testInfo, 'sphinx-real-start-turn-after-return-before-uncover');
});

test('Oops Cowboys 决斗交互应按官方链路完成 Pinkerton/决斗牌/Deputy/结算', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);
    const duelBannerText = /决斗进行中|Duel in progress/i;
    const duelCardPromptText = /决斗牌：从手牌选择 1 张要用于这场决斗的牌，或跳过|Duel: choose 1 duel card from hand, or skip/i;
    const deputyPromptText = /副警长：你可以弃掉 1 张副警长，使 1 个随从直到回合结束获得 \+2 力量|Deputy: you may discard a Deputy to give a minion \+2 power until end of turn/i;

    await game.openTestGame('smashup');
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            factions: ['cowboys', 'robots'],
            hand: [
                { uid: 'gun-1', defId: 'cowboys_gunfighter', type: 'minion' },
                { uid: 'deputy-1', defId: 'cowboys_deputy', type: 'minion' },
            ],
            deck: [],
            discard: [],
            field: [
                { uid: 'pink-1', defId: 'cowboys_pinkerton', baseIndex: 0, owner: '0', controller: '0', power: 4 },
            ],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['samurai', 'vikings'],
            hand: [],
            deck: [],
            discard: [],
            field: [
                { uid: 'enemy-1', defId: 'robot_microbot_alpha', baseIndex: 0, owner: '1', controller: '1', power: 2 },
            ],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [{ defId: 'base_a' }],
        extra: {
            core: {
                turnOrder: ['0', '1'],
                turnNumber: 1,
                nextUid: 6000,
            },
        },
    });

    await waitForSmashUpUI(page);
    await game.playCard('cowboys_gunfighter', { targetBaseIndex: 0 });
    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('cowboys_gunfighter');

    await waitForSelectableMinion(page, 'enemy-1');
    await clickSelectableMinion(page, 'enemy-1');

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('smashup_duel_pinkerton');
    await expect(page.getByText(duelBannerText)).toBeVisible({ timeout: 8000 });
    await expectDuelParticipantMinions(page, ['gun-1', 'enemy-1']);
    await saveEvidenceScreenshot(page, testInfo, 'oops-duel-pinkerton-prompt');
    await page.getByRole('button', { name: /放置 1 个指示物|Place 1 counter/i }).click();

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('smashup_duel_card');
    await expect(page.getByText(duelCardPromptText)).toBeVisible({ timeout: 8000 });
    await expectDuelParticipantMinions(page, ['gun-1', 'enemy-1']);
    await saveEvidenceScreenshot(page, testInfo, 'oops-duel-card-prompt');
    await page.getByRole('button', { name: /跳过（不从手牌打出决斗牌）|Skip \(play no duel card\)/i }).click();

    await expect.poll(async () => {
        const interaction = await getCurrentInteraction(page);
        return interaction ? { sourceId: interaction.data?.sourceId ?? null, playerId: interaction.playerId ?? null } : null;
    }, { timeout: 8000 }).toEqual({ sourceId: 'smashup_duel_card', playerId: '1' });
    const enemySkipOption = await findCurrentInteractionOption(page, option => option?.value?.skip === true);
    expect(enemySkipOption).toBeTruthy();
    await respondCurrentInteraction(page, { optionId: enemySkipOption.id });

    await expect.poll(async () => {
        const interaction = await getCurrentInteraction(page);
        return interaction ? { sourceId: interaction.data?.sourceId ?? null, playerId: interaction.playerId ?? null } : null;
    }, { timeout: 8000 }).toEqual({ sourceId: 'smashup_duel_deputy_card', playerId: '0' });
    await expect(page.getByText(deputyPromptText)).toBeVisible({ timeout: 8000 });
    await saveEvidenceScreenshot(page, testInfo, 'oops-duel-deputy-card-prompt');
    await page.locator('[data-card-uid="deputy-1"]').click({ force: true });

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('smashup_duel_deputy_target');
    await expectDuelParticipantMinions(page, ['gun-1', 'enemy-1']);
    await saveEvidenceScreenshot(page, testInfo, 'oops-duel-deputy-target-prompt');
    await clickSelectableMinion(page, 'gun-1');

    await expect.poll(async () => {
        const state = await game.getState();
        return {
            enemyGone: !state.core.bases[0].minions.some((minion: any) => minion.uid === 'enemy-1'),
            deputyDiscarded: state.core.players['0'].discard.some((card: any) => card.uid === 'deputy-1'),
            activeDuel: state.core.activeDuel ?? null,
        };
    }, { timeout: 8000 }).toEqual({
        enemyGone: true,
        deputyDiscarded: true,
        activeDuel: null,
    });
    await expect(page.getByText(duelBannerText)).toHaveCount(0);
    await expect(page.locator('[data-duel-participant="true"]')).toHaveCount(0);

    await saveEvidenceScreenshot(page, testInfo, 'oops-duel-after-resolve');
});

test('Oops Samurai 额外出牌效果应在浏览器中兑现额外随从与行动额度', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await game.openTestGame('smashup');
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            factions: ['samurai', 'cowboys'],
            hand: [
                { uid: 'yokai-1', defId: 'samurai_yokai_attack', type: 'action' },
            ],
            deck: [],
            discard: [],
            field: [
                { uid: 'ally-1', defId: 'samurai_ronin', baseIndex: 0, owner: '0', controller: '0', power: 3 },
            ],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['vikings', 'robots'],
            hand: [],
            deck: [],
            discard: [],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [{ defId: 'base_a' }],
        extra: {
            core: {
                turnOrder: ['0', '1'],
                turnNumber: 1,
                nextUid: 7000,
            },
        },
    });

    await waitForSmashUpUI(page);
    await page.locator('[data-testid="su-hand-area"] [data-card-uid="yokai-1"]').click({ force: true });
    await dismissSpotlightIfVisible(page);
    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null).toBe('samurai_yokai_attack');

    await waitForSelectableMinion(page, 'ally-1');
    await saveEvidenceScreenshot(page, testInfo, 'oops-extra-play-before-select');
    await clickSelectableMinion(page, 'ally-1');

    await expect.poll(async () => (await getCurrentInteraction(page))?.data?.sourceId ?? null, { timeout: 8000 }).toBe(null);

    await expect.poll(async () => {
        const state = await game.getState();
        return {
            allyGone: !state.core.bases[0].minions.some((minion: any) => minion.uid === 'ally-1'),
            actionDiscarded: state.core.players['0'].discard.some((card: any) => card.uid === 'yokai-1'),
            handEmpty: state.core.players['0'].hand.length === 0,
            minionLimit: state.core.players['0'].minionLimit,
            actionLimit: state.core.players['0'].actionLimit,
        };
    }, { timeout: 8000 }).toEqual({
        allyGone: true,
        actionDiscarded: true,
        handEmpty: true,
        minionLimit: 2,
        actionLimit: 2,
    });

    await saveEvidenceScreenshot(page, testInfo, 'oops-extra-play-after-resolve');
});

test('在线模式对手打出行动卡时应显示特写', async ({ browser }, testInfo) => {
    test.setTimeout(120000);

    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const firstSetup = await setupSmashUpMatchSkipSetup(browser, baseURL);
    if (!firstSetup) {
        test.skip(true, 'SmashUp 联机房间创建失败');
        return;
    }

    try {
        const { hostPage, guestPage } = firstSetup;
        await applyOnlineMatchState(firstSetup.matchId, hostPage, (state) => buildActionSpotlightState(state, 0));
        await waitForSmashUpUI(hostPage);
        await waitForSmashUpUI(guestPage);
        await waitForTurnTracker(hostPage, 'YOU');
        await waitForTurnTracker(guestPage, 'OPP');

        const guestSpotlightCard = guestPage.getByTestId('smashup-action-spotlight-card');
        const guestSpotlightQueue = guestPage.getByTestId('card-spotlight-queue');
        const hostSpotlightQueue = hostPage.getByTestId('card-spotlight-queue');

        const hostActionUid = await getPlayerActionUid(hostPage, '0', 'wizard_mystic_studies');
        expect(hostActionUid).toBeTruthy();
        await hostPage.locator(`[data-card-uid="${hostActionUid}"]`).click();
        await expect(guestSpotlightCard).toBeVisible({ timeout: 8000 });
        await expect(guestSpotlightCard).toHaveAttribute('data-card-def-id', 'wizard_mystic_studies');
        await expect(hostSpotlightQueue).toHaveCount(0);
        await saveEvidenceScreenshot(guestPage, testInfo, 'action-spotlight-online-p0');

        await guestSpotlightQueue.click({ force: true });
        await expect(guestSpotlightCard).toBeHidden({ timeout: 5000 });
    } finally {
        await firstSetup.guestContext.close();
        await firstSetup.hostContext.close();
    }

    const secondSetup = await setupSmashUpMatchSkipSetup(browser, baseURL);
    if (!secondSetup) {
        test.skip(true, 'SmashUp 联机房间创建失败（P1 场景）');
        return;
    }

    try {
        const { hostPage, guestPage } = secondSetup;
        await applyOnlineMatchState(secondSetup.matchId, hostPage, (state) => buildActionSpotlightState(state, 1));
        await waitForSmashUpUI(hostPage);
        await waitForSmashUpUI(guestPage);
        await waitForTurnTracker(hostPage, 'OPP');
        await waitForTurnTracker(guestPage, 'YOU');

        const hostSpotlightCard = hostPage.getByTestId('smashup-action-spotlight-card');
        const hostSpotlightQueue = hostPage.getByTestId('card-spotlight-queue');
        const guestSpotlightQueue = guestPage.getByTestId('card-spotlight-queue');

        const guestActionUid = await getPlayerActionUid(guestPage, '1', 'wizard_mystic_studies');
        expect(guestActionUid).toBeTruthy();
        await guestPage.locator(`[data-card-uid="${guestActionUid}"]`).click();
        await expect(hostSpotlightCard).toBeVisible({ timeout: 8000 });
        await expect(hostSpotlightCard).toHaveAttribute('data-card-def-id', 'wizard_mystic_studies');
        await expect(guestSpotlightQueue).toHaveCount(0);
        await saveEvidenceScreenshot(hostPage, testInfo, 'action-spotlight-online-p1');

        await hostSpotlightQueue.click({ force: true });
        await expect(hostSpotlightCard).toBeHidden({ timeout: 5000 });
    } finally {
        await secondSetup.guestContext.close();
        await secondSetup.hostContext.close();
    }
});

test('在线 AI 持有隐藏交互时应自动 batch 响应并推进状态', async ({ browser }, testInfo) => {
    test.setTimeout(120000);

    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupSmashUpOnlineAiRoom(browser, baseURL);
    if (!setup) {
        test.skip(true, 'SmashUp AI 联机房间创建失败');
        return;
    }

    try {
        const { hostPage, matchId } = setup;
        await waitForAiSeatCredential(hostPage, matchId, '1');

        await applyOnlineMatchState(matchId, hostPage, buildOnlineAiHiddenSacrificeState);
        await waitForSmashUpUI(hostPage);

        const injectedState = await getMatchState(matchId, hostPage);
        expect(injectedState.sys?.interaction?.current?.playerId).toBe('1');
        expect(injectedState.sys?.interaction?.current?.data?.sourceId).toBe('wizard_sacrifice');
        expect(injectedState.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid)).toEqual(['ai-sacrifice-target']);
        await expect(hostPage.getByText('选择要牺牲的随从（抽取等量力量的牌）')).toHaveCount(0);

        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-hidden-choice-before-resolve');

        await expect.poll(async () => {
            const state = await getMatchState(matchId, hostPage);
            return {
                interactionSourceId: state.sys?.interaction?.current?.data?.sourceId ?? null,
                interactionPlayerId: state.sys?.interaction?.current?.playerId ?? null,
                minionsOnBase: state.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid) ?? [],
                aiHandDefIds: state.core?.players?.['1']?.hand?.map((card: any) => card.defId) ?? [],
                aiDeckCount: state.core?.players?.['1']?.deck?.length ?? -1,
            };
        }, {
            timeout: 20000,
            message: '等待在线 AI 自动响应隐藏交互并完成结算',
        }).toEqual({
            interactionSourceId: null,
            interactionPlayerId: null,
            minionsOnBase: [],
            aiHandDefIds: ['wizard_archmage', 'wizard_apprentice', 'wizard_enchantress'],
            aiDeckCount: 0,
        });

        await expect.poll(async () => {
            return hostPage.locator('[data-minion-uid="ai-sacrifice-target"]').count();
        }, { timeout: 8000 }).toBe(0);

        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-hidden-choice-after-resolve');
    } finally {
        await setup.hostContext.close();
    }
});

test('在线 AI 的盘旋机器人隐藏交互卡住时，应在 4 秒后自动跳过并恢复对局', async ({ browser }, testInfo) => {
    test.setTimeout(120000);

    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupSmashUpOnlineAiRoom(browser, baseURL);
    if (!setup) {
        test.skip(true, 'SmashUp AI 联机房间创建失败');
        return;
    }

    try {
        const { hostPage, matchId } = setup;
        await waitForAiSeatCredential(hostPage, matchId, '1');
        await installSmashUpAiChoiceRejectPatch(hostPage, { targetPlayerId: '1' });

        await applyOnlineMatchState(matchId, hostPage, buildOnlineAiHiddenHoverbotState);
        await waitForSmashUpUI(hostPage);

        const injectedState = await getMatchState(matchId, hostPage);
        expect(injectedState.sys?.interaction?.current?.playerId).toBe('1');
        expect(injectedState.sys?.interaction?.current?.data?.sourceId).toBe('robot_hoverbot');
        expect(injectedState.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid)).toEqual(['ai-hoverbot-on-base']);
        await expect(hostPage.getByText('牌库顶是 cards.robot_zapbot.name（力量 2），是否作为额外随从打出？')).toHaveCount(0);

        await expect.poll(async () => {
            return hostPage.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    interactionPlayerId: state?.sys?.interaction?.current?.playerId ?? null,
                    isBlocked: state?.sys?.interaction?.isBlocked ?? null,
                    baseMinions: state?.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid) ?? [],
                };
            });
        }, {
            timeout: 10000,
            message: '等待房主视角进入“隐藏交互阻塞但无可见 prompt”状态',
        }).toEqual({
            interactionPlayerId: null,
            isBlocked: true,
            baseMinions: ['ai-hoverbot-on-base'],
        });

        await expect.poll(async () => {
            return (await readSmashUpAiChoiceRejectPatchStatus(hostPage))?.rejectedCount ?? 0;
        }, {
            timeout: 10000,
            message: '等待 AI seat 至少尝试一次 hoverbot 隐藏交互',
        }).toBeGreaterThan(0);

        const forceSkipToast = hostPage.getByText('AI 响应超时').locator('..');
        await expect(forceSkipToast).toBeVisible({ timeout: 12000 });
        await expect(hostPage.getByText('AI 自动跳过。')).toBeVisible({ timeout: 5000 });
        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-hoverbot-force-skip-toast');

        const patchStatusAfterAutoSkip = await readSmashUpAiChoiceRejectPatchStatus(hostPage);
        expect(patchStatusAfterAutoSkip?.rejectedCount ?? 0).toBeGreaterThan(0);
        expect(patchStatusAfterAutoSkip?.delegatedCount ?? 0).toBeGreaterThanOrEqual(1);
        expect(patchStatusAfterAutoSkip?.forceSkipDelegated).toBe(true);

        await expect.poll(async () => {
            const status = await readSmashUpAiChoiceRejectPatchStatus(hostPage);
            const state = await getMatchState(matchId, hostPage);
            return {
                delegatedCount: status?.delegatedCount ?? 0,
                forceSkipDelegated: status?.forceSkipDelegated ?? false,
                interactionSourceId: state.sys?.interaction?.current?.data?.sourceId ?? null,
                interactionPlayerId: state.sys?.interaction?.current?.playerId ?? null,
                baseMinions: state.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid) ?? [],
                deckTop: state.core?.players?.['1']?.deck?.[0]?.defId ?? null,
            };
        }, {
            timeout: 20000,
            message: '等待 4 秒自动跳过提交成功并解除房主阻塞',
        }).toEqual({
            delegatedCount: 1,
            forceSkipDelegated: true,
            interactionSourceId: null,
            interactionPlayerId: null,
            baseMinions: ['ai-hoverbot-on-base'],
            deckTop: 'robot_zapbot',
        });

        await expect.poll(async () => {
            return hostPage.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    interactionPlayerId: state?.sys?.interaction?.current?.playerId ?? null,
                    isBlocked: state?.sys?.interaction?.isBlocked ?? null,
                    toastVisible: Array.from(document.querySelectorAll('h4')).some((node) =>
                        node.textContent?.trim() === 'AI 响应超时'),
                };
            });
        }, {
            timeout: 10000,
            message: '等待强制跳过后房主解除阻塞并收起超时 toast',
        }).toEqual({
            interactionPlayerId: null,
            isBlocked: false,
            toastVisible: false,
        });

        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-hoverbot-force-skip-after-resolve');
    } finally {
        await setup.hostContext.close();
    }
});

test('在线 AI 连续 8 秒没有任何实际进展时，应自动强制结束当前回合', async ({ browser }, testInfo) => {
    test.setTimeout(120000);

    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const setup = await setupSmashUpOnlineAiRoom(browser, baseURL);
    if (!setup) {
        test.skip(true, 'SmashUp AI 联机房间创建失败');
        return;
    }

    try {
        const { hostPage, matchId } = setup;
        await waitForAiSeatCredential(hostPage, matchId, '1');
        await installSmashUpAiChoiceRejectPatch(hostPage, {
            targetPlayerId: '1',
            allowBatchKinds: ['force-end-turn'],
        });

        await applyOnlineMatchState(matchId, hostPage, buildOnlineAiHiddenSacrificeState);
        await waitForSmashUpUI(hostPage);

        const injectedState = await getMatchState(matchId, hostPage);
        expect(injectedState.sys?.interaction?.current?.playerId).toBe('1');
        expect(injectedState.sys?.interaction?.current?.data?.sourceId).toBe('wizard_sacrifice');
        expect(injectedState.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid)).toEqual(['ai-sacrifice-target']);
        await expect(hostPage.getByText('选择要牺牲的随从（抽取等量力量的牌）')).toHaveCount(0);

        await expect.poll(async () => {
            return hostPage.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    interactionPlayerId: state?.sys?.interaction?.current?.playerId ?? null,
                    isBlocked: state?.sys?.interaction?.isBlocked ?? null,
                    currentPlayerIndex: state?.core?.currentPlayerIndex ?? null,
                    baseMinions: state?.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid) ?? [],
                };
            });
        }, {
            timeout: 10000,
            message: '等待房主视角进入“隐藏交互阻塞但无可见 prompt”状态',
        }).toEqual({
            interactionPlayerId: null,
            isBlocked: true,
            currentPlayerIndex: 1,
            baseMinions: ['ai-sacrifice-target'],
        });

        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-force-end-turn-before-timeout');

        await expect.poll(async () => {
            return (await readSmashUpAiChoiceRejectPatchStatus(hostPage))?.rejectedCount ?? 0;
        }, {
            timeout: 10000,
            message: '等待 AI seat 至少尝试一次 wizard sacrifice 隐藏交互',
        }).toBeGreaterThan(0);

        const forceEndTurnToast = hostPage.getByText('AI 强制结束回合').locator('..');
        await expect(forceEndTurnToast).toBeVisible({ timeout: 16000 });
        await expect(hostPage.getByText('AI 已强制结束回合。')).toBeVisible({ timeout: 5000 });

        await expect.poll(async () => {
            const status = await readSmashUpAiChoiceRejectPatchStatus(hostPage);
            const state = await getMatchState(matchId, hostPage);
            return {
                delegatedCount: status?.delegatedCount ?? 0,
                forceEndTurnDelegated: status?.forceEndTurnDelegated ?? false,
                interactionSourceId: state.sys?.interaction?.current?.data?.sourceId ?? null,
                interactionPlayerId: state.sys?.interaction?.current?.playerId ?? null,
                currentPlayerIndex: state.core?.currentPlayerIndex ?? null,
                baseMinions: state.core?.bases?.[0]?.minions?.map((minion: any) => minion.uid) ?? [],
            };
        }, {
            timeout: 20000,
            message: '等待 8 秒强制结束回合提交成功并切回房主',
        }).toEqual({
            delegatedCount: 2,
            forceEndTurnDelegated: true,
            interactionSourceId: null,
            interactionPlayerId: null,
            currentPlayerIndex: 0,
            baseMinions: ['ai-sacrifice-target'],
        });

        await expect.poll(async () => {
            return hostPage.evaluate(() => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return {
                    interactionPlayerId: state?.sys?.interaction?.current?.playerId ?? null,
                    isBlocked: state?.sys?.interaction?.isBlocked ?? null,
                    currentPlayerIndex: state?.core?.currentPlayerIndex ?? null,
                };
            });
        }, {
            timeout: 10000,
            message: '等待房主过滤视角解除阻塞并接回当前回合',
        }).toEqual({
            interactionPlayerId: null,
            isBlocked: false,
            currentPlayerIndex: 0,
        });

        await expect(
            hostPage.locator('[data-tutorial-id="su-turn-tracker"]').filter({ hasText: /你自己|YOU/i }),
        ).toBeVisible({ timeout: 8000 });
        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-force-end-turn-after-resolve');
    } finally {
        await setup.hostContext.close();
    }
});

test('在线 AI 结束回合切回我方时不应出现整板重挂载或 loading 闪屏', async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const setup = await setupSmashUpOnlineAiRoom(browser, baseURL);
    if (!setup) {
        test.skip(true, 'SmashUp AI 联机房间创建失败');
        return;
    }

    const { hostPage, hostContext, matchId } = setup;

    try {
        await waitForAiSeatCredential(hostPage, matchId, '1');
        await installUiRefreshMonitor(hostPage);
        await applyOnlineMatchState(matchId, hostPage, buildOnlineAiPassTurnState);
        await waitForSmashUpUI(hostPage);
        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-pass-turn-before-host-turn');

        await expect.poll(async () => {
            const state = await getMatchState(matchId, hostPage);
            return {
                currentPlayerIndex: state.core?.currentPlayerIndex,
                turnNumber: state.core?.turnNumber,
                phase: state.sys?.phase,
            };
        }, {
            timeout: 12000,
            message: '等待 AI 自动结束回合并切回玩家 0',
        }).toMatchObject({
            currentPlayerIndex: 0,
        });

        await expect(hostPage.locator('[data-tutorial-id="su-turn-tracker"]')).toBeVisible({ timeout: 8000 });
        await hostPage.waitForTimeout(1200);
        await saveEvidenceScreenshot(hostPage, testInfo, 'online-ai-pass-turn-after-host-turn');

        const monitor = await readUiRefreshMonitor(hostPage) as {
            loadingVisibleSamples: number;
            samples: number;
            replacements: Record<string, number>;
            disconnects: Record<string, number>;
        };

        expect(monitor.loadingVisibleSamples).toBe(0);
        expect(monitor.replacements.turnTracker).toBe(0);
        expect(monitor.replacements.scoreboard).toBe(0);
        expect(monitor.replacements.handArea).toBe(0);
        expect(monitor.disconnects.turnTracker).toBe(0);
        expect(monitor.disconnects.scoreboard).toBe(0);
        expect(monitor.disconnects.handArea).toBe(0);
    } finally {
        await hostContext.close();
    }
});

test('阵营选择已清空但 phase 残留时，仍应显示起手重抽交互', async ({ page, game }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('/play/smashup');
    await page.waitForFunction(
        () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
        { timeout: 15000, polling: 200 },
    );

    await game.setupScene({
        gameId: 'smashup',
        player0: { factions: ['tricksters_pod', 'steampunks_pod'] },
        player1: { factions: ['vampires_pod', 'bear_cavalry_pod'] },
        currentPlayer: '0',
        phase: 'playCards',
    });

    await page.evaluate((updaterSource) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const state = harness.state.get();
        const updater = new Function('state', `${updaterSource}`) as (state: any) => any;
        harness.state.set(updater(state));
    }, `return (${buildFactionSelectStuckState.toString()})(state);`);

    await page.waitForTimeout(500);
    await expect(page.locator('[data-tutorial-id="su-faction-select"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '保留手牌' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: '重抽一次' })).toBeVisible({ timeout: 8000 });

    await saveEvidenceScreenshot(page, testInfo, 'stuck-faction-select-mulligan-visible');
});
