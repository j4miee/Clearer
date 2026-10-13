import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeScreen from './screens/Home';
import ReviewScreen from './screens/Review';
import AchievementsScreen from './screens/Achievements';
import SettingsScreen from './screens/Settings';
import DeleteDrawer from './components/DeleteDrawer';
import AchievementToast from './components/AchievementToast';
import { loadState, saveState, resetState } from './lib/storage';
import { ACHIEVEMENTS, evaluateUnlocks } from './lib/achievements';
import { haptic } from './lib/photos';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [state, setState] = useState(() => loadState());
  const [session, setSession] = useState({ photos: [], groups: [] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimer = useRef(null);

  // Persist whenever state changes
  useEffect(() => { saveState(state); }, [state]);

  const stats = useMemo(() => ({
    cleared: state.clearedCount,
    bytes: state.freedBytes,
    streak: state.streakDays,
    favorites: state.favoriteCount,
    burstSetsCompleted: state.burstSetsCompleted || 0,
    perfectKept: state.perfectKept || 0,
  }), [state]);

  const pushToast = useCallback((achievement) => {
    setToasts((t) => [...t, { id: `${achievement.id}-${Date.now()}`, achievement }]);
    haptic([30, 40, 30]);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToasts((t) => t.slice(1));
    }, 3200);
  }, []);

  const applyStatsAndAward = useCallback((nextState) => {
    const nextStats = {
      cleared: nextState.clearedCount,
      bytes: nextState.freedBytes,
      streak: nextState.streakDays,
      favorites: nextState.favoriteCount,
      burstSetsCompleted: nextState.burstSetsCompleted || 0,
      perfectKept: nextState.perfectKept || 0,
    };
    const { newly, unlocked } = evaluateUnlocks(nextStats, nextState.unlocked);
    if (newly.length) {
      const bonusXp = newly.reduce((s, a) => s + (a.xp || 0), 0);
      newly.forEach((a) => pushToast(a));
      return { ...nextState, unlocked, xp: nextState.xp + bonusXp };
    }
    return { ...nextState, unlocked };
  }, [pushToast]);

  // Update streak when photos are first loaded for a session
  const touchStreak = useCallback(() => {
    setState((s) => {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      const last = s.lastReviewISO;
      if (last === todayISO) return s;
      let nextStreak = 1;
      if (last) {
        const prev = new Date(last + 'T00:00:00');
        const diff = Math.round((today - prev) / 86_400_000);
        nextStreak = diff === 1 ? s.streakDays + 1 : 1;
      }
      const next = { ...s, lastReviewISO: todayISO, streakDays: nextStreak };
      return applyStatsAndAward(next);
    });
  }, [applyStatsAndAward]);

  const commitKeep = useCallback((photo) => {
    setState((s) => {
      const next = {
        ...s,
        keptCount: s.keptCount + 1,
        xp: s.xp + 2,
      };
      return applyStatsAndAward(next);
    });
  }, [applyStatsAndAward]);

  const commitRemove = useCallback((photo) => {
    setState((s) => {
      const already = s.pendingRemovals.some((p) => p.id === photo.id);
      const pendingRemovals = already
        ? s.pendingRemovals
        : [...s.pendingRemovals, { id: photo.id, bytes: photo.size || 0, name: photo.name, url: photo.url }];
      const next = { ...s, pendingRemovals, xp: s.xp + 4 };
      return applyStatsAndAward(next);
    });
  }, [applyStatsAndAward]);

  const commitFavorite = useCallback((photo) => {
    setState((s) => {
      if (s.favorites.includes(photo.id)) return s;
      const next = {
        ...s,
        favorites: [...s.favorites, photo.id],
        favoriteCount: s.favoriteCount + 1,
        xp: s.xp + 3,
      };
      return applyStatsAndAward(next);
    });
    // Mark it in the session too so UI reflects immediately
    setSession((ses) => ({
      ...ses,
      photos: ses.photos.map((p) => (p.id === photo.id ? { ...p, favorite: true } : p)),
    }));
  }, [applyStatsAndAward]);

  const commitBurstCompleted = useCallback((perfectlyKept) => {
    setState((s) => {
      const next = {
        ...s,
        burstSetsCompleted: (s.burstSetsCompleted || 0) + 1,
        perfectKept: (s.perfectKept || 0) + (perfectlyKept ? 1 : 0),
      };
      return applyStatsAndAward(next);
    });
  }, [applyStatsAndAward]);

  const undoLast = useCallback((decision) => {
    if (!decision) return;
    setState((s) => {
      let next = { ...s };
      if (decision.type === 'remove') {
        next.pendingRemovals = s.pendingRemovals.filter((p) => p.id !== decision.photo.id);
        next.xp = Math.max(0, s.xp - 4);
      } else if (decision.type === 'keep') {
        next.keptCount = Math.max(0, s.keptCount - 1);
        next.xp = Math.max(0, s.xp - 2);
      } else if (decision.type === 'favorite') {
        next.favorites = s.favorites.filter((id) => id !== decision.photo.id);
        next.favoriteCount = Math.max(0, s.favoriteCount - 1);
        next.xp = Math.max(0, s.xp - 3);
      }
      return next;
    });
  }, []);

  const confirmDelete = useCallback(() => {
    setState((s) => {
      const bytes = s.pendingRemovals.reduce((t, p) => t + (p.bytes || 0), 0);
      const count = s.pendingRemovals.length;
      const next = {
        ...s,
        freedBytes: s.freedBytes + bytes,
        clearedCount: s.clearedCount + count,
        pendingRemovals: [],
        xp: s.xp + count * 2, // bonus for committing
      };
      return applyStatsAndAward(next);
    });
    haptic([60, 30, 60]);
    setDrawerOpen(false);
    setScreen('home');
  }, [applyStatsAndAward]);

  const unqueue = useCallback((photoId) => {
    setState((s) => ({ ...s, pendingRemovals: s.pendingRemovals.filter((p) => p.id !== photoId) }));
  }, []);

  const resetAll = useCallback(() => {
    const fresh = resetState();
    setState(fresh);
    setSession({ photos: [], groups: [] });
  }, []);

  const screenEl = (() => {
    switch (screen) {
      case 'review':
        return (
          <ReviewScreen
            state={state}
            session={session}
            setSession={setSession}
            onKeep={commitKeep}
            onRemove={commitRemove}
            onFavorite={commitFavorite}
            onUndo={undoLast}
            onBurstCompleted={commitBurstCompleted}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setScreen('home')}
            onLoadedPhotos={touchStreak}
          />
        );
      case 'achievements':
        return <AchievementsScreen state={state} onBack={() => setScreen('home')} />;
      case 'settings':
        return <SettingsScreen state={state} onBack={() => setScreen('home')} onReset={resetAll} />;
      case 'home':
      default:
        return (
          <HomeScreen
            state={state}
            onReview={() => setScreen('review')}
            onAchievements={() => setScreen('achievements')}
            onSettings={() => setScreen('settings')}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
        );
    }
  })();

  return (
    <div className="min-h-screen w-full flex items-stretch sm:items-center justify-center canvas-grain">
      <div className="relative w-full sm:w-[440px] min-h-screen sm:min-h-[860px] sm:my-6 sm:rounded-[36px] overflow-hidden bg-cream shadow-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
            className="relative"
          >
            {screenEl}
          </motion.div>
        </AnimatePresence>

        <DeleteDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          pending={state.pendingRemovals}
          onUnqueue={unqueue}
          onConfirm={confirmDelete}
        />

        <div className="pointer-events-none fixed sm:absolute left-0 right-0 bottom-24 flex flex-col items-center gap-2 z-50">
          <AnimatePresence>
            {toasts.map((t) => (
              <AchievementToast key={t.id} achievement={t.achievement} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// expose for debug/console
if (typeof window !== 'undefined') {
  window.__CLEARSPACE_ACHIEVEMENTS__ = ACHIEVEMENTS;
}
