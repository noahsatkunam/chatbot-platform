// Chat Interface Type Definitions

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read';
  reactions?: Reaction[];
  tenantId: string;
  userId?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  uploadProgress?: number;
  status: 'uploading' | 'uploaded' | 'failed';
}

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  tenantId: string;
  userId?: string;
  sessionId: string;
  status: 'active' | 'closed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  metadata?: Record<string, any>;
  participants?: Participant[];
}

export interface Participant {
  id: string;
  type: 'user' | 'assistant' | 'agent';
  name?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  typing?: boolean;
}

export interface ChatTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  messageBubbleUser: {
    backgroundColor: string;
    textColor: string;
  };
  messageBubbleAssistant: {
    backgroundColor: string;
    textColor: string;
  };
  customCSS?: string;
}

export interface TenantBranding {
  tenantId: string;
  logoUrl?: string;
  companyName: string;
  theme: ChatTheme;
  welcomeMessage?: string;
  placeholder?: string;
  poweredByText?: string;
  features: ChatFeatures;
}

export interface ChatFeatures {
  fileUpload: boolean;
  emoji: boolean;
  reactions: boolean;
  markdown: boolean;
  quickReplies: boolean;
  typing: boolean;
  search: boolean;
  voiceInput: boolean;
  readReceipts: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export interface ChatWidgetConfig {
  position: 'bottom-right' | 'bottom-left' | 'center' | 'full-screen';
  size: 'small' | 'medium' | 'large' | 'custom';
  customSize?: {
    width: string;
    height: string;
  };
  animation: 'slide' | 'fade' | 'scale' | 'none';
  zIndex: number;
  mobileBreakpoint: number;
}

export interface ChatContext {
  conversation: Conversation | null;
  messages: Message[];
  participants: Participant[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  loadMoreMessages: () => Promise<void>;
  searchMessages: (query: string) => Promise<Message[]>;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'presence' | 'reaction' | 'edit' | 'delete';
  payload: any;
  timestamp: Date;
  tenantId: string;
  conversationId: string;
}
