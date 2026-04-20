/**
 * SmashUp 外星人图集索引验证（三板斧）
 * - 新框架：../framework
 * - 专用测试模式：openTestGame
 * - 状态注入：setupScene
 */

import { test, expect } from '../framework';

const ALIEN_ACTION_CARDS = [
    { uid: 'alien-action-1', defId: 'alien_probe' },
    { uid: 'alien-action-2', defId: 'alien_terraform' },
    { uid: 'alien-action-3', defId: 'alien_crop_circles' },
] as const;

test.describe('SmashUp 外星人图集索引验证', () => {
    test('Probe、Terraform、Crop Circles 在状态与手牌中都可见', async ({ page, game }, testInfo) => {
        await game.openTestGame('smashup');
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ALIEN_ACTION_CARDS.map((card) => ({
                    uid: card.uid,
                    defId: card.defId,
                    type: 'action',
                    owner: '0',
                })),
                deck: [],
                discard: [],
                factions: ['aliens', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['ninjas', 'robots'],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });

        await expect.poll(async () => {
            const player0 = await game.getPlayerState('0');
            return (player0?.hand ?? []).map((card: { defId?: string }) => card.defId ?? '');
        }, { timeout: 5000 }).toEqual(expect.arrayContaining(ALIEN_ACTION_CARDS.map((card) => card.defId)));

        for (const card of ALIEN_ACTION_CARDS) {
            await expect(page.locator(`[data-testid="su-hand-area"] [data-card-uid="${card.uid}"]`).first()).toBeVisible({
                timeout: 5000,
            });
        }

        await game.screenshot('alien-atlas-verify-hand-cards', testInfo);
    });
});
