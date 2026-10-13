import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function AchievementToast({ achievement }) {
  const Icon = Icons[achievement.icon] || Icons.Trophy;
  return (
    <motion.div
      data-testid={`achievement-toast-${achievement.id}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.2, 0.9, 0.2, 1] }}
      className="pointer-events-auto bg-ink text-cream rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card border border-honey/30 max-w-[88%]"
    >
      <div className="w-10 h-10 rounded-xl bg-honey/20 border border-honey/40 flex items-center justify-center">
        <Icon size={18} className="text-honey" strokeWidth={1.8} />
      </div>
      <div className="flex-1">
        <p className="eyebrow text-honey">Trophy unlocked</p>
        <p className="serif text-cream text-[15px] tracking-tight mt-0.5">{achievement.title}</p>
      </div>
      <span className="sans text-honey text-[11px] font-semibold">+{achievement.xp} XP</span>
    </motion.div>
  );
}
