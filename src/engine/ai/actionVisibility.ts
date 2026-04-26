import type { AiLegalAction, GameAiRuntime, LocalAiActionVisibility } from './types';

const FAST_AI_COMMAND_TYPES = new Set([
    'ADVANCE_PHASE',
    'sw:end_phase',
    'RESPONSE_PASS',
    'REROLL_BONUS_DIE',
    'SKIP_BONUS_DICE_REROLL',
]);

const DEFAULT_HIDDEN_ACTION_KINDS = new Set([
    'advance-phase',
    'response-pass',
    'token-response',
    'skip-token-response',
]);

function resolveVisibleStepConfig(runtime?: Pick<GameAiRuntime, 'localVisibleStepDelayConfig' | 'localFollowUpDelayConfig'> | null) {
    return runtime?.localVisibleStepDelayConfig ?? runtime?.localFollowUpDelayConfig;
}

export function resolveLocalAiActionVisibility(
    action: Pick<AiLegalAction, 'kind' | 'commands' | 'metadata'>,
    runtime?: Pick<GameAiRuntime, 'localVisibleStepDelayConfig' | 'localFollowUpDelayConfig'> | null,
): LocalAiActionVisibility {
    if (action.metadata?.visibleStepDelayPolicy === 'visible') {
        return 'visible';
    }
    if (action.metadata?.visibleStepDelayPolicy === 'hidden') {
        return 'hidden';
    }
    if (action.metadata?.followUpDelayPolicy === 'delay') {
        return 'visible';
    }
    if (action.metadata?.followUpDelayPolicy === 'skip') {
        return 'hidden';
    }

    const visibleStepConfig = resolveVisibleStepConfig(runtime);
    if (visibleStepConfig?.mode === 'whitelist') {
        return typeof action.kind === 'string' && visibleStepConfig.actionKinds.includes(action.kind)
            ? 'visible'
            : 'hidden';
    }

    if (typeof action.kind !== 'string') {
        return 'hidden';
    }
    if (action.kind.startsWith('interaction-')) {
        return 'hidden';
    }
    if (DEFAULT_HIDDEN_ACTION_KINDS.has(action.kind)) {
        return 'hidden';
    }
    if (!Array.isArray(action.commands) || action.commands.length === 0) {
        return 'hidden';
    }
    if (action.commands.every((command) => typeof command.type === 'string' && FAST_AI_COMMAND_TYPES.has(command.type))) {
        return 'hidden';
    }
    return 'visible';
}
