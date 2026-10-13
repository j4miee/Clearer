import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowLeft, Check, Heart, X, Undo2, ImagePlus, ChevronRight, Shield, Loader2 } from 'lucide-react';
import { groupSimilarPhotos } from '../lib/grouping';
import { pickFromInput, pickWithFileSystemAccess, supportsNativePicker, loadSamplePhotos, haptic } from '../lib/photos';
import { formatBytes } from '../lib/storage';

const SWIPE_THRESHOLD = 110;

export default function ReviewScreen({
  state, session, setSession,
  onKeep, onRemove, onFavorite, onUndo, onBurstCompleted,
  onOpenDrawer, onBack, onLoadedPhotos,
}) {
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);
  const burstTrackerRef = useRef(new Map());

  const groups = session.groups;
  const totalCards = useMemo(() => groups.reduce((n, g) => n + g.photos.length, 0), [groups]);
  const decidedIds = useMemo(
    () => new Set(history.map((h) => h.photo.id).concat(state.pendingRemovals.map((p) => p.id))),
    [history, state.pendingRemovals],
  );
  const queue = useMemo(() => {
    const out = [];
    for (const g of groups) for (const p of g.photos) if (!decidedIds.has(p.id)) out.push({ ...p, _groupId: g.id, _groupSize: g.photos.length });
    return out;
  }, [groups, decidedIds]);

  const [current, peek, peek2] = queue;
  const decidedCount = totalCards - queue.length;
  const progress = totalCards > 0 ? decidedCount / totalCards : 0;

  const loadPhotos = useCallback((flat) => {
    if (!flat.length) return;
    const grouped = groupSimilarPhotos(flat);
    setSession({ photos: flat, groups: grouped });
    burstTrackerRef.current = new Map(grouped.map((g) => [g.id, { total: g.photos.length }]));
    onLoadedPhotos?.();
  }, [setSession, onLoadedPhotos]);

  const withLoading = async (fn) => {
    setPermissionError('');
    setLoading(true);
    try { loadPhotos(await fn()); } catch (err) { setPermissionError(err?.message || 'Could not open your photos.'); } finally { setLoading(false); }
  };

  const triggerFileInput = () => { setPermissionError(''); fileInputRef.current?.click(); };
  const onInputChange = (e) => withLoading(async () => { const items = await pickFromInput(e.target); e.target.value = ''; return items; });

  const recordBurstProgress = useCallback((groupId, decision) => {
    const t = burstTrackerRef.current.get(groupId);
    if (!t) return;
    const next = { ...t, decided: (t.decided || 0) + 1, removed: (t.removed || 0) + (decision === 'remove' ? 1 : 0) };
    burstTrackerRef.current.set(groupId, next);
    if (next.decided === t.total && t.total >= 4) onBurstCompleted?.(next.removed === 0);
  }, [onBurstCompleted]);

  const commit = useCallback((decision) => {
    if (!current) return;
    setHistory((h) => [...h, { type: decision, photo: current, groupId: current._groupId }]);
    if (decision === 'keep') { onKeep(current); haptic([25]); }
    else if (decision === 'remove') { onRemove(current); haptic([40]); }
    else { onFavorite(current); haptic([20, 20, 40]); }
    recordBurstProgress(current._groupId, decision);
  }, [current, onKeep, onRemove, onFavorite, recordBurstProgress]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    const t = burstTrackerRef.current.get(last.groupId);
    if (t) burstTrackerRef.current.set(last.groupId, { ...t, decided: Math.max(0, (t.decided || 1) - 1), removed: Math.max(0, (t.removed || 0) - (last.type === 'remove' ? 1 : 0)) });
    onUndo(last);
    haptic([15]);
  }, [history, onUndo]);

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-10 no-select">
      <header className="flex items-center justify-between">
        <button data-testid="review-back-btn" onClick={onBack} aria-label="Back" className="glass w-10 h-10 rounded-[12px] flex items-center justify-center press">
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="text-center">
          <p className="eyebrow text-muted">Review</p>
          <p className="font-grotesk font-bold text-[17px] tracking-tight">Similar moments</p>
        </div>
        <button data-testid="review-queue-btn" onClick={onOpenDrawer} aria-label="Open delete queue" className="glass relative w-10 h-10 rounded-[12px] flex items-center justify-center press">
          <span className="font-mono text-[12px] font-bold tabular">{state.pendingRemovals.length}</span>
          {state.pendingRemovals.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-[4px] bg-coral border-2 border-cream" />}
        </button>
      </header>

      {session.photos.length === 0 ? (
        <PermissionPanel
          loading={loading} error={permissionError} supportsNative={supportsNativePicker()}
          onPick={triggerFileInput}
          onNativePicker={() => withLoading(pickWithFileSystemAccess)}
          onSamples={() => withLoading(loadSamplePhotos)}
        />
      ) : (
        <>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(totalCards, 24)}, 1fr)` }}>
              {Array.from({ length: Math.min(totalCards, 24) }).map((_, i) => (
                <div key={i} className={`h-[5px] rounded-[2px] ${i < Math.round(progress * Math.min(totalCards, 24)) ? 'bg-ink' : 'bg-ink/10'}`} />
              ))}
            </div>
            <span data-testid="review-progress-label" className="font-mono text-[11px] text-muted tabular">{decidedCount} / {totalCards}</span>
            <div data-testid="review-progress-bar" className="hidden" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] text-center">
            <span className="glass-chip rounded-[8px] py-1.5 text-coral">← REMOVE</span>
            <span className="glass-chip rounded-[8px] py-1.5 text-honeyDeep">↑ FAVOURITE</span>
            <span className="glass-chip rounded-[8px] py-1.5 text-sageDeep">KEEP →</span>
          </div>

          <div className="relative mt-4 h-[460px]" data-testid="review-card-stack">
            {!current ? (
              <AllDonePanel photosCount={totalCards} onOpenDrawer={onOpenDrawer} onPickMore={triggerFileInput} pending={state.pendingRemovals.length} />
            ) : (
              <>
                {peek2 && <StackCard key={peek2.id} depth={2} photo={peek2} />}
                {peek && <StackCard key={peek.id} depth={1} photo={peek} />}
                <SwipeCard key={current.id} photo={current} isFavorite={state.favorites.includes(current.id)} onDecision={commit} />
              </>
            )}
          </div>

          <div className="mt-5 glass rounded-[18px] p-2 flex items-center gap-2">
            <ActionButton tint="coral" onClick={() => commit('remove')} disabled={!current} testid="btn-remove" label="Remove"><X size={20} strokeWidth={2.2} /></ActionButton>
            <ActionButton tint="honey" onClick={() => commit('favorite')} disabled={!current} testid="btn-favorite" label="Love"><Heart size={20} strokeWidth={2.2} /></ActionButton>
            <ActionButton tint="ink" onClick={() => commit('keep')} disabled={!current} testid="btn-keep" label="Keep"><Check size={20} strokeWidth={2.2} /></ActionButton>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button data-testid="undo-btn" onClick={undo} disabled={!history.length} className="glass h-11 rounded-[12px] flex items-center justify-center gap-2 text-[11px] disabled:opacity-40 press">
              <Undo2 size={14} /> UNDO
            </button>
            <button data-testid="add-more-photos-btn" onClick={triggerFileInput} className="glass h-11 rounded-[12px] flex items-center justify-center gap-2 text-[11px] press">
              <ImagePlus size={14} /> ADD PHOTOS
            </button>
          </div>
        </>
      )}

      <input ref={fileInputRef} data-testid="photo-file-input" type="file" accept="image/*" multiple className="hidden" onChange={onInputChange} />
    </div>
  );
}

function SwipeCard({ photo, isFavorite, onDecision }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-10, 10]);
  const keepOpacity = useTransform(x, [20, 140], [0, 1]);
  const removeOpacity = useTransform(x, [-140, -20], [1, 0]);
  const favOpacity = useTransform(y, [-140, -20], [1, 0]);
  const crossed = useRef(null);

  const handleDrag = (_, { offset }) => {
    const zone = offset.y < -SWIPE_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x) ? 'up'
      : offset.x > SWIPE_THRESHOLD ? 'right' : offset.x < -SWIPE_THRESHOLD ? 'left' : null;
    if (zone && zone !== crossed.current) haptic([12]);
    crossed.current = zone;
  };

  const handleDragEnd = (_, { offset, velocity }) => {
    if (offset.y < -SWIPE_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) onDecision('favorite');
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > 600) onDecision('keep');
    else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -600) onDecision('remove');
  };

  return (
    <motion.div
      data-testid="swipe-card-active"
      className="absolute inset-0 rounded-[20px] overflow-hidden bg-ink shadow-card will-transform border border-white/60"
      style={{ x, y, rotate }}
      drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} dragElastic={0.6}
      onDrag={handleDrag} onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      whileTap={{ scale: 0.985 }}
    >
      <img src={photo.url} alt={photo.name || 'photo'} className="w-full h-full object-cover pointer-events-none" draggable={false} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="absolute top-3 left-3 glass-chip rounded-[8px] px-2.5 py-1.5 text-[9px] text-ink">
        SET · {String(photo._groupSize).padStart(2, '0')}
      </div>
      {isFavorite && (
        <div className="absolute top-3 right-3 bg-honey rounded-[8px] px-2.5 py-1.5 flex items-center gap-1 text-[9px] text-ink">
          <Heart size={10} fill="#0E1314" strokeWidth={0} /> FAVE
        </div>
      )}

      <motion.div style={{ opacity: keepOpacity }} className="absolute inset-0 bg-mint/25 flex items-start justify-end p-6 pointer-events-none">
        <span className="glass-chip rounded-[10px] px-3 py-2 font-grotesk font-bold text-[18px] text-sageDeep">KEEP</span>
      </motion.div>
      <motion.div style={{ opacity: removeOpacity }} className="absolute inset-0 bg-coral/30 flex items-start justify-start p-6 pointer-events-none">
        <span className="glass-chip rounded-[10px] px-3 py-2 font-grotesk font-bold text-[18px] text-coralDeep">REMOVE</span>
      </motion.div>
      <motion.div style={{ opacity: favOpacity }} className="absolute inset-0 bg-honey/30 flex items-start justify-center p-6 pointer-events-none">
        <span className="glass-chip rounded-[10px] px-3 py-2 font-grotesk font-bold text-[18px] text-honeyDeep">FAVOURITE</span>
      </motion.div>

      <div className="absolute left-3 right-3 bottom-3 glass-chip rounded-[12px] px-3.5 py-3 flex items-center justify-between">
        <p className="font-grotesk font-semibold text-[14px] text-ink truncate max-w-[55%]">{photo.name || 'Photo'}</p>
        <p className="font-mono text-[10px] text-ink/70 tabular">
          {photo.width && photo.height ? `${((photo.width * photo.height) / 1_000_000).toFixed(1)}MP` : '—'} · {formatBytes(photo.size)}
        </p>
      </div>
    </motion.div>
  );
}

function StackCard({ photo, depth }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-[20px] overflow-hidden bg-ink border border-white/60"
      style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.04})`, opacity: depth === 1 ? 0.8 : 0.5, zIndex: -depth }}
    >
      <img src={photo.url} alt="" className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}

