/**
 * SmashUp - 幽灵 + 鬼屋链式弃牌 E2E 测试
 */

import { test, expect } from '../framework';

async function openGhostHauntedHouseScene(game: any, hand: string[]): Promise<void> {
    await game.openTestGame('smashup', {
        p0: 'ghosts,aliens',
        p1: 'robots,ninjas',
        skipFactionSelect: true,
        skipInitialization: false,
        seed: 12345,
    }, 20000);

    await game.setupScene({
        gameId: 'smashup',
        player0: {
            hand,
            deck: [],
            discard: [],
            actionsPlayed: 0,
            actionLimit: 1,
            minionsPlayed: 0,
            minionLimit: 1,
        },
        player1: {
            hand: [],
            deck: [],
            discard: [],
        },
        bases: [
            {
                defId: 'base_haunted_house_al9000',
                minions: [],
                ongoingActions: [],
            },
        ],
        currentPlayer: '0',
        phase: 'playCards',
    });
}

function getCurrentPlayer(state: any): any {
    const currentPlayerId = state.core.turnOrder[state.core.currentPlayerIndex];
    return state.core.players[currentPlayerId];
}

async function clickCurrentPlayerHandCardByDefId(game: any, page: any, defId: string): Promise<void> {
    const state = await game.getState();
    const player = getCurrentPlayer(state);
    const card = player.hand.find((entry: any) => entry.defId === defId);
    expect(card, `当前玩家手牌中未找到 ${defId}`).toBeTruthy();
    await page.click(`[data-card-uid="${card.uid}"]`);
    await page.waitForTimeout(300);
}

test.describe('SmashUp - Ghost + Haunted House 链式弃牌', () => {
    test('当第一段弃牌后只剩 1 张可弃手牌时，鬼屋第二段只应显示这 1 张最新手牌', async ({ game, page }, testInfo) => {
        await openGhostHauntedHouseScene(game, [
            'ghost_ghost',
            'ghost_seance',
            'ghost_shady_deal',
        ]);

        const initialState = await game.getState();
        expect(getCurrentPlayer(initialState).hand.map((card: any) => card.defId)).toEqual([
            'ghost_ghost',
            'ghost_seance',
            'ghost_shady_deal',
        ]);

        await game.playCard('ghost_ghost', { targetBaseIndex: 0 });
        await game.waitForInteraction('ghost_ghost');

        const firstOptions = await game.getInteractionOptions();
        expect(firstOptions.map((option: any) => option.value?.defId).filter(Boolean)).toEqual([
            'ghost_seance',
            'ghost_shady_deal',
        ]);
        await game.screenshot('ghost-first-discard-prompt', testInfo);

        await clickCurrentPlayerHandCardByDefId(game, page, 'ghost_seance');
        await game.waitForInteraction('base_haunted_house_al9000');

        const secondOptions = await game.getInteractionOptions();
        expect(secondOptions.map((option: any) => option.value?.defId).filter(Boolean)).toEqual([
            'ghost_shady_deal',
        ]);
        await game.screenshot('haunted-house-single-latest-card', testInfo);

        await clickCurrentPlayerHandCardByDefId(game, page, 'ghost_shady_deal');
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        const player0 = getCurrentPlayer(finalState);
        expect(player0.hand).toHaveLength(0);
        expect(player0.discard.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['ghost_seance', 'ghost_shady_deal']),
        );
        expect(finalState.core.bases[0].minions).toHaveLength(1);
        expect(finalState.core.bases[0].minions[0].defId).toBe('ghost_ghost');
    });

    test('当第二段仍需选择时，鬼屋交互只应显示最新剩余手牌', async ({ game, page }, testInfo) => {
        await openGhostHauntedHouseScene(game, [
            'ghost_ghost',
            'ghost_seance',
            'ghost_shady_deal',
            'ghost_ghostly_arrival',
        ]);

        await game.playCard('ghost_ghost', { targetBaseIndex: 0 });
        await game.waitForInteraction('ghost_ghost');
        await clickCurrentPlayerHandCardByDefId(game, page, 'ghost_seance');

        await game.waitForInteraction('base_haunted_house_al9000');
        const secondOptions = await game.getInteractionOptions();
        const secondDefIds = secondOptions.map((option: any) => option.value?.defId).filter(Boolean);
        expect(secondDefIds).toEqual(['ghost_shady_deal', 'ghost_ghostly_arrival']);
        expect(secondDefIds).not.toContain('ghost_seance');
        await game.screenshot('haunted-house-refreshed-second-prompt', testInfo);

        await clickCurrentPlayerHandCardByDefId(game, page, 'ghost_shady_deal');
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        const player0 = getCurrentPlayer(finalState);
        expect(player0.hand.map((card: any) => card.defId)).toEqual(['ghost_ghostly_arrival']);
        expect(player0.discard.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['ghost_seance', 'ghost_shady_deal']),
        );
        expect(finalState.core.bases[0].minions).toHaveLength(1);
        expect(finalState.core.bases[0].minions[0].defId).toBe('ghost_ghost');
    });
});
