import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, Heart, X, Undo2, ImagePlus, Sparkles, ChevronRight, Shield, Loader2,
} from 'lucide-react';
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
  const [history, setHistory] = useState([]); // decisions, for undo
  const fileInputRef = useRef(null);
  const burstTrackerRef = useRef(new Map()); // groupId -> {keptCount, total}

  const groups = session.groups;
  const totalCards = useMemo(() => groups.reduce((n, g) => n + g.photos.length, 0), [groups]);

  // Current card is the first non-decided photo across groups
  const decidedIds = useMemo(() => new Set(history.map((h) => h.photo.id).concat(state.pendingRemovals.map((p) => p.id))), [history, state.pendingRemovals]);
  const queue = useMemo(() => {
    const out = [];
    for (const g of groups) {
      for (const p of g.photos) {
        if (!decidedIds.has(p.id)) out.push({ ...p, _groupId: g.id, _groupSize: g.photos.length });
      }
    }
    return out;
  }, [groups, decidedIds]);

  const current = queue[0];
  const peek = queue[1];
  const peek2 = queue[2];
  const decidedCount = totalCards - queue.length;
  const progress = totalCards > 0 ? decidedCount / totalCards : 0;

  const handleFilesSelected = useCallback(async (files) => {
    const photos = await Promise.all([...files]);
    const flat = photos.flat();
    if (!flat.length) return;
    const grouped = groupSimilarPhotos(flat);
    setSession({ photos: flat, groups: grouped });
    burstTrackerRef.current = new Map(grouped.map((g) => [g.id, { keptCount: 0, total: g.photos.length }]));
    onLoadedPhotos?.();
  }, [setSession, onLoadedPhotos]);

  const triggerFileInput = () => {
    setPermissionError('');
    fileInputRef.current?.click();
  };

  const openSystemPicker = async () => {
    setPermissionError('');
    setLoading(true);
    try {
      const items = await pickWithFileSystemAccess();
      await handleFilesSelected([Promise.resolve(items)]);
    } catch (err) {
      setPermissionError(err?.message || 'Could not open the system picker.');
    } finally {
      setLoading(false);
    }
  };

  const loadSamples = async () => {
    setLoading(true);
    try {
      const samples = await loadSamplePhotos();
      await handleFilesSelected([Promise.resolve(samples)]);
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = async (e) => {
    setLoading(true);
    try {
      const items = await pickFromInput(e.target);
      e.target.value = ''; // allow reselect
      await handleFilesSelected([Promise.resolve(items)]);
    } finally {
      setLoading(false);
    }
  };

  const recordBurstProgress = useCallback((groupId, decision) => {
    const t = burstTrackerRef.current.get(groupId);
    if (!t) return;
    const decided = (t.decidedCount || 0) + 1;
    const kept = (t.keptCount || 0) + (decision === 'keep' || decision === 'favorite' ? 1 : 0);
    const removed = (t.removedCount || 0) + (decision === 'remove' ? 1 : 0);
    const next = { ...t, decidedCount: decided, keptCount: kept, removedCount: removed };
    burstTrackerRef.current.set(groupId, next);
    if (decided === t.total) {
      // all photos in burst reviewed
      onBurstCompleted?.(removed === 0 && t.total > 1);
    }
  }, [onBurstCompleted]);

  const commit = useCallback((decision) => {
    if (!current) return;
    const payload = { type: decision, photo: current, groupId: current._groupId };
    setHistory((h) => [...h, payload]);
    if (decision === 'keep') { onKeep(current); haptic([25]); }
    else if (decision === 'remove') { onRemove(current); haptic([40]); }
    else if (decision === 'favorite') { onFavorite(current); haptic([20, 20, 40]); }
    recordBurstProgress(current._groupId, decision);
  }, [current, onKeep, onRemove, onFavorite, recordBurstProgress]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    onUndo(last);
    haptic([15]);
  }, [history, onUndo]);

  const noPhotos = session.photos.length === 0;

  return (
    <div className="min-h-screen w-full flex flex-col px-5 pt-8 pb-28 no-select">
      <header className="flex items-center justify-between">
        <button
          data-testid="review-back-btn"
          onClick={onBack}
          className="w-10 h-10 rounded-full border border-hairline bg-surface flex items-center justify-center t-colors active:bg-sage"
          aria-label="Back"
        >
          <ArrowLeft size={17} className="text-ink" strokeWidth={1.6} />
        </button>
        <div className="text-center">
          <p className="eyebrow text-muted">On-device review</p>
          <p className="serif text-ink text-[18px] tracking-tight">Similar moments</p>
        </div>
        <button
          data-testid="review-queue-btn"
          onClick={onOpenDrawer}
          className="relative w-10 h-10 rounded-full border border-hairline bg-surface flex items-center justify-center t-colors active:bg-sage"
          aria-label="Open delete queue"
        >
          <span className="text-ink text-[11px] font-bold sans">{state.pendingRemovals.length}</span>
          {state.pendingRemovals.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-coral border-2 border-cream" />
          )}
        </button>
      </header>

      {noPhotos ? (
        <PermissionPanel
          loading={loading}
          onPick={triggerFileInput}
          onNativePicker={openSystemPicker}
          onSamples={loadSamples}
          supportsNative={supportsNativePicker()}
          error={permissionError}
        />
      ) : (
        <>
          {/* Progress bar */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
              <div
                className="h-full bg-ink rounded-full t-transform"
                style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
                data-testid="review-progress-bar"
              />
            </div>
            <span className="sans text-[11px] text-muted" data-testid="review-progress-label">
              {decidedCount} / {totalCards}
            </span>
          </div>

          <p className="sans text-muted text-[12px] text-center mt-4">
            Swipe <span className="text-sageDeep font-semibold">right · keep</span> ·{' '}
            <span className="text-coral font-semibold">left · remove</span> ·{' '}
            <span className="text-honeyDeep font-semibold">up · favourite</span>
          </p>

          {/* Card stack */}
          <div className="relative mt-5 h-[460px]" data-testid="review-card-stack">
            {!current ? (
              <AllDonePanel
                photosCount={totalCards}
                onOpenDrawer={onOpenDrawer}
                onPickMore={triggerFileInput}
                pending={state.pendingRemovals.length}
              />
            ) : (
              <>
                {peek2 && <StackCard key={peek2.id} depth={2} photo={peek2} />}
                {peek && <StackCard key={peek.id} depth={1} photo={peek} />}
                <SwipeCard
                  key={current.id}
                  photo={current}
                  isFavorite={state.favorites.includes(current.id)}
                  onDecision={commit}
                />
              </>
            )}
          </div>

          {/* Action row */}
          <div className="mt-5 flex items-center justify-center gap-4">
            <ActionButton tint="coral" onClick={() => commit('remove')} disabled={!current} testid="btn-remove">
              <X size={22} />
            </ActionButton>
            <ActionButton tint="honey" onClick={() => commit('favorite')} disabled={!current} testid="btn-favorite" large>
              <Heart size={22} />
            </ActionButton>
            <ActionButton tint="sage" onClick={() => commit('keep')} disabled={!current} testid="btn-keep">
              <Check size={22} />
            </ActionButton>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              data-testid="undo-btn"
              onClick={undo}
              disabled={!history.length}
              className="flex items-center gap-2 text-ink/80 text-[12px] sans py-2 px-3 rounded-full border border-hairline bg-surface disabled:opacity-40 t-colors active:bg-sage"
            >
              <Undo2 size={14} strokeWidth={1.8} /> Undo
            </button>
            <button
              data-testid="add-more-photos-btn"
              onClick={triggerFileInput}
              className="flex items-center gap-2 text-ink/80 text-[12px] sans py-2 px-3 rounded-full border border-hairline bg-surface t-colors active:bg-sage"
            >
              <ImagePlus size={14} strokeWidth={1.8} /> Add photos
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        data-testid="photo-file-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

/* ---------- cards ---------- */

function SwipeCard({ photo, isFavorite, onDecision }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const keepOpacity = useTransform(x, [20, 160], [0, 1]);
  const removeOpacity = useTransform(x, [-160, -20], [1, 0]);
  const favOpacity = useTransform(y, [-160, -20], [1, 0]);

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.y < -SWIPE_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) {
      onDecision('favorite');
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 600) {
      onDecision('keep');
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -600) {
      onDecision('remove');
    }
  };

  return (
    <motion.div
      data-testid="swipe-card-active"
      className="absolute inset-0 rounded-[28px] overflow-hidden bg-surface border border-hairline shadow-card will-transform"
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.985 }}
    >
      <img
        src={photo.url}
        alt={photo.name || 'photo'}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

      {/* Group / meta */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-cream/90 backdrop-blur px-3 py-1.5 rounded-full">
        <Sparkles size={12} className="text-coral" strokeWidth={1.8} />
        <span className="eyebrow text-ink">Burst set · {photo._groupSize}</span>
      </div>

      {isFavorite && (
        <div className="absolute top-4 right-4 bg-honey text-ink px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Heart size={12} fill="#19272B" strokeWidth={0} />
          <span className="eyebrow">Favourite</span>
        </div>
      )}

      {/* Swipe stamps */}
      <motion.div style={{ opacity: keepOpacity }} className="absolute top-20 right-6 border-2 border-sageDeep text-sageDeep bg-cream/85 px-3 py-1 rounded-md -rotate-[12deg]">
        <span className="serif tracking-[0.2em] text-[14px]">KEEP</span>
      </motion.div>
      <motion.div style={{ opacity: removeOpacity }} className="absolute top-20 left-6 border-2 border-coral text-coral bg-cream/85 px-3 py-1 rounded-md rotate-[-12deg]">
        <span className="serif tracking-[0.2em] text-[14px]">REMOVE</span>
      </motion.div>
      <motion.div style={{ opacity: favOpacity }} className="absolute left-1/2 -translate-x-1/2 top-24 border-2 border-honeyDeep text-honeyDeep bg-cream/85 px-3 py-1 rounded-md">
        <span className="serif tracking-[0.2em] text-[14px]">★ LOVE</span>
      </motion.div>

      <div className="absolute left-5 right-5 bottom-5 text-cream">
        <p className="sans text-[14px] font-semibold truncate">{photo.name || 'Photo'}</p>
        <p className="sans text-[11px] text-cream/80 mt-1">
          {photo.width && photo.height ? `${((photo.width * photo.height) / 1_000_000).toFixed(1)} MP` : 'Dimensions unknown'}
          {' · '}
          {formatBytes(photo.size)}
        </p>
      </div>
    </motion.div>
  );
}

function StackCard({ photo, depth }) {
  const scale = depth === 1 ? 0.96 : 0.92;
  const translate = depth === 1 ? 12 : 24;
  const opacity = depth === 1 ? 0.85 : 0.55;
  return (
    <div
      className="absolute inset-0 rounded-[28px] overflow-hidden bg-surface border border-hairline"
      style={{ transform: `translateY(${translate}px) scale(${scale})`, opacity, zIndex: -depth }}
      aria-hidden
    >
      <img src={photo.url} alt="" className="w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}

function ActionButton({ children, tint, onClick, disabled, testid, large }) {
  const bg = tint === 'coral' ? 'bg-coral text-surface' : tint === 'honey' ? 'bg-honey text-ink' : 'bg-ink text-cream';
  const size = large ? 'w-16 h-16' : 'w-14 h-14';
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      className={`${size} ${bg} rounded-full flex items-center justify-center shadow-soft disabled:opacity-40 active:scale-95 t-transform`}
    >
      {children}
    </button>
  );
}

/* ---------- panels ---------- */

function PermissionPanel({ loading, onPick, onNativePicker, onSamples, supportsNative, error }) {
  return (
    <div className="mt-10 bg-surface border border-hairline rounded-3xl p-7 flex flex-col items-center text-center shadow-soft">
      <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center">
        <Shield size={22} className="text-sageDeep" strokeWidth={1.6} />
      </div>
      <h2 className="serif text-ink text-[22px] mt-5 tracking-tight">Allow photo access</h2>
      <p className="sans text-muted text-[12px] leading-[1.6] mt-2 max-w-[300px]">
        Clearspace reads your photos only on this device. Nothing is uploaded —
        groups are built here from capture time and dimensions.
      </p>
      <button
        data-testid="allow-photo-access-btn"
        onClick={onPick}
        disabled={loading}
        className="mt-6 bg-ink text-cream rounded-full py-3 px-6 flex items-center gap-2 shadow-card active:scale-[0.98] t-transform disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        <span className="sans text-[13px] font-semibold">Open camera roll</span>
      </button>
      {supportsNative && (
        <button
          data-testid="native-picker-btn"
          onClick={onNativePicker}
          disabled={loading}
          className="mt-3 text-ink/80 text-[12px] sans flex items-center gap-2"
        >
          <ChevronRight size={14} /> Use system file picker
        </button>
      )}
      <button
        data-testid="try-sample-btn"
        onClick={onSamples}
        disabled={loading}
        className="mt-3 text-coral text-[12px] sans font-semibold underline underline-offset-4"
      >
        Try it with sample photos
      </button>
      {error && (
        <div className="mt-4 w-full bg-coral/10 text-coral text-[11px] p-3 rounded-xl sans text-left">{error}</div>
      )}
    </div>
  );
}

function AllDonePanel({ photosCount, onOpenDrawer, onPickMore, pending }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-sage flex items-center justify-center">
        <Check size={28} className="text-sageDeep" strokeWidth={1.6} />
      </div>
      <h3 className="serif text-ink text-[26px] mt-5 tracking-tight">You reviewed all {photosCount}</h3>
      <p className="sans text-muted text-[12px] mt-2 leading-[1.6] max-w-[280px]">
        {pending > 0
          ? 'Confirm the queued photos to free the space, or pick more to keep going.'
          : 'Beautiful. Pick more photos or come back tomorrow to keep the streak alive.'}
      </p>
      <div className="flex gap-3 mt-6">
        {pending > 0 && (
          <button
            data-testid="confirm-queue-btn"
            onClick={onOpenDrawer}
            className="bg-coral text-surface rounded-full py-2.5 px-5 sans text-[12px] font-semibold shadow-pop"
          >
            Review queue ({pending})
          </button>
        )}
        <button
          data-testid="pick-more-btn"
          onClick={onPickMore}
          className="bg-surface border border-hairline rounded-full py-2.5 px-5 sans text-[12px] font-semibold"
        >
          Pick more photos
        </button>
      </div>
    </div>
  );
}