function ActionButton({ children, tint, onClick, disabled, testid, label }) {
  const bg = { coral: 'bg-coral text-white', honey: 'bg-honey text-ink', ink: 'bg-ink text-white' }[tint];
  return (
    <button data-testid={testid} onClick={onClick} disabled={disabled} className={`${bg} flex-1 h-14 rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-40 press`}>
      {children}
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase">{label}</span>
    </button>
  );
}

function PermissionPanel({ loading, onPick, onNativePicker, onSamples, supportsNative, error }) {
  return (
    <div className="mt-8">
      <h1 className="font-grotesk font-bold text-[44px] leading-[0.92] tracking-[-0.05em]">Your camera<br />roll, <span className="text-coral">decluttered.</span></h1>
      <div className="mt-6 glass rounded-tile p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-ink text-white flex items-center justify-center"><Shield size={16} /></div>
          <div>
            <p className="font-grotesk font-semibold text-[15px]">Allow photo access</p>
            <p className="text-[10px] text-muted">Read locally. Never uploaded.</p>
          </div>
        </div>
        <p className="text-[11px] text-muted leading-relaxed mt-4">
          Your phone will ask which photos Clearspace can see — choose “Select all” for the full library.
          Bursts are grouped on-device by capture time and dimensions.
        </p>
        <button data-testid="allow-photo-access-btn" onClick={onPick} disabled={loading} className="mt-5 w-full h-14 bg-ink text-white rounded-[12px] flex items-center justify-center gap-2 press disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          <span className="font-grotesk font-semibold text-[15px]">Open camera roll</span>
        </button>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {supportsNative && (
            <button data-testid="native-picker-btn" onClick={onNativePicker} disabled={loading} className="h-11 rounded-[10px] bg-white/70 border border-ink/10 text-[11px] flex items-center justify-center gap-1 press">
              <ChevronRight size={13} /> FILE PICKER
            </button>
          )}
          <button data-testid="try-sample-btn" onClick={onSamples} disabled={loading} className={`h-11 rounded-[10px] bg-coral/10 text-coralDeep text-[11px] press ${supportsNative ? '' : 'col-span-2'}`}>
            TRY SAMPLE PHOTOS
          </button>
        </div>
        {error && <p className="mt-3 bg-coral/10 text-coralDeep text-[11px] p-3 rounded-[10px]">{error}</p>}
      </div>
    </div>
  );
}

function AllDonePanel({ photosCount, onOpenDrawer, onPickMore, pending }) {
  return (
    <div className="h-full glass rounded-[20px] flex flex-col justify-end p-6">
      <div className="w-12 h-12 rounded-[12px] bg-mint flex items-center justify-center"><Check size={22} strokeWidth={2.4} /></div>
      <h3 className="font-grotesk font-bold text-[34px] leading-[0.95] tracking-[-0.04em] mt-5">All {photosCount}<br />reviewed.</h3>
      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        {pending > 0 ? 'Confirm the queue to reclaim the space, or keep going.' : 'Pick more photos or come back tomorrow to keep the streak alive.'}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-5">
        {pending > 0 && (
          <button data-testid="confirm-queue-btn" onClick={onOpenDrawer} className="h-12 bg-coral text-white rounded-[10px] text-[11px] press">REVIEW QUEUE ({pending})</button>
        )}
        <button data-testid="pick-more-btn" onClick={onPickMore} className={`h-12 bg-ink text-white rounded-[10px] text-[11px] press ${pending > 0 ? '' : 'col-span-2'}`}>PICK MORE</button>
      </div>
    </div>
  );
}
