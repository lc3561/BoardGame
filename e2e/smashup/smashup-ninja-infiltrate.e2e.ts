/**
 * E2E 测试：忍者渗透 - 选择并消灭基地上的战术卡（三板斧）
 */

import { test, expect } from '../framework';

test.describe('忍者渗透 - 战术卡选择（三板斧）', () => {
    test('渗透打在基地上后，应该能选择并消灭基地上的战术卡', async ({ page, game }, testInfo) => {
        await game.openTestGame('smashup');

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    {
                        uid: 'card-infiltrate',
                        defId: 'ninja_infiltrate',
                        type: 'action',
                        owner: '0',
                    },
                ],
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {},
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_jungle_oasis',
                    ongoingActions: [
                        {
                            uid: 'ongoing-1',
                            defId: 'alien_jammed_signal',
                            ownerId: '1',
                        },
                        {
                            uid: 'ongoing-2',
                            defId: 'dino_wildlife_preserve',
                            ownerId: '1',
                        },
                    ],
                },
            ],
        });

        await expect(page.locator('[data-card-uid="card-infiltrate"]')).toBeVisible({ timeout: 10000 });

        await game.screenshot('01-before-play', testInfo);

        const initialState = await game.getState();
        expect(initialState?.core?.bases?.[0]?.ongoingActions?.length ?? 0).toBe(2);
        expect(initialState?.core?.players?.['0']?.hand?.some((card: any) => card.defId === 'ninja_infiltrate')).toBe(true);

        await page.locator('[data-card-uid="card-infiltrate"]').click();
        await page.waitForTimeout(300);
        await game.selectBase(0);

        await game.waitForInteraction('ninja_infiltrate_destroy', 5000);
        const destroyPrompt = page.getByText(/选择要消灭的(战术|牌)/);
        await expect(destroyPrompt).toBeVisible({ timeout: 5000 });
        await game.screenshot('02-select-prompt', testInfo);

        const options = await game.getInteractionOptions();
        const targetOption = options.find((entry: any) =>
            entry?.value?.cardUid === 'ongoing-1'
            || entry?.value?.defId === 'alien_jammed_signal'
            || String(entry?.id ?? '').includes('alien_jammed_signal'),
        );
        expect(targetOption, '交互中未找到 ongoing-1 / alien_jammed_signal 选项').toBeTruthy();
        await game.selectOption(targetOption.id);
        await game.waitForNoInteraction(5000);

        await game.screenshot('03-after-select', testInfo);

        const finalState = await game.getState();
        const base0Ongoing = finalState?.core?.bases?.[0]?.ongoingActions ?? [];

        expect(base0Ongoing.length).toBe(2);
        expect(base0Ongoing.some((card: any) => card.defId === 'ninja_infiltrate')).toBe(true);
        expect(base0Ongoing.some((card: any) => card.defId === 'dino_wildlife_preserve')).toBe(true);
        expect(base0Ongoing.some((card: any) => card.defId === 'alien_jammed_signal')).toBe(false);
    });
});
