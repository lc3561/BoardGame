/**
 * SmashUp 响应窗口 UI 基础验证（三板斧）
 */
import { test, expect } from '../framework';

test.describe('SmashUp 响应窗口 UI（三板斧）', () => {
  test('注入 responseWindow 后状态应可见且可被读取', async ({ game }, testInfo) => {
    await game.openTestGame('smashup');
    await game.setupScene({
      gameId: 'smashup',
      player0: { hand: [], deck: [], discard: [], factions: ['aliens', 'robots'] },
      player1: { hand: [], deck: [], discard: [], factions: ['ninjas', 'pirates'] },
      currentPlayer: '0',
      phase: 'playCards',
      responseWindow: {
        windowType: 'afterPlayAction',
        sourceId: 'test_response_window',
        responderQueue: ['0', '1'],
        currentResponderIndex: 0,
      },
    });

    const state = await game.getState();
    expect(state?.sys?.responseWindow?.current?.windowType).toBe('afterPlayAction');
    expect(state?.sys?.responseWindow?.current?.sourceId).toBe('test_response_window');

    await game.screenshot('response-window-ui-state-visible', testInfo);
  });
});
