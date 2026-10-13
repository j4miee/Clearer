const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function toSnapshot(s) {
  return {
    device_id: s.deviceId,
    platform: 'web',
    freed_bytes: s.freedBytes,
    cleared_count: s.clearedCount,
    kept_count: s.keptCount,
    favorite_count: s.favoriteCount,
    streak_days: s.streakDays,
    best_streak: s.bestStreak || s.streakDays,
    last_review_iso: s.lastReviewISO,
    xp: s.xp,
    burst_sets_completed: s.burstSetsCompleted || 0,
    perfect_kept: s.perfectKept || 0,
    unlocked_achievements: s.unlocked,
    unlocked_at: s.unlockedAt || {},
    history: s.history || {},
  };
}

export function fromSnapshot(s, d) {
  return {
    ...s,
    deviceId: d.device_id,
    freedBytes: d.freed_bytes,
    clearedCount: d.cleared_count,
    keptCount: d.kept_count,
    favoriteCount: d.favorite_count,
    streakDays: d.streak_days,
    bestStreak: d.best_streak,
    lastReviewISO: d.last_review_iso,
    xp: d.xp,
    burstSetsCompleted: d.burst_sets_completed,
    perfectKept: d.perfect_kept,
    unlocked: d.unlocked_achievements,
    unlockedAt: d.unlocked_at,
    history: d.history,
    linkedPlatforms: d.platforms || [],
    lastSyncISO: d.updated_at,
  };
}

async function req(path, opts) {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Request failed (${res.status})`);
  return res.json();
}

export const syncProgress = (state) => req('/progress', { method: 'POST', body: JSON.stringify(toSnapshot(state)) });
export const createPairCode = (deviceId) => req('/pair', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) });
export const redeemPairCode = (code) => req(`/pair/${encodeURIComponent(code.trim())}`);
