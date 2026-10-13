import React, { useState } from 'react';
import { ArrowLeft, Lock, RefreshCw, Shield, Smartphone, Link2, Copy, Loader2, Check } from 'lucide-react';
import { formatBytes, levelFromXp } from '../lib/storage';
import { createPairCode, redeemPairCode } from '../lib/sync';

export default function SettingsScreen({ state, setState, onBack, onReset, onSync, syncStatus }) {
  const { level } = levelFromXp(state.xp);
  const confirmReset = () => {
    if (window.confirm('Reset Clearspace progress on this device? Your real photos stay untouched.')) onReset();
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-12 no-select">
      <header className="flex items-center justify-between">
        <button data-testid="settings-back-btn" onClick={onBack} aria-label="Back" className="glass w-10 h-10 rounded-[12px] flex items-center justify-center press">
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <p className="eyebrow text-muted">Settings</p>
        <span className="w-10" />
      </header>

      <h1 className="font-grotesk font-bold text-[40px] leading-none mt-8 tracking-[-0.05em]">Control<br />room.</h1>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Cell label="Freed" value={formatBytes(state.freedBytes)} />
        <Cell label="Best" value={`${Math.max(state.bestStreak || 0, state.streakDays)}d`} />
        <Cell label="Level" value={String(level).padStart(2, '0')} />
      </section>

      <SyncPanel state={state} setState={setState} onSync={onSync} syncStatus={syncStatus} />

      <p className="eyebrow text-muted mt-7 mb-2">[B] Privacy</p>
      <div className="glass rounded-tile divide-y divide-ink/5">
        <Row icon={<Lock size={15} />} title="Photos never leave the device" detail="Only counters (MB freed, streak, trophies) sync — never images or filenames." />
        <Row icon={<Shield size={15} />} title="Deletion needs confirmation" detail="Swipes only queue a photo. You confirm the final queue." />
      </div>

      <p className="eyebrow text-muted mt-7 mb-2">[C] Danger zone</p>
      <button data-testid="reset-progress-btn" onClick={confirmReset} className="glass rounded-tile h-14 px-4 flex items-center justify-between text-coral press">
        <span className="font-grotesk font-semibold text-[15px]">Reset progress</span>
        <RefreshCw size={16} />
      </button>

      <p className="text-[10px] text-muted mt-10">CLEARSPACE PHOTOS · v2.0</p>
    </div>
  );
}

function SyncPanel({ state, setState, onSync, syncStatus }) {
  const [code, setCode] = useState('');
  const [myCode, setMyCode] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const wrap = (key, fn) => async () => {
    setBusy(key); setMsg('');
    try { await fn(); } catch (e) { setMsg(e.message || 'Something went wrong'); } finally { setBusy(''); }
  };

  const syncNow = wrap('sync', async () => { await onSync(); setMsg('Progress synced.'); });
  const getCode = wrap('code', async () => {
    await onSync();
    setMyCode(await createPairCode(state.deviceId));
  });
  const link = wrap('link', async () => {
    const { device_id } = await redeemPairCode(code);
    await onSync({ ...state, deviceId: device_id, autoSync: true });
    setCode('');
    setMsg('Linked. Progress merged across devices.');
  });
  const toggleAuto = () => setState((s) => ({ ...s, autoSync: !s.autoSync }));

  const platforms = state.linkedPlatforms || [];

  return (
    <>
      <p className="eyebrow text-muted mt-7 mb-2">[A] Native sync</p>
      <div data-testid="sync-panel" className="glass rounded-tile p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-ink text-white flex items-center justify-center"><Smartphone size={16} /></div>
          <div className="flex-1 min-w-0">
            <p className="font-grotesk font-semibold text-[15px]">Sync with the Clearspace app</p>
            <p data-testid="sync-device-id" className="text-[10px] text-muted truncate">ID {state.deviceId}</p>
          </div>
          <button
            data-testid="auto-sync-toggle" onClick={toggleAuto} aria-pressed={state.autoSync}
            className={`w-12 h-7 rounded-full p-0.5 t-colors ${state.autoSync ? 'bg-mint' : 'bg-ink/15'}`}
          >
            <span className={`block w-6 h-6 rounded-full bg-white shadow t-transform ${state.autoSync ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {['web', 'ios', 'android'].map((p) => (
            <span key={p} data-testid={`platform-chip-${p}`} className={`eyebrow px-2 py-1 rounded-[6px] ${platforms.includes(p) ? 'bg-ink text-white' : 'bg-ink/5 text-muted'}`}>{p}</span>
          ))}
          {state.lastSyncISO && <span className="text-[10px] text-muted ml-auto self-center">LAST {new Date(state.lastSyncISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button data-testid="sync-now-btn" onClick={syncNow} disabled={!!busy} className="h-11 rounded-[10px] bg-ink text-white flex items-center justify-center gap-2 text-[12px] press disabled:opacity-60">
            {busy === 'sync' || syncStatus === 'syncing' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync now
          </button>
          <button data-testid="get-link-code-btn" onClick={getCode} disabled={!!busy} className="h-11 rounded-[10px] bg-white/70 border border-ink/10 flex items-center justify-center gap-2 text-[12px] press disabled:opacity-60">
            {busy === 'code' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Link code
          </button>
        </div>

        {myCode && (
          <div data-testid="link-code-display" className="mt-3 rounded-[10px] bg-ink text-white p-3 flex items-center justify-between">
            <div>
              <p className="eyebrow text-white/50">Enter on other device · 10 min</p>
              <p className="font-mono text-[26px] tracking-[0.3em] mt-1">{myCode.code}</p>
            </div>
            <button data-testid="copy-link-code-btn" onClick={() => navigator.clipboard?.writeText(myCode.code)} className="w-9 h-9 rounded-[8px] bg-white/10 flex items-center justify-center" aria-label="Copy code">
              <Copy size={14} />
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            data-testid="link-code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6} placeholder="ENTER CODE"
            className="flex-1 h-11 rounded-[10px] bg-white/70 border border-ink/10 px-3 font-mono text-[14px] tracking-[0.25em] outline-none focus:border-ink/40"
          />
          <button data-testid="link-device-btn" onClick={link} disabled={code.length !== 6 || !!busy} className="h-11 px-4 rounded-[10px] bg-coral text-white text-[12px] press disabled:opacity-40 flex items-center gap-1.5">
            {busy === 'link' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Link
          </button>
        </div>

        {msg && <p data-testid="sync-message" className="text-[11px] mt-3 text-muted">{msg}</p>}
        {syncStatus === 'error' && !msg && <p className="text-[11px] mt-3 text-coral">Sync failed — check connection.</p>}
      </div>
    </>
  );
}

function Cell({ label, value }) {
  return (
    <div className="glass rounded-tile p-3.5">
      <p className="eyebrow text-muted">{label}</p>
      <p className="font-grotesk font-bold text-[20px] mt-3 tabular">{value}</p>
    </div>
  );
}

function Row({ icon, title, detail }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="w-9 h-9 rounded-[10px] bg-ink/5 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="font-grotesk font-semibold text-[15px]">{title}</p>
        <p className="text-[10px] text-muted mt-1 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}
