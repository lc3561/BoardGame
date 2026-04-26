/**
 * 召唤师战争 - useGameEvents 辅助函数测试
 */

import { describe, it, expect } from 'vitest';
import type { EventStreamEntry, GameEvent } from '../../../engine/types';
import { computeEventStreamDelta } from '../ui/useGameEvents';
import {
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
