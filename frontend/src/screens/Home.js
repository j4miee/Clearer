import React from 'react';
import { ArrowUpRight, Settings, Trash2, Trophy, Flame, Heart, BarChart3, RefreshCw } from 'lucide-react';
import { formatBytes, levelFromXp } from '../lib/storage';
import { weeklyRecap } from '../lib/recap';

export default function HomeScreen({ state, onReview, onAchievements, onSettings, onRecap, onOpenDrawer }) {
  const { level, intoLevel, levelSize, progress } = levelFromXp(state.xp);
  const pending = state.pendingRemovals.length;
  const recap = weeklyRecap(state);
  const [value, unit] = formatBytes(state.freedBytes).split(' ');

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-10 pb-12 no-select">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-ink flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-[3px] border-2 border-coral" />
          </div>
          <div className="leading-none">
            <p className="font-grotesk font-bold text-[19px] tracking-tight">Clearspace</p>
            <p className="eyebrow text-muted mt-1">v2.0 / on-device</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.autoSync && (
            <span data-testid="home-sync-indicator" className="glass-chip rounded-[10px] h-10 px-3 flex items-center gap-1.5 eyebrow text-sageDeep">
              <RefreshCw size={12} strokeWidth={2} /> Synced
            </span>
          )}
          <button
            data-testid="open-settings-btn" onClick={onSettings} aria-label="Open settings"
            className="glass w-10 h-10 rounded-[12px] flex items-center justify-center press"
          >
            <Settings size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Hero metric */}
      <section className="mt-9">
        <p className="eyebrow text-muted">[01] Space reclaimed</p>
        <div className="flex items-end gap-2 mt-2">
          <h1 data-testid="hero-freed" className="font-grotesk font-bold text-[84px] leading-[0.85] tracking-[-0.06em] tabular">{value}</h1>
          <span className="font-grotesk font-semibold text-[28px] text-coral mb-1.5">{unit}</span>
        </div>
        <p className="text-[12px] text-muted mt-3 leading-relaxed">
          Keep the moments. Clear the rest. {state.clearedCount} photos cleared to date.
        </p>
      </section>

      {/* Level tile */}
      <section className="mt-7 glass-dark sheen rounded-tile p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow text-white/50">Level</p>
            <p className="font-grotesk font-bold text-[40px] leading-none mt-1 tabular" data-testid="level-value">{String(level).padStart(2, '0')}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-white/50">Streak</p>
            <p className="font-grotesk font-bold text-[40px] leading-none mt-1 flex items-center gap-1 justify-end tabular">
              <Flame size={22} className="text-coral" strokeWidth={2.2} />{state.streakDays}
            </p>
          </div>
        </div>
        <div className="mt-5 h-[6px] rounded-full bg-white/10 overflow-hidden">
          <div data-testid="xp-progress-bar" className="h-full bg-gradient-to-r from-coral to-honey rounded-full t-transform" style={{ width: `${Math.max(3, Math.round(progress * 100))}%` }} />
        </div>
        <p className="text-[10px] text-white/55 mt-2 tabular">{intoLevel}/{levelSize} XP → LVL {level + 1}</p>
      </section>

      {/* Primary CTA */}
      <button
        data-testid="start-review-btn" onClick={onReview}
        className="mt-3 bg-coral text-white rounded-tile p-5 text-left shadow-pop press flex items-center justify-between"
      >
        <div>
          <p className="eyebrow text-white/70">[02] Review</p>
          <p className="font-grotesk font-bold text-[24px] mt-1 tracking-tight">Start swiping</p>
        </div>
        <div className="w-12 h-12 rounded-[12px] bg-white/15 border border-white/25 flex items-center justify-center">
          <ArrowUpRight size={22} strokeWidth={2} />
        </div>
      </button>

      {/* Stat grid */}
      <section className="mt-3 grid grid-cols-3 gap-3">
        <StatTile testid="stat-freed" label="Freed" value={formatBytes(state.freedBytes)} />
        <StatTile testid="stat-cleared" label="Cleared" value={state.clearedCount} icon={<Trash2 size={13} className="text-coral" />} />
        <StatTile testid="stat-favorites" label="Faves" value={state.favoriteCount} icon={<Heart size={13} className="text-honeyDeep" />} />
      </section>

      {pending > 0 && (
        <button
          data-testid="open-delete-drawer-btn" onClick={onOpenDrawer}
          className="mt-3 glass rounded-tile p-4 flex items-center gap-3 text-left press"
        >
          <div className="w-10 h-10 rounded-[10px] bg-coral flex items-center justify-center"><Trash2 size={16} className="text-white" /></div>
          <div className="flex-1">
            <p className="font-grotesk font-semibold text-[15px]">{pending} queued for removal</p>
            <p className="text-[10px] text-muted">Confirm to reclaim the space</p>
          </div>
          <ArrowUpRight size={16} />
        </button>
      )}

      {/* Weekly recap + trophies */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <button data-testid="open-recap-btn" onClick={onRecap} className="glass rounded-tile p-4 text-left press">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-muted">[03] Week</p>
            <BarChart3 size={14} />
          </div>
          <div className="flex items-end gap-1 h-12 mt-3">
            {recap.days.map((d) => (
              <div key={d.key} className={`flex-1 rounded-[3px] ${d.bytes ? 'bg-coral' : 'bg-ink/10'}`} style={{ height: `${Math.max(10, (d.bytes / recap.maxBytes) * 100)}%` }} />
            ))}
          </div>
          <p className="font-grotesk font-bold text-[18px] mt-3 tabular">{formatBytes(recap.bytes)}</p>
          <p className="text-[10px] text-muted">Weekly recap →</p>
        </button>
        <button data-testid="open-achievements-btn" onClick={onAchievements} className="glass rounded-tile p-4 text-left press">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-muted">[04] Trophies</p>
            <Trophy size={14} />
          </div>
          <p className="font-grotesk font-bold text-[44px] leading-none mt-4 tabular">{state.unlocked.length}<span className="text-ink/25 text-[22px]">/13</span></p>
          <p className="text-[10px] text-muted mt-3">Trophy case →</p>
        </button>
      </section>

      <footer className="mt-auto pt-10 flex items-center justify-between text-[10px] text-muted">
        <span>NOTHING LEAVES YOUR DEVICE</span>
        <span className="tabular">{new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
      </footer>
    </div>
  );
}

function StatTile({ label, value, icon, testid }) {
  return (
    <div data-testid={testid} className="glass rounded-tile p-3.5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted">{label}</p>
        {icon}
      </div>
      <p className="font-grotesk font-bold text-[20px] mt-3 tracking-tight tabular">{value}</p>
    </div>
  );
}
