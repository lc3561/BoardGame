/**
 * 召唤师战争 - useGameEvents 辅助函数测试
 */

import { describe, it, expect } from 'vitest';
import type { EventStreamEntry, GameEvent } from '../../../engine/types';
import { computeEventStreamDelta } from '../ui/useGameEvents';
import {
  ACTIVATED_ABILITY_IDS,
  deriveSystemAbilityMode,
  findActivatedAbilityDirectionOptionByPosition,
  findActivatedAbilityTargetOptionByCardId,
  findActivatedAbilityTargetOptionByPosition,
  listActivatedAbilityTargetCardIds,
  type SwSimpleChoiceInteraction,
} from '../ui/systemInteractionAdapter';

function makeEntry(id: number): EventStreamEntry {
  const event: GameEvent = { type: 'TEST_EVENT', payload: {}, timestamp: id };
  return { id, event };
}

describe('computeEventStreamDelta', () => {
  it('事件流为空时，重置 lastSeenEventId', () => {
    const result = computeEventStreamDelta([], 3);
    expect(result).toEqual({
      newEntries: [],
      nextLastSeenId: -1,
      shouldReset: true,
    });
  });

  it('事件流为空且未消费过，保持不重置', () => {
    const result = computeEventStreamDelta([], -1);
    expect(result).toEqual({
      newEntries: [],
      nextLastSeenId: -1,
      shouldReset: false,
    });
  });

  it('事件流回滚时，返回全量并触发重置', () => {
    const entries = [makeEntry(2), makeEntry(3)];
    const result = computeEventStreamDelta(entries, 10);
    expect(result).toEqual({
      newEntries: entries,
      nextLastSeenId: 3,
      shouldReset: true,
    });
  });

  it('事件流正常递增时，只返回新增部分', () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const result = computeEventStreamDelta(entries, 2);
    expect(result).toEqual({
      newEntries: [entries[2]],
      nextLastSeenId: 3,
      shouldReset: false,
    });
  });

  it('首次消费时返回全量，并更新 lastSeenEventId', () => {
    const entries = [makeEntry(5), makeEntry(6)];
    const result = computeEventStreamDelta(entries, -1);
    expect(result).toEqual({
      newEntries: entries,
      nextLastSeenId: 6,
      shouldReset: false,
    });
  });
});

