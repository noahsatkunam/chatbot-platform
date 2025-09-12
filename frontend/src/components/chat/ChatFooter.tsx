import React from 'react';
import { motion } from 'framer-motion';

interface ChatFooterProps {
  text?: string;
}

export const ChatFooter: React.FC<ChatFooterProps> = ({ 
  text = 'Powered by Chatbot Platform' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 py-2 border-t bg-muted/30 text-center"
    >
      <p className="text-xs text-muted-foreground">
        {text}
      </p>
    </motion.div>
  );
};
