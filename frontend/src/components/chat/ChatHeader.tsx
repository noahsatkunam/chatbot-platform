import React from 'react';
import { X, Minimize2, Maximize2, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { TenantBranding } from './types';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  branding: TenantBranding;
  isMinimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  isFullScreen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  branding,
  isMinimized,
  onMinimize,
  onClose,
  isFullScreen,
}) => {
  return (
    <div 
      className={cn(
        'flex items-center justify-between p-4 border-b',
        'bg-primary text-primary-foreground',
        'select-none cursor-move'
      )}
      style={{ backgroundColor: branding.theme.primaryColor }}
    >
      <div className="flex items-center gap-3">
        {branding.logoUrl && (
          <img
            src={branding.logoUrl}
            alt={branding.companyName}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <div>
          <h3 className="font-semibold text-sm">{branding.companyName}</h3>
          {!isMinimized && (
            <p className="text-xs opacity-90">We're here to help</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isFullScreen && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMinimize}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 rounded hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X size={16} />
        </motion.button>
      </div>
    </div>
  );
};
