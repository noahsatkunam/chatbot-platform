import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { Message, Conversation, Participant, ChatContext, WebSocketMessage, ChatFeatures } from '../types';
import { chatReducer, ChatState, ChatAction } from '../utils/chatReducer';
import { WebSocketManager } from '../utils/websocket';
import { chatAPI } from '../utils/api';

const ChatContext = createContext<ChatContext | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
  tenantId: string;
  userId?: string;
  conversationId?: string;
  features: ChatFeatures;
  onError?: (error: Error) => void;
}

const initialState: ChatState = {
  conversation: null,
  messages: [],
  participants: [],
  isConnected: false,
  isLoading: false,
  error: null,
  hasMore: true,
  typingUsers: new Set(),
};

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  tenantId,
  userId,
  conversationId,
  features,
  onError,
}) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const wsManager = useRef<WebSocketManager | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!wsManager.current) {
      wsManager.current = new WebSocketManager({
        tenantId,
        userId,
        conversationId,
        onMessage: handleWebSocketMessage,
        onConnectionChange: (connected) => {
          dispatch({ type: 'SET_CONNECTION', payload: connected });
        },
        onError: (error) => {
          dispatch({ type: 'SET_ERROR', payload: error });
          onError?.(error);
        },
      });
    }

    wsManager.current.connect();

    return () => {
      wsManager.current?.disconnect();
    };
  }, [tenantId, userId, conversationId]);

  // Load initial conversation and messages
  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    if (!conversationId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [conversation, messages] = await Promise.all([
        chatAPI.getConversation(conversationId),
        chatAPI.getMessages(conversationId, { limit: 50 }),
      ]);

      dispatch({ type: 'SET_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      onError?.(error as Error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'message':
        dispatch({ type: 'ADD_MESSAGE', payload: message.payload });
        break;
      case 'typing':
        handleTypingIndicator(message.payload);
        break;
      case 'presence':
        dispatch({ type: 'UPDATE_PARTICIPANT', payload: message.payload });
        break;
      case 'reaction':
        dispatch({ type: 'UPDATE_MESSAGE', payload: message.payload });
        break;
      case 'edit':
        dispatch({ type: 'UPDATE_MESSAGE', payload: message.payload });
        break;
      case 'delete':
        dispatch({ type: 'REMOVE_MESSAGE', payload: message.payload.messageId });
        break;
    }
  };

  const handleTypingIndicator = (payload: { userId: string; isTyping: boolean }) => {
    dispatch({ type: 'SET_TYPING', payload });
  };

  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!conversationId || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      conversationId,
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sending',
      tenantId,
      userId,
    };

    // Optimistic update
    dispatch({ type: 'ADD_MESSAGE', payload: tempMessage });

    try {
      // Handle file uploads if present
      let uploadedAttachments;
      if (attachments && attachments.length > 0 && features.fileUpload) {
        uploadedAttachments = await chatAPI.uploadFiles(attachments, {
          conversationId,
          onProgress: (progress) => {
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                id: tempId,
                attachments: attachments.map((file, index) => ({
                  id: `upload-${index}`,
                  filename: file.name,
                  fileSize: file.size,
                  mimeType: file.type,
                  url: '',
                  uploadProgress: progress,
                  status: 'uploading' as const,
                })),
              },
            });
          },
        });
      }

      // Send message
      const sentMessage = await chatAPI.sendMessage({
        conversationId,
        content,
        attachments: uploadedAttachments,
      });

      // Update temp message with real data
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { ...sentMessage, tempId },
      });

      // Send via WebSocket for real-time update
      wsManager.current?.send({
        type: 'message',
        payload: sentMessage,
      });
    } catch (error) {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: tempId, status: 'failed' },
      });
      onError?.(error as Error);
    }
  }, [conversationId, features.fileUpload, tenantId, userId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!features.markdown) return;

    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { id: messageId, content, edited: true, editedAt: new Date() },
    });

    try {
      const updated = await chatAPI.editMessage(messageId, content);
      wsManager.current?.send({
        type: 'edit',
        payload: updated,
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [features.markdown]);

  const deleteMessage = useCallback(async (messageId: string) => {
    dispatch({ type: 'REMOVE_MESSAGE', payload: messageId });

    try {
      await chatAPI.deleteMessage(messageId);
      wsManager.current?.send({
        type: 'delete',
        payload: { messageId },
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      onError?.(error as Error);
    }
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!features.reactions) return;

    try {
      const updated = await chatAPI.addReaction(messageId, emoji);
      dispatch({ type: 'UPDATE_MESSAGE', payload: updated });
      wsManager.current?.send({
        type: 'reaction',
        payload: updated,
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [features.reactions]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!features.reactions) return;

    try {
      const updated = await chatAPI.removeReaction(messageId, emoji);
      dispatch({ type: 'UPDATE_MESSAGE', payload: updated });
      wsManager.current?.send({
        type: 'reaction',
        payload: updated,
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [features.reactions]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!features.typing) return;

    // Clear existing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    wsManager.current?.send({
      type: 'typing',
      payload: { userId, isTyping },
    });

    // Auto-stop typing after 5 seconds
    if (isTyping) {
      typingTimer.current = setTimeout(() => {
        wsManager.current?.send({
          type: 'typing',
          payload: { userId, isTyping: false },
        });
      }, 5000);
    }
  }, [features.typing, userId]);

  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || state.isLoading || !state.hasMore) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const oldestMessage = state.messages[0];
      const messages = await chatAPI.getMessages(conversationId, {
        before: oldestMessage?.timestamp,
        limit: 50,
      });

      if (messages.length < 50) {
        dispatch({ type: 'SET_HAS_MORE', payload: false });
      }

      dispatch({ type: 'PREPEND_MESSAGES', payload: messages });
    } catch (error) {
      onError?.(error as Error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [conversationId, state.isLoading, state.hasMore, state.messages]);

  const searchMessages = useCallback(async (query: string): Promise<Message[]> => {
    if (!features.search || !conversationId) return [];

    try {
      return await chatAPI.searchMessages(conversationId, query);
    } catch (error) {
      onError?.(error as Error);
      return [];
    }
  }, [features.search, conversationId]);

  const contextValue: ChatContext = {
    conversation: state.conversation,
    messages: state.messages,
    participants: state.participants,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setTyping,
    loadMoreMessages,
    searchMessages,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
