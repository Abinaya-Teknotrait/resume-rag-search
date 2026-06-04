import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface BotBubbleProps {
  children: ReactNode;
  timestamp?: Date;
}

export function BotBubble({ children, timestamp }: BotBubbleProps) {
  const timeString = timestamp?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start"
    >
      <div className="flex max-w-xs flex-col gap-1 lg:max-w-2xl">
        <div className="rounded-3xl bg-slate-800/50 px-6 py-4 text-slate-100">{children}</div>
        {timeString ? <p className="text-xs text-slate-500">{timeString}</p> : null}
      </div>
    </motion.div>
  );
}
