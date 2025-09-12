import React from 'react';
import { motion } from 'framer-motion';
import { Participant } from './types';

interface TypingIndicatorProps {
  users: Participant[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const displayNames = users.slice(0, 3).map(u => u.name || 'Someone');
  let text = '';

  if (displayNames.length === 1) {
    text = `${displayNames[0]} is typing`;
  } else if (displayNames.length === 2) {
    text = `${displayNames.join(' and ')} are typing`;
  } else if (displayNames.length === 3) {
    text = `${displayNames[0]}, ${displayNames[1]}, and ${displayNames[2]} are typing`;
  } else {
    const othersCount = users.length - 3;
    text = `${displayNames[0]}, ${displayNames[1]}, ${displayNames[2]} and ${othersCount} ${
      othersCount === 1 ? 'other' : 'others'
    } are typing`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{text}</span>
    </motion.div>
  );
};
