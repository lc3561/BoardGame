/**
 * 大杀四方 - 盘旋机器人交互 E2E 测试
 */

import { test, expect } from '../framework';

async function openRobotScene(game: any): Promise<void> {
    await game.openTestGame('smashup', {
        p0: 'robots,pirates',
        p1: 'ninjas,dinosaurs',
        skipFactionSelect: true,
        skipInitialization: false,
    });
}

test.describe('盘旋机器人交互测试', () => {
    test('应该正确显示交互弹窗并允许选择打出牌库顶随从', async ({ game }, testInfo) => {
        await openRobotScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['robot_hoverbot'],
                deck: ['pirate_first_mate', 'pirate_swashbuckler'],
            },
            player1: { hand: [], deck: [] },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
        await game.waitForInteraction('robot_hoverbot');

        const options = await game.getInteractionOptions();
        expect(options.map((option: any) => option.id)).toEqual(expect.arrayContaining(['play', 'skip']));
        expect(options.find((option: any) => option.id === 'play')?.value?.defId).toBe('pirate_first_mate');
        await game.screenshot('hoverbot-interaction-visible', testInfo);

        await game.selectOption('play');
        const stateAfterPlay = await game.getState();
        if (stateAfterPlay.sys.interaction?.current?.data?.sourceId === 'robot_hoverbot_base') {
            await game.selectBase(0);
            await game.waitForNoInteraction();
        }

        const finalState = await game.getState();
        const base0Minions = finalState.core.bases[0].minions.filter((minion: any) => minion.controller === '0');
        expect(base0Minions.some((minion: any) => minion.defId === 'robot_hoverbot')).toBe(true);
        expect(base0Minions.some((minion: any) => minion.defId === 'pirate_first_mate')).toBe(true);
    });

    test('应该允许选择跳过', async ({ game }, testInfo) => {
        await openRobotScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['robot_hoverbot'],
                deck: ['robot_zapbot'],
            },
            player1: { hand: [], deck: [] },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
        await game.waitForInteraction('robot_hoverbot');
        await game.selectOption('skip');

        const finalState = await game.getState();
        const base0Minions = finalState.core.bases[0].minions.filter((minion: any) => minion.controller === '0');
        expect(finalState.sys.interaction?.current).toBeUndefined();
        expect(finalState.core.players['0'].deck[0]?.defId).toBe('robot_zapbot');
        expect(base0Minions).toHaveLength(1);
        expect(base0Minions[0].defId).toBe('robot_hoverbot');
        await game.screenshot('hoverbot-skip', testInfo);
    });

    test('牌库顶是行动卡时不应该创建交互', async ({ game }, testInfo) => {
        await openRobotScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['robot_hoverbot'],
                deck: ['robot_tech_center'],
            },
            player1: { hand: [], deck: [] },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const finalState = await game.getState();
        const base0Minions = finalState.core.bases[0].minions.filter((minion: any) => minion.controller === '0');
        expect(finalState.sys.interaction?.current).toBeUndefined();
        expect(base0Minions).toHaveLength(1);
        expect(base0Minions[0].defId).toBe('robot_hoverbot');
        await game.screenshot('hoverbot-action-top-no-prompt', testInfo);
    });
});
