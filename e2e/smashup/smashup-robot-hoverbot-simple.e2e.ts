/**
 * 盘旋机器人简化测试（三板斧）
 */
import { test, expect } from '../framework';

test.describe('盘旋机器人交互（三板斧）', () => {
  test('打出盘旋机器人后应出现可选交互', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: {
        hand: ['robot_hoverbot'],
        deck: ['robot_zapbot', 'robot_microbot_alpha'],
        discard: [],
        factions: ['robots', 'aliens'],
        actionsPlayed: 0,
        actionLimit: 1,
        minionsPlayed: 0,
        minionLimit: 1,
      },
      player1: {
        hand: [],
        deck: [],
        discard: [],
        factions: ['ninjas', 'pirates'],
      },
      bases: [{ defId: 'base_the_mothership' }],
      currentPlayer: '0',
      phase: 'playCards',
    });

    await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
    await game.waitForInteraction('robot_hoverbot');

    const options = await game.getInteractionOptions();
    expect(options.length).toBeGreaterThanOrEqual(1);

    const labels = options.map((entry: { label?: string }) => String(entry.label ?? ''));
    expect(labels.some((label) => /打出|play/i.test(label))).toBeTruthy();

    await game.screenshot('hoverbot-simple-options-visible', testInfo);
  });
});
