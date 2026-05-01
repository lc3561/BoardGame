// @asset-pipeline-allow
// @asset-pipeline-allow
import React from 'react';
import { createScopedLogger } from '../../../lib/logger';
import { SHIMMER_BG } from '../../../components/common/media/OptimizedImage';
import { getDieFaceByValue } from '../domain/diceRegistry';
import {
    DICE_BG_SIZE,
    getDiceSpritePosition,
    getDiceSpriteAssetPath,
} from './assets';
import {
    getLocalizedImageCandidateUrls,
    getPreloadedImageElement,
    markImageLoaded,
} from '../../../core';

export interface Dice3DProps {
    /** 骰子值 (1-6) */
    value: number;
    /** 是否正在播放滚动动画 */
    isRolling: boolean;
    /** 骰子大小 (CSS 单位) */
    size?: string;
    /** 语言 */
    locale?: string;
    /** 动画序号，用于错峰滚动 */
    index?: number;
    /** 变体：default 用于骰盘，spotlight 用于特写 */
    variant?: 'default' | 'spotlight';
    /** 角色 ID，用于回退路径和兜底字形 */
    characterId?: string;
    /** 骰子定义 ID，优先从定义读取 spriteSheet */
    definitionId?: string;
}

const dice3DLogger = createScopedLogger('dicethrone:dice3d');
const DICE3D_STYLE_ELEMENT_ID = 'dicethrone-dice3d-styles';
const DICE3D_STYLE_TEXT = `
.dice3d-perspective { perspective: 1000px; }
.dice3d-preserve-3d { transform-style: preserve-3d; }
.dice3d-backface-hidden { backface-visibility: hidden; }
@keyframes dice3d-tumble {
    0% { transform: rotateX(0) rotateY(0); }
    100% { transform: rotateX(1440deg) rotateY(1440deg); }
}
@keyframes dice3d-bonus-tumble {
    0% { transform: rotateX(0) rotateY(0); }
    100% { transform: rotateX(1440deg) rotateY(1440deg); }
}
.animate-dice3d-tumble { animation: dice3d-tumble 1s linear infinite; }
.animate-dice3d-bonus-tumble { animation: dice3d-bonus-tumble 0.8s linear infinite; }
`;

const DICE_FACE_FALLBACK_LABELS: Record<string, string> = {
    fist: 'FS',
    palm: 'PM',
    taiji: 'TJ',
    lotus: 'LT',
    katana: 'KT',
    sword: 'SW',
    helm: 'HM',
    heart: 'HP',
    pray: 'PR',
    rising_sun: 'RS',
    strength: 'ST',
    fire: 'FR',
    fiery_soul: 'FY',
    magma: 'MG',
    meteor: 'MT',
    bow: 'BW',
    foot: 'FT',
    moon: 'MN',
    dagger: 'DG',
    bag: 'BG',
    card: 'CD',
    shadow: 'SD',
    bullet: 'BL',
    dash: 'DS',
    bullseye: 'BE',
};

type DiceSpriteLoadResult = { url: string; img: HTMLImageElement } | null;
const diceSpriteInFlightLoads = new Map<string, Promise<DiceSpriteLoadResult>>();

const hasUsableSpriteImage = (img: HTMLImageElement | null | undefined): img is HTMLImageElement =>
    img != null && img.naturalWidth > 0;

const normalizeComparableUrl = (url: string): string => {
    if (!url) return '';
    if (typeof window === 'undefined') return url;
    try {
        return new URL(url, window.location.href).href;
    } catch {
        return url;
    }
};

const matchLoadedSpriteCandidateUrl = (
    img: HTMLImageElement | null | undefined,
    candidateUrls: string[],
): string => {
    if (!hasUsableSpriteImage(img)) return '';

    const normalizedCandidates = candidateUrls.map((candidateUrl) => ({
        candidateUrl,
        normalized: normalizeComparableUrl(candidateUrl),
    }));

    for (const src of [img.currentSrc, img.src]) {
        const normalizedSrc = normalizeComparableUrl(src);
        if (!normalizedSrc) continue;
        const matchedCandidate = normalizedCandidates.find((candidate) => candidate.normalized === normalizedSrc);
        if (matchedCandidate) {
            return matchedCandidate.candidateUrl;
        }
    }

    return '';
};

