import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function AchievementToast({ achievement }) {
  const Icon = Icons[achievement.icon] || Icons.Trophy;
  return (
    <motion.div
      data-testid={`achievement-toast-${achievement.id}`}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="pointer-events-auto glass-dark sheen text-white rounded-[14px] pl-2 pr-4 py-2 flex items-center gap-3 max-w-[88%]"
    >
      <div className="w-10 h-10 rounded-[10px] bg-honey text-ink flex items-center justify-center">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <p className="eyebrow text-white/50 !text-[8px]">Trophy unlocked</p>
        <p className="font-grotesk font-bold text-[15px] tracking-tight">{achievement.title}</p>
      </div>
      <span className="font-mono text-honey text-[11px] tabular">+{achievement.xp}XP</span>
    </motion.div>
  );
}
