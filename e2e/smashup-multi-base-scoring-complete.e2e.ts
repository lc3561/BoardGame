import type { Page } from '@playwright/test';
import { test, expect } from './framework';

type InteractionOption = {
    id: string;
    label?: string;
    value?: Record<string, unknown>;
};

async function waitForInteractionSource(page: Page, sourceId: string, timeout = 15000): Promise<void> {
    await page.waitForFunction(
        (expectedSourceId) => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return state?.sys?.interaction?.current?.data?.sourceId === expectedSourceId;
        },
        sourceId,
        { timeout, polling: 100 },
    );
}

async function clickFinishTurn(page: Page): Promise<void> {
    const finishButton = page.getByRole('button', { name: /^(结束回合|Finish Turn|FINISH|End Turn)$/i }).first();
    await expect(finishButton).toBeVisible({ timeout: 15000 });
    await finishButton.click({ force: true, timeout: 5000 });
}

async function chooseInteractionOption(
    page: Page,
    predicate: (option: InteractionOption) => boolean,
    message: string,
): Promise<InteractionOption> {
    const interaction = await page.evaluate(() => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
        const current = state?.sys?.interaction?.current;
        return {
            sourceId: current?.data?.sourceId ?? null,
            options: current?.data?.options ?? [],
        };
    });

    const option = (interaction.options as InteractionOption[]).find(predicate);
    expect(option, `${message}: ${JSON.stringify(interaction)}`).toBeTruthy();

    await page.evaluate((optionId) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const state = harness?.state?.get?.();
        const interaction = state?.sys?.interaction?.current;
        if (!interaction) {
            throw new Error(`当前没有交互，无法选择 ${optionId}`);
        }
        harness.command.dispatch({
            type: 'SYS_INTERACTION_RESPOND',
            playerId: interaction.playerId,
            payload: { optionId },
        });
    }, option!.id);
    await page.waitForTimeout(300);

    return option!;
}

test.describe('SmashUp 多基地计分完整流程', () => {
    test('3 个基地依次计分，afterScoring 不会打断后续基地结算', async ({ page, game }, testInfo) => {
        test.setTimeout(120000);

        await game.openTestGame('smashup', { skipInitialization: true }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                factions: ['pirates', 'ninjas'],
                hand: [],
                deck: [],
                discard: [],
                vp: 0,
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                factions: ['robots', 'aliens'],
                hand: [],
                deck: [],
                discard: [],
                vp: 0,
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                {
                    defId: 'base_the_jungle',
                    minions: [
                        { uid: 'jungle-p0', defId: 'pirate_buccaneer', owner: '0', controller: '0', basePower: 7 },
                        { uid: 'jungle-p1', defId: 'alien_invader', owner: '1', controller: '1', basePower: 6 },
                    ],
                },
                {
                    defId: 'base_ninja_dojo',
                    minions: [
                        { uid: 'dojo-p0', defId: 'ninja_master', owner: '0', controller: '0', basePower: 10 },
                        { uid: 'dojo-p1', defId: 'robot_heavy_duty_bot', owner: '1', controller: '1', basePower: 9 },
                    ],
                },
                {
                    defId: 'base_pirate_cove',
                    minions: [
                        { uid: 'cove-p0', defId: 'dinosaur_king_rex', owner: '0', controller: '0', basePower: 11 },
                        { uid: 'cove-p1', defId: 'wizard_apprentice', owner: '1', controller: '1', basePower: 10 },
                    ],
                },
            ],
            currentPlayer: '0',
            phase: 'playCards',
            extra: {
                core: {
                    turnNumber: 7,
                    baseDeck: ['base_tar_pits', 'base_central_brain', 'base_rhodes_plaza'],
                },
            },
        });

        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return state?.sys?.phase === 'playCards'
                    && state?.core?.bases?.length === 3
                    && state?.core?.bases?.every((base: any) => Array.isArray(base.minions) && base.minions.length === 2);
            },
            { timeout: 15000 },
        );

        await game.screenshot('01-scene-ready', testInfo);

        await clickFinishTurn(page);
        await waitForInteractionSource(page, 'multi_base_scoring', 20000);
        await game.screenshot('02-first-base-choice', testInfo);

        await chooseInteractionOption(
            page,
            (option) => option.value?.baseDefId === 'base_the_jungle' || option.value?.baseIndex === 0,
            '未找到丛林的计分选项',
        );

        await waitForInteractionSource(page, 'multi_base_scoring', 20000);
        const secondChoiceState = await page.evaluate(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return state?.sys?.interaction?.current?.data?.options ?? [];
        });
        expect(secondChoiceState.some((option: any) => option.value?.baseDefId === 'base_the_jungle')).toBe(false);
        await game.screenshot('03-second-base-choice', testInfo);

        await chooseInteractionOption(
            page,
            (option) => option.value?.baseDefId === 'base_pirate_cove' || option.value?.baseIndex === 2,
            '未找到海盗湾的计分选项',
        );

        await waitForInteractionSource(page, 'base_pirate_cove', 20000);
        await game.screenshot('04-pirate-cove-after-scoring', testInfo);
        await chooseInteractionOption(
            page,
            (option) => option.id === 'skip' || option.value?.skip === true,
            '海盗湾交互缺少跳过选项',
        );

        await waitForInteractionSource(page, 'smashup_reaction_choose', 20000);
        const reactionChooserOptions = await page.evaluate(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return state?.sys?.interaction?.current?.data?.options ?? [];
        });
        const dojoTriggerOption = reactionChooserOptions.find(
            (option: any) =>
                option.value?.kind === 'trigger'
                && String(option.value?.triggerId ?? '').includes('base_ninja_dojo'),
        );
        expect(dojoTriggerOption).toBeTruthy();
        await game.screenshot('05-dojo-reaction-chooser', testInfo);

        await chooseInteractionOption(
            page,
            (option) =>
                option.value?.kind === 'trigger'
                && String(option.value?.triggerId ?? '').includes('base_ninja_dojo'),
            '未找到忍者道场 afterScoring 触发选项',
        );

        await waitForInteractionSource(page, 'base_ninja_dojo', 20000);
        await game.screenshot('06-ninja-dojo-interaction', testInfo);
        await chooseInteractionOption(
            page,
            (option) => option.id === 'skip' || option.value?.skip === true,
            '忍者道场交互缺少不消灭选项',
        );

        await game.waitForNoInteraction(20000);
        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return !state?.sys?.responseWindow?.current
                    && state?.sys?.phase === 'playCards'
                    && state?.core?.currentPlayerIndex === 1;
            },
            { timeout: 20000, polling: 100 },
        );

        const finalState = await game.getState();
        const baseIds = finalState.core.bases.map((base: any) => base.defId);
        const remainingUids = finalState.core.bases.flatMap((base: any) => base.minions.map((minion: any) => minion.uid));

        expect(baseIds).not.toContain('base_the_jungle');
        expect(baseIds).not.toContain('base_ninja_dojo');
        expect(baseIds).not.toContain('base_pirate_cove');
        expect(remainingUids).not.toContain('jungle-p0');
        expect(remainingUids).not.toContain('jungle-p1');
        expect(remainingUids).not.toContain('dojo-p0');
        expect(remainingUids).not.toContain('dojo-p1');
        expect(remainingUids).not.toContain('cove-p0');
        expect(remainingUids).not.toContain('cove-p1');
        expect(finalState.core.players['0'].vp).toBe(7);
        expect(finalState.core.players['1'].vp).toBe(4);
        expect(finalState.core.currentPlayerIndex).toBe(1);

        await game.screenshot('07-final-state', testInfo);
    });
});