const resolveLoadedSpriteUrl = (
    candidateUrls: string[],
    spriteAssetPath?: string | null,
    locale?: string,
): string => {
    for (const candidateUrl of candidateUrls) {
        const matchedCandidate = matchLoadedSpriteCandidateUrl(getPreloadedImageElement(candidateUrl), candidateUrls);
        if (matchedCandidate) {
            return matchedCandidate;
        }
    }

    if (spriteAssetPath) {
        const sourceImg = getPreloadedImageElement(spriteAssetPath, locale);
        const matchedCandidate = matchLoadedSpriteCandidateUrl(sourceImg, candidateUrls);
        if (matchedCandidate) {
            return matchedCandidate;
        }

        if (hasUsableSpriteImage(sourceImg)) {
            return sourceImg.currentSrc || sourceImg.src || '';
        }
    }

    return '';
};

const loadDiceSpriteCandidatesShared = (candidateUrls: string[]): Promise<DiceSpriteLoadResult> => {
    if (candidateUrls.length === 0) {
        return Promise.resolve(null);
    }

    const inFlightKey = candidateUrls.join('|');
    const inFlight = diceSpriteInFlightLoads.get(inFlightKey);
    if (inFlight) {
        return inFlight;
    }

    const promise = new Promise<DiceSpriteLoadResult>((resolve) => {
        const tryLoad = (index: number) => {
            if (index >= candidateUrls.length) {
                resolve(null);
                return;
            }

            const url = candidateUrls[index];
            const img = new Image();
            img.onload = () => {
                markImageLoaded(url, undefined, img);
                resolve({ url, img });
            };
            img.onerror = () => {
                tryLoad(index + 1);
            };
            img.src = url;
        };

        tryLoad(0);
    }).finally(() => {
        diceSpriteInFlightLoads.delete(inFlightKey);
    });

    diceSpriteInFlightLoads.set(inFlightKey, promise);
    return promise;
};

const resolveFallbackLabel = (faceValue: number, definitionId?: string) => {
    const symbol = definitionId
        ? getDieFaceByValue(definitionId, faceValue)?.symbols?.[0]
        : null;
    const symbolKey = typeof symbol === 'string' ? symbol.toLowerCase() : '';
    const label = DICE_FACE_FALLBACK_LABELS[symbolKey];
    return {
        symbol: symbolKey || '',
        label: label ?? String(faceValue),
    };
};

