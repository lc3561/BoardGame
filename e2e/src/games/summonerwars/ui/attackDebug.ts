type AttackDebugPayload = Record<string, unknown>;

declare global {
  interface Window {
    __SW_ATTACK_DEBUG__?: boolean;
    __SW_ATTACK_DEBUG_SEQ__?: number;
    __SW_ATTACK_DEBUG_LOGS__?: Array<{
      seq: number;
      at: string;
      tag: string;
      payload: AttackDebugPayload;
    }>;
  }
}

const ATTACK_DEBUG_KEY = 'sw_attack_debug';

const isTruthyFlag = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
};

export const isSwAttackDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.__SW_ATTACK_DEBUG__ === true) return true;
  try {
    return isTruthyFlag(window.localStorage.getItem(ATTACK_DEBUG_KEY));
  } catch {
    return false;
  }
};

export const swAttackDebugLog = (tag: string, payload: AttackDebugPayload = {}): void => {
  if (!isSwAttackDebugEnabled()) return;
  if (typeof window === 'undefined') return;
  const seq = (window.__SW_ATTACK_DEBUG_SEQ__ ?? 0) + 1;
  window.__SW_ATTACK_DEBUG_SEQ__ = seq;
  const record = {
    seq,
    at: new Date().toISOString(),
    tag,
    payload,
  };
  const logs = window.__SW_ATTACK_DEBUG_LOGS__ ?? [];
  logs.push(record);
  if (logs.length > 300) {
    logs.splice(0, logs.length - 300);
  }
  window.__SW_ATTACK_DEBUG_LOGS__ = logs;
  // eslint-disable-next-line no-console
  console.log(`[SW-ATTACK-DEBUG#${seq}] ${tag}`, payload);
};

