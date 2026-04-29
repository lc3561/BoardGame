/**
 * 大杀四方 - 印斯茅斯“本地人”展示测试（简化版）
 */

import { test, expect } from '../framework';

async function openScene(game: any): Promise<void> {
    await game.openTestGame('smashup');
}

test.describe('印斯茅斯“本地人”展示功能（简化版）', () => {
    test('打出“本地人”后应该显示展示 UI', async ({ page, game }, testInfo) => {
        await openScene(game);
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['innsmouth_the_locals'],
                deck: ['innsmouth_the_locals', 'aliens_scout', 'innsmouth_the_locals'],
                factions: ['innsmouth', 'aliens'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [{ defId: 'base_the_homeworld', minions: [], ongoingActions: [] }],
        });

        await game.playCard('innsmouth_the_locals', { targetBaseIndex: 0 });
        await expect(page.getByTestId('reveal-overlay')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="reveal-overlay"] [data-card-preview]')).toHaveCount(3);
        await game.screenshot('innsmouth-locals-reveal', testInfo);

        await page.getByTestId('reveal-overlay').click({ force: true });
        await expect(page.getByTestId('reveal-overlay')).toBeHidden({ timeout: 3000 });

        const state = await game.getState();
        const handLocals = state.core.players['0'].hand.filter((card: any) => card.defId === 'innsmouth_the_locals').length;
        const baseLocals = state.core.bases[0].minions.filter((minion: any) => minion.defId === 'innsmouth_the_locals' && minion.controller === '0').length;
        expect(handLocals + baseLocals).toBe(3);
    });
});
