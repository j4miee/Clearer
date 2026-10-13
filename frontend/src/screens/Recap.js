import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { formatBytes } from '../lib/storage';
import { weeklyRecap, isRecapDay } from '../lib/recap';
import { shareRecap } from '../lib/shareCard';

export default function RecapScreen({ state, onBack }) {
  const recap = weeklyRecap(state);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const Trophy = recap.topTrophy ? Icons[recap.topTrophy.icon] || Icons.Trophy : Icons.Trophy;

  const share = async () => {
    setBusy(true);
    try {
      const r = await shareRecap(recap);
      setStatus(r === 'shared' ? 'Shared.' : 'Saved recap image to downloads.');
    } catch (e) {
      if (e?.name !== 'AbortError') setStatus('Could not share right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-12 no-select">
      <header className="flex items-center justify-between">
        <button data-testid="recap-back-btn" onClick={onBack} aria-label="Back" className="glass w-10 h-10 rounded-[12px] flex items-center justify-center press">
          <Icons.ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <p className="eyebrow text-muted">Weekly recap</p>
        <span className="w-10" />
      </header>

      {isRecapDay() && (
        <p data-testid="recap-weekend-banner" className="mt-5 glass-chip rounded-[10px] px-3 py-2 text-[10px] text-sageDeep">
          ● YOUR WEEK IS WRAPPED — SHARE IT
        </p>
      )}

      {/* Share card preview */}
      <article data-testid="recap-card" className="mt-5 relative rounded-[20px] overflow-hidden bg-ink text-white p-6 shadow-card">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-coral/60 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-honey/30 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative">
          <div className="flex justify-between eyebrow text-white/55">
            <span>Clearspace / Week</span>
            <span data-testid="recap-range">{recap.range}</span>
          </div>
          <p data-testid="recap-bytes" className="font-grotesk font-bold text-[64px] leading-[0.9] tracking-[-0.06em] mt-6 tabular">{formatBytes(recap.bytes)}</p>
          <p className="text-[11px] text-white/65 mt-2">reclaimed this week · {recap.activeDays}/7 active days</p>

          <div className="mt-6 rounded-[12px] border border-white/15 bg-white/[0.06] backdrop-blur-xl p-4">
            <div className="flex items-end gap-2 h-24">
              {recap.days.map((d) => (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className={`w-full rounded-[4px] ${d.bytes ? 'bg-coral' : 'bg-white/15'}`} style={{ height: `${Math.max(6, (d.bytes / recap.maxBytes) * 100)}%` }} />
                  <span className="text-[9px] text-white/50">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <Cell label="Cleared" value={recap.cleared} testid="recap-cleared" />
            <Cell label="Best streak" value={`${recap.bestStreak}d`} testid="recap-streak" />
            <div data-testid="recap-trophy" className="rounded-[12px] border border-white/15 bg-white/[0.06] p-3">
              <p className="eyebrow text-white/50 !text-[8px]">Top trophy</p>
              <Trophy size={18} className="text-honey mt-2" strokeWidth={2} />
              <p className="font-grotesk font-semibold text-[12px] mt-1 leading-tight text-honey">{recap.topTrophy?.title || '—'}</p>
            </div>
          </div>
        </div>
      </article>

      <button
        data-testid="share-recap-btn" onClick={share} disabled={busy}
        className="mt-4 bg-ink text-white rounded-tile h-14 flex items-center justify-center gap-2 press disabled:opacity-60"
      >
        {busy ? <Icons.Loader2 size={16} className="animate-spin" /> : <Icons.Share size={16} />}
        <span className="font-grotesk font-semibold text-[15px]">Share recap</span>
      </button>
      {status && <p data-testid="share-status" className="text-[11px] text-muted text-center mt-3">{status}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Mini label="Kept" value={recap.kept} />
        <Mini label="Trophies (week)" value={recap.trophiesThisWeek} />
      </div>
    </div>
  );
}

function Cell({ label, value, testid }) {
  return (
    <div data-testid={testid} className="rounded-[12px] border border-white/15 bg-white/[0.06] p-3">
      <p className="eyebrow text-white/50 !text-[8px]">{label}</p>
      <p className="font-grotesk font-bold text-[26px] mt-2 tabular">{value}</p>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="glass rounded-tile p-4">
      <p className="eyebrow text-muted">{label}</p>
      <p className="font-grotesk font-bold text-[26px] mt-2 tabular">{value}</p>
    </div>
  );
}
