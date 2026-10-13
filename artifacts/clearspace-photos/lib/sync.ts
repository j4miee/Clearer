import AsyncStorage from '@react-native-async-storage/async-storage';

const API = `${process.env.EXPO_PUBLIC_SYNC_URL}/api`;
const DEVICE_KEY = 'clearspace-device-id';

export type SyncSnapshot = {
  device_id: string;
  freed_bytes: number;
  cleared_count: number;
  kept_count: number;
  platforms?: string[];
  updated_at?: string;
};

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export async function setDeviceId(id: string) {
  await AsyncStorage.setItem(DEVICE_KEY, id);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Sync failed (${res.status})`);
  }
  return res.json();
}

export function pushProgress(
  deviceId: string,
  platform: string,
  stats: { freedBytes: number; clearedPhotoCount: number; keptCount: number },
) {
  return req<SyncSnapshot>('/progress', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      platform,
      freed_bytes: stats.freedBytes,
      cleared_count: stats.clearedPhotoCount,
      kept_count: stats.keptCount,
    }),
  });
}

export const createPairCode = (deviceId: string) =>
  req<{ code: string; expires_at: string }>('/pair', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) });

export const redeemPairCode = (code: string) =>
  req<{ device_id: string }>(`/pair/${encodeURIComponent(code.trim().toUpperCase())}`);
