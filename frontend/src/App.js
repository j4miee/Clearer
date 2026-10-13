import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeScreen from './screens/Home';
import ReviewScreen from './screens/Review';
import AchievementsScreen from './screens/Achievements';
import SettingsScreen from './screens/Settings';
import RecapScreen from './screens/Recap';
import DeleteDrawer from './components/DeleteDrawer';
import AchievementToast from './components/AchievementToast';
import { loadState, saveState, resetState } from './lib/storage';
import { ACHIEVEMENTS, evaluateUnlocks } from './lib/achievements';
import { bumpHistory } from './lib/recap';
import { syncProgress, fromSnapshot } from './lib/sync';
import { haptic } from './lib/photos';

const statsOf = (s) => ({
  cleared: s.clearedCount,
  bytes: s.freedBytes,
  streak: s.streakDays,
  favorites: s.favoriteCount,
  burstSetsCompleted: s.burstSetsCompleted || 0,
  perfectKept: s.perfectKept || 0,
});

export default function App() {
  const [screen, setScreen] = useState('home');
  const [state, setState] = useState(() => loadState());
  const [session, setSession] = useState({ photos: [], groups: [] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const seenUnlocked = useRef(new Set(state.unlocked));

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    const fresh = state.unlocked.filter((id) => !seenUnlocked.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => seenUnlocked.current.add(id));
    haptic([30, 40, 30]);
    fresh.forEach((id, i) => {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement) return;
      const key = `${id}-${Date.now()}`;
      setToasts((t) => [...t, { id: key, achievement }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== key)), 3200 + i * 400);
    });
  }, [state.unlocked]);

  const award = useCallback((next) => {
    const { newly, unlocked } = evaluateUnlocks(statsOf(next), next.unlocked);
    if (!newly.length) return { ...next, unlocked };
    const now = new Date().toISOString();
    const unlockedAt = { ...(next.unlockedAt || {}) };
    newly.forEach((a) => { unlockedAt[a.id] = now; });
    return { ...next, unlocked, unlockedAt, xp: next.xp + newly.reduce((s, a) => s + a.xp, 0) };
  }, []);

  const runSync = useCallback(async (override) => {
    setSyncStatus('syncing');
    try {
      const merged = await syncProgress(override || state);
      setState((s) => fromSnapshot(override ? { ...s, ...override } : s, merged));
      setSyncStatus('ok');
      return merged;
    } catch (e) {
      setSyncStatus('error');
      throw e;
    }
  }, [state]);

  // Debounced auto-sync after progress changes
  const syncKey = `${state.freedBytes}|${state.clearedCount}|${state.keptCount}|${state.favoriteCount}|${state.xp}|${state.unlocked.length}`;
  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;
  useEffect(() => {
    if (!state.autoSync) return;
    const t = setTimeout(() => { runSyncRef.current().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [syncKey, state.autoSync]);

  const touchStreak = useCallback(() => {
    setState((s) => {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      if (s.lastReviewISO === todayISO) return s;
      let streak = 1;
      if (s.lastReviewISO) {
        const diff = Math.round((new Date(todayISO) - new Date(s.lastReviewISO)) / 86_400_000);
        streak = diff === 1 ? s.streakDays + 1 : 1;
      }
      return award({ ...s, lastReviewISO: todayISO, streakDays: streak, bestStreak: Math.max(s.bestStreak || 0, streak) });
    });
  }, [award]);

  const commitKeep = useCallback(() => {
    setState((s) => award({ ...s, keptCount: s.keptCount + 1, xp: s.xp + 2, history: bumpHistory(s.history, { kept: 1 }) }));
  }, [award]);

  const commitRemove = useCallback((photo) => {
    setState((s) => {
      if (s.pendingRemovals.some((p) => p.id === photo.id)) return s;
      const pendingRemovals = [...s.pendingRemovals, { id: photo.id, bytes: photo.size || 0, name: photo.name, url: photo.url }];
      return award({ ...s, pendingRemovals, xp: s.xp + 4 });
    });
  }, [award]);

  const commitFavorite = useCallback((photo) => {
    setState((s) => {
      if (s.favorites.includes(photo.id)) return s;
      return award({
        ...s,
        favorites: [...s.favorites, photo.id],
        favoriteCount: s.favoriteCount + 1,
        xp: s.xp + 3,
        history: bumpHistory(s.history, { favorites: 1 }),
      });
    });
    setSession((ses) => ({ ...ses, photos: ses.photos.map((p) => (p.id === photo.id ? { ...p, favorite: true } : p)) }));
  }, [award]);

  const commitBurstCompleted = useCallback((perfect) => {
    setState((s) => award({
      ...s,
      burstSetsCompleted: (s.burstSetsCompleted || 0) + 1,
      perfectKept: (s.perfectKept || 0) + (perfect ? 1 : 0),
    }));
  }, [award]);

  const undoLast = useCallback((d) => {
    if (!d) return;
    setState((s) => {
      if (d.type === 'remove') return { ...s, pendingRemovals: s.pendingRemovals.filter((p) => p.id !== d.photo.id), xp: Math.max(0, s.xp - 4) };
      if (d.type === 'keep') return { ...s, keptCount: Math.max(0, s.keptCount - 1), xp: Math.max(0, s.xp - 2), history: bumpHistory(s.history, { kept: -1 }) };
      return {
        ...s,
        favorites: s.favorites.filter((id) => id !== d.photo.id),
        favoriteCount: Math.max(0, s.favoriteCount - 1),
        xp: Math.max(0, s.xp - 3),
        history: bumpHistory(s.history, { favorites: -1 }),
      };
    });
  }, []);

  const confirmDelete = useCallback(() => {
    setState((s) => {
      const bytes = s.pendingRemovals.reduce((t, p) => t + (p.bytes || 0), 0);
      const count = s.pendingRemovals.length;
      return award({
        ...s,
        freedBytes: s.freedBytes + bytes,
        clearedCount: s.clearedCount + count,
        pendingRemovals: [],
        xp: s.xp + count * 2,
        history: bumpHistory(s.history, { bytes, cleared: count }),
      });
    });
    haptic([60, 30, 60]);
    setDrawerOpen(false);
    setScreen('home');
  }, [award]);

  const unqueue = useCallback((id) => {
    setState((s) => ({ ...s, pendingRemovals: s.pendingRemovals.filter((p) => p.id !== id) }));
  }, []);

  const resetAll = useCallback(() => {
    setState(resetState());
    seenUnlocked.current = new Set();
    setSession({ photos: [], groups: [] });
  }, []);

  const go = (s) => () => setScreen(s);

  const screens = {
    review: (
      <ReviewScreen
        state={state} session={session} setSession={setSession}
        onKeep={commitKeep} onRemove={commitRemove} onFavorite={commitFavorite}
        onUndo={undoLast} onBurstCompleted={commitBurstCompleted}
        onOpenDrawer={() => setDrawerOpen(true)} onBack={go('home')} onLoadedPhotos={touchStreak}
      />
    ),
    achievements: <AchievementsScreen state={state} onBack={go('home')} />,
    recap: <RecapScreen state={state} onBack={go('home')} />,
    settings: (
      <SettingsScreen
        state={state} setState={setState} onBack={go('home')} onReset={resetAll}
        onSync={runSync} syncStatus={syncStatus}
      />
    ),
    home: (
      <HomeScreen
        state={state} onReview={go('review')} onAchievements={go('achievements')}
        onSettings={go('settings')} onRecap={go('recap')} onOpenDrawer={() => setDrawerOpen(true)}
      />
    ),
  };

  return (
    <div className="min-h-screen w-full flex items-stretch sm:items-center justify-center canvas-grain">
      <div className="relative w-full sm:w-[440px] min-h-screen sm:min-h-[880px] sm:my-6 sm:rounded-[44px] overflow-hidden bg-cream shadow-card sm:border sm:border-white/70">
        <div className="ambient" />
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
          className="relative z-10"
        >
          {screens[screen] || screens.home}
        </motion.div>

        <DeleteDrawer
          open={drawerOpen} onClose={() => setDrawerOpen(false)}
          pending={state.pendingRemovals} onUnqueue={unqueue} onConfirm={confirmDelete}
        />

        <div className="pointer-events-none fixed sm:absolute left-0 right-0 bottom-24 flex flex-col items-center gap-2 z-50">
          <AnimatePresence>
            {toasts.map((t) => <AchievementToast key={t.id} achievement={t.achievement} />)}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
