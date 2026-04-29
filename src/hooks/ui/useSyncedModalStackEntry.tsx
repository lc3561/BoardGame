import { useEffect } from 'react';
import type { ModalEntry } from '../../contexts/ModalStackContext';
import { useModalStack } from '../../contexts/ModalStackContext';

interface UseSyncedModalStackEntryOptions {
    enabled: boolean;
    entryId: string;
    entry: Omit<ModalEntry, 'id'>;
}

/**
 * 将声明式本地状态同步到全局 modal stack。
 * 适用于“组件内部已有开关状态，但实际渲染必须走全局弹窗栈”的场景。
 */
export function useSyncedModalStackEntry({
    enabled,
    entryId,
    entry,
}: UseSyncedModalStackEntryOptions) {
    const { stack, openModal, updateModal, closeModal } = useModalStack();
    const isInStack = stack.some((item) => item.id === entryId);

    useEffect(() => {
        if (!enabled) {
            if (isInStack) {
                closeModal(entryId);
            }
            return;
        }

        if (!isInStack) {
            openModal({ ...entry, id: entryId });
            return;
        }

        updateModal(entryId, entry);
    }, [closeModal, enabled, entry, entryId, isInStack, openModal, updateModal]);

    useEffect(() => {
        return () => {
            closeModal(entryId);
        };
    }, [closeModal, entryId]);
}
