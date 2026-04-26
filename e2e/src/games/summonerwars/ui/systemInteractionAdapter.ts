import type { PromptOption } from '../../../engine/systems/InteractionSystem';
import type { CellCoord } from '../domain/types';
import type { AbilityModeState } from './useGameEvents';

export interface SwSimpleChoiceInteraction {
  id: string;
  type: string;
  meta: Record<string, unknown>;
  options: PromptOption[];
}

export interface InteractionAbilityDraft {
  interactionId: string;
  selectedCardIds: string[];
}

type ActivatedAbilityId =
  | 'revive_undead'
  | 'fortress_power'
  | 'telekinesis_instead'
  | 'high_telekinesis_instead'
  | 'vanish';

const isCellCoord = (value: unknown): value is CellCoord => {
  if (!value || typeof value !== 'object') return false;
  const coord = value as { row?: unknown; col?: unknown };
  return typeof coord.row === 'number' && typeof coord.col === 'number';
};

const isActivatedAbilityId = (value: unknown): value is ActivatedAbilityId => (
  value === 'revive_undead'
  || value === 'fortress_power'
  || value === 'telekinesis_instead'
  || value === 'high_telekinesis_instead'
  || value === 'vanish'
);

export function isActivatedAbilityInteraction(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  abilityId: ActivatedAbilityId,
  step?: string,
): boolean {
  if (!swInteraction || swInteraction.type !== 'activated_ability_target') return false;
  if (swInteraction.meta?.abilityId !== abilityId) return false;
  if (step && swInteraction.meta?.step !== step) return false;
  return true;
}

export function findActivatedAbilityTargetOptionByPosition(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  abilityId: ActivatedAbilityId,
  position: CellCoord,
  step?: string,
): PromptOption | null {
  if (!isActivatedAbilityInteraction(swInteraction, abilityId, step)) return null;
  return swInteraction.options.find((option) => {
    const value = option.value as {
      action?: string;
      abilityId?: string;
      targetPosition?: CellCoord;
    } | undefined;
    const isDirectActivatedTarget = value?.action === 'activated_ability_target'
      && value.abilityId === abilityId
      && value.targetPosition?.row === position.row
      && value.targetPosition?.col === position.col;
    const isTelekinesisStepTarget = (
      (abilityId === 'telekinesis_instead' || abilityId === 'high_telekinesis_instead')
      && value?.action === 'after_attack_telekinesis_target'
      && value.targetPosition?.row === position.row
      && value.targetPosition?.col === position.col
    );
    return isDirectActivatedTarget || isTelekinesisStepTarget;
  }) ?? null;
}

export function findActivatedAbilityTargetOptionByCardId(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  abilityId: ActivatedAbilityId,
  targetCardId: string,
  step?: string,
): PromptOption | null {
  if (!isActivatedAbilityInteraction(swInteraction, abilityId, step)) return null;
  return swInteraction.options.find((option) => {
    const value = option.value as {
      action?: string;
      abilityId?: string;
      targetCardId?: string;
    } | undefined;
    return value?.action === 'activated_ability_target'
      && value.abilityId === abilityId
      && value.targetCardId === targetCardId;
  }) ?? null;
}

export function listActivatedAbilityTargetCardIds(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  abilityId: ActivatedAbilityId,
  step?: string,
): string[] {
  if (!isActivatedAbilityInteraction(swInteraction, abilityId, step)) return [];
  return swInteraction.options
    .map((option) => {
      const value = option.value as {
        action?: string;
        abilityId?: string;
        targetCardId?: string;
      } | undefined;
      return value?.action === 'activated_ability_target'
        && value.abilityId === abilityId
        && typeof value.targetCardId === 'string'
        ? value.targetCardId
        : null;
    })
    .filter((targetCardId): targetCardId is string => !!targetCardId);
}

export function findActivatedAbilityDirectionOptionByPosition(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  abilityId: Extract<ActivatedAbilityId, 'telekinesis_instead' | 'high_telekinesis_instead'>,
  position: CellCoord,
): PromptOption | null {
  if (!isActivatedAbilityInteraction(swInteraction, abilityId, 'selectDirection')) return null;
  return swInteraction.options.find((option) => {
    const value = option.value as {
      action?: string;
    } | undefined;
    const match = typeof option.id === 'string' ? option.id.match(/^pos:(\d+),(\d+)$/) : null;
    return value?.action === 'after_attack_telekinesis_direction'
      && !!match
      && Number(match[1]) === position.row
      && Number(match[2]) === position.col;
  }) ?? null;
}

