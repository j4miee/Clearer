// Lightweight local persistence for progress + photo decisions.
// Uses localStorage for simple JSON state (small, synchronous, fine for MVP).
// Photo blobs themselves are kept in memory for the active session only.

const KEY = 'clearspace::state::v1';

const DEFAULT_STATE = {
  deviceId: null,
  freedBytes: 0,
  clearedCount: 0,
  keptCount: 0,
  favoriteCount: 0,
  streakDays: 0,
  lastReviewISO: null,
  xp: 0,
  unlocked: [],
  pendingRemovals: [], // [{id, bytes}]
  favorites: [], // ids
  pastDecisions: [], // for undo across sessions (not required but useful)
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_STATE, ...parsed };
    if (!merged.deviceId) {
      merged.deviceId = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      saveState(merged);
    }
    return merged;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage disabled, non-fatal */
  }
}

export function resetState() {
  const next = { ...DEFAULT_STATE };
  next.deviceId = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  saveState(next);
  return next;
}

// XP curve: every level needs 100 more XP than the previous.
// Level 1: 0-99 XP, Level 2: 100-299, Level 3: 300-599...
export function levelFromXp(xp) {
  let level = 1;
  let needed = 100;
  let acc = 0;
  while (xp >= acc + needed) {
    acc += needed;
    level += 1;
    needed += 100;
  }
  return { level, intoLevel: xp - acc, levelSize: needed, progress: (xp - acc) / needed };
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
