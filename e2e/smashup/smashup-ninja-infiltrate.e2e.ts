import { test, expect } from '../framework';
import type { GameTestContext } from '../framework';

interface OngoingActionCard {
    uid: string;
    defId: string;
    ownerId?: string;
}

interface SmashUpPlayerState {
    hand: Array<{ defId: string }>;
}

interface SmashUpBaseState {
    ongoingActions: OngoingActionCard[];
}

interface SmashUpState {
    core: {
        bases: SmashUpBaseState[];
        players: Record<string, SmashUpPlayerState>;
    };
}

interface InteractionOption {
    id: string;
    value?: {
        cardUid?: string;
        defId?: string;
    };
}

const SMASHUP_NINJA_QUERY = {
    p0: 'ninjas,aliens',
    p1: 'dinosaurs,wizards',
    skipFactionSelect: true,
    skipInitialization: false,
    seed: 12345,
};

async function openInfiltrateScene(game: GameTestContext): Promise<void> {
    await game.openTestGame('smashup', SMASHUP_NINJA_QUERY, 45000);

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
            factions: ['ninjas', 'aliens'],
            minionsPlayed: 0,
            minionLimit: 1,
            actionsPlayed: 0,
            actionLimit: 1,
        },
        player1: {
            factions: ['dinosaurs', 'wizards'],
        },
        bases: [
            {
                defId: 'base_the_homeworld',
                ongoingActions: [
                    { uid: 'ongoing-1', defId: 'alien_supreme_overlord', ownerId: '1' },
                    { uid: 'ongoing-2', defId: 'dinosaur_king_rex', ownerId: '1' },
                ],
            },
        ],
        currentPlayer: '0',
        phase: 'playCards',
    });

    await game.waitForPhase('playCards');
    await game.waitForCurrentPlayer('0');
}

async function getState(game: GameTestContext): Promise<SmashUpState> {
    return await game.getState() as SmashUpState;
}

async function getBase0Ongoing(game: GameTestContext): Promise<OngoingActionCard[]> {
    const state = await getState(game);
    return state.core.bases[0]?.ongoingActions ?? [];
}

async function getInteractionOptions(game: GameTestContext): Promise<InteractionOption[]> {
    return await game.getInteractionOptions() as InteractionOption[];
}

test.describe('忍者渗透 - 战术卡选择', () => {
    test('渗透打在基地上后，应该能选择并消灭基地上的战术卡', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await openInfiltrateScene(game);

        await expect(page.locator('[data-base-index="0"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-card-uid="card-infiltrate"]')).toBeVisible({ timeout: 10000 });
        await game.expectCardInHand('ninja_infiltrate');
        await game.screenshot('01-before-play', testInfo);

        const initialState = await getState(game);
        expect(initialState.core.bases[0]?.ongoingActions).toHaveLength(2);
        expect(initialState.core.players['0']?.hand.some((card) => card.defId === 'ninja_infiltrate')).toBe(true);

        await game.playCard('ninja_infiltrate', { targetBaseIndex: 0 });
        await game.waitForInteraction('ninja_infiltrate_destroy');

        const promptTitle = page.getByText('选择要消灭的战术');
        await expect(promptTitle).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-ongoing-uid="ongoing-1"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-ongoing-uid="ongoing-2"]')).toBeVisible({ timeout: 5000 });
        await expect.poll(async () => (await getInteractionOptions(game)).length).toBe(2);
        await game.screenshot('02-select-prompt', testInfo);

        const options = await getInteractionOptions(game);
        const targetOption = options.find((option) =>
            option.value?.cardUid === 'ongoing-1'
            || option.value?.defId === 'alien_supreme_overlord',
        );

        expect(targetOption, '交互中未找到 alien_supreme_overlord 选项').toBeTruthy();
        await game.selectOption(targetOption!.id);
        await game.waitForNoInteraction();
        await expect(promptTitle).not.toBeVisible({ timeout: 5000 });
        await game.screenshot('03-after-select', testInfo);

        const base0Ongoing = await getBase0Ongoing(game);
        expect(base0Ongoing).toHaveLength(2);
        expect(base0Ongoing.some((card) => card.defId === 'ninja_infiltrate')).toBe(true);
        expect(base0Ongoing.some((card) => card.defId === 'dinosaur_king_rex')).toBe(true);
        expect(base0Ongoing.some((card) => card.defId === 'alien_supreme_overlord')).toBe(false);
    });
});
