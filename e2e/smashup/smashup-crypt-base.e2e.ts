import { test, expect } from '../framework';

async function openScene(game: any): Promise<void> {
    await game.openTestGame('smashup');
}

test.describe('SmashUp - 地窖基地能力', () => {
    test('行动卡消灭对手随从时触发地窖能力', async ({ game }) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [],
                deck: [],
                discard: [],
            },
            player1: {
                hand: ['vampire_big_gulp'],
                deck: [],
                discard: [],
            },
            currentPlayer: '1',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_crypt',
                    minions: [
                        { uid: 'red-minion-1', defId: 'ninja_shinobi', owner: '0', controller: '0', baseIndex: 0 },
                        { uid: 'blue-minion-1', defId: 'robot_microbot', owner: '1', controller: '1', baseIndex: 0 },
                    ],
                },
            ],
        });

        await game.playCard('vampire_big_gulp');
        await game.waitForInteraction('vampire_big_gulp');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'red-minion-1',
            '选择被消灭的忍者',
        );
        await game.waitForInteraction('base_crypt');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'blue-minion-1',
            '选择获得指示物的己方随从',
        );
        await game.waitForNoInteraction();

        const state = await game.getState();
        const target = state.core.bases[0].minions.find((minion: any) => minion.uid == 'blue-minion-1');
        expect(target?.powerCounters).toBe(1);
    });

    test('渴血鬼消灭自己随从时触发地窖能力', async ({ game }) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['vampire_heavy_drinker'],
                deck: [],
                discard: [],
            },
            player1: { hand: [], deck: [], discard: [] },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_crypt',
                    minions: [
                        { uid: 'fodder-minion', defId: 'pirate_first_mate', owner: '0', controller: '0', baseIndex: 0 },
                    ],
                },
            ],
        });

        await game.playCard('vampire_heavy_drinker', { targetBaseIndex: 0 });
        await game.waitForInteraction('vampire_heavy_drinker');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'fodder-minion',
            '选择被渴血鬼消灭的己方随从',
        );
        await game.waitForInteraction('base_crypt');

        const stateAfterPlay = await game.getState();
        const heavyDrinkerUid = stateAfterPlay.core.bases[0].minions.find((minion: any) => minion.defId === 'vampire_heavy_drinker')?.uid;
        expect(heavyDrinkerUid).toBeTruthy();

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === heavyDrinkerUid,
            '选择渴血鬼获得地窖指示物',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        const heavyDrinker = finalState.core.bases[0].minions.find((minion: any) => minion.uid === heavyDrinkerUid);
        expect(heavyDrinker?.powerCounters).toBe(2);
    });

    test('消灭者在地窖没有随从时不触发', async ({ game }) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: { hand: [], deck: [], discard: [] },
            player1: { hand: ['vampire_big_gulp'], deck: [], discard: [] },
            currentPlayer: '1',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_crypt',
                    minions: [
                        { uid: 'red-minion-1', defId: 'ninja_shinobi', owner: '0', controller: '0', baseIndex: 0 },
                    ],
                },
                {
                    defId: 'base_the_factory',
                    minions: [
                        { uid: 'blue-outside-crypt', defId: 'robot_microbot', owner: '1', controller: '1', baseIndex: 1 },
                    ],
                },
            ],
        });

        await game.playCard('vampire_big_gulp');
        await game.waitForInteraction('vampire_big_gulp');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'red-minion-1',
            '选择被消灭的忍者',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.sys.interaction?.current).toBeUndefined();
        expect(finalState.core.bases[1].minions.find((minion: any) => minion.uid === 'blue-outside-crypt')?.powerCounters ?? 0).toBe(0);
    });
});
