import { ACHIEVEMENTS } from './achievements';

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function bumpHistory(history = {}, delta) {
  const k = dayKey();
  const prev = history[k] || { bytes: 0, cleared: 0, kept: 0, favorites: 0 };
  const next = { ...prev };
  Object.entries(delta).forEach(([f, v]) => { next[f] = Math.max(0, (prev[f] || 0) + v); });
  return { ...history, [k]: next };
}

const TIER_RANK = { gold: 3, silver: 2, bronze: 1 };

export function weeklyRecap(state, now = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    days.push({ key: k, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), ...(state.history?.[k] || { bytes: 0, cleared: 0, kept: 0, favorites: 0 }) });
  }
  const weekStart = days[0].key;
  const bytes = days.reduce((t, d) => t + d.bytes, 0);
  const cleared = days.reduce((t, d) => t + d.cleared, 0);
  const kept = days.reduce((t, d) => t + d.kept, 0);
  const activeDays = days.filter((d) => d.bytes || d.cleared || d.kept || d.favorites).length;
  const unlockedAt = state.unlockedAt || {};
  const thisWeek = ACHIEVEMENTS.filter((a) => unlockedAt[a.id] && unlockedAt[a.id].slice(0, 10) >= weekStart);
  const pool = thisWeek.length ? thisWeek : ACHIEVEMENTS.filter((a) => state.unlocked.includes(a.id));
  const topTrophy = [...pool].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.xp - a.xp)[0] || null;
  return {
    days, bytes, cleared, kept, activeDays,
    bestStreak: Math.max(state.bestStreak || 0, state.streakDays || 0),
    topTrophy, trophiesThisWeek: thisWeek.length,
    range: `${new Date(days[0].key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(days[6].key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    maxBytes: Math.max(1, ...days.map((d) => d.bytes)),
  };
}

export const isRecapDay = (now = new Date()) => now.getDay() === 0 || now.getDay() === 6;
