import type { TFunction } from 'i18next';
import type { DieFace } from '../types';

type I18nLike = {
    resolvedLanguage?: string;
    language?: string;
    exists?: (key: string, options?: Record<string, unknown>) => boolean;
    getResource?: (language: string, namespace: string, key: string) => unknown;
    services?: {
        interpolator?: {
            interpolate: (template: string, params: Record<string, unknown>, language?: string) => string;
        };
    };
};

const interpolateFallback = (template: string, params: Record<string, unknown> = {}) => (
    template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
        const value = params[key];
        return value === undefined || value === null ? '' : String(value);
    })
);

export const resolveBonusDieText = (
    key: string,
    context: { t: TFunction; i18n: I18nLike },
    params?: Record<string, string | number>,
    face?: DieFace,
): string => {
    const { t, i18n } = context;
    const language = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
    const resolvedKey = resolveDerivedEffectKey(key, face);

    if (i18n.exists?.(resolvedKey, { ns: 'game-dicethrone' })) {
        return t(resolvedKey, params);
    }

    if (resolvedKey.startsWith('bonusDie.effect.')) {
        const suffix = resolvedKey.slice('bonusDie.effect.'.length);
        const effectMap = i18n.getResource?.(language, 'game-dicethrone', 'bonusDie.effect') as Record<string, string> | undefined;
        const template = effectMap?.[suffix];
        if (typeof template === 'string') {
            const interpolator = i18n.services?.interpolator;
            if (interpolator?.interpolate) {
                return interpolator.interpolate(template, params ?? {}, language);
            }
            return interpolateFallback(template, params ?? {});
        }
    }

    return params ? t(resolvedKey, params) : resolvedKey;
};

const resolveDerivedEffectKey = (key: string, face?: DieFace): string => {
    switch (key) {
        case 'bonusDie.effect.watchOut':
            return 'bonusDie.effect.watchOut.none';
        case 'bonusDie.effect.volley':
            return face === 'bow'
                ? 'bonusDie.effect.volley.bowContribution'
                : 'bonusDie.effect.volley.otherContribution';
        case 'bonusDie.effect.luckyRoll':
            return face === 'heart'
                ? 'bonusDie.effect.luckyRoll.heartContribution'
                : 'bonusDie.effect.luckyRoll.otherContribution';
        case 'bonusDie.effect.morePleaseRoll':
            return face === 'sword'
                ? 'bonusDie.effect.morePleaseRoll.swordContribution'
                : 'bonusDie.effect.morePleaseRoll.otherContribution';
        case 'bonusDie.effect.gunslingerEatMyLeadDie':
            return face === 'bullet'
                ? 'bonusDie.effect.gunslingerEatMyLead.bulletContribution'
                : 'bonusDie.effect.gunslingerEatMyLead.otherContribution';
        case 'bonusDie.effect.thunderStrikeDie':
            return 'bonusDie.effect.totalDamageContribution';
        case 'bonusDie.effect.thunderStrike2Die':
        case 'bonusDie.effect.barbarianSuppress':
            return 'bonusDie.effect.totalDamageContributionThreshold';
        case 'bonusDie.effect.pyroBlast2Die':
        case 'bonusDie.effect.pyroBlast3Die':
            if (face === 'fire' || face === 'magma' || face === 'fiery_soul' || face === 'meteor') {
                return `bonusDie.effect.${face}`;
            }
            return 'bonusDie.effect.default';
        default:
            return key;
    }
};

