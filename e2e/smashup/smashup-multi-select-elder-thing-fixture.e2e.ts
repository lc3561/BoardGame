/**
 * 大杀四方 - 远古之物多选交互 E2E 测试
 */

import { test, expect } from '../framework';

async function openScene(game: any): Promise<void> {
    await game.openTestGame('smashup');
}

test.describe('远古之物 - 消灭两个己方随从（多选）', () => {
    test('选择消灭时应显示两段单选交互，依次选中 2 个随从', async ({ game }) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['elder_thing_elder_thing'],
                deck: [],
                discard: [],
                factions: ['elder_things', 'aliens'],
            },
            player1: { hand: [], deck: [], discard: [] },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        { uid: 'm1', defId: 'alien_invader', owner: '0', controller: '0', baseIndex: 0 },
                        { uid: 'm2', defId: 'alien_supreme_overlord', owner: '0', controller: '0', baseIndex: 0 },
                        { uid: 'm3', defId: 'alien_scout', owner: '0', controller: '0', baseIndex: 0 },
                    ],
                },
            ],
        });

        await game.playCard('elder_thing_elder_thing', { targetBaseIndex: 0 });
        await game.waitForInteraction('elder_thing_elder_thing_choice');
        await game.selectOption('destroy');

        await game.waitForInteraction('elder_thing_elder_thing_destroy_first');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'm1',
            '选择第一个被消灭的随从 m1',
        );

        await game.waitForInteraction('elder_thing_elder_thing_destroy_second');
        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'm2',
            '选择第二个被消灭的随从 m2',
        );
        await game.waitForNoInteraction();

        const state = await game.getState();
        const remainingMinions = state.core.bases[0].minions.map((minion: any) => minion.uid);
        expect(remainingMinions).toEqual(expect.arrayContaining(['m3']));
        expect(remainingMinions).not.toContain('m1');
        expect(remainingMinions).not.toContain('m2');
        expect(state.core.bases[0].minions.some((minion: any) => minion.defId === 'elder_thing_elder_thing')).toBe(true);
    });

    test('恰好2个随从时选择消灭应直接执行，无需二段选择', async ({ game }) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['elder_thing_elder_thing'],
                deck: [],
                discard: [],
                factions: ['elder_things', 'aliens'],
            },
            player1: { hand: [], deck: [], discard: [] },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        { uid: 'm1', defId: 'alien_invader', owner: '0', controller: '0', baseIndex: 0 },
                        { uid: 'm2', defId: 'alien_scout', owner: '0', controller: '0', baseIndex: 0 },
                    ],
                },
            ],
        });

        await game.playCard('elder_thing_elder_thing', { targetBaseIndex: 0 });
        await game.waitForInteraction('elder_thing_elder_thing_choice');
        await game.selectOption('destroy');
        await game.waitForNoInteraction();

        const state = await game.getState();
        const remainingMinions = state.core.bases[0].minions.map((minion: any) => minion.uid);
        expect(remainingMinions).toHaveLength(1);
        expect(remainingMinions[0]).not.toBe('m1');
        expect(remainingMinions[0]).not.toBe('m2');
        expect(state.core.bases[0].minions[0].defId).toBe('elder_thing_elder_thing');
    });
});
