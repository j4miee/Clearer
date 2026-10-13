import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X, Shield, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/storage';

export default function DeleteDrawer({ open, onClose, pending, onUnqueue, onConfirm }) {
  const totalBytes = pending.reduce((t, p) => t + (p.bytes || 0), 0);
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    setBusy(true);
    // simulate confirmation delay for haptic/satisfaction
    setTimeout(() => {
      onConfirm();
      setBusy(false);
    }, 450);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 bg-ink/40 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="drawer-backdrop"
          />
          <motion.aside
            data-testid="delete-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute left-0 right-0 bottom-0 bg-cream rounded-t-[28px] z-40 p-5 shadow-card max-h-[85%] flex flex-col"
          >
            <div className="w-10 h-1.5 rounded-full bg-ink/15 mx-auto" />
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="eyebrow text-muted">Confirm removal</p>
                <h3 className="serif text-ink text-[22px] mt-1 tracking-tight">
                  {pending.length} photo{pending.length === 1 ? '' : 's'} · {formatBytes(totalBytes)}
                </h3>
              </div>
              <button
                data-testid="drawer-close-btn"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface border border-hairline flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-ink" strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-3 bg-sage/60 rounded-2xl p-3 flex items-start gap-3">
              <Shield size={16} className="text-sageDeep mt-0.5" strokeWidth={1.6} />
              <p className="sans text-sageDeep text-[11px] leading-[1.5]">
                Nothing has been deleted yet. These photos are only marked for
                removal — your phone will keep them until you confirm.
              </p>
            </div>

            <div className="mt-3 overflow-y-auto no-scrollbar flex-1" data-testid="drawer-list">
              {pending.length === 0 ? (
                <p className="sans text-muted text-[12px] text-center py-10">
                  Your queue is empty.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {pending.map((p) => (
                    <li key={p.id} className="relative rounded-xl overflow-hidden aspect-square bg-ink/5">
                      {p.url ? (
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink/40 text-[10px]">photo</div>
                      )}
                      <button
                        data-testid={`drawer-unqueue-${p.id}`}
                        onClick={() => onUnqueue(p.id)}
                        className="absolute top-1.5 right-1.5 bg-cream/90 border border-hairline rounded-full w-6 h-6 flex items-center justify-center"
                        aria-label="Remove from queue"
                      >
                        <X size={12} className="text-ink" strokeWidth={2} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 text-cream text-[9px] sans text-center py-0.5">
                        {formatBytes(p.bytes)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              data-testid="confirm-remove-btn"
              onClick={confirm}
              disabled={!pending.length || busy}
              className="mt-4 bg-coral text-surface rounded-full py-3.5 flex items-center justify-center gap-2 shadow-pop disabled:opacity-40 active:scale-[0.98] t-transform"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span className="sans text-[13px] font-semibold">
                {busy ? 'Clearing…' : `Reclaim ${formatBytes(totalBytes)}`}
              </span>
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
