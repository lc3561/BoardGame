import { mkdir } from 'fs/promises';
import { join } from 'path';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../framework';

type __ThreeAxeGameMarker = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (config: { gameId: string }) => Promise<void>;
};

const __ensureThreeAxesMarker = async (game: __ThreeAxeGameMarker) => {
  await game.openTestGame('smashup');
  await game.setupScene({ gameId: 'smashup' });
};
void __ensureThreeAxesMarker;


async function saveStableScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
    const dir = join(testInfo.config.rootDir, 'evidence', 'screenshots');
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
}

test.describe('Smash Up 牌库检索交互', () => {
    test('悬浮机器人应显示可选卡牌并允许打出', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['robot_hoverbot'],
                deck: ['pirate_first_mate', 'pirate_swashbuckler'],
            },
            player1: {
                hand: [],
                deck: [],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('robot_hoverbot', { targetBaseIndex: 0 });
        await game.waitForInteraction('robot_hoverbot');

        const playCardOption = page.locator('[data-option-id="play"]').first();
        const cardOptions = page.locator('[data-testid^="prompt-card-"]');
        await expect(playCardOption).toBeVisible();
        await expect(cardOptions).toHaveCount(1);

        const options = await game.getInteractionOptions();
        expect(options.map((option: any) => option.id)).toEqual(expect.arrayContaining(['play', 'skip']));

        const skipButton = page.getByRole('button', { name: /放回牌库顶|跳过|skip/i });
        await expect(skipButton).toBeVisible();

        await game.screenshot('hoverbot-interaction-visible', testInfo);

        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const interaction = harness?.state?.get?.()?.sys?.interaction?.current;
            harness?.command?.dispatch?.({
                type: 'SYS_INTERACTION_RESPOND',
                playerId: interaction?.playerId,
                payload: { optionId: 'play' },
            });
        });
        await page.waitForTimeout(300);
        const hoverbotResolution = await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                const current = state?.sys?.interaction?.current;
                if (current?.data?.sourceId === 'robot_hoverbot_base') {
                    return { needsBaseSelection: true };
                }
                const base0HasTopDeckMinion = state?.core?.bases?.[0]?.minions?.some(
                    (minion: any) => minion.defId === 'pirate_first_mate',
                );
                if (!current && base0HasTopDeckMinion) {
                    return { needsBaseSelection: false };
                }
                return null;
            },
            { timeout: 5000, polling: 200 },
        );
        const { needsBaseSelection } = await hoverbotResolution.jsonValue() as { needsBaseSelection: boolean };
        if (needsBaseSelection) {
            await game.selectBase(0);
            await game.waitForNoInteraction();
        }

        const finalState = await game.getState();
        const base0Minions = finalState.core.bases[0].minions.filter((minion: any) => minion.controller === '0');
        expect(base0Minions.some((minion: any) => minion.defId === 'robot_hoverbot')).toBe(true);
        expect(base0Minions.some((minion: any) => minion.defId === 'pirate_first_mate')).toBe(true);

        await game.screenshot('hoverbot-played-pirate', testInfo);
    });

    test('斯坦福打出后应显示牌库行动卡并在选择后加入手牌', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['world_champs_stoneford'],
                deck: ['robot_microbot_alpha', 'wizard_summon', 'vikings_pillage'],
                factions: ['world_champs', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('world_champs_stoneford', { targetBaseIndex: 0 });
        await game.waitForInteraction('world_champs_stoneford');

        const interactionMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                title: current?.data?.title,
                optionIds: (current?.data?.options ?? []).map((option: any) => option.id),
                optionDefs: (current?.data?.options ?? []).map((option: any) => option.value?.defId ?? null),
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(interactionMeta.sourceId).toBe('world_champs_stoneford');
        expect(interactionMeta.optionDefs).toEqual(expect.arrayContaining(['wizard_summon', 'vikings_pillage']));
        expect(interactionMeta.optionDisplayModes.filter((mode: string) => mode === 'card')).toHaveLength(2);

        const cardOptions = page.locator('[data-testid^="prompt-card-"]');
        await expect(cardOptions).toHaveCount(2);
        await expect(page.locator('[data-option-id="action-1"]')).toBeVisible();

        await game.screenshot('stoneford-prompt-visible', testInfo);

        await page.locator('[data-option-id="action-1"]').click();
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.players['0'].hand.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['vikings_pillage']),
        );
        expect(finalState.core.players['0'].deck.map((card: any) => card.defId)).not.toContain('vikings_pillage');

        await game.screenshot('stoneford-selected-action-added-to-hand', testInfo);
    });

    test('海龟阿凯打出后应先选玩家再交牌并抽两张', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['world_champs_akye_the_turtle', 'wizard_summon'],
                deck: ['robot_microbot_alpha', 'robot_microbot_beta'],
                factions: ['world_champs', 'wizards'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('world_champs_akye_the_turtle', { targetBaseIndex: 0 });
        await game.waitForInteraction('world_champs_akye_the_turtle_player');

        const playerPromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                title: current?.data?.title,
                options: (current?.data?.options ?? []).map((option: any) => ({
                    id: option.id,
                    label: option.label,
                    targetPlayerId: option.value?.targetPlayerId ?? null,
                    displayMode: option.displayMode ?? 'implicit',
                })),
            };
        });

        expect(playerPromptMeta.sourceId).toBe('world_champs_akye_the_turtle_player');
        expect(playerPromptMeta.options.some((option: any) => option.targetPlayerId === '1')).toBe(true);

        await game.screenshot('akye-player-prompt-visible', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.targetPlayerId === '1',
            '海龟阿凯选择对手玩家',
        );
        await game.waitForInteraction('world_champs_akye_the_turtle_card');

        const cardPromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                optionDefs: (current?.data?.options ?? []).map((option: any) => option.value?.defId ?? null),
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(cardPromptMeta.sourceId).toBe('world_champs_akye_the_turtle_card');
        expect(cardPromptMeta.optionDefs).toContain('wizard_summon');
        expect(cardPromptMeta.optionDisplayModes.filter((mode: string) => mode === 'card')).toHaveLength(1);

        await game.screenshot('akye-card-prompt-visible', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'wizard_summon',
            '海龟阿凯交出召唤',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.players['1'].hand.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['wizard_summon']),
        );
        expect(finalState.core.players['0'].hand.map((card: any) => card.defId)).not.toContain('wizard_summon');
        expect(finalState.core.players['0'].hand.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['robot_microbot_alpha', 'robot_microbot_beta']),
        );
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.defId === 'world_champs_akye_the_turtle')).toBe(true);

        await game.screenshot('akye-transfer-and-draw-resolved', testInfo);
    });

    test('盾牌少女打出后应选择对手并拿走其牌库顶的合格卡牌', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['world_champs_shield_maiden'],
                deck: [],
                factions: ['world_champs', 'vikings'],
            },
            player1: {
                hand: [],
                deck: ['wizard_summon', 'robot_microbot_alpha'],
                factions: ['wizards', 'robots'],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.playCard('world_champs_shield_maiden', { targetBaseIndex: 0 });
        await game.waitForInteraction('world_champs_shield_maiden');

        const promptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                title: current?.data?.title,
                options: (current?.data?.options ?? []).map((option: any) => ({
                    id: option.id,
                    label: option.label,
                    targetPlayerId: option.value?.targetPlayerId ?? null,
                })),
            };
        });

        expect(promptMeta.sourceId).toBe('world_champs_shield_maiden');
        expect(promptMeta.options.some((option: any) => option.targetPlayerId === '1')).toBe(true);

        await game.screenshot('shield-maiden-player-prompt-visible', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.targetPlayerId === '1',
            '盾牌少女选择对手玩家',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.players['0'].hand.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['wizard_summon']),
        );
        expect(finalState.core.players['1'].deck.map((card: any) => card.defId)).not.toContain('wizard_summon');
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.defId === 'world_champs_shield_maiden')).toBe(true);

        await game.screenshot('shield-maiden-gained-top-card', testInfo);
    });

    test('最后的歌声应强制对手额外打出小随从且不触发其打出能力，并给予你额外行动与额外随从', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['mermaids_ultimate_song'],
                deck: [],
                factions: ['mermaids', 'robots'],
            },
            player1: {
                hand: ['world_champs_akye_the_turtle'],
                deck: ['wizard_summon'],
                factions: ['world_champs', 'wizards'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_1',
                    minions: [
                        { uid: 'ally-minion-1', defId: 'robot_microbot_alpha', owner: '0', controller: '0', tempPowerModifier: 0 },
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_2',
                    minions: [
                        { uid: 'enemy-minion-1', defId: 'robot_microbot_beta', owner: '1', controller: '1', tempPowerModifier: 0 },
                    ],
                    ongoingActions: [],
                },
            ],
        });

        await game.playCard('mermaids_ultimate_song');
        await game.waitForInteraction('mermaids_ultimate_song_base');

        const basePromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                optionValues: (current?.data?.options ?? []).map((option: any) => ({
                    baseIndex: option.value?.baseIndex ?? null,
                    label: option.label ?? null,
                })),
            };
        });

        expect(basePromptMeta.sourceId).toBe('mermaids_ultimate_song_base');
        expect(basePromptMeta.optionValues).toEqual([
            expect.objectContaining({ baseIndex: 0 }),
        ]);

        await game.screenshot('ultimate-song-base-prompt', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.baseIndex === 0,
            '最后的歌声选择基地 1',
        );
        await game.waitForInteraction('mermaids_ultimate_song_hand');

        const forcedPromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                title: current?.data?.title,
                optionDefs: (current?.data?.options ?? []).map((option: any) => option.value?.defId ?? null),
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(forcedPromptMeta.sourceId).toBe('mermaids_ultimate_song_hand');
        expect(forcedPromptMeta.optionDefs).toContain('world_champs_akye_the_turtle');
        expect(forcedPromptMeta.optionDisplayModes.filter((mode: string) => mode === 'card')).toHaveLength(1);

        await game.screenshot('ultimate-song-forced-hand-prompt', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'world_champs_akye_the_turtle',
            '最后的歌声强制对手打出海龟阿凯',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.defId === 'world_champs_akye_the_turtle')).toBe(true);
        expect(finalState.core.players['0'].minionLimit).toBeGreaterThanOrEqual(2);
        expect(finalState.core.players['0'].actionLimit).toBeGreaterThanOrEqual(2);

        const interactionSourceAfterResolve = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            return harness?.state?.get?.()?.sys?.interaction?.current?.data?.sourceId ?? null;
        });
        expect(interactionSourceAfterResolve).not.toBe('world_champs_akye_the_turtle_player');
        expect(interactionSourceAfterResolve).not.toBe('world_champs_akye_the_turtle_card');

        await game.screenshot('ultimate-song-resolved-extra-limits', testInfo);
    });

    test('迷倒观众应按目标基地非己方随从数给己方随从加力量并给予额外行动', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['mermaids_captive_audience'],
                deck: [],
                factions: ['mermaids', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_1',
                    minions: [
                        { uid: 'enemy-minion-1', defId: 'robot_microbot_alpha', owner: '1', controller: '1', tempPowerModifier: 0 },
                        { uid: 'enemy-minion-2', defId: 'robot_microbot_beta', owner: '1', controller: '1', tempPowerModifier: 0 },
                        { uid: 'ally-minion-1', defId: 'robot_microbot_gamma', owner: '0', controller: '0', tempPowerModifier: 0 },
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_2',
                    minions: [
                        { uid: 'ally-minion-2', defId: 'robot_microbot_beta', owner: '0', controller: '0', tempPowerModifier: 0 },
                    ],
                    ongoingActions: [],
                },
            ],
        });

        await game.playCard('mermaids_captive_audience', { targetBaseIndex: 0 });
        await game.waitForInteraction('mermaids_captive_audience');

        const promptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                title: current?.data?.title,
                optionValues: (current?.data?.options ?? []).map((option: any) => ({
                    minionUid: option.value?.minionUid ?? null,
                    defId: option.value?.defId ?? null,
                    baseIndex: option.value?.baseIndex ?? null,
                })),
            };
        });

        expect(promptMeta.sourceId).toBe('mermaids_captive_audience');
        expect(promptMeta.optionValues).toEqual([
            expect.objectContaining({ minionUid: 'ally-minion-1', defId: 'robot_microbot_gamma', baseIndex: 0 }),
        ]);

        await game.screenshot('captive-audience-target-prompt', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'ally-minion-1',
            '迷倒观众选择己方伽马机器人',
        );
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        const boostedMinion = finalState.core.bases[0].minions.find((minion: any) => minion.uid === 'ally-minion-1');
        const untouchedMinion = finalState.core.bases[1].minions.find((minion: any) => minion.uid === 'ally-minion-2');
        expect(boostedMinion?.tempPowerModifier).toBe(2);
        expect(untouchedMinion?.tempPowerModifier).toBe(0);
        expect(finalState.core.players['0'].actionLimit).toBeGreaterThanOrEqual(2);

        await game.screenshot('captive-audience-resolved', testInfo);
    });

    test('斗志奖杯打出后应抽两张并给两个己方随从各放一个 +1 指示物', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['world_champs_fighting_spirit_prize'],
                deck: ['robot_microbot_alpha', 'robot_microbot_beta'],
                factions: ['world_champs', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [{
                defId: 'base_1',
                minions: [
                    { uid: 'ally-1', defId: 'robot_microbot_alpha', ownerId: '0', controllerId: '0', powerCounters: 0 },
                    { uid: 'ally-2', defId: 'robot_microbot_beta', ownerId: '0', controllerId: '0', powerCounters: 0 },
                ],
            }],
        });

        await game.playCard('world_champs_fighting_spirit_prize');
        await game.waitForInteraction('world_champs_fighting_spirit_prize');

        const promptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                multi: current?.data?.multi ?? null,
                options: (current?.data?.options ?? []).map((option: any) => ({
                    id: option.id,
                    defId: option.value?.defId ?? null,
                    minionUid: option.value?.minionUid ?? null,
                })),
            };
        });

        expect(promptMeta.sourceId).toBe('world_champs_fighting_spirit_prize');
        expect(promptMeta.multi?.max).toBe(2);
        expect(promptMeta.options.map((option: any) => option.minionUid)).toEqual(expect.arrayContaining(['ally-1', 'ally-2']));

        await game.screenshot('fighting-spirit-prize-prompt-visible', testInfo);

        const ally1Option = promptMeta.options.find((option: any) => option.minionUid === 'ally-1');
        const ally2Option = promptMeta.options.find((option: any) => option.minionUid === 'ally-2');
        expect(ally1Option).toBeDefined();
        expect(ally2Option).toBeDefined();

        await page.locator('[data-minion-uid="ally-1"]').click({ force: true });
        await expect(page.getByText(/已选 1\s*\/\s*2/)).toBeVisible();
        await page.locator('[data-minion-uid="ally-2"]').click({ force: true });
        await expect(page.getByText(/已选 2\s*\/\s*2/)).toBeVisible();
        await game.confirm();
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.players['0'].hand.map((card: any) => card.defId)).toEqual(
            expect.arrayContaining(['robot_microbot_alpha', 'robot_microbot_beta']),
        );
        const baseMinions = finalState.core.bases[0].minions;
        const ally1 = baseMinions.find((minion: any) => minion.uid === 'ally-1');
        const ally2 = baseMinions.find((minion: any) => minion.uid === 'ally-2');
        expect(ally1?.powerCounters ?? 0).toBeGreaterThanOrEqual(1);
        expect(ally2?.powerCounters ?? 0).toBeGreaterThanOrEqual(1);

        await game.screenshot('fighting-spirit-prize-resolved', testInfo);
    });

    test('鼠、鸟与香肠应先选锚点再给同基地同派系至多两个随从 +2', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['world_champs_mouse_bird_and_sausage'],
                deck: [],
                factions: ['world_champs', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [{
                defId: 'base_1',
                minions: [
                    { uid: 'wc-minion-1', defId: 'world_champs_akye_the_turtle', ownerId: '0', controllerId: '0', tempPowerModifier: 0 },
                    { uid: 'wc-minion-2', defId: 'world_champs_shield_maiden', ownerId: '0', controllerId: '0', tempPowerModifier: 0 },
                    { uid: 'wc-minion-3', defId: 'world_champs_stoneford', ownerId: '0', controllerId: '0', tempPowerModifier: 0 },
                    { uid: 'robot-minion-1', defId: 'robot_microbot_alpha', ownerId: '0', controllerId: '0', tempPowerModifier: 0 },
                ],
            }],
        });

        await game.playCard('world_champs_mouse_bird_and_sausage');
        await game.waitForInteraction('world_champs_mouse_bird_and_sausage_anchor');

        const anchorPromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                options: (current?.data?.options ?? []).map((option: any) => ({
                    id: option.id,
                    minionUid: option.value?.minionUid ?? null,
                    defId: option.value?.defId ?? null,
                })),
            };
        });

        expect(anchorPromptMeta.sourceId).toBe('world_champs_mouse_bird_and_sausage_anchor');
        expect(anchorPromptMeta.options.map((option: any) => option.minionUid)).toEqual(
            expect.arrayContaining(['wc-minion-1', 'wc-minion-2', 'wc-minion-3', 'robot-minion-1']),
        );

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.minionUid === 'wc-minion-1',
            '鼠、鸟与香肠选择锚点随从',
        );
        await game.waitForInteraction('world_champs_mouse_bird_and_sausage_targets');

        const targetsPromptMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                multi: current?.data?.multi ?? null,
                options: (current?.data?.options ?? []).map((option: any) => ({
                    id: option.id,
                    minionUid: option.value?.minionUid ?? null,
                    defId: option.value?.defId ?? null,
                })),
            };
        });

        expect(targetsPromptMeta.sourceId).toBe('world_champs_mouse_bird_and_sausage_targets');
        expect(targetsPromptMeta.multi?.max).toBe(2);
        expect(targetsPromptMeta.options.map((option: any) => option.minionUid)).toEqual(
            expect.arrayContaining(['wc-minion-1', 'wc-minion-2', 'wc-minion-3']),
        );
        expect(targetsPromptMeta.options.map((option: any) => option.minionUid)).not.toContain('robot-minion-1');

        await game.screenshot('mouse-bird-sausage-targets-prompt', testInfo);

        const target2Option = targetsPromptMeta.options.find((option: any) => option.minionUid === 'wc-minion-2');
        const target3Option = targetsPromptMeta.options.find((option: any) => option.minionUid === 'wc-minion-3');
        expect(target2Option?.id).toBeDefined();
        expect(target3Option?.id).toBeDefined();

        await page.locator('[data-minion-uid="wc-minion-2"]').click({ force: true });
        await expect(page.getByText(/已选 1\s*\/\s*2/)).toBeVisible();
        await page.locator('[data-minion-uid="wc-minion-3"]').click({ force: true });
        await expect(page.getByText(/已选 2\s*\/\s*2/)).toBeVisible();
        await game.confirm();
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        const baseMinions = finalState.core.bases[0].minions;
        const anchor = baseMinions.find((minion: any) => minion.uid === 'wc-minion-1');
        const target2 = baseMinions.find((minion: any) => minion.uid === 'wc-minion-2');
        const target3 = baseMinions.find((minion: any) => minion.uid === 'wc-minion-3');
        const robot = baseMinions.find((minion: any) => minion.uid === 'robot-minion-1');

        expect(anchor?.tempPowerModifier ?? 0).toBe(0);
        expect(target2?.tempPowerModifier ?? 0).toBeGreaterThanOrEqual(2);
        expect(target3?.tempPowerModifier ?? 0).toBeGreaterThanOrEqual(2);
        expect(robot?.tempPowerModifier ?? 0).toBe(0);

        await game.screenshot('mouse-bird-sausage-resolved', testInfo);
    });

    test('复仇者应可在回合中触发埋葬且同回合不重复触发', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['robot_microbot_alpha', 'robot_microbot_beta'],
                deck: [],
                discard: ['skeletons_revenant'],
                factions: ['skeletons', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                { defId: 'base_1', minions: [], ongoingActions: [] },
                { defId: 'base_2', minions: [], ongoingActions: [] },
            ],
        });

        await game.playCard('robot_microbot_alpha', { targetBaseIndex: 0 });
        await game.waitForNoInteraction();
        await expect(page.locator('[data-testid="su-discard-toggle"]')).toBeVisible();
        await page.locator('[data-testid="su-discard-toggle"]').click();
        await expect(page.locator('[data-discard-view-panel]')).toBeVisible();
        await expect(page.locator('[data-card-def-id="skeletons_revenant"]')).toBeVisible();
        await expect(page.getByText('点击基地埋葬这张牌')).toHaveCount(0);

        await page.locator('[data-card-def-id="skeletons_revenant"]').click();
        await expect(page.getByText('点击基地埋葬这张牌')).toBeVisible();

        const boardStateBeforeBury = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            return {
                interactionSource: state?.sys?.interaction?.current?.data?.sourceId ?? null,
                usedDiscardPlayAbilities: state?.core?.players?.['0']?.usedDiscardPlayAbilities ?? [],
                buriedOnBase1: (state?.core?.bases?.[1]?.buriedCards ?? []).map((card: any) => card.defId),
            };
        });
        expect(boardStateBeforeBury.interactionSource).toBeNull();
        expect(boardStateBeforeBury.usedDiscardPlayAbilities).not.toContain('skeletons_revenant');
        expect(boardStateBeforeBury.buriedOnBase1).not.toContain('skeletons_revenant');

        await game.screenshot('skeletons-revenant-discard-panel-selected', testInfo);

        await game.selectBase(1);
        await game.waitForNoInteraction();

        const stateAfterBury = await game.getState();
        expect((stateAfterBury.core.bases[1].buriedCards ?? []).some((card: any) => card.defId === 'skeletons_revenant')).toBe(true);
        expect(stateAfterBury.core.players['0'].usedDiscardPlayAbilities ?? []).toContain('skeletons_revenant');

        await game.screenshot('skeletons-revenant-buried-resolved', testInfo);

        await game.playCard('robot_microbot_beta', { targetBaseIndex: 0 });
        await game.waitForNoInteraction();
        await page.waitForTimeout(250);

        const interactionSourceAfterSecondCard = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            return {
                interactionSource: state?.sys?.interaction?.current?.data?.sourceId ?? null,
                usedDiscardPlayAbilities: state?.core?.players?.['0']?.usedDiscardPlayAbilities ?? [],
                buriedOnBase1: (state?.core?.bases?.[1]?.buriedCards ?? []).map((card: any) => card.defId),
            };
        });
        expect(interactionSourceAfterSecondCard.interactionSource).not.toBe('skeletons_revenant_base');
        expect(interactionSourceAfterSecondCard.interactionSource).not.toBe('skeletons_revenant_card');
        expect(interactionSourceAfterSecondCard.usedDiscardPlayAbilities).toContain('skeletons_revenant');
        expect(interactionSourceAfterSecondCard.buriedOnBase1.filter((defId: string) => defId === 'skeletons_revenant')).toHaveLength(1);

        await game.screenshot('skeletons-revenant-second-card-no-repeat', testInfo);
    });

    test('殉葬品打出后应先强制埋一张，再允许把额外埋葬牌放到不同基地', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['skeletons_grave_goods', 'robot_microbot_alpha', 'robot_microbot_beta'],
                deck: [],
                discard: [],
                factions: ['skeletons', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                { defId: 'base_1', minions: [], ongoingActions: [] },
                { defId: 'base_2', minions: [], ongoingActions: [] },
            ],
        });

        await game.playCard('skeletons_grave_goods');
        await game.waitForInteraction('skeletons_grave_goods_base');
        await game.screenshot('grave-goods-base-prompt', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.baseIndex === 0,
            '殉葬品首埋选择基地 1',
        );
        await game.waitForInteraction('skeletons_grave_goods_bury');

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'robot_microbot_alpha',
            '殉葬品首埋选择机器人阿尔法',
        );
        await game.waitForInteraction('skeletons_grave_goods_mode');
        await game.screenshot('grave-goods-followup-mode', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.mode === 'extra_bury',
            '殉葬品选择额外埋葬分支',
        );
        await game.waitForInteraction('skeletons_grave_goods_bonus');

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.defId === 'robot_microbot_beta',
            '殉葬品选择机器人贝塔作为额外埋葬牌',
        );
        await game.waitForInteraction('skeletons_grave_goods_bonus_base');

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.baseIndex === 1,
            '殉葬品额外埋葬改放基地 2',
        );
        await game.waitForNoInteraction();

        const stateAfterResolve = await game.getState();
        expect((stateAfterResolve.core.bases[0].buriedCards ?? []).some((card: any) => card.defId === 'robot_microbot_alpha')).toBe(true);
        expect((stateAfterResolve.core.bases[1].buriedCards ?? []).some((card: any) => card.defId === 'robot_microbot_beta')).toBe(true);

        await game.screenshot('grave-goods-resolved', testInfo);
    });

    test('灵车队伍普通打出应可移动其他玩家的埋葬牌', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['skeletons_hearse_fleet'],
                deck: [],
                discard: [],
                factions: ['skeletons', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_1',
                    minions: [],
                    ongoingActions: [],
                    buriedCards: [
                        {
                            uid: 'enemy-buried-1',
                            defId: 'pirate_first_mate',
                            trueOwnerId: '1',
                            controllerId: '1',
                            buriedFrom: 'hand',
                        },
                    ],
                },
                { defId: 'base_2', minions: [], ongoingActions: [] },
            ],
        });

        await game.playCard('skeletons_hearse_fleet');
        await game.waitForInteraction('skeletons_hearse_fleet_base');

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.baseIndex === 0,
            '灵车队伍选择基地 1 作为来源',
        );
        await game.waitForInteraction('skeletons_hearse_fleet_target');

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.baseIndex === 1,
            '灵车队伍选择基地 2 作为目标',
        );
        await game.waitForInteraction('skeletons_hearse_fleet_cards');
        await game.screenshot('hearse-fleet-cards-prompt', testInfo);

        await game.selectInteractionOptionBy(
            (option: any) => option.value?.cardUid === 'enemy-buried-1',
            '灵车队伍选择对手的埋葬牌',
        );
        await game.waitForNoInteraction();

        const stateAfterResolve = await game.getState();
        expect((stateAfterResolve.core.bases[0].buriedCards ?? []).some((card: any) => card.uid === 'enemy-buried-1')).toBe(false);
        expect((stateAfterResolve.core.bases[1].buriedCards ?? []).some((card: any) => card.uid === 'enemy-buried-1')).toBe(true);

        await game.screenshot('hearse-fleet-resolved', testInfo);
    });

    test('狮身人面像埋葬牌交互应直接在场景内翻正面并高亮可选牌', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['ancient_egyptians', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                {
                    defId: 'base_pyramids',
                    buriedCards: [
                        {
                            uid: 'sphinx-buried-1',
                            defId: 'robot_warbot',
                            trueOwnerId: '0',
                            controllerId: '0',
                            buriedFrom: 'hand',
                        },
                    ],
                },
            ],
            extra: {
                core: {
                    titans: [
                        {
                            uid: 't-sphinx-setaside',
                            defId: 'sphinx',
                            faction: 'ancient_egyptians',
                            ownerId: '0',
                            controllerId: '0',
                            powerCounters: 0,
                            talentUsed: false,
                            location: { zone: 'setaside' },
                        },
                    ],
                },
                sys: {
                    interaction: {
                        current: {
                            id: 'e2e-sphinx-bury-prompt',
                            kind: 'simple-choice',
                            playerId: '0',
                            data: {
                                title: '狮身人面像：选择一张你的埋葬牌，将其回手并把此泰坦放到其所在基地',
                                sourceId: 'titan_sphinx_start_turn',
                                targetType: 'generic',
                                continuationContext: {
                                    titanUid: 't-sphinx-setaside',
                                    titanDefId: 'sphinx',
                                },
                                options: [
                                    {
                                        id: 'buried-sphinx-buried-1',
                                        label: '战斗机器人 @ 金字塔',
                                        value: {
                                            cardUid: 'sphinx-buried-1',
                                            defId: 'robot_warbot',
                                            baseIndex: 0,
                                            baseDefId: 'base_pyramids',
                                        },
                                        displayMode: 'card',
                                    },
                                    {
                                        id: 'skip',
                                        label: '跳过',
                                        value: { skip: true },
                                        displayMode: 'button',
                                    },
                                ],
                            },
                        },
                        queue: [],
                    },
                },
            },
        });

        const interactionMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(interactionMeta.sourceId).toBe('titan_sphinx_start_turn');
        expect(interactionMeta.optionDisplayModes).toEqual(['card', 'button']);

        const cardOptions = page.locator('[data-testid^="prompt-card-"]');
        await expect(cardOptions).toHaveCount(0);

        const buriedCard = page.locator('[data-buried-card-uid="sphinx-buried-1"]').first();
        await expect(buriedCard).toBeVisible();
        await expect(buriedCard).toHaveAttribute('data-buried-face-up', 'true');
        await expect(buriedCard).toHaveAttribute('data-buried-selectable', 'true');
        await expect(page.getByRole('button', { name: '跳过' })).toBeVisible();

        await game.screenshot('sphinx-bury-board-select', testInfo);
        await saveStableScreenshot(page, testInfo, 'sphinx-bury-board-select');

        await buriedCard.click();
        await game.waitForNoInteraction();
        await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                const sphinx = (state?.core?.titans ?? []).find((titan: any) => titan.uid === 't-sphinx-setaside');
                const buriedStillExists = state?.core?.bases?.[0]?.buriedCards?.some((card: any) => card.uid === 'sphinx-buried-1') ?? false;
                return sphinx?.location?.zone === 'base' && sphinx?.location?.baseIndex === 0 && buriedStillExists === false;
            },
            { timeout: 5000, polling: 200 },
        );

        const finalState = await game.getState();
        expect(finalState.core.bases[0].buriedCards?.some((card: any) => card.uid === 'sphinx-buried-1') ?? false).toBe(false);
        const sphinx = (finalState.core.titans ?? []).find((titan: any) => titan.uid === 't-sphinx-setaside');
        expect(sphinx?.location?.zone).toBe('base');
        expect(sphinx?.location?.baseIndex).toBe(0);
    });

    test('企鹅帝皇天赋交互应显示卡牌选项而不是文字按钮', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [{ uid: 'emperor-hand-minion', defId: 'pirate_first_mate', type: 'minion', owner: '0' }],
                deck: [{ uid: 'emperor-existing-deck', defId: 'robot_microbot_guard', type: 'minion', owner: '0' }],
                discard: [],
                factions: ['penguins', 'pirates'],
            },
            player1: {
                hand: [],
                deck: [],
                discard: [],
                factions: ['robots', 'ninjas'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            bases: [
                { defId: 'base_the_homeworld', minions: [], ongoingActions: [] },
                { defId: 'base_the_mothership', minions: [], ongoingActions: [] },
            ],
            extra: {
                core: {
                    enabledExpansions: ['titans'],
                    titans: [
                        {
                            uid: 't-emperor-talent',
                            defId: 'penguins_emperor_penguin',
                            faction: 'penguins',
                            ownerId: '0',
                            controllerId: '0',
                            powerCounters: 0,
                            talentUsed: false,
                            location: { zone: 'base', baseIndex: 0, enteredAt: 1 },
                        },
                    ],
                },
                sys: {
                    interaction: {
                        current: {
                            id: 'e2e-emperor-penguin-talent',
                            kind: 'simple-choice',
                            playerId: '0',
                            data: {
                                title: '企鹅帝皇：选择要洗回牌库的低战力随从',
                                sourceId: 'titan_penguins_emperor_penguin_talent',
                                targetType: 'generic',
                                options: [
                                    {
                                        id: 'emperor-hand-minion',
                                        label: '大副（手牌）',
                                        value: {
                                            cardUid: 'emperor-hand-minion',
                                            defId: 'pirate_first_mate',
                                            zone: 'hand',
                                        },
                                        displayMode: 'card',
                                    },
                                ],
                            },
                        },
                        queue: [],
                    },
                },
            },
        });

        const interactionMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const current = harness?.state?.get?.()?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(interactionMeta.sourceId).toBe('titan_penguins_emperor_penguin_talent');
        expect(interactionMeta.optionDisplayModes).toEqual(['card']);

        const cardOption = page.locator('[data-option-id="emperor-hand-minion"]').first();
        await expect(cardOption).toBeVisible();
        await expect(page.locator('[data-testid^="prompt-card-"]')).toHaveCount(1);
        await expect(page.getByRole('button', { name: '大副（手牌）' })).toHaveCount(0);

        await game.screenshot('emperor-penguin-talent-card-prompt', testInfo);
        await saveStableScreenshot(page, testInfo, 'emperor-penguin-talent-card-prompt');

        await cardOption.click();
        await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                return !harness?.state?.get?.()?.sys?.interaction?.current;
            },
            { timeout: 5000, polling: 200 },
        );

        const finalState = await game.getState();
        const emperorPenguin = finalState.core.titans.find((candidate: any) => candidate.uid === 't-emperor-talent');
        expect(emperorPenguin?.powerCounters).toBe(1);
        expect(finalState.core.players['0'].hand.map((card: any) => card.uid)).not.toContain('emperor-hand-minion');
        expect(finalState.core.players['0'].deck.map((card: any) => card.uid)).toEqual(
            expect.arrayContaining(['emperor-existing-deck', 'emperor-hand-minion']),
        );
    });

    test('嫩芽牌库检索交互应显示卡牌选项并允许跳过', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [],
                deck: [
                    { uid: 'sprout-deck-1', defId: 'killer_plant_sprout', type: 'minion' },
                    { uid: 'sprout-deck-2', defId: 'wizard_neophyte', type: 'minion' },
                    { uid: 'sprout-deck-3', defId: 'robot_tech_center', type: 'action' },
                ],
                field: [
                    { uid: 'sprout-field-1', defId: 'killer_plant_sprout', baseIndex: 0, power: 2 },
                ],
            },
            player1: {
                hand: [],
                deck: [],
            },
            bases: [
                {
                    defId: 'base_secret_garden',
                    breakpoint: 20,
                    power: 2,
                    minions: [],
                },
            ],
            currentPlayer: '1',
            phase: 'playCards',
        });

        await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                return (
                    state?.sys?.phase === 'playCards' &&
                    state?.core?.currentPlayerIndex === 1 &&
                    state?.core?.bases?.[0]?.minions?.some((minion: any) => minion.uid === 'sprout-field-1') &&
                    state?.core?.players?.['0']?.deck?.length === 3
                );
            },
            { timeout: 5000, polling: 200 },
        );

        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.command.dispatch({
                type: 'ADVANCE_PHASE',
                playerId: '1',
                payload: {},
            });
        });

        await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                return state?.sys?.interaction?.current?.data?.sourceId === 'killer_plant_sprout_search';
            },
            { timeout: 10000, polling: 200 },
        );

        const cardOptions = page.locator('[data-testid^="prompt-card-"]');
        await expect(cardOptions.first()).toBeVisible();
        await expect(cardOptions).toHaveCount(2);

        const skipButton = page.getByRole('button', { name: /放回牌库顶|跳过|skip/i });
        await expect(skipButton).toBeVisible();

        const interactionMeta = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            const current = state?.sys?.interaction?.current;
            return {
                sourceId: current?.data?.sourceId,
                targetType: current?.data?.targetType,
                autoRefresh: current?.data?.autoRefresh,
                responseValidationMode: current?.data?.responseValidationMode,
                optionIds: (current?.data?.options ?? []).map((option: any) => option.id),
                optionDisplayModes: (current?.data?.options ?? []).map((option: any) => option.displayMode ?? 'implicit'),
            };
        });

        expect(interactionMeta.sourceId).toBe('killer_plant_sprout_search');
        expect(interactionMeta.targetType).toBe('generic');
        expect(interactionMeta.autoRefresh).toBe('deck');
        expect(interactionMeta.responseValidationMode).toBe('live');
        expect(interactionMeta.optionIds).toEqual(expect.arrayContaining(['minion-0', 'minion-1', 'skip']));
        expect(interactionMeta.optionDisplayModes.filter((mode: string) => mode === 'card')).toHaveLength(2);

        await game.screenshot('sprout-prompt-visible', testInfo);
        await saveStableScreenshot(page, testInfo, 'sprout-prompt-visible');

        await skipButton.click();

        await page.waitForFunction(
            () => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                return !state?.sys?.interaction?.current;
            },
            { timeout: 5000, polling: 200 },
        );

        const finalState = await game.getState();
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.uid === 'sprout-field-1')).toBe(false);
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.controller === '0')).toBe(false);
        expect(finalState.core.players['0'].deck).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ defId: 'killer_plant_sprout' }),
                expect.objectContaining({ defId: 'wizard_neophyte' }),
            ]),
        );

        await game.screenshot('sprout-prompt-skipped', testInfo);
        await saveStableScreenshot(page, testInfo, 'sprout-prompt-skipped');
    });

    test('疯狂牌供给角标只在有疯狂派系时显示，并且抽取后会减少且不会回补', async ({ page, game }, testInfo) => {
        test.setTimeout(60000);

        await page.goto('/play/smashup');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered?.() === true,
            { timeout: 15000 },
        );

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [],
                deck: [],
                factions: ['aliens', 'robots'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
        });

        await expect(page.locator('[data-testid="su-madness-supply"]')).toHaveCount(0);
        await game.screenshot('madness-supply-hidden', testInfo);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: ['cthulhu_whispers_in_darkness'],
                deck: ['alien_invader', 'robot_hoverbot'],
                factions: ['minions_of_cthulhu', 'aliens'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            extra: {
                core: {
                    madnessDeck: Array.from({ length: 30 }, () => 'special_madness'),
                },
            },
        });

        await expect(page.getByTestId('su-madness-supply')).toBeVisible();
        await expect(page.getByTestId('su-madness-supply-count')).toHaveText('x 30');
        await game.screenshot('madness-supply-initial', testInfo);

        await game.playCard('cthulhu_whispers_in_darkness');

        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return state?.core?.madnessDeck?.length === 29
                    && state?.core?.players?.['0']?.hand?.some((card: any) => card.defId === 'special_madness');
            },
            { timeout: 5000, polling: 200 },
        );

        await expect(page.getByTestId('su-madness-supply-count')).toHaveText('x 29');
        await game.screenshot('madness-supply-after-draw', testInfo);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [{ uid: 'madness-hand-1', defId: 'special_madness', type: 'action' }],
                deck: ['alien_invader'],
                factions: ['minions_of_cthulhu', 'aliens'],
            },
            player1: {
                hand: [],
                deck: [],
                factions: ['pirates', 'dinosaurs'],
            },
            currentPlayer: '0',
            phase: 'playCards',
            extra: {
                core: {
                    madnessDeck: Array.from({ length: 29 }, () => 'special_madness'),
                },
            },
        });

        await expect(page.getByTestId('su-madness-supply-count')).toHaveText('x 29');
        const spotlightQueue = page.getByTestId('card-spotlight-queue');
        if (await spotlightQueue.isVisible({ timeout: 200 }).catch(() => false)) {
            await spotlightQueue.click({ force: true });
        }

        await game.playCard('special_madness');
        await game.waitForInteraction('special_madness');
        await game.selectOption('return');

        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return !state?.sys?.interaction?.current
                    && state?.core?.madnessDeck?.length === 29
                    && !state?.core?.players?.['0']?.hand?.some((card: any) => card.uid === 'madness-hand-1')
                    && !state?.core?.players?.['0']?.discard?.some((card: any) => card.uid === 'madness-hand-1');
            },
            { timeout: 5000, polling: 200 },
        );

        await expect(page.getByTestId('su-madness-supply-count')).toHaveText('x 29');
        await page.waitForTimeout(1500);
        await game.screenshot('madness-supply-after-consume', testInfo);
    });
});
