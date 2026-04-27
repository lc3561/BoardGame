import { useEffect, useRef, useState, type ChangeEvent, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
    className?: string;
    inlineStyle?: Record<string, string>;
}

interface TargetProxySnapshot {
    readonly?: boolean;
    contentEditable?: string | null;
    opacity?: string;
    caretColor?: string;
}

const KEYBOARD_PROXY_MIN_INSET = 72;
const TARGET_PROXY_ATTR = 'data-mobile-text-entry-proxy-source';
const DEFAULT_PROXY_BACKGROUND = 'rgba(255, 248, 240, 0.98)';
const DEFAULT_PROXY_BOX_SHADOW = '0 18px 40px rgba(15, 23, 42, 0.18)';

const readKeyboardInset = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 0;
    }

    const rawValue = window.getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset-height');
    const parsed = Number.parseFloat(rawValue || '0');
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const isProxyUiElement = (candidate: EventTarget | Element | null | undefined): candidate is HTMLElement => {
    return candidate instanceof HTMLElement
        && (candidate.dataset.testid === 'mobile-text-entry-proxy-input'
            || candidate.dataset.testid === 'mobile-text-entry-proxy-textarea'
            || candidate.dataset.testid === 'mobile-text-entry-proxy'
            || candidate.closest('[data-testid="mobile-text-entry-proxy"]') !== null);
};

const isTransparentColor = (value: string | null | undefined) => {
    if (!value) {
        return true;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === ''
        || normalized === 'transparent'
        || normalized === 'rgba(0, 0, 0, 0)'
        || normalized === 'rgba(0,0,0,0)';
};

const buildProxyState = (target: HTMLElement): ProxyState => {
    const tagName = target.tagName.toLowerCase();
    const multiline = tagName === 'textarea' || target.getAttribute('contenteditable') !== null || target.isContentEditable;
    const input = tagName === 'input' ? target as HTMLInputElement : null;
    const computed = window.getComputedStyle(target);

    return {
        target,
        multiline,
        value: readTextEntryValue(target),
        placeholder: target.getAttribute('placeholder') ?? '',
        inputMode: input?.inputMode || target.getAttribute('inputmode') || undefined,
        maxLength: input?.maxLength && input.maxLength > 0 ? input.maxLength : undefined,
        enterKeyHint: input?.enterKeyHint || target.getAttribute('enterkeyhint') || undefined,
        className: target.className,
        inlineStyle: {
            minHeight: computed.minHeight,
            height: multiline ? computed.height : 'auto',
            maxHeight: computed.maxHeight,
            paddingTop: computed.paddingTop,
            paddingRight: computed.paddingRight,
            paddingBottom: computed.paddingBottom,
            paddingLeft: computed.paddingLeft,
            borderRadius: computed.borderRadius,
            borderWidth: computed.borderWidth,
            borderStyle: computed.borderStyle,
            borderColor: computed.borderColor,
            background: isTransparentColor(computed.backgroundColor) ? DEFAULT_PROXY_BACKGROUND : computed.background,
            backgroundColor: isTransparentColor(computed.backgroundColor) ? DEFAULT_PROXY_BACKGROUND : computed.backgroundColor,
            color: computed.color,
            font: computed.font,
            letterSpacing: computed.letterSpacing,
            lineHeight: computed.lineHeight,
            boxShadow: computed.boxShadow === 'none' ? DEFAULT_PROXY_BOX_SHADOW : computed.boxShadow,
            textAlign: computed.textAlign,
        },
    };
};

const freezeTargetForProxy = (target: HTMLElement): TargetProxySnapshot => {
    const snapshot: TargetProxySnapshot = {
        opacity: target.style.opacity,
        caretColor: target.style.caretColor,
    };

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        snapshot.readonly = target.readOnly;
        target.readOnly = true;
    } else if (target.isContentEditable || target.getAttribute('contenteditable') !== null) {
        snapshot.contentEditable = target.getAttribute('contenteditable');
        target.setAttribute('contenteditable', 'false');
    }

    target.style.opacity = '0';
    target.style.caretColor = 'transparent';
    target.setAttribute(TARGET_PROXY_ATTR, 'true');
    target.blur();

    return snapshot;
};

const restoreTargetAfterProxy = (target: HTMLElement, snapshot: TargetProxySnapshot | null) => {
    target.removeAttribute(TARGET_PROXY_ATTR);
    target.style.opacity = snapshot?.opacity ?? '';
    target.style.caretColor = snapshot?.caretColor ?? '';

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.readOnly = snapshot?.readonly ?? false;
    } else if (snapshot && 'contentEditable' in snapshot) {
        if (snapshot.contentEditable == null) {
            target.removeAttribute('contenteditable');
        } else {
            target.setAttribute('contenteditable', snapshot.contentEditable);
        }
    }
};