export function deriveSystemAbilityMode(
  swInteraction: SwSimpleChoiceInteraction | null | undefined,
  interactionAbilityDraft: InteractionAbilityDraft | null | undefined,
): AbilityModeState | null {
  if (!swInteraction) return null;
  const meta = swInteraction.meta as {
    sourceUnitId?: string;
    sourcePosition?: CellCoord;
    structurePosition?: CellCoord;
    targetPosition?: CellCoord;
    targetCardId?: string;
    abilityId?: string;
    step?: string;
  };
  if (!meta.sourceUnitId) return null;

  if (swInteraction.type === 'on_phase_start_illusion') {
    return {
      abilityId: 'illusion',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'on_phase_start_blood_rune') {
    return {
      abilityId: 'blood_rune',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'after_move_spirit_bond') {
    return {
      abilityId: 'spirit_bond',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'after_move_ancestral_bond') {
    return {
      abilityId: 'ancestral_bond',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'after_move_structure_shift_target') {
    return {
      abilityId: 'structure_shift',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'after_move_structure_shift_direction') {
    return {
      abilityId: 'structure_shift',
      step: 'selectNewPosition',
      sourceUnitId: meta.sourceUnitId,
      targetPosition: isCellCoord(meta.targetPosition) ? meta.targetPosition : undefined,
    };
  }

  if (swInteraction.type === 'after_move_frost_axe') {
    return {
      abilityId: 'frost_axe',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
    };
  }

  if (swInteraction.type === 'activated_ability_target' && isActivatedAbilityId(meta.abilityId)) {
    if (meta.abilityId === 'vanish' && meta.step === 'selectUnit') {
      return {
        abilityId: 'vanish',
        step: 'selectUnit',
        sourceUnitId: meta.sourceUnitId,
      };
    }

    if ((meta.abilityId === 'telekinesis_instead' || meta.abilityId === 'high_telekinesis_instead')
      && meta.step === 'selectUnit') {
      return {
        abilityId: meta.abilityId,
        step: 'selectUnit',
        sourceUnitId: meta.sourceUnitId,
      };
    }

    if (meta.abilityId === 'fortress_power' && meta.step === 'selectCard') {
      return {
        abilityId: 'fortress_power',
        step: 'selectCard',
        sourceUnitId: meta.sourceUnitId,
      };
    }

    if (meta.abilityId === 'revive_undead' && meta.step === 'selectCard') {
      return {
        abilityId: 'revive_undead',
        step: 'selectCard',
        sourceUnitId: meta.sourceUnitId,
      };
    }

    if (meta.abilityId === 'revive_undead' && meta.step === 'selectPosition') {
      return {
        abilityId: 'revive_undead',
        step: 'selectPosition',
        sourceUnitId: meta.sourceUnitId,
        selectedCardId: typeof meta.targetCardId === 'string' ? meta.targetCardId : undefined,
      };
    }
  }

  if (swInteraction.type === 'ice_ram_target') {
    return {
      abilityId: 'ice_ram',
      step: 'selectUnit',
      sourceUnitId: 'ice_ram',
      structurePosition: isCellCoord(meta.structurePosition) ? meta.structurePosition : undefined,
    };
  }

  if (swInteraction.type === 'ice_ram_push') {
    return {
      abilityId: 'ice_ram',
      step: 'selectPushDirection',
      sourceUnitId: 'ice_ram',
      structurePosition: isCellCoord(meta.structurePosition) ? meta.structurePosition : undefined,
      targetPosition: isCellCoord(meta.targetPosition) ? meta.targetPosition : undefined,
    };
  }

  if (!isCellCoord(meta.targetPosition)) return null;

  if (swInteraction.type === 'before_attack_life_drain') {
    return {
      abilityId: 'life_drain',
      step: 'selectUnit',
      sourceUnitId: meta.sourceUnitId,
      context: 'beforeAttack',
      pendingAttackTarget: meta.targetPosition,
    };
  }

  if (swInteraction.type === 'before_attack_holy_arrow' || swInteraction.type === 'before_attack_healing') {
    const expectedAction = swInteraction.type;
    const selectableCardIds = swInteraction.options
      .map((option) => {
        const value = option.value as { action?: string; cardId?: string } | undefined;
        return value?.action === expectedAction && typeof value.cardId === 'string' ? value.cardId : null;
      })
      .filter((cardId): cardId is string => !!cardId);
    const selectedCardIds = interactionAbilityDraft?.interactionId === swInteraction.id
      ? interactionAbilityDraft.selectedCardIds.filter((cardId) => selectableCardIds.includes(cardId))
      : [];
    return {
      abilityId: swInteraction.type === 'before_attack_holy_arrow' ? 'holy_arrow' : 'healing',
      step: 'selectCards',
      sourceUnitId: meta.sourceUnitId,
      context: 'beforeAttack',
      selectedCardIds,
      selectableCardIds,
      pendingAttackTarget: meta.targetPosition,
    };
  }

  return null;
}
