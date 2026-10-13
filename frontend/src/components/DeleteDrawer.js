import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X, Shield, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/storage';

export default function DeleteDrawer({ open, onClose, pending, onUnqueue, onConfirm }) {
  const totalBytes = pending.reduce((t, p) => t + (p.bytes || 0), 0);
  const [busy, setBusy] = React.useState(false);

  const confirm = () => {
    setBusy(true);
    setTimeout(() => { onConfirm(); setBusy(false); }, 450);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            data-testid="drawer-backdrop" onClick={onClose}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[6px] z-30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.aside
            data-testid="delete-drawer"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute left-2 right-2 bottom-2 glass rounded-[24px] z-40 p-5 max-h-[85%] flex flex-col !bg-white/80"
          >
            <div className="w-10 h-1 rounded-full bg-ink/20 mx-auto" />
            <div className="flex items-start justify-between mt-4">
              <div>
                <p className="eyebrow text-muted">Confirm removal</p>
                <h3 className="font-grotesk font-bold text-[30px] leading-none mt-2 tracking-[-0.04em] tabular">{formatBytes(totalBytes)}</h3>
                <p className="text-[10px] text-muted mt-1">{pending.length} PHOTO{pending.length === 1 ? '' : 'S'} QUEUED</p>
              </div>
              <button data-testid="drawer-close-btn" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-[10px] bg-ink/5 flex items-center justify-center press">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4 rounded-[10px] bg-sage/70 p-3 flex items-start gap-2.5">
              <Shield size={14} className="text-sageDeep mt-0.5 shrink-0" />
              <p className="text-sageDeep text-[10px] leading-relaxed">Nothing is deleted yet. Photos stay on your phone until you confirm.</p>
            </div>

            <div className="mt-3 overflow-y-auto no-scrollbar flex-1" data-testid="drawer-list">
              {pending.length === 0 ? (
                <p className="text-muted text-[11px] text-center py-10">QUEUE EMPTY</p>
              ) : (
                <ul className="grid grid-cols-3 gap-1.5">
                  {pending.map((p) => (
                    <li key={p.id} className="relative rounded-[10px] overflow-hidden aspect-square bg-ink/5">
                      {p.url && <img src={p.url} alt="" className="w-full h-full object-cover" />}
                      <button
                        data-testid={`drawer-unqueue-${p.id}`} onClick={() => onUnqueue(p.id)} aria-label="Remove from queue"
                        className="absolute top-1.5 right-1.5 glass-chip rounded-[6px] w-6 h-6 flex items-center justify-center"
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 glass-chip rounded-[5px] px-1.5 py-0.5 text-[8px] tabular">{formatBytes(p.bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              data-testid="confirm-remove-btn" onClick={confirm} disabled={!pending.length || busy}
              className="mt-4 bg-coral text-white rounded-[12px] h-14 flex items-center justify-center gap-2 shadow-pop disabled:opacity-40 press"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span className="font-grotesk font-semibold text-[15px]">{busy ? 'Clearing…' : `Reclaim ${formatBytes(totalBytes)}`}</span>
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
