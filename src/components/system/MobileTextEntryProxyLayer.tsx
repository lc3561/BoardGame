import { useEffect, useMemo, useRef, useState, type ChangeEvent, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import {
    isTextEntryElement,
    isTextEntryProxyEligible,
    readTextEntryValue,
    syncProxyValueToTextEntry,
} from '../../lib/textEntry';
import { UI_Z_INDEX } from '../../core';

interface ProxyState {
    target: HTMLElement;
    multiline: boolean;
    value: string;
    placeholder: string;
    inputMode?: string;
    maxLength?: number;
    enterKeyHint?: string;
}

const KEYBOARD_PROXY_MIN_INSET = 72;

const readKeyboardInset = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 0;
    }

    const rawValue = window.getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset-height');
    const parsed = Number.parseFloat(rawValue || '0');
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const buildProxyState = (target: HTMLElement): ProxyState => {
    const tagName = target.tagName.toLowerCase();
    const multiline = tagName === 'textarea' || target.getAttribute('contenteditable') !== null || target.isContentEditable;
    const input = tagName === 'input' ? target as HTMLInputElement : null;

    return {
        target,
        multiline,
        value: readTextEntryValue(target),
        placeholder: target.getAttribute('placeholder') ?? '',
        inputMode: input?.inputMode || target.getAttribute('inputmode') || undefined,
        maxLength: input?.maxLength && input.maxLength > 0 ? input.maxLength : undefined,
        enterKeyHint: input?.enterKeyHint || target.getAttribute('enterkeyhint') || undefined,
    };
};

export const MobileTextEntryProxyLayer = () => {
    const portalRoot = useMemo(() => {
        if (typeof document === 'undefined') return null;
        return document.getElementById('modal-root');
    }, []);
    const [proxyState, setProxyState] = useState<ProxyState | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const activateProxy = (target: HTMLElement) => {
            if (!isTextEntryProxyEligible(target)) {
                setProxyState(null);
                return;
            }
            setProxyState(buildProxyState(target));
        };

        const maybeActivateFromActiveElement = () => {
            const active = document.activeElement;
            if (!isTextEntryElement(active) || !isTextEntryProxyEligible(active)) {
                return;
            }
            if (readKeyboardInset() < KEYBOARD_PROXY_MIN_INSET) {
                return;
            }
            activateProxy(active);
        };

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target;
            if (!isTextEntryElement(target)) {
                setProxyState(null);
                return;
            }

            if (!isTextEntryProxyEligible(target)) {
                setProxyState(null);
                return;
            }

            window.setTimeout(() => {
                if (readKeyboardInset() >= KEYBOARD_PROXY_MIN_INSET) {
                    activateProxy(target);
                }
            }, 40);
        };

        const handleFocusOut = () => {
            window.setTimeout(() => {
                const active = document.activeElement;
                if (active === inputRef.current) {
                    return;
                }
                if (isTextEntryElement(active) && isTextEntryProxyEligible(active) && readKeyboardInset() >= KEYBOARD_PROXY_MIN_INSET) {
                    activateProxy(active);
                    return;
                }
                setProxyState(null);
            }, 80);
        };

        const handleViewportResize = () => {
            if (readKeyboardInset() < KEYBOARD_PROXY_MIN_INSET) {
                setProxyState(null);
                return;
            }
            maybeActivateFromActiveElement();
        };

        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('focusout', handleFocusOut, true);
        window.visualViewport?.addEventListener('resize', handleViewportResize);

        return () => {
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('focusout', handleFocusOut, true);
            window.visualViewport?.removeEventListener('resize', handleViewportResize);
        };
    }, []);

    useEffect(() => {
        if (!proxyState) {
            return undefined;
        }

        const syncFromTarget = () => {
            setProxyState((current) => {
                if (!current || current.target !== proxyState.target) {
                    return current;
                }
                return {
                    ...current,
                    value: readTextEntryValue(current.target),
                };
            });
        };

        proxyState.target.addEventListener('input', syncFromTarget);
        proxyState.target.addEventListener('change', syncFromTarget);

        return () => {
            proxyState.target.removeEventListener('input', syncFromTarget);
            proxyState.target.removeEventListener('change', syncFromTarget);
        };
    }, [proxyState]);

    useEffect(() => {
        if (!proxyState) {
            return;
        }
        const next = inputRef.current;
        if (!next) {
            return;
        }
        next.focus({ preventScroll: true });
        const selectionEnd = proxyState.value.length;
        next.setSelectionRange?.(selectionEnd, selectionEnd);
    }, [proxyState]);

    if (!portalRoot || !proxyState) {
        return null;
    }

    const keyboardInset = readKeyboardInset();
    const sharedProps = {
        ref: inputRef,
        value: proxyState.value,
        placeholder: proxyState.placeholder,
        inputMode: proxyState.inputMode as HTMLAttributes<HTMLInputElement>['inputMode'],
        maxLength: proxyState.maxLength,
        enterKeyHint: proxyState.enterKeyHint as HTMLAttributes<HTMLInputElement>['enterKeyHint'],
        autoCapitalize: 'sentences' as const,
        autoCorrect: 'on',
        spellCheck: true,
        className: [
            'w-full rounded-2xl border border-parchment-card-border/40 bg-parchment-card-bg',
            'px-4 py-3 text-base text-parchment-base-text shadow-[0_12px_32px_rgba(67,52,34,0.18)]',
            'outline-none focus:border-parchment-base-text placeholder:text-parchment-light-text/60',
        ].join(' '),
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const nextValue = event.target.value;
            setProxyState((current) => (current ? { ...current, value: nextValue } : current));
            syncProxyValueToTextEntry(proxyState.target, nextValue);
        },
        onBlur: () => {
            window.setTimeout(() => {
                const active = document.activeElement;
                if (active === inputRef.current) {
                    return;
                }
                setProxyState(null);
            }, 100);
        },
        'data-testid': 'mobile-text-entry-proxy-input',
    };

    return createPortal(
        <div
            className="fixed inset-x-0 bottom-0 pointer-events-none"
            style={{ zIndex: UI_Z_INDEX.modalRoot + 120 }}
            data-testid="mobile-text-entry-proxy"
        >
            <div
                className="pointer-events-auto mx-auto w-full max-w-3xl px-3 pb-3"
                style={{ paddingBottom: `max(12px, calc(${Math.max(0, keyboardInset)}px + var(--safe-area-bottom)))` }}
            >
                <div className="rounded-[1.25rem] border border-parchment-card-border/30 bg-parchment-base-bg/96 p-3 shadow-2xl backdrop-blur-md">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-parchment-light-text">
                        移动端独立输入框
                    </div>
                    {proxyState.multiline ? (
                        <textarea
                            {...sharedProps}
                            rows={3}
                            data-testid="mobile-text-entry-proxy-textarea"
                            className={`${sharedProps.className} min-h-28 resize-none`}
                        />
                    ) : (
                        <input
                            {...sharedProps}
                            type="text"
                            data-testid="mobile-text-entry-proxy-input"
                        />
                    )}
                </div>
            </div>
        </div>,
        portalRoot,
    );
};

export default MobileTextEntryProxyLayer;
