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
    const derivedSummaryText = resolveDerivedSummaryText(resolvedKey, t, params, language);

    if (derivedSummaryText) {
        return derivedSummaryText;
    }

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

const getNumericParam = (
    params: Record<string, string | number> | undefined,
    ...keys: string[]
): number => {
    for (const key of keys) {
        const value = params?.[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return 0;
};

const joinSummaryParts = (parts: string[], language: string): string => {
    const filtered = parts.filter(Boolean);
    if (filtered.length === 0) return '';
    return language.startsWith('zh') ? filtered.join('；') : filtered.join('; ');
};

const resolveDerivedSummaryText = (
    key: string,
    t: TFunction,
    params: Record<string, string | number> | undefined,
    language: string,
): string | undefined => {
    const parts: string[] = [];

    switch (key) {
        case 'bonusDie.effect.volley.result': {
            const bonusDamage = getNumericParam(params, 'bonusDamage');
            if (bonusDamage > 0) {
                parts.push(t('bonusDie.summary.attackDamageBonus', { amount: bonusDamage }));
            }
            parts.push(t('bonusDie.summary.inflictEntangle'));
            return joinSummaryParts(parts, language);
        }
        case 'bonusDie.effect.luckyRoll.result': {
            const healAmount = getNumericParam(params, 'healAmount');
            if (healAmount > 0) {
                parts.push(t('bonusDie.summary.heal', { amount: healAmount }));
            }
            return joinSummaryParts(parts, language);
        }
        case 'bonusDie.effect.morePleaseRoll.result': {
            const damage = getNumericParam(params, 'damage');
            if (damage > 0) {
                parts.push(t('bonusDie.summary.attackDamageBonus', { amount: damage }));
            }
            parts.push(t('bonusDie.summary.inflictConcussion'));
            return joinSummaryParts(parts, language);
        }
        case 'bonusDie.effect.gunslingerEatMyLead.result':
        case 'bonusDie.effect.gunslingerEatMyLead.resultKnockdown': {
            const bonusDamage = getNumericParam(params, 'bonusDamage');
            if (bonusDamage > 0) {
                parts.push(t('bonusDie.summary.attackDamageBonus', { amount: bonusDamage }));
            }
            if (key.endsWith('resultKnockdown')) {
                parts.push(t('bonusDie.summary.inflictKnockdown'));
            }
            return joinSummaryParts(parts, language);
        }
        case 'bonusDie.effect.explodingArrow.result':
        case 'bonusDie.effect.explodingArrow2.result':
        case 'bonusDie.effect.explodingArrow3.result': {
            const damage = getNumericParam(params, 'damage');
            const moonCount = getNumericParam(params, 'moonCount');
            if (damage > 0) {
                parts.push(t('bonusDie.summary.damage', { amount: damage }));
            }
            if (moonCount > 0) {
                parts.push(t('bonusDie.summary.loseCp', { amount: moonCount }));
            }
            parts.push(t('bonusDie.summary.inflictBlinded'));
            if (key === 'bonusDie.effect.explodingArrow3.result') {
                parts.push(t('bonusDie.summary.inflictEntangle'));
            }
            return joinSummaryParts(parts, language);
        }
        case 'bonusDie.effect.samuraiMasamune.result': {
            const katanaCount = getNumericParam(params, 'katanaCount');
            const appliedShameCount = getNumericParam(params, 'appliedShameCount', 'shameCount');
            const grantedRetributionCount = getNumericParam(params, 'grantedRetributionCount', 'retributionCount');
            const rawRetributionCount = getNumericParam(params, 'retributionCount');
            if (katanaCount > 0) {
                parts.push(t('bonusDie.summary.attackDamageBonus', { amount: katanaCount }));
            }
            if (appliedShameCount > 0) {
                parts.push(t('bonusDie.summary.inflictShame', { count: appliedShameCount }));
            }
            if (grantedRetributionCount > 0) {
                parts.push(t('bonusDie.summary.gainBackStrike', { count: grantedRetributionCount }));
            } else if (rawRetributionCount > 0) {
                parts.push(t('bonusDie.summary.backStrikeAtLimit'));
            }
            return joinSummaryParts(parts, language);
        }
        default:
            return undefined;
    }
};

