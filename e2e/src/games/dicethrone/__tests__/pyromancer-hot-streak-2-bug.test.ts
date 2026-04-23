/**
 * 测试火法小顺子二级技能（Hot Streak II）无法触发焚灭的 bug
 * 
 * Bug 描述：火法的小顺子二级技能，无法触发焚灭技能
 * 
 * 预期行为：
 * - 小顺子（1,2,3,4）应该触发 fiery-combo-2 变体（priority 1）
 * - 2火+2炽魂（diceSet）应该触发 incinerate 变体（priority 2）
 * - 当两个条件都满足时，应该触发 incinerate（priority 更高）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRunner, cmd, createQueuedRandom, createHeroMatchup, advanceTo } from './test-utils';
import { registerDiceThroneConditions } from '../conditions';
import { initializeCustomActions } from '../domain/customActions';
import { HOT_STREAK_2 } from '../heroes/pyromancer/abilities';

beforeAll(() => {
    registerDiceThroneConditions();
    initializeCustomActions();
});

describe('火法小顺子二级技能 - 焚灭触发', () => {
    it('应该在满足小顺子条件时触发 fiery-combo-2', () => {
        const random = createQueuedRandom([
            // 玩家0（火法）进攻投掷：小顺子 [1,2,3,4,5,6]
            1, 2, 3, 4, 5, 6
        ]);
        const runner = createRunner(random, false);

        const result = runner.run({
            name: '火法小顺子触发',
            setup: createHeroMatchup('pyromancer', 'barbarian', (core) => {
                // 给火法装备 Hot Streak II 卡牌（直接修改 abilities）
                const player = core.players['0'];
                if (player) {
                    // 找到 fiery-combo 技能并替换为 Hot Streak II
                    const abilityIndex = player.abilities.findIndex(a => a.id === 'fiery-combo');
                    if (abilityIndex !== -1) {
                        player.abilities[abilityIndex] = HOT_STREAK_2;
                    }
                }
            }),
            commands: [
                // 推进到 offensiveRoll 阶段
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
            ],
            expect: (state) => {
                const availableAbilities = state.core.availableAbilities;
                // 应该包含 fiery-combo-2（小顺子触发）
                expect(availableAbilities).toContain('fiery-combo-2');
            }
        });

        expect(result.passed).toBe(true);
    });

    it('应该在满足 2火+2爆发 条件时触发 incinerate', () => {
        const random = createQueuedRandom([
            1, 2, 4, 4, 5, 6
        ]);
        const runner = createRunner(random, false);

        const result = runner.run({
            name: '火法焚灭触发',
            setup: createHeroMatchup('pyromancer', 'barbarian', (core) => {
                const player = core.players['0'];
                if (!player) return;
                const abilityIndex = player.abilities.findIndex(a => a.id === 'fiery-combo');
                if (abilityIndex !== -1) {
                    player.abilities[abilityIndex] = HOT_STREAK_2;
                }
            }),
            commands: [
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
            ],
            expect: (state) => {
                const availableAbilities = state.core.availableAbilities;
                expect(availableAbilities).toContain('incinerate');
                expect(availableAbilities[0]).toBe('incinerate');
            }
        });

        expect(result.passed).toBe(true);
    });

    it('当小顺子与焚灭条件同时满足时，应优先给出 incinerate', () => {
        const random = createQueuedRandom([
            1, 2, 3, 4, 4, 6
        ]);
        const runner = createRunner(random, false);

        const result = runner.run({
            name: '火法小顺子与焚灭同时满足时优先焚灭',
            setup: createHeroMatchup('pyromancer', 'barbarian', (core) => {
                const player = core.players['0'];
                if (!player) return;
                const abilityIndex = player.abilities.findIndex(a => a.id === 'fiery-combo');
                if (abilityIndex !== -1) {
                    player.abilities[abilityIndex] = HOT_STREAK_2;
                }
            }),
            commands: [
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
            ],
            expect: (state) => {
                const availableAbilities = state.core.availableAbilities;
                expect(availableAbilities).toContain('incinerate');
                expect(availableAbilities).toContain('fiery-combo-2');
                expect(availableAbilities[0]).toBe('incinerate');
            }
        });

        expect(result.passed).toBe(true);
    });
});
