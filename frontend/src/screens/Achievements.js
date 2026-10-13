import React from 'react';
import * as Icons from 'lucide-react';
import { ACHIEVEMENTS, progressFor } from '../lib/achievements';
import { formatBytes } from '../lib/storage';

const TIER = {
  bronze: 'text-coralDeep bg-coral/10',
  silver: 'text-sageDeep bg-sage',
  gold: 'text-honeyDeep bg-honey/25',
};

export default function AchievementsScreen({ state, onBack }) {
  const unlockedSet = new Set(state.unlocked);
  const stats = {
    cleared: state.clearedCount,
    bytes: state.freedBytes,
    streak: state.streakDays,
    favorites: state.favoriteCount,
    burstSetsCompleted: state.burstSetsCompleted || 0,
    perfectKept: state.perfectKept || 0,
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-12 no-select">
      <header className="flex items-center justify-between">
        <button data-testid="achievements-back-btn" onClick={onBack} aria-label="Back" className="glass w-10 h-10 rounded-[12px] flex items-center justify-center press">
          <Icons.ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <p className="eyebrow text-muted">Trophy case</p>
        <span className="w-10" />
      </header>

      <div className="mt-8 flex items-end justify-between">
        <h1 className="font-grotesk font-bold text-[72px] leading-[0.85] tracking-[-0.06em] tabular">
          {String(state.unlocked.length).padStart(2, '0')}<span className="text-ink/20">/{ACHIEVEMENTS.length}</span>
        </h1>
        <p className="text-[10px] text-muted text-right leading-relaxed">BRONZE<br />SILVER<br />GOLD</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3" data-testid="achievement-grid">
        {ACHIEVEMENTS.map((a, idx) => {
          const Icon = Icons[a.icon] || Icons.Trophy;
          const unlocked = unlockedSet.has(a.id);
          const pct = Math.round(progressFor(a, stats) * 100);
          const current = stats[a.goal.kind] ?? 0;
          const fmt = (v) => (a.goal.kind === 'bytes' ? formatBytes(v) : v);
          return (
            <div key={a.id} data-testid={`achievement-tile-${a.id}`} className={`rounded-tile p-4 ${unlocked ? 'glass-dark text-white sheen' : 'glass'}`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${unlocked ? 'bg-honey text-ink' : 'bg-ink/5 text-ink/35'}`}>
                  <Icon size={17} strokeWidth={2} />
                </div>
                <span className="font-mono text-[9px] opacity-50 tabular">{String(idx + 1).padStart(2, '0')}</span>
              </div>
              <p className="font-grotesk font-bold text-[16px] mt-4 tracking-tight leading-tight">{a.title}</p>
              <p className={`text-[10px] leading-snug mt-1 min-h-[28px] ${unlocked ? 'text-white/60' : 'text-muted'}`}>{a.detail}</p>
              <div className={`mt-3 h-[4px] rounded-full overflow-hidden ${unlocked ? 'bg-white/15' : 'bg-ink/8 bg-ink/10'}`}>
                <div className={`h-full ${unlocked ? 'bg-honey' : 'bg-ink/40'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`eyebrow !text-[8px] px-1.5 py-0.5 rounded-[4px] ${unlocked ? 'bg-white/10 text-honey' : TIER[a.tier]}`}>{a.tier}</span>
                <span className={`text-[9px] tabular ${unlocked ? 'text-white/70' : 'text-muted'}`}>{unlocked ? 'UNLOCKED' : `${fmt(current)}/${fmt(a.goal.value)}`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
