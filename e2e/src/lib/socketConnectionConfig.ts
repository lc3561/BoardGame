/**
 * 统一管理 socket.io 的握手策略。
 * 所有环境都优先使用 websocket，但始终允许 polling 自动回退。
 * 这样在 websocket 被网络拦截时可以继续连上；网络恢复后，engine.io 会继续优先 websocket / 尝试升级回 websocket。
 */
export const SOCKET_CONNECT_TIMEOUT_MS = 30_000;
export const SOCKET_COMPATIBILITY_MODE_STORAGE_KEY = 'boardgame.socketCompatibilityMode';

export type SocketIoTransport = 'websocket' | 'polling';

const SOCKET_IO_TRANSPORTS_AUTOMATIC: SocketIoTransport[] = ['websocket', 'polling'];

/**
 * 兼容模式切换已废弃，改为统一自动回退。
 * 保留这些导出以兼容旧引用，但它们不再驱动任何用户可见开关。
 */
export const canToggleSocketCompatibilityMode = () => false;

export const isSocketCompatibilityModeEnabled = (): boolean => {
    return true;
};

export const setSocketCompatibilityModeEnabled = (_enabled: boolean): void => {
    // Compatibility mode is now always handled automatically by the transport order.
};

export const getSocketIoTransports = (): SocketIoTransport[] => {
    return [...SOCKET_IO_TRANSPORTS_AUTOMATIC];
};

export const shouldTryAllSocketTransports = (): boolean => true;
