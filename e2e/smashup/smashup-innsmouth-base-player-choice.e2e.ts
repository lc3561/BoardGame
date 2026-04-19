/**
 * 印斯茅斯基地 E2E 测试 - 玩家选择修复
 */

import { test, expect } from '../framework';

async function openScene(game: any): Promise<void> {
    await game.openTestGame('smashup');
}

async function setupInnsmouthBaseScene(game: any, config: {
    selfDiscard: string[];
    opponentDiscard: string[];
}): Promise<void> {
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            hand: ['ninja_shinobi'],
            discard: config.selfDiscard,
            deck: [],
        },
        player1: {
            hand: [],
            discard: config.opponentDiscard,
            deck: [],
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [{ defId: 'base_innsmouth_base', minions: [], ongoingActions: [] }],
    });
}

test.describe('印斯茅斯基地 - 玩家选择修复', () => {
    test('场景1：选择从自己的弃牌堆选卡', async ({ game }) => {
        await openScene(game);
        await setupInnsmouthBaseScene(game, {
            selfDiscard: ['ninja_infiltrate', 'alien_abduction'],
            opponentDiscard: [],
        });

        await game.playCard('ninja_shinobi', { targetBaseIndex: 0 });
        await game.waitForInteraction('base_innsmouth_base_choose_player');

        const playerOptions = await game.getInteractionOptions();
        expect(playerOptions.filter((option: any) => option.value?.targetPlayerId).map((option: any) => option.value.targetPlayerId)).toEqual(['0']);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.targetPlayerId === '0',
            '选择自己的弃牌堆',
        );
        await game.waitForInteraction('base_innsmouth_base_choose_card');

        const cardOptions = await game.getInteractionOptions();
        expect(cardOptions.filter((option: any) => option.value?.defId).map((option: any) => option.value.defId).sort()).toEqual([
            'alien_abduction',
            'ninja_infiltrate',
        ]);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'ninja_infiltrate',
            '选择潜行',
        );
        await game.waitForNoInteraction();

        const state = await game.getState();
        expect(state.core.players['0'].deck).toHaveLength(1);
        expect(state.core.players['0'].deck[0].defId).toBe('ninja_infiltrate');
        expect(state.core.players['0'].discard).toHaveLength(1);
    });

    test('场景2：选择从对手的弃牌堆选卡', async ({ game }) => {
        await openScene(game);
        await setupInnsmouthBaseScene(game, {
            selfDiscard: ['ninja_infiltrate'],
            opponentDiscard: ['dinosaur_king_rex', 'robot_microbot_alpha'],
        });

        await game.playCard('ninja_shinobi', { targetBaseIndex: 0 });
        await game.waitForInteraction('base_innsmouth_base_choose_player');

        const playerOptions = await game.getInteractionOptions();
        expect(playerOptions.filter((option: any) => option.value?.targetPlayerId).map((option: any) => option.value.targetPlayerId).sort()).toEqual(['0', '1']);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.targetPlayerId === '1',
            '选择对手弃牌堆',
        );
        await game.waitForInteraction('base_innsmouth_base_choose_card');

        const cardOptions = await game.getInteractionOptions();
        expect(cardOptions.filter((option: any) => option.value?.defId).map((option: any) => option.value.defId).sort()).toEqual([
            'dinosaur_king_rex',
            'robot_microbot_alpha',
        ]);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'dinosaur_king_rex',
            '选择霸王龙',
        );
        await game.waitForNoInteraction();

        const state = await game.getState();
        expect(state.core.players['1'].deck).toHaveLength(1);
        expect(state.core.players['1'].deck[0].defId).toBe('dinosaur_king_rex');
        expect(state.core.players['1'].discard).toHaveLength(1);
    });

    test('场景3：跳过选择', async ({ game }) => {
        await openScene(game);
        await setupInnsmouthBaseScene(game, {
            selfDiscard: ['ninja_infiltrate'],
            opponentDiscard: [],
        });

        await game.playCard('ninja_shinobi', { targetBaseIndex: 0 });
        await game.waitForInteraction('base_innsmouth_base_choose_player');
        await game.selectOption('skip');
        await game.waitForNoInteraction();

        const state = await game.getState();
        expect(state.core.players['0'].deck).toHaveLength(0);
        expect(state.core.players['0'].discard).toHaveLength(1);
    });
});
