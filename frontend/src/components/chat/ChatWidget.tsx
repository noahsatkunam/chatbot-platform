import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { ChatProvider } from './providers/ChatProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatFooter } from './ChatFooter';
import { TenantBranding, ChatWidgetConfig, ChatFeatures } from './types';
import { cn } from '@/lib/utils';

interface ChatWidgetProps {
  tenantId: string;
  userId?: string;
  branding: TenantBranding;
  config?: Partial<ChatWidgetConfig>;
  onClose?: () => void;
}

const defaultConfig: ChatWidgetConfig = {
  position: 'bottom-right',
  size: 'medium',
  animation: 'slide',
  zIndex: 9999,
  mobileBreakpoint: 768,
};

const sizeClasses = {
  small: 'w-80 h-[500px]',
  medium: 'w-96 h-[600px]',
  large: 'w-[450px] h-[700px]',
  custom: '',
  'full-screen': 'w-screen h-screen',
};

const positionClasses = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'full-screen': 'inset-0',
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  tenantId,
  userId,
  branding,
  config: userConfig,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  
  const config = { ...defaultConfig, ...userConfig };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < config.mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [config.mobileBreakpoint]);

  const handleToggle = useCallback(() => {
    if (!isOpen && !conversationId) {
      // Create new conversation when opening for the first time
      // This will be handled by the ChatProvider
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  }, [isOpen, conversationId]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const getAnimationVariants = () => {
    switch (config.animation) {
      case 'slide':
        return {
          initial: { 
            opacity: 0, 
            y: 100,
            scale: 0.9,
          },
          animate: { 
            opacity: 1, 
            y: 0,
            scale: 1,
          },
          exit: { 
            opacity: 0, 
            y: 100,
            scale: 0.9,
          },
        };
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0 },
        };
      default:
        return {};
    }
  };

  const widgetSize = isMobile ? 'full-screen' : config.size;
  const widgetPosition = isMobile ? 'full-screen' : config.position;

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className={cn(
            'fixed z-50 p-4 rounded-full shadow-lg',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            widgetPosition === 'bottom-right' && 'bottom-4 right-4',
            widgetPosition === 'bottom-left' && 'bottom-4 left-4',
            widgetPosition === 'center' && 'bottom-4 right-4'
          )}
          style={{ 
            zIndex: config.zIndex,
            backgroundColor: branding.theme.primaryColor,
          }}
        >
          <MessageCircle size={24} />
        </motion.button>
      )}

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <ThemeProvider theme={branding.theme}>
            <ChatProvider
              tenantId={tenantId}
              userId={userId}
              conversationId={conversationId}
              features={branding.features}
            >
              <motion.div
                {...getAnimationVariants()}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={cn(
                  'fixed flex flex-col bg-background rounded-lg shadow-2xl overflow-hidden',
                  sizeClasses[widgetSize],
                  positionClasses[widgetPosition],
                  isMinimized && 'h-14',
                  config.size === 'custom' && config.customSize && 
                    `w-[${config.customSize.width}] h-[${config.customSize.height}]`
                )}
                style={{ 
                  zIndex: config.zIndex,
                  ...(config.size === 'custom' && config.customSize && {
                    width: config.customSize.width,
                    height: config.customSize.height,
                  }),
                }}
              >
                {/* Header */}
                <ChatHeader
                  branding={branding}
                  isMinimized={isMinimized}
                  onMinimize={handleMinimize}
                  onClose={handleClose}
                  isFullScreen={widgetSize === 'full-screen'}
                />

                {/* Chat Content */}
                {!isMinimized && (
                  <>
                    <div className="flex-1 overflow-hidden">
                      <MessageList
                        welcomeMessage={branding.welcomeMessage}
                        showSearch={branding.features.search}
                      />
                    </div>

                    <MessageInput
                      placeholder={branding.placeholder || 'Type a message...'}
                      features={branding.features}
                    />

                    {branding.poweredByText !== false && (
                      <ChatFooter text={branding.poweredByText} />
                    )}
                  </>
                )}
              </motion.div>
            </ChatProvider>
          </ThemeProvider>
        )}
      </AnimatePresence>

      {/* Custom CSS injection */}
      {branding.theme.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: branding.theme.customCSS }} />
      )}
    </>
  );
};
