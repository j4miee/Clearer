import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  createPairCode,
  getDeviceId,
  pushProgress,
  redeemPairCode,
  setDeviceId,
  type SyncSnapshot,
} from '@/lib/sync';

type StoredState = {
  pendingRemovalIds: string[];
  keptIds: string[];
  freedBytes: number;
  clearedPhotoCount: number;
};

type PhotoLibraryContextValue = StoredState & {
  ready: boolean;
  scannedPhotoCount: number;
  similarGroupCount: number;
  markForRemoval: (id: string) => void;
  keepPhoto: (id: string) => void;
  recordDeleted: (ids: string[], bytes: number) => Promise<void>;
  setScanSummary: (photoCount: number, groupCount: number) => void;
  deviceId: string | null;
  lastSync: { at: string; platforms: string[] } | null;
  syncNow: () => Promise<void>;
  getLinkCode: () => Promise<string>;
  linkWithCode: (code: string) => Promise<void>;
};

const STORAGE_KEY = 'clearspace-library-state-v2';
const EMPTY_STATE: StoredState = {
  pendingRemovalIds: [],
  keptIds: [],
  freedBytes: 0,
  clearedPhotoCount: 0,
};
const PhotoLibraryContext = createContext<PhotoLibraryContextValue | null>(null);

export function PhotoLibraryProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [scannedPhotoCount, setScannedPhotoCount] = useState(0);
  const [similarGroupCount, setSimilarGroupCount] = useState(0);
  const [deviceId, setDeviceIdState] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<{ at: string; platforms: string[] } | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        try {
          const parsed = JSON.parse(value) as Partial<StoredState>;
          setStored({
            pendingRemovalIds: parsed.pendingRemovalIds ?? [],
            keptIds: parsed.keptIds ?? [],
            freedBytes: parsed.freedBytes ?? 0,
            clearedPhotoCount: parsed.clearedPhotoCount ?? 0,
          });
        } catch {
          // Start clean if a prior local state cannot be read.
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = (next: StoredState) => {
    setStored(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const markForRemoval = (id: string) => {
    const next: StoredState = {
      ...stored,
      pendingRemovalIds: stored.pendingRemovalIds.includes(id)
        ? stored.pendingRemovalIds
        : [...stored.pendingRemovalIds, id],
      keptIds: stored.keptIds.filter((keptId) => keptId !== id),
    };
    persist(next);
  };

  const keepPhoto = (id: string) => {
    const next: StoredState = {
      ...stored,
      pendingRemovalIds: stored.pendingRemovalIds.filter((pendingId) => pendingId !== id),
      keptIds: stored.keptIds.includes(id) ? stored.keptIds : [...stored.keptIds, id],
    };
    persist(next);
  };

  const recordDeleted = async (ids: string[], bytes: number) => {
    const deleted = new Set(ids);
    const next: StoredState = {
      ...stored,
      pendingRemovalIds: stored.pendingRemovalIds.filter((id) => !deleted.has(id)),
      keptIds: stored.keptIds.filter((id) => !deleted.has(id)),
      freedBytes: stored.freedBytes + bytes,
      clearedPhotoCount: stored.clearedPhotoCount + ids.length,
    };
    setStored(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setScanSummary = (photoCount: number, groupCount: number) => {
    setScannedPhotoCount(photoCount);
    setSimilarGroupCount(groupCount);
  };

  useEffect(() => {
    getDeviceId().then(setDeviceIdState).catch(() => undefined);
  }, []);

  const applyMerged = (merged: SyncSnapshot) => {
    const next: StoredState = {
      ...stored,
      freedBytes: Math.max(stored.freedBytes, merged.freed_bytes),
      clearedPhotoCount: Math.max(stored.clearedPhotoCount, merged.cleared_count),
    };
    persist(next);
    setLastSync({ at: merged.updated_at ?? new Date().toISOString(), platforms: merged.platforms ?? [] });
  };

  const syncNow = async (overrideId?: string) => {
    const id = overrideId ?? deviceId ?? (await getDeviceId());
    const merged = await pushProgress(id, Platform.OS, {
      freedBytes: stored.freedBytes,
      clearedPhotoCount: stored.clearedPhotoCount,
      keptCount: stored.keptIds.length,
    });
    applyMerged(merged);
  };

  const getLinkCode = async () => {
    const id = deviceId ?? (await getDeviceId());
    await syncNow(id);
    return (await createPairCode(id)).code;
  };

  const linkWithCode = async (code: string) => {
    const { device_id } = await redeemPairCode(code);
    await setDeviceId(device_id);
    setDeviceIdState(device_id);
    await syncNow(device_id);
  };

  const value = useMemo(
    () => ({
      ...stored,
      ready,
      scannedPhotoCount,
      similarGroupCount,
      deviceId,
      lastSync,
      markForRemoval,
      keepPhoto,
      recordDeleted,
      setScanSummary,
      syncNow: () => syncNow(),
      getLinkCode,
      linkWithCode,
    }),
    [stored, ready, scannedPhotoCount, similarGroupCount, deviceId, lastSync],
  );

  return <PhotoLibraryContext.Provider value={value}>{children}</PhotoLibraryContext.Provider>;
}

export function usePhotoLibrary() {
  const context = useContext(PhotoLibraryContext);
  if (!context) throw new Error('usePhotoLibrary must be used inside PhotoLibraryProvider');
  return context;
}
