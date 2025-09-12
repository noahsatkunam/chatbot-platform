// Main chat widget exports
export { ChatWidget } from './ChatWidget';
export { ChatProvider, useChat } from './providers/ChatProvider';
export { ThemeProvider, useTheme } from './providers/ThemeProvider';

// Component exports
export { MessageList } from './MessageList';
export { MessageInput } from './MessageInput';
export { MessageBubble } from './MessageBubble';
export { TypingIndicator } from './TypingIndicator';
export { FileUpload } from './FileUpload';
export { ChatHeader } from './ChatHeader';
export { ChatFooter } from './ChatFooter';

// Type exports
export type {
  Message,
  Attachment,
  Reaction,
  Conversation,
  Participant,
  ChatTheme,
  TenantBranding,
  ChatFeatures,
  ChatWidgetConfig,
  ChatContext,
  WebSocketMessage,
} from './types';

// Utility exports
export { WebSocketManager } from './utils/websocket';
export { chatAPI } from './utils/api';
export { sanitizeInput, sanitizeMarkdown, sanitizeUrl, validateFile, RateLimiter } from './utils/sanitizer';

// Hook exports
export { useDebounce } from './hooks/useDebounce';
