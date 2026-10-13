// Achievements catalog. Each tier unlocks the next.
// Icons from lucide-react are referenced by name string.

export const ACHIEVEMENTS = [
  // Space milestones
  { id: 'first-clear',    tier: 'bronze', title: 'First Clear',     detail: 'Remove your first photo.',             icon: 'Sparkles',    goal: { kind: 'cleared', value: 1 },           xp: 20 },
  { id: 'clean-sweep',    tier: 'bronze', title: 'Clean Sweep',     detail: 'Clear 25 photos in total.',             icon: 'Brush',       goal: { kind: 'cleared', value: 25 },          xp: 40 },
  { id: 'power-sweeper',  tier: 'silver', title: 'Power Sweeper',   detail: 'Clear 100 photos in total.',            icon: 'Wand2',       goal: { kind: 'cleared', value: 100 },         xp: 80 },
  { id: 'minimalist',     tier: 'gold',   title: 'Minimalist',      detail: 'Clear 500 photos. Breathe out.',        icon: 'Leaf',        goal: { kind: 'cleared', value: 500 },         xp: 180 },

  // Byte milestones
  { id: 'saver-100mb',    tier: 'bronze', title: 'Space Saver',     detail: 'Reclaim 100 MB of local storage.',      icon: 'HardDrive',   goal: { kind: 'bytes',   value: 100_000_000 },  xp: 40 },
  { id: 'saver-1gb',      tier: 'silver', title: 'Gigabyte Hero',   detail: 'Reclaim 1 GB. Your phone sighs.',       icon: 'Database',    goal: { kind: 'bytes',   value: 1_000_000_000 },xp: 120 },
  { id: 'saver-10gb',     tier: 'gold',   title: 'Vault Breaker',   detail: 'Reclaim 10 GB. Legendary.',             icon: 'Trophy',      goal: { kind: 'bytes',   value: 10_000_000_000 },xp: 300 },

  // Streaks
  { id: 'streak-3',       tier: 'bronze', title: 'On a Roll',       detail: 'Review on 3 different days.',           icon: 'Flame',       goal: { kind: 'streak',  value: 3 },           xp: 30 },
  { id: 'streak-7',       tier: 'silver', title: 'Weekly Tidier',   detail: 'A whole week of mindful swipes.',       icon: 'CalendarCheck',goal:{ kind: 'streak',  value: 7 },           xp: 90 },
  { id: 'streak-30',      tier: 'gold',   title: 'Devoted',         detail: '30-day Clearspace streak.',             icon: 'Crown',       goal: { kind: 'streak',  value: 30 },          xp: 300 },

  // Favorites + burst busters
  { id: 'favourite-5',    tier: 'bronze', title: 'Favourite Finder', detail: 'Star 5 keepers.',                      icon: 'Heart',       goal: { kind: 'favorites', value: 5 },         xp: 20 },
  { id: 'burst-buster',   tier: 'silver', title: 'Burst Buster',     detail: 'Finish reviewing a set of 4+ bursts.', icon: 'Zap',         goal: { kind: 'burstSetsCompleted', value: 1 }, xp: 50 },
  { id: 'perfectionist',  tier: 'gold',   title: 'Perfectionist',    detail: 'Keep every photo in a burst set.',    icon: 'Gem',         goal: { kind: 'perfectKept', value: 1 },       xp: 60 },
];

export function evaluateUnlocks(stats, alreadyUnlocked) {
  const unlockedSet = new Set(alreadyUnlocked);
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (unlockedSet.has(a.id)) continue;
    const current = stats[a.goal.kind] ?? 0;
    if (current >= a.goal.value) {
      unlockedSet.add(a.id);
      newly.push(a);
    }
  }
  return { newly, unlocked: Array.from(unlockedSet) };
}

export function progressFor(a, stats) {
  const current = stats[a.goal.kind] ?? 0;
  return Math.min(1, current / a.goal.value);
}