export const MobileTextEntryProxyLayer = () => {
    const portalRoot = typeof document === 'undefined'
        ? null
        : (document.getElementById('modal-root') ?? document.body);
    const [proxyState, setProxyState] = useState<ProxyState | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const proxiedTargetRef = useRef<HTMLElement | null>(null);
    const proxiedSnapshotRef = useRef<TargetProxySnapshot | null>(null);
    const blurCleanupTimerRef = useRef<number | null>(null);
    const proxyTarget = proxyState?.target ?? null;

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const clearPendingBlurCleanup = () => {
            if (blurCleanupTimerRef.current != null) {
                window.clearTimeout(blurCleanupTimerRef.current);
                blurCleanupTimerRef.current = null;
            }
        };

        const activateProxy = (target: HTMLElement) => {
            clearPendingBlurCleanup();
            if (isProxyUiElement(target) || target === inputRef.current) {
                return;
            }
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
            if (isProxyUiElement(target) || target === inputRef.current) {
                return;
            }
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
                if (active === inputRef.current || isProxyUiElement(active)) {
                    return;
                }
                if (isTextEntryElement(active) && isTextEntryProxyEligible(active) && readKeyboardInset() >= KEYBOARD_PROXY_MIN_INSET) {
                    activateProxy(active);
                    return;
                }
                if (proxiedTargetRef.current && readKeyboardInset() >= KEYBOARD_PROXY_MIN_INSET) {
                    clearPendingBlurCleanup();
                    setProxyState((current) => current ?? (proxiedTargetRef.current ? buildProxyState(proxiedTargetRef.current) : null));
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
            clearPendingBlurCleanup();
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
        const previousTarget = proxiedTargetRef.current;
        if (previousTarget && previousTarget !== proxyTarget) {
            restoreTargetAfterProxy(previousTarget, proxiedSnapshotRef.current);
            proxiedTargetRef.current = null;
            proxiedSnapshotRef.current = null;
        }

        if (!proxyTarget) {
            return undefined;
        }

        if (proxiedTargetRef.current !== proxyTarget) {
            proxiedSnapshotRef.current = freezeTargetForProxy(proxyTarget);
            proxiedTargetRef.current = proxyTarget;
        }

        const next = inputRef.current;
        if (next) {
            next.focus({ preventScroll: true });
            const selectionEnd = readTextEntryValue(proxyTarget).length;
            next.setSelectionRange?.(selectionEnd, selectionEnd);
        }

        return () => {
            if (!proxyTarget) {
                return;
            }
            if (proxiedTargetRef.current === proxyTarget) {
                restoreTargetAfterProxy(proxyTarget, proxiedSnapshotRef.current);
                proxiedTargetRef.current = null;
                proxiedSnapshotRef.current = null;
            }
        };
    }, [proxyTarget]);

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
        className: proxyState.className || 'w-full',
        style: {
            width: '100%',
            ...proxyState.inlineStyle,
        },
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const nextValue = event.target.value;
            setProxyState((current) => (current ? { ...current, value: nextValue } : current));
            syncProxyValueToTextEntry(proxyState.target, nextValue);
        },
        onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (
                event.key === 'Enter'
                && !proxyState.multiline
                && !event.shiftKey
                && !event.nativeEvent.isComposing
            ) {
                event.preventDefault();
                const form = proxyState.target.form;
                if (form) {
                    const submitter = form.querySelector('button[type="submit"]:not(:disabled), input[type="submit"]:not(:disabled)');
                    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
                        submitter.click();
                        return;
                    }
                    if (typeof form.requestSubmit === 'function') {
                        form.requestSubmit();
                        return;
                    }
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    return;
                }
            }

            const forwardedEvent = new KeyboardEvent('keydown', {
                key: event.key,
                code: event.code,
                location: event.location,
                repeat: event.repeat,
                isComposing: event.nativeEvent.isComposing,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey,
                bubbles: true,
                cancelable: true,
            });
            const notCancelled = proxyState.target.dispatchEvent(forwardedEvent);
            if (!notCancelled || forwardedEvent.defaultPrevented) {
                event.preventDefault();
                return;
            }
        },
        onKeyUp: (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const forwardedEvent = new KeyboardEvent('keyup', {
                key: event.key,
                code: event.code,
                location: event.location,
                repeat: event.repeat,
                isComposing: event.nativeEvent.isComposing,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey,
                bubbles: true,
                cancelable: true,
            });
            proxyState.target.dispatchEvent(forwardedEvent);
        },
        onBlur: () => {
            if (blurCleanupTimerRef.current != null) {
                window.clearTimeout(blurCleanupTimerRef.current);
            }
            blurCleanupTimerRef.current = window.setTimeout(() => {
                blurCleanupTimerRef.current = null;
                const active = document.activeElement;
                if (active === inputRef.current || isProxyUiElement(active)) {
                    return;
                }
                if (isTextEntryElement(active) && isTextEntryProxyEligible(active) && readKeyboardInset() >= KEYBOARD_PROXY_MIN_INSET) {
                    setProxyState(buildProxyState(active));
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
                className="pointer-events-auto mx-auto w-full max-w-3xl px-3"
                style={{ paddingBottom: `max(12px, calc(${Math.max(0, keyboardInset)}px + var(--safe-area-bottom)))` }}
            >
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
        </div>,
        portalRoot,
    );
};

export default MobileTextEntryProxyLayer;
