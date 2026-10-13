import React from 'react';
import { ArrowLeft, Lock, Check, RefreshCw, Shield, Flame, HardDrive, Images } from 'lucide-react';
import { formatBytes, levelFromXp } from '../lib/storage';

export default function SettingsScreen({ state, onBack, onReset }) {
  const { level, intoLevel, levelSize } = levelFromXp(state.xp);

  const confirmReset = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset Clearspace progress on this device? Your real photos stay untouched.')) {
      onReset();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-28 no-select">
      <header className="flex items-center justify-between">
        <button
          data-testid="settings-back-btn"
          onClick={onBack}
          className="w-10 h-10 rounded-full border border-hairline bg-surface flex items-center justify-center t-colors active:bg-sage"
          aria-label="Back"
        >
          <ArrowLeft size={17} className="text-ink" strokeWidth={1.6} />
        </button>
        <p className="serif text-ink text-[22px] tracking-tight">Settings</p>
        <span className="w-10" />
      </header>

      {/* Private hero */}
      <div className="mt-6 bg-ink text-cream rounded-[26px] p-5 flex items-center gap-4 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-honey/20 border border-honey/30 flex items-center justify-center">
          <Shield size={20} className="text-honey" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <p className="serif text-[18px] tracking-tight">Private by default</p>
          <p className="sans text-cream/70 text-[11px] mt-1">Photo details and ranking stay on this device.</p>
        </div>
        <Check size={18} className="text-honey" strokeWidth={1.8} />
      </div>

      <p className="eyebrow text-muted mt-7 mb-2">Your progress</p>
      <div className="bg-surface border border-hairline rounded-2xl p-4 flex flex-col gap-3">
        <StatRow icon={<HardDrive size={16} className="text-sageDeep" strokeWidth={1.6} />}
          title={`${formatBytes(state.freedBytes)} reclaimed`}
          detail={`${state.clearedCount} photo${state.clearedCount === 1 ? '' : 's'} removed in total.`} />
        <div className="h-px bg-hairline" />
        <StatRow icon={<Flame size={16} className="text-coral" strokeWidth={1.6} />}
          title={`${state.streakDays}-day streak`}
          detail="Review on at least one burst per day to grow your streak." />
        <div className="h-px bg-hairline" />
        <StatRow icon={<Images size={16} className="text-honeyDeep" strokeWidth={1.6} />}
          title={`Level ${level} · ${state.xp} XP`}
          detail={`${intoLevel} / ${levelSize} XP to next level.`} />
      </div>

      <p className="eyebrow text-muted mt-7 mb-2">How picks work</p>
      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden">
        <InfoRow icon={<Lock size={16} className="text-sageDeep" strokeWidth={1.6} />}
          title="Nothing leaves your phone"
          detail="Clearspace is a PWA — the photos you review stay in this browser session." />
        <div className="h-px bg-hairline ml-14" />
        <InfoRow icon={<Shield size={16} className="text-sageDeep" strokeWidth={1.6} />}
          title="Deletion needs confirmation"
          detail="Swipes only mark a photo. You confirm the final queue before anything is removed." />
      </div>

      <p className="eyebrow text-muted mt-7 mb-2">Danger zone</p>
      <button
        data-testid="reset-progress-btn"
        onClick={confirmReset}
        className="bg-surface border border-coral/30 text-coral rounded-2xl py-3 px-4 flex items-center justify-between t-colors active:bg-coral/10"
      >
        <span className="sans text-[13px] font-semibold">Reset my Clearspace progress</span>
        <RefreshCw size={16} strokeWidth={1.6} />
      </button>

      <p className="sans text-muted text-[10px] text-center mt-8 tracking-wide">
        Clearspace Photos · v1.1 · made with care
      </p>
    </div>
  );
}

function StatRow({ icon, title, detail }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="sans text-ink text-[13px] font-semibold">{title}</p>
        <p className="sans text-muted text-[11px] mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, detail }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="sans text-ink text-[13px] font-semibold">{title}</p>
        <p className="sans text-muted text-[11px] mt-0.5 leading-[1.5]">{detail}</p>
      </div>
    </div>
  );
}
