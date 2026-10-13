import React from 'react';
import { Aperture, ChevronRight, Settings, Trash2, Trophy, Flame, HardDrive, Heart, Images } from 'lucide-react';
import { formatBytes, levelFromXp } from '../lib/storage';

export default function HomeScreen({ state, onReview, onAchievements, onSettings, onOpenDrawer }) {
  const { level, intoLevel, levelSize, progress } = levelFromXp(state.xp);
  const pending = state.pendingRemovals.length;

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-10 pb-28 no-select">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-ink flex items-center justify-center">
            <Aperture size={18} className="text-honey" strokeWidth={1.6} />
          </div>
          <span className="serif text-[22px] text-ink tracking-tight">clearspace</span>
        </div>
        <button
          data-testid="open-settings-btn"
          onClick={onSettings}
          className="w-10 h-10 rounded-full border border-hairline bg-surface flex items-center justify-center t-colors active:bg-sage"
          aria-label="Open settings"
        >
          <Settings size={17} className="text-ink" strokeWidth={1.6} />
        </button>
      </header>

      {/* Hero */}
      <section className="mt-8">
        <div className="inline-flex items-center gap-2 bg-sage text-sageDeep px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-coral" />
          <span className="eyebrow">Private by default</span>
        </div>
        <h1 className="serif text-ink text-[42px] leading-[1.05] tracking-tight mt-5">
          Keep the moments.<br />
          <span className="italic text-coral">Clear</span> the rest.
        </h1>
        <p className="sans text-muted text-[13px] leading-[1.6] mt-3 max-w-[320px]">
          A calmer camera roll starts with one good swipe. Earn space back as you go.
        </p>
      </section>

      {/* Level + XP card */}
      <section className="mt-6 bg-ink text-cream rounded-[26px] p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-honey">Level {level}</p>
            <p className="serif text-[22px] mt-1 tracking-tight">
              {state.clearedCount > 0 ? `You've reclaimed ${formatBytes(state.freedBytes)}` : 'Begin your first review'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-honey/15 border border-honey/30 flex items-center justify-center">
            <Trophy size={20} className="text-honey" strokeWidth={1.6} />
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 rounded-full bg-cream/10 overflow-hidden">
            <div
              className="h-full bg-honey rounded-full t-transform"
              style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
              data-testid="xp-progress-bar"
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-cream/70 sans">
            <span>{intoLevel} / {levelSize} XP to level {level + 1}</span>
            <span className="flex items-center gap-1"><Flame size={12} className="text-coral" />{state.streakDays}-day streak</span>
          </div>
        </div>
      </section>

      {/* Primary CTA */}
      <button
        data-testid="start-review-btn"
        onClick={onReview}
        className="mt-5 bg-cream border border-ink/5 rounded-[26px] p-5 text-left shadow-soft active:scale-[0.99] t-transform group"
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-coral flex items-center justify-center shadow-pop">
            <Images size={18} className="text-surface" strokeWidth={1.6} />
          </div>
          <ChevronRight size={18} className="text-ink/60 mt-2" strokeWidth={1.6} />
        </div>
        <h2 className="serif text-ink text-[22px] mt-4 tracking-tight">Start a review</h2>
        <p className="sans text-muted text-[12px] mt-1 leading-[1.5] max-w-[260px]">
          Open your camera roll — Clearspace groups bursts and lets you swipe your way to space.
        </p>
      </button>

      {/* Stat row */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <StatTile icon={<HardDrive size={16} className="text-sageDeep" strokeWidth={1.6} />}
          value={formatBytes(state.freedBytes)} label="Reclaimed" tint="bg-sage" testid="stat-freed" />
        <StatTile icon={<Trash2 size={16} className="text-coral" strokeWidth={1.6} />}
          value={state.clearedCount} label="Cleared" tint="bg-coral/10" testid="stat-cleared" />
        <StatTile icon={<Heart size={16} className="text-honeyDeep" strokeWidth={1.6} />}
          value={state.favoriteCount} label="Favourites" tint="bg-honey/20" testid="stat-favorites" />
      </section>

      {pending > 0 && (
        <button
          data-testid="open-delete-drawer-btn"
          onClick={onOpenDrawer}
          className="mt-4 flex items-center gap-3 border border-coral/30 bg-coral/5 rounded-2xl p-4 text-left t-colors active:bg-coral/10"
        >
          <div className="w-9 h-9 rounded-xl bg-coral/15 flex items-center justify-center">
            <Trash2 size={16} className="text-coral" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <p className="sans text-ink text-[13px] font-semibold">{pending} photo{pending === 1 ? '' : 's'} queued</p>
            <p className="sans text-muted text-[11px]">Review and confirm to free the space.</p>
          </div>
          <ChevronRight size={18} className="text-coral" strokeWidth={1.6} />
        </button>
      )}

      {/* Achievements CTA */}
      <button
        data-testid="open-achievements-btn"
        onClick={onAchievements}
        className="mt-4 flex items-center gap-3 bg-surface border border-hairline rounded-2xl p-4 text-left t-colors active:bg-sage/40"
      >
        <div className="w-9 h-9 rounded-xl bg-honey/20 flex items-center justify-center">
          <Trophy size={16} className="text-honeyDeep" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <p className="sans text-ink text-[13px] font-semibold">
            {state.unlocked.length} achievement{state.unlocked.length === 1 ? '' : 's'} unlocked
          </p>
          <p className="sans text-muted text-[11px]">Tap to see your trophy case.</p>
        </div>
        <ChevronRight size={18} className="text-ink/60" strokeWidth={1.6} />
      </button>

      <footer className="mt-auto pt-8 text-center">
        <p className="sans text-muted text-[10px] tracking-wide">
          Nothing leaves your device. Deletes always ask again.
        </p>
      </footer>
    </div>
  );
}

function StatTile({ icon, value, label, tint, testid }) {
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-3 flex flex-col gap-2" data-testid={testid}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}>{icon}</div>
      <div>
        <p className="serif text-ink text-[17px] tracking-tight">{value}</p>
        <p className="sans text-muted text-[10px] uppercase tracking-[0.18em]">{label}</p>
      </div>
    </div>
  );
}