/** 3D 骰子组件 */
export const Dice3D = ({
    value,
    isRolling,
    size = '4.5vw',
    locale,
    index = 0,
    variant = 'default',
    characterId = 'monk',
    definitionId,
}: Dice3DProps) => {
    const translateZ = `calc(${size} / 2)`;
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const lastInspectKeyRef = React.useRef<string | null>(null);
    const spriteAssetPath = React.useMemo(
        () => getDiceSpriteAssetPath(definitionId, characterId),
        [characterId, definitionId],
    );
    const effectiveLocale = locale ?? 'zh-CN';
    const spriteCandidates = React.useMemo(
        () => (spriteAssetPath ? getLocalizedImageCandidateUrls(spriteAssetPath, effectiveLocale) : []),
        [effectiveLocale, spriteAssetPath],
    );
    const loadedSpriteUrl = React.useMemo(
        () => resolveLoadedSpriteUrl(spriteCandidates, spriteAssetPath, effectiveLocale),
        [effectiveLocale, spriteAssetPath, spriteCandidates],
    );
    const spriteStateKey = `${spriteAssetPath ?? ''}|${effectiveLocale}`;

    const faces = [
        { id: 1, trans: `translateZ(${translateZ})` },
        { id: 6, trans: `rotateY(180deg) rotateZ(180deg) translateZ(${translateZ})` },
        { id: 3, trans: `rotateY(90deg) translateZ(${translateZ})` },
        { id: 4, trans: `rotateY(-90deg) translateZ(${translateZ})` },
        { id: 2, trans: `rotateX(90deg) translateZ(${translateZ})` },
        { id: 5, trans: `rotateX(-90deg) translateZ(${translateZ})` },
    ];

    const [spriteState, setSpriteState] = React.useState(() => ({
        key: spriteStateKey,
        resolvedSpriteUrl: loadedSpriteUrl || spriteCandidates[0] || null,
        isSpriteReady: Boolean(loadedSpriteUrl),
    }));
    const currentSpriteState = spriteState.key === spriteStateKey
        ? spriteState
        : {
            key: spriteStateKey,
            resolvedSpriteUrl: loadedSpriteUrl || spriteCandidates[0] || null,
            isSpriteReady: Boolean(loadedSpriteUrl),
        };
    const { resolvedSpriteUrl, isSpriteReady } = currentSpriteState;

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        if (document.getElementById(DICE3D_STYLE_ELEMENT_ID)) return;
        const style = document.createElement('style');
        style.id = DICE3D_STYLE_ELEMENT_ID;
        style.textContent = DICE3D_STYLE_TEXT;
        document.head.appendChild(style);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        if (!spriteAssetPath) return () => {
            cancelled = true;
        };

        if (loadedSpriteUrl) {
            setSpriteState((current) => {
                if (current.isSpriteReady && current.resolvedSpriteUrl === loadedSpriteUrl) return current;
                return {
                    key: spriteStateKey,
                    resolvedSpriteUrl: loadedSpriteUrl,
                    isSpriteReady: true,
                };
            });
            return () => {
                cancelled = true;
            };
        }

        if (spriteCandidates.length === 0) {
            setSpriteState((current) => {
                return {
                    key: spriteStateKey,
                    resolvedSpriteUrl: null,
                    isSpriteReady: false,
                };
            });
            return () => {
                cancelled = true;
            };
        }

        setSpriteState((current) => {
            return {
                key: spriteStateKey,
                resolvedSpriteUrl: current.resolvedSpriteUrl ?? spriteCandidates[0] ?? null,
                isSpriteReady: false,
            };
        });

        void loadDiceSpriteCandidatesShared(spriteCandidates).then((result) => {
            if (cancelled || !result) {
                return;
            }

            markImageLoaded(spriteAssetPath, effectiveLocale, result.img);
            setSpriteState((current) => {
                return {
                    key: spriteStateKey,
                    resolvedSpriteUrl: result.url,
                    isSpriteReady: true,
                };
            });
        });

        return () => {
            cancelled = true;
        };
    }, [effectiveLocale, loadedSpriteUrl, spriteAssetPath, spriteCandidates, spriteStateKey]);

    React.useEffect(() => {
        dice3DLogger.debug('sprite-resolved', {
            definitionId: definitionId ?? null,
            characterId,
            locale: effectiveLocale,
            spriteAssetPath: spriteAssetPath ?? null,
            spriteUrl: resolvedSpriteUrl ?? null,
            isSpriteReady,
        });
    }, [characterId, definitionId, effectiveLocale, isSpriteReady, resolvedSpriteUrl, spriteAssetPath]);

    const isSpotlight = variant === 'spotlight';

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const root = rootRef.current;
        if (!root) return;
        const inspectKey = [
            resolvedSpriteUrl ?? 'null',
            isSpriteReady ? 'ready' : 'not-ready',
            size,
            value,
        ].join('|');
        if (lastInspectKeyRef.current === inspectKey) return;
        lastInspectKeyRef.current = inspectKey;

        const faceEl = root.querySelector('[data-face-id="1"]') as HTMLElement | null;
        if (!faceEl) {
            dice3DLogger.warn('sprite-inspect-missing-face', {
                definitionId: definitionId ?? null,
                characterId,
                locale: locale ?? null,
            });
            return;
        }

        const style = window.getComputedStyle(faceEl);
        dice3DLogger.info('sprite-inspect', {
            definitionId: definitionId ?? null,
            characterId,
            locale: locale ?? null,
            spriteUrl: resolvedSpriteUrl ?? null,
            isSpriteReady,
            size,
            value,
            diceBgSize: DICE_BG_SIZE,
            backgroundImage: style.backgroundImage,
            backgroundSize: style.backgroundSize,
            backgroundPosition: style.backgroundPosition,
            backgroundRepeat: style.backgroundRepeat,
            opacity: style.opacity,
            visibility: style.visibility,
            display: style.display,
        });
    }, [characterId, definitionId, isSpriteReady, locale, resolvedSpriteUrl, size, value]);

    const getFinalTransform = (val: number) => {
        switch (val) {
            case 1: return 'rotateX(0deg) rotateY(0deg)';
            case 6: return 'rotateX(180deg) rotateY(0deg)';
            case 2: return 'rotateX(-90deg) rotateY(0deg)';
            case 5: return 'rotateX(90deg) rotateY(0deg)';
            case 3: return 'rotateX(0deg) rotateY(-90deg)';
            case 4: return 'rotateX(0deg) rotateY(90deg)';
            default: return 'rotateY(0deg)';
        }
    };

    const animationClass = isSpotlight ? 'animate-dice3d-bonus-tumble' : 'animate-dice3d-tumble';
    const borderRadius = isSpotlight ? 'rounded-[1vw]' : 'rounded-[0.5vw]';
    const borderStyle = isSpotlight ? 'border-2 border-slate-600/50' : 'border border-slate-700/50';
    const boxShadow = isSpotlight ? 'inset 0 0 2vw rgba(0,0,0,0.8)' : 'inset 0 0 1vw rgba(0,0,0,0.8)';
    const transitionDuration = isSpotlight ? '600ms' : '1000ms';

    return (
        <div
            ref={rootRef}
            className="relative dice3d-perspective"
            style={{ width: size, height: size }}
            data-testid="dice-3d"
            data-sprite-ready={isSpriteReady ? 'true' : 'false'}
            data-definition-id={definitionId ?? ''}
            data-sprite-url={resolvedSpriteUrl ?? ''}
        >
            <div
                className={`relative w-full h-full dice3d-preserve-3d ${isRolling ? animationClass : ''}`}
                style={{
                    transform: isRolling
                        ? `rotateX(${720 + index * 90}deg) rotateY(${720 + index * 90}deg)`
                        : getFinalTransform(value),
                    transition: isRolling ? 'none' : `transform ${transitionDuration} ease-out`,
                }}
            >
                {faces.map((face) => {
                    const { xPos, yPos } = getDiceSpritePosition(face.id);
                    const needsFlip = face.id === 1 || face.id === 6;
                    const faceTransform = needsFlip ? `${face.trans} rotateZ(180deg)` : face.trans;
                    const hasSprite = Boolean(isSpriteReady && resolvedSpriteUrl);
                    const fallbackMeta = resolveFallbackLabel(face.id, definitionId);

                    return (
                        <div
                            key={face.id}
                            className={`absolute inset-0 flex items-center justify-center bg-slate-900 ${borderRadius} dice3d-backface-hidden ${borderStyle} shadow-inner overflow-hidden`}
                            style={{
                                transform: faceTransform,
                                ...(hasSprite && resolvedSpriteUrl ? {
                                    backgroundImage: `url("${resolvedSpriteUrl}")`,
                                    backgroundSize: DICE_BG_SIZE,
                                    backgroundPosition: `${xPos}% ${yPos}%`,
                                    backgroundRepeat: 'no-repeat',
                                } : {
                                    backgroundColor: SHIMMER_BG.backgroundColor,
                                    backgroundImage: SHIMMER_BG.backgroundImage,
                                    backgroundSize: SHIMMER_BG.backgroundSize,
                                    backgroundPosition: SHIMMER_BG.backgroundPosition,
                                    backgroundRepeat: 'no-repeat',
                                    animation: SHIMMER_BG.animation,
                                }),
                                boxShadow,
                                imageRendering: 'auto',
                            }}
                            data-face-id={face.id}
                            data-face-fallback={hasSprite ? 'false' : 'glyph'}
                            data-face-symbol={fallbackMeta.symbol}
                        >
                            {!hasSprite && (
                                <span
                                    className="pointer-events-none select-none text-slate-100 font-black uppercase tracking-[0.08em]"
                                    style={{
                                        fontSize: isSpotlight ? '1.5vw' : '1.1vw',
                                        textShadow: '0 0 0.4vw rgba(0, 0, 0, 0.75)',
                                        lineHeight: 1,
                                    }}
                                >
                                    {fallbackMeta.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dice3D;
