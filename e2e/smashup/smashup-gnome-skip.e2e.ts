/**
 * SmashUp - Gnome Skip Option
 */

import { test, expect } from '../framework';

async function openScene(game: any): Promise<void> {
    await game.openTestGame('smashup');
}

async function setupGnomeScene(game: any): Promise<void> {
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            hand: ['trickster_gnome'],
        },
        player1: {
            hand: [],
        },
        currentPlayer: '0',
        phase: 'playCards',
        bases: [
            {
                defId: 'base_the_homeworld',
                minions: [
                    { uid: 'p0-minion-1', defId: 'trickster_gnome', owner: '0', controller: '0', baseIndex: 0 },
                    { uid: 'p1-minion-1', defId: 'robot_microbot', owner: '1', controller: '1', baseIndex: 0 },
                ],
            },
        ],
    });
}

test.describe('SmashUp - Gnome Skip Option', () => {
    test('should allow skipping Gnome ability', async ({ game }) => {
        await openScene(game);
        await setupGnomeScene(game);

        await game.playCard('trickster_gnome', { targetBaseIndex: 0 });
        await game.waitForInteraction('trickster_gnome');

        const options = await game.getInteractionOptions();
        expect(options.some((option: any) => option.id === 'skip')).toBe(true);

        const minionsBeforeSkip = (await game.getState()).core.bases[0].minions.length;
        await game.selectOption('skip');
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.bases[0].minions.length).toBe(minionsBeforeSkip);
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.uid === 'p1-minion-1')).toBe(true);
    });

    test('should allow destroying minion when not skipping', async ({ game }) => {
        await openScene(game);
        await setupGnomeScene(game);

        await game.playCard('trickster_gnome', { targetBaseIndex: 0 });
        await game.waitForInteraction('trickster_gnome');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'p1-minion-1',
            '选择敌方微型机器人',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.uid === 'p1-minion-1')).toBe(false);
    });
});
