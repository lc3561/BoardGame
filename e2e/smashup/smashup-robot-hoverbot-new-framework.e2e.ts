/**
 * 盘旋机器人新框架回归（三板斧）
 */
import { test, expect } from '../framework';

test.describe('盘旋机器人新框架回归（三板斧）', () => {
  test('盘旋机器人应触发交互并给出可选项', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['robot_hoverbot'],
        deck: ['robot_microbot_alpha'],
        discard: [],
        factions: ['robots', 'aliens'],
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['ninjas', 'pirates'],
      },
      bases: [{ defId: 'base_the_mothership' }, { defId: 'base_jungle_oasis' }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
    await game.waitForInteraction('robot_hoverbot');

    const options = await game.getInteractionOptions();
    expect(options.length).toBeGreaterThan(0);

    const state = await game.getState();
    expect(state?.sys?.interaction?.current?.data?.sourceId).toBe('robot_hoverbot');

    await game.screenshot('hoverbot-new-framework-interaction-visible', testInfo);
  });
});
