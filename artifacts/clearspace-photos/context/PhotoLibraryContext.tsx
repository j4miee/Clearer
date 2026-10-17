import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type StoredState = {
  pendingRemovalIds: string[];
  keptIds: string[];
  freedBytes: number;
  clearedPhotoCount: number;
  xp: number;
  streakDays: number;
  bestStreak: number;
  lastActivityDate: string | null;
  dailyHistory: DailyProgress[];
};

export type DailyProgress = {
  date: string;
  freedBytes: number;
  clearedCount: number;
  keptCount: number;
  reviewedCount: number;
};

type PhotoLibraryContextValue = StoredState & {
  ready: boolean;
  scannedPhotoCount: number;
  similarGroupCount: number;
  markForRemoval: (id: string) => void;
  markSetForRemoval: (ids: string[]) => void;
  restoreFromBin: (ids: string[]) => void;
  keepPhoto: (id: string) => void;
  favoritePhoto: (id: string) => void;
  restoreReviewState: (snapshot: ReviewStateSnapshot) => void;
  recordDeleted: (ids: string[], bytes: number) => Promise<void>;
  setScanSummary: (photoCount: number, groupCount: number) => void;
};

export type ReviewStateSnapshot = Pick<
  StoredState,
  'pendingRemovalIds' | 'keptIds' | 'xp' | 'streakDays' | 'bestStreak' | 'lastActivityDate' | 'dailyHistory'
>;

const STORAGE_KEY = 'clearspace-library-state-v2';
const EMPTY_STATE: StoredState = {
  pendingRemovalIds: [],
  keptIds: [],
  freedBytes: 0,
  clearedPhotoCount: 0,
  xp: 0,
  streakDays: 0,
  bestStreak: 0,
  lastActivityDate: null,
  dailyHistory: [],
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextStreak(lastDate: string | null, currentStreak: number, today: string) {
  if (lastDate === today) return currentStreak;
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return lastDate === localDateKey(yesterday) ? currentStreak + 1 : 1;
}

function updateDay(history: DailyProgress[], date: string, delta: Partial<Omit<DailyProgress, 'date'>>) {
  const previous = history.find((day) => day.date === date);
  const nextDay: DailyProgress = {
    date,
    freedBytes: (previous?.freedBytes ?? 0) + (delta.freedBytes ?? 0),
    clearedCount: (previous?.clearedCount ?? 0) + (delta.clearedCount ?? 0),
    keptCount: (previous?.keptCount ?? 0) + (delta.keptCount ?? 0),
    reviewedCount: (previous?.reviewedCount ?? 0) + (delta.reviewedCount ?? 0),
  };
  return [...history.filter((day) => day.date !== date), nextDay]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
}
const PhotoLibraryContext = createContext<PhotoLibraryContextValue | null>(null);

export function PhotoLibraryProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [scannedPhotoCount, setScannedPhotoCount] = useState(0);
  const [similarGroupCount, setSimilarGroupCount] = useState(0);

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
            xp: parsed.xp ?? 0,
            streakDays: parsed.streakDays ?? 0,
            bestStreak: parsed.bestStreak ?? 0,
            lastActivityDate: parsed.lastActivityDate ?? null,
            dailyHistory: parsed.dailyHistory ?? [],
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
    if (stored.pendingRemovalIds.includes(id)) return;
    const today = localDateKey();
    const streakDays = nextStreak(stored.lastActivityDate, stored.streakDays, today);
    const next: StoredState = {
      ...stored,
      xp: stored.xp + 4,
      streakDays,
      bestStreak: Math.max(stored.bestStreak, streakDays),
      lastActivityDate: today,
      dailyHistory: updateDay(stored.dailyHistory, today, { reviewedCount: 1 }),
      pendingRemovalIds: stored.pendingRemovalIds.includes(id)
        ? stored.pendingRemovalIds
        : [...stored.pendingRemovalIds, id],
      keptIds: stored.keptIds.filter((keptId) => keptId !== id),
    };
    persist(next);
  };

  const markSetForRemoval = (ids: string[]) => {
    const newlyMarked = ids.filter((id) => !stored.pendingRemovalIds.includes(id));
    if (newlyMarked.length === 0) return;
    const today = localDateKey();
    const streakDays = nextStreak(stored.lastActivityDate, stored.streakDays, today);
    const marked = new Set(ids);
    persist({
      ...stored,
      xp: stored.xp + newlyMarked.length * 4,
      streakDays,
      bestStreak: Math.max(stored.bestStreak, streakDays),
      lastActivityDate: today,
      dailyHistory: updateDay(stored.dailyHistory, today, { reviewedCount: newlyMarked.length }),
      pendingRemovalIds: [...stored.pendingRemovalIds, ...newlyMarked],
      keptIds: stored.keptIds.filter((id) => !marked.has(id)),
    });
  };

  const restoreFromBin = (ids: string[]) => {
    const restored = new Set(ids);
    const pendingRemovalIds = stored.pendingRemovalIds.filter((id) => !restored.has(id));
    if (pendingRemovalIds.length === stored.pendingRemovalIds.length) return;
    persist({ ...stored, pendingRemovalIds });
  };

  const keepPhoto = (id: string) => {
    if (stored.keptIds.includes(id)) return;
    const today = localDateKey();
    const streakDays = nextStreak(stored.lastActivityDate, stored.streakDays, today);
    const next: StoredState = {
      ...stored,
      xp: stored.xp + 2,
      streakDays,
      bestStreak: Math.max(stored.bestStreak, streakDays),
      lastActivityDate: today,
      dailyHistory: updateDay(stored.dailyHistory, today, { keptCount: 1, reviewedCount: 1 }),
      pendingRemovalIds: stored.pendingRemovalIds.filter((pendingId) => pendingId !== id),
      keptIds: stored.keptIds.includes(id) ? stored.keptIds : [...stored.keptIds, id],
    };
    persist(next);
  };

  const favoritePhoto = (_id: string) => {
    const today = localDateKey();
    const streakDays = nextStreak(stored.lastActivityDate, stored.streakDays, today);
    persist({
      ...stored,
      xp: stored.xp + 3,
      streakDays,
      bestStreak: Math.max(stored.bestStreak, streakDays),
      lastActivityDate: today,
      dailyHistory: updateDay(stored.dailyHistory, today, { reviewedCount: 1 }),
    });
  };

  const restoreReviewState = (snapshot: ReviewStateSnapshot) => {
    persist({ ...stored, ...snapshot });
  };

  const recordDeleted = async (ids: string[], bytes: number) => {
    const deleted = new Set(ids);
    const next: StoredState = {
      ...stored,
      xp: stored.xp + ids.length * 2,
      dailyHistory: updateDay(stored.dailyHistory, localDateKey(), {
        freedBytes: bytes,
        clearedCount: ids.length,
      }),
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

  const value = useMemo(
    () => ({
      ...stored,
      ready,
      scannedPhotoCount,
      similarGroupCount,
      markForRemoval,
      markSetForRemoval,
      restoreFromBin,
      keepPhoto,
      favoritePhoto,
      restoreReviewState,
      recordDeleted,
      setScanSummary,
    }),
    [stored, ready, scannedPhotoCount, similarGroupCount],
  );

  return <PhotoLibraryContext.Provider value={value}>{children}</PhotoLibraryContext.Provider>;
}

export function usePhotoLibrary() {
  const context = useContext(PhotoLibraryContext);
  if (!context) throw new Error('usePhotoLibrary must be used inside PhotoLibraryProvider');
  return context;
}