describe('systemInteractionAdapter', () => {
  it('activated_ability_target 适配白名单与系统交互保持一致', () => {
    expect(ACTIVATED_ABILITY_IDS).toEqual([
      'revive_undead',
      'fortress_power',
      'telekinesis_instead',
      'high_telekinesis_instead',
      'vanish',
    ]);
  });

  it('为 revive_undead 的 selectCard 交互派生系统 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-revive-1',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'revive_undead',
        sourceUnitId: 'summoner-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectCard',
      },
      options: [
        {
          id: 'card-a',
          label: 'Undead A',
          value: { action: 'activated_ability_target', abilityId: 'revive_undead', targetCardId: 'card-a' },
        },
      ],
    };

    expect(deriveSystemAbilityMode(swInteraction, null)).toEqual({
      abilityId: 'revive_undead',
      step: 'selectCard',
      sourceUnitId: 'summoner-1',
    });
  });

  it('为 revive_undead 的 selectPosition 交互保留 targetCardId', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-revive-2',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'revive_undead',
        sourceUnitId: 'summoner-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectPosition',
        targetCardId: 'card-a',
      },
      options: [
        {
          id: 'pos:6,2',
          label: '(6,2)',
          value: {
            action: 'activated_ability_target',
            abilityId: 'revive_undead',
            targetCardId: 'card-a',
            targetPosition: { row: 6, col: 2 },
          },
        },
      ],
    };

    expect(deriveSystemAbilityMode(swInteraction, null)).toEqual({
      abilityId: 'revive_undead',
      step: 'selectPosition',
      sourceUnitId: 'summoner-1',
      selectedCardId: 'card-a',
    });
  });

  it('为 fortress_power 的 selectCard 交互派生系统 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-fortress-1',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'fortress_power',
        sourceUnitId: 'paladin-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectCard',
      },
      options: [
        {
          id: 'fort-card',
          label: 'Fortress',
          value: { action: 'activated_ability_target', abilityId: 'fortress_power', targetCardId: 'fort-card' },
        },
      ],
    };

    expect(deriveSystemAbilityMode(swInteraction, null)).toEqual({
      abilityId: 'fortress_power',
      step: 'selectCard',
      sourceUnitId: 'paladin-1',
    });
  });

  it('为 on_phase_start_illusion 交互派生系统 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-illusion-1',
      type: 'on_phase_start_illusion',
      meta: {
        type: 'on_phase_start_illusion',
        sourceUnitId: 'illusionist-1',
        sourcePosition: { row: 4, col: 2 },
      },
      options: [
        {
          id: 'pos:4,3',
          label: 'Target',
          value: { action: 'on_phase_start_illusion', targetPosition: { row: 4, col: 3 } },
        },
      ],
    };

    expect(deriveSystemAbilityMode(swInteraction, null)).toEqual({
      abilityId: 'illusion',
      step: 'selectUnit',
      sourceUnitId: 'illusionist-1',
    });
  });

  it('为 on_phase_start_blood_rune 交互派生系统 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-blood-rune-1',
      type: 'on_phase_start_blood_rune',
      meta: {
        type: 'on_phase_start_blood_rune',
        sourceUnitId: 'brav-1',
        sourcePosition: { row: 3, col: 2 },
      },
      options: [
        {
          id: 'damage',
          label: '自伤',
          value: { action: 'on_phase_start_blood_rune', choice: 'damage' },
        },
      ],
    };

    expect(deriveSystemAbilityMode(swInteraction, null)).toEqual({
      abilityId: 'blood_rune',
      step: 'selectUnit',
      sourceUnitId: 'brav-1',
    });
  });

  it('为 before_attack_holy_arrow 交互派生系统选牌 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-holy-arrow-1',
      type: 'before_attack_holy_arrow',
      meta: {
        type: 'before_attack_holy_arrow',
        sourceUnitId: 'archer-1',
        targetPosition: { row: 4, col: 3 },
      },
      options: [
        {
          id: 'card-unit-a',
          label: 'Discard Unit A',
          value: { action: 'before_attack_holy_arrow', cardId: 'card-unit-a' },
        },
        {
          id: 'card-unit-b',
          label: 'Discard Unit B',
          value: { action: 'before_attack_holy_arrow', cardId: 'card-unit-b' },
        },
      ],
    };

    expect(
      deriveSystemAbilityMode(swInteraction, {
        interactionId: 'sw-holy-arrow-1',
        selectedCardIds: ['card-unit-a', 'other-card'],
      }),
    ).toEqual({
      abilityId: 'holy_arrow',
      step: 'selectCards',
      sourceUnitId: 'archer-1',
      context: 'beforeAttack',
      selectedCardIds: ['card-unit-a'],
      selectableCardIds: ['card-unit-a', 'card-unit-b'],
      pendingAttackTarget: { row: 4, col: 3 },
    });
  });

  it('为 before_attack_healing 交互派生系统选牌 abilityMode', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-healing-1',
      type: 'before_attack_healing',
      meta: {
        type: 'before_attack_healing',
        sourceUnitId: 'priest-1',
        targetPosition: { row: 2, col: 1 },
      },
      options: [
        {
          id: 'card-heal-a',
          label: 'Heal A',
          value: { action: 'before_attack_healing', cardId: 'card-heal-a' },
        },
      ],
    };

    expect(
      deriveSystemAbilityMode(swInteraction, {
        interactionId: 'sw-healing-1',
        selectedCardIds: ['card-heal-a'],
      }),
    ).toEqual({
      abilityId: 'healing',
      step: 'selectCards',
      sourceUnitId: 'priest-1',
      context: 'beforeAttack',
      selectedCardIds: ['card-heal-a'],
      selectableCardIds: ['card-heal-a'],
      pendingAttackTarget: { row: 2, col: 1 },
    });
  });

  it('为现役 selectUnit 系统交互派生对应 abilityMode', () => {
    const cases: Array<{
      interaction: SwSimpleChoiceInteraction;
      expected: Record<string, unknown>;
    }> = [
      {
        interaction: {
          id: 'sw-spirit-bond-1',
          type: 'after_move_spirit_bond',
          meta: {
            type: 'after_move_spirit_bond',
            sourceUnitId: 'shaman-1',
            sourcePosition: { row: 5, col: 2 },
          },
          options: [],
        },
        expected: {
          abilityId: 'spirit_bond',
          step: 'selectUnit',
          sourceUnitId: 'shaman-1',
        },
      },
      {
        interaction: {
          id: 'sw-ancestral-bond-1',
          type: 'after_move_ancestral_bond',
          meta: {
            type: 'after_move_ancestral_bond',
            sourceUnitId: 'elder-1',
            sourcePosition: { row: 4, col: 2 },
          },
          options: [],
        },
        expected: {
          abilityId: 'ancestral_bond',
          step: 'selectUnit',
          sourceUnitId: 'elder-1',
        },
      },
      {
        interaction: {
          id: 'sw-frost-axe-1',
          type: 'after_move_frost_axe',
          meta: {
            type: 'after_move_frost_axe',
            sourceUnitId: 'smith-1',
            sourcePosition: { row: 3, col: 3 },
          },
          options: [],
        },
        expected: {
          abilityId: 'frost_axe',
          step: 'selectUnit',
          sourceUnitId: 'smith-1',
        },
      },
      {
        interaction: {
          id: 'sw-vanish-1',
          type: 'activated_ability_target',
          meta: {
            type: 'activated_ability_target',
            abilityId: 'vanish',
            sourceUnitId: 'sneeks-1',
            sourcePosition: { row: 7, col: 2 },
            step: 'selectUnit',
          },
          options: [],
        },
        expected: {
          abilityId: 'vanish',
          step: 'selectUnit',
          sourceUnitId: 'sneeks-1',
        },
      },
      {
        interaction: {
          id: 'sw-tele-1',
          type: 'activated_ability_target',
          meta: {
            type: 'activated_ability_target',
            abilityId: 'telekinesis_instead',
            sourceUnitId: 'kala-1',
            sourcePosition: { row: 4, col: 2 },
            step: 'selectUnit',
          },
          options: [],
        },
        expected: {
          abilityId: 'telekinesis_instead',
          step: 'selectUnit',
          sourceUnitId: 'kala-1',
        },
      },
      {
        interaction: {
          id: 'sw-tele-2',
          type: 'activated_ability_target',
          meta: {
            type: 'activated_ability_target',
            abilityId: 'high_telekinesis_instead',
            sourceUnitId: 'kala-2',
            sourcePosition: { row: 4, col: 2 },
            step: 'selectUnit',
          },
          options: [],
        },
        expected: {
          abilityId: 'high_telekinesis_instead',
          step: 'selectUnit',
          sourceUnitId: 'kala-2',
        },
      },
      {
        interaction: {
          id: 'sw-structure-shift-1',
          type: 'after_move_structure_shift_target',
          meta: {
            type: 'after_move_structure_shift_target',
            sourceUnitId: 'builder-1',
            sourcePosition: { row: 5, col: 2 },
          },
          options: [],
        },
        expected: {
          abilityId: 'structure_shift',
          step: 'selectUnit',
          sourceUnitId: 'builder-1',
        },
      },
      {
        interaction: {
          id: 'sw-life-drain-1',
          type: 'before_attack_life_drain',
          meta: {
            type: 'before_attack_life_drain',
            sourceUnitId: 'drainer-1',
            sourcePosition: { row: 6, col: 1 },
            targetPosition: { row: 6, col: 2 },
          },
          options: [],
        },
        expected: {
          abilityId: 'life_drain',
          step: 'selectUnit',
          sourceUnitId: 'drainer-1',
          context: 'beforeAttack',
          pendingAttackTarget: { row: 6, col: 2 },
        },
      },
      {
        interaction: {
          id: 'sw-ice-ram-1',
          type: 'ice_ram_target',
          meta: {
            type: 'ice_ram_target',
            sourceUnitId: 'interaction-source',
            structurePosition: { row: 2, col: 2 },
          },
          options: [],
        },
        expected: {
          abilityId: 'ice_ram',
          step: 'selectUnit',
          sourceUnitId: 'ice_ram',
          structurePosition: { row: 2, col: 2 },
        },
      },
    ];

    for (const { interaction, expected } of cases) {
      expect(deriveSystemAbilityMode(interaction, null)).toEqual(expected);
    }

    expect(deriveSystemAbilityMode({
      id: 'sw-structure-shift-2',
      type: 'after_move_structure_shift_direction',
      meta: {
        type: 'after_move_structure_shift_direction',
        sourceUnitId: 'builder-1',
        sourcePosition: { row: 5, col: 2 },
        targetPosition: { row: 5, col: 3 },
      },
      options: [],
    }, null)).toEqual({
      abilityId: 'structure_shift',
      step: 'selectNewPosition',
      sourceUnitId: 'builder-1',
      targetPosition: { row: 5, col: 3 },
    });

    expect(deriveSystemAbilityMode({
      id: 'sw-ice-ram-2',
      type: 'ice_ram_push',
      meta: {
        type: 'ice_ram_push',
        sourceUnitId: 'interaction-source',
        structurePosition: { row: 2, col: 2 },
        targetPosition: { row: 2, col: 3 },
      },
      options: [],
    }, null)).toEqual({
      abilityId: 'ice_ram',
      step: 'selectPushDirection',
      sourceUnitId: 'ice_ram',
      structurePosition: { row: 2, col: 2 },
      targetPosition: { row: 2, col: 3 },
    });
  });

  it('infection / ice_shards / feed_beast 不再派生 abilityMode，而是走各自系统专用态', () => {
    expect(deriveSystemAbilityMode({
      id: 'sw-infection-1',
      type: 'infection',
      meta: {
        type: 'infection',
        sourceUnitId: 'plague-1',
        targetPosition: { row: 5, col: 3 },
      },
      options: [],
    }, null)).toBeNull();

    expect(deriveSystemAbilityMode({
      id: 'sw-ice-shards-1',
      type: 'ice_shards',
      meta: {
        type: 'ice_shards',
        sourceUnitId: 'jarmund-1',
      },
      options: [],
    }, null)).toBeNull();

    expect(deriveSystemAbilityMode({
      id: 'sw-feed-beast-1',
      type: 'feed_beast',
      meta: {
        type: 'feed_beast',
        sourceUnitId: 'beast-1',
      },
      options: [],
    }, null)).toBeNull();
  });

  it('能按卡牌和位置匹配 activated_ability_target 选项', () => {
    const swInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-activated-1',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'fortress_power',
        sourceUnitId: 'paladin-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectCard',
      },
      options: [
        {
          id: 'fort-card',
          label: 'Fortress',
          value: { action: 'activated_ability_target', abilityId: 'fortress_power', targetCardId: 'fort-card' },
        },
      ],
    };

    expect(
      findActivatedAbilityTargetOptionByCardId(swInteraction, 'fortress_power', 'fort-card', 'selectCard')?.id,
    ).toBe('fort-card');
    expect(listActivatedAbilityTargetCardIds(swInteraction, 'fortress_power', 'selectCard')).toEqual(['fort-card']);

    const vanishInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-activated-2',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'vanish',
        sourceUnitId: 'sneeks-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectUnit',
      },
      options: [
        {
          id: 'pos:6,2',
          label: 'Target',
          value: {
            action: 'activated_ability_target',
            abilityId: 'vanish',
            targetPosition: { row: 6, col: 2 },
          },
        },
      ],
    };

    expect(
      findActivatedAbilityTargetOptionByPosition(vanishInteraction, 'vanish', { row: 6, col: 2 }, 'selectUnit')?.id,
    ).toBe('pos:6,2');

    const telekinesisTargetInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-activated-2b',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'telekinesis_instead',
        sourceUnitId: 'unit-1',
        sourcePosition: { row: 2, col: 1 },
        step: 'selectUnit',
      },
      options: [
        {
          id: 'pos:2,3',
          label: '(2,3)',
          value: {
            action: 'after_attack_telekinesis_target',
            targetPosition: { row: 2, col: 3 },
          },
        },
      ],
    };

    expect(
      findActivatedAbilityTargetOptionByPosition(
        telekinesisTargetInteraction,
        'telekinesis_instead',
        { row: 2, col: 3 },
        'selectUnit',
      )?.id,
    ).toBe('pos:2,3');

    const telekinesisDirectionInteraction: SwSimpleChoiceInteraction = {
      id: 'sw-activated-3',
      type: 'activated_ability_target',
      meta: {
        type: 'activated_ability_target',
        abilityId: 'telekinesis_instead',
        sourceUnitId: 'unit-1',
        sourcePosition: { row: 7, col: 2 },
        step: 'selectDirection',
        targetPosition: { row: 5, col: 2 },
      },
      options: [
        {
          id: 'pos:6,2',
          label: 'Push',
          value: {
            action: 'after_attack_telekinesis_direction',
            targetPosition: { row: 5, col: 2 },
            moveRow: 1,
            moveCol: 0,
          },
        },
      ],
    };

    expect(
      findActivatedAbilityDirectionOptionByPosition(
        telekinesisDirectionInteraction,
        'telekinesis_instead',
        { row: 6, col: 2 },
      )?.id,
    ).toBe('pos:6,2');
  });
});
