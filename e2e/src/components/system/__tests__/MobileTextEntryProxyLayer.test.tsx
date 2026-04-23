import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { syncProxyValueToTextEntry } from '../../../lib/textEntry';
import { MobileTextEntryProxyLayer } from '../MobileTextEntryProxyLayer';

const ensureVisualViewportStub = () => {
    Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
            height: 564,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        },
    });
};

describe('MobileTextEntryProxyLayer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        cleanup();
        document.body.innerHTML = '<div id="modal-root"></div>';
        document.documentElement.style.setProperty('--keyboard-inset-height', '280px');
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: true }),
        });
        ensureVisualViewportStub();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        cleanup();
        document.body.innerHTML = '';
        document.documentElement.style.removeProperty('--keyboard-inset-height');
    });

    it('在键盘弹起时为 modal-root 内输入框创建代理输入', async () => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) throw new Error('missing modal root');

        const sourceInput = document.createElement('input');
        sourceInput.type = 'text';
        sourceInput.placeholder = 'feedback';
        sourceInput.value = 'hello';
        modalRoot.appendChild(sourceInput);

        render(<MobileTextEntryProxyLayer />);

        await act(async () => {
            sourceInput.focus();
            fireEvent.focusIn(sourceInput);
            await vi.advanceTimersByTimeAsync(60);
        });

        const proxyInput = screen.getByTestId('mobile-text-entry-proxy-input');
        expect(proxyInput).toBeTruthy();
        expect((proxyInput as HTMLInputElement).value).toBe('hello');
        expect(sourceInput.readOnly).toBe(true);
        expect(sourceInput.getAttribute('data-mobile-text-entry-proxy-source')).toBe('true');
    });

    it('代理输入失焦切到另一个可代理输入时，不应先闪退再重建', async () => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) throw new Error('missing modal root');

        const firstInput = document.createElement('input');
        firstInput.type = 'text';
        firstInput.placeholder = 'first';
        firstInput.value = 'alpha';

        const secondInput = document.createElement('input');
        secondInput.type = 'text';
        secondInput.placeholder = 'second';
        secondInput.value = 'beta';

        modalRoot.appendChild(firstInput);
        modalRoot.appendChild(secondInput);

        render(<MobileTextEntryProxyLayer />);

        await act(async () => {
            firstInput.focus();
            fireEvent.focusIn(firstInput);
            await vi.advanceTimersByTimeAsync(60);
        });

        const initialProxy = screen.getByTestId('mobile-text-entry-proxy-input');
        expect((initialProxy as HTMLInputElement).value).toBe('alpha');

        await act(async () => {
            fireEvent.blur(initialProxy);
            secondInput.focus();
            fireEvent.focusIn(secondInput);
            fireEvent.focusOut(firstInput);
            await vi.advanceTimersByTimeAsync(160);
        });

        const proxies = screen.getAllByTestId('mobile-text-entry-proxy-input');
        expect(proxies).toHaveLength(1);
        expect((proxies[0] as HTMLInputElement).value).toBe('beta');
        expect(firstInput.readOnly).toBe(false);
        expect(secondInput.readOnly).toBe(true);
    });

    it('代理层卸载后会恢复原始 input 的可编辑状态', async () => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) throw new Error('missing modal root');

        const sourceInput = document.createElement('input');
        sourceInput.type = 'text';
        sourceInput.value = 'persist me';
        modalRoot.appendChild(sourceInput);

        const view = render(<MobileTextEntryProxyLayer />);

        await act(async () => {
            sourceInput.focus();
            fireEvent.focusIn(sourceInput);
            await vi.advanceTimersByTimeAsync(60);
        });

        expect(screen.getByTestId('mobile-text-entry-proxy-input')).toBeTruthy();
        expect(sourceInput.readOnly).toBe(true);
        expect(sourceInput.style.opacity).toBe('0');
        expect(sourceInput.getAttribute('data-mobile-text-entry-proxy-source')).toBe('true');

        view.unmount();

        expect(sourceInput.readOnly).toBe(false);
        expect(sourceInput.style.opacity).toBe('');
        expect(sourceInput.style.caretColor).toBe('');
        expect(sourceInput.hasAttribute('data-mobile-text-entry-proxy-source')).toBe(false);
    });

    it('代理层卸载后会恢复原始 contenteditable 的可编辑状态', async () => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) throw new Error('missing modal root');

        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        editable.textContent = 'editable text';
        modalRoot.appendChild(editable);

        const view = render(<MobileTextEntryProxyLayer />);

        await act(async () => {
            editable.focus();
            fireEvent.focusIn(editable);
            await vi.advanceTimersByTimeAsync(60);
        });

        expect(screen.getByTestId('mobile-text-entry-proxy-textarea')).toBeTruthy();
        expect(editable.getAttribute('contenteditable')).toBe('false');
        expect(editable.getAttribute('data-mobile-text-entry-proxy-source')).toBe('true');

        view.unmount();

        expect(editable.getAttribute('contenteditable')).toBe('true');
        expect(editable.style.opacity).toBe('');
        expect(editable.style.caretColor).toBe('');
        expect(editable.hasAttribute('data-mobile-text-entry-proxy-source')).toBe(false);
    });

    it('会把代理输入同步回 React 受控 input', () => {
        const ControlledInput = () => {
            const [value, setValue] = React.useState('');
            return (
                <input
                    data-testid="controlled-input"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />
            );
        };

        render(<ControlledInput />);
        const input = screen.getByTestId('controlled-input') as HTMLInputElement;

        expect(syncProxyValueToTextEntry(input, '代理同步值')).toBe(true);
        expect(input.value).toBe('代理同步值');
    });
});
