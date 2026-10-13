import React from 'react';
import * as Icons from 'lucide-react';
import { ACHIEVEMENTS, progressFor } from '../lib/achievements';
import { formatBytes } from '../lib/storage';

const TIER_STYLES = {
  bronze: { ring: 'ring-coral/20', pill: 'bg-coral/10 text-coral', dot: 'bg-coral' },
  silver: { ring: 'ring-sageDeep/20', pill: 'bg-sage text-sageDeep', dot: 'bg-sageDeep' },
  gold:   { ring: 'ring-honeyDeep/30', pill: 'bg-honey/30 text-honeyDeep', dot: 'bg-honeyDeep' },
};

function iconComponent(name) {
  const Comp = Icons[name] || Icons.Trophy;
  return Comp;
}

function describeGoal(a, state) {
  const stats = {
    cleared: state.clearedCount,
    bytes: state.freedBytes,
    streak: state.streakDays,
    favorites: state.favoriteCount,
    burstSetsCompleted: state.burstSetsCompleted || 0,
    perfectKept: state.perfectKept || 0,
  };
  const current = stats[a.goal.kind] ?? 0;
  const goal = a.goal.value;
  const fmt = (v) => a.goal.kind === 'bytes' ? formatBytes(v) : v;
  return { current, goal, label: `${fmt(current)} / ${fmt(goal)}` };
}

export default function AchievementsScreen({ state, onBack }) {
  const unlockedSet = new Set(state.unlocked);
  const unlockedCount = state.unlocked.length;

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-28 no-select">
      <header className="flex items-center justify-between">
        <button
          data-testid="achievements-back-btn"
          onClick={onBack}
          className="w-10 h-10 rounded-full border border-hairline bg-surface flex items-center justify-center t-colors active:bg-sage"
          aria-label="Back"
        >
          <Icons.ArrowLeft size={17} className="text-ink" strokeWidth={1.6} />
        </button>
        <p className="serif text-ink text-[22px] tracking-tight">Trophies</p>
        <span className="w-10" />
      </header>

      <div className="mt-6 bg-ink text-cream rounded-[26px] p-5 flex items-center gap-4 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-honey/20 border border-honey/30 flex items-center justify-center">
          <Icons.Trophy size={20} className="text-honey" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <p className="serif text-[20px] tracking-tight">{unlockedCount} of {ACHIEVEMENTS.length} unlocked</p>
          <p className="sans text-cream/70 text-[11px] mt-1">Chase bronze, silver and gold tiers.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3" data-testid="achievement-grid">
        {ACHIEVEMENTS.map((a) => {
          const Icon = iconComponent(a.icon);
          const unlocked = unlockedSet.has(a.id);
          const style = TIER_STYLES[a.tier];
          const goal = describeGoal(a, state);
          const pct = Math.round(progressFor(a, {
            cleared: state.clearedCount,
            bytes: state.freedBytes,
            streak: state.streakDays,
            favorites: state.favoriteCount,
            burstSetsCompleted: state.burstSetsCompleted || 0,
            perfectKept: state.perfectKept || 0,
          }) * 100);
          return (
            <div
              key={a.id}
              data-testid={`achievement-tile-${a.id}`}
              className={`rounded-2xl p-4 border ${unlocked ? 'bg-surface border-hairline shadow-soft' : 'bg-surface/60 border-hairline'} relative overflow-hidden`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ring-4 ${style.ring} ${unlocked ? 'bg-ink text-honey' : 'bg-cream text-ink/40'}`}>
                <Icon size={18} strokeWidth={1.6} />
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className={`eyebrow ${style.pill} px-2 py-0.5 rounded-full`}>{a.tier}</span>
              </div>
              <p className="serif text-ink text-[16px] mt-2 tracking-tight">{a.title}</p>
              <p className="sans text-muted text-[11px] leading-[1.4] mt-1 min-h-[32px]">{a.detail}</p>
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden">
                  <div className={`h-full ${unlocked ? 'bg-honeyDeep' : 'bg-ink/30'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="sans text-[10px] text-muted mt-1.5">{unlocked ? '✓ Unlocked' : goal.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
