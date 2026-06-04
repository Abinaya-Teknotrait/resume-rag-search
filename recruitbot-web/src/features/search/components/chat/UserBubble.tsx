import { motion } from 'framer-motion';

interface UserBubbleProps {
  text: string;
  timestamp: Date;
}

export function UserBubble({ text, timestamp }: UserBubbleProps) {
  const timeString = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end"
    >
      <div className="flex max-w-xs flex-col gap-1 lg:max-w-md">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-500 to-pink-500 px-6 py-4 text-white">
          <p className="text-sm">{text}</p>
        </div>
        <p className="text-right text-xs text-slate-500">{timeString}</p>
      </div>
    </motion.div>
  );
}
