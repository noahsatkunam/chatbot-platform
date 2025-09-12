import { Message, Conversation, Participant } from '../types';

export interface ChatState {
  conversation: Conversation | null;
  messages: Message[];
  participants: Participant[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  typingUsers: Set<string>;
}

export type ChatAction =
  | { type: 'SET_CONVERSATION'; payload: Conversation }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Partial<Message> & { id: string; tempId?: string } }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'PREPEND_MESSAGES'; payload: Message[] }
  | { type: 'SET_PARTICIPANTS'; payload: Participant[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: Participant }
  | { type: 'SET_CONNECTION'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_TYPING'; payload: { userId: string; isTyping: boolean } };

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CONVERSATION':
      return {
        ...state,
        conversation: action.payload,
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE': {
      const { tempId, ...update } = action.payload;
      return {
        ...state,
        messages: state.messages.map((msg) => {
          if (tempId && msg.id === tempId) {
            return { ...msg, ...update };
          }
          if (msg.id === update.id) {
            return { ...msg, ...update };
          }
          return msg;
        }),
      };
    }

    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== action.payload),
      };

    case 'PREPEND_MESSAGES':
      return {
        ...state,
        messages: [...action.payload, ...state.messages],
      };

    case 'SET_PARTICIPANTS':
      return {
        ...state,
        participants: action.payload,
      };

    case 'UPDATE_PARTICIPANT': {
      const updatedParticipant = action.payload;
      const existingIndex = state.participants.findIndex(
        (p) => p.id === updatedParticipant.id
      );

      if (existingIndex >= 0) {
        const newParticipants = [...state.participants];
        newParticipants[existingIndex] = {
          ...newParticipants[existingIndex],
          ...updatedParticipant,
        };
        return {
          ...state,
          participants: newParticipants,
        };
      }

      return {
        ...state,
        participants: [...state.participants, updatedParticipant],
      };
    }

    case 'SET_CONNECTION':
      return {
        ...state,
        isConnected: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_HAS_MORE':
      return {
        ...state,
        hasMore: action.payload,
      };

    case 'SET_TYPING': {
      const { userId, isTyping } = action.payload;
      const newTypingUsers = new Set(state.typingUsers);
      
      if (isTyping) {
        newTypingUsers.add(userId);
      } else {
        newTypingUsers.delete(userId);
      }

      return {
        ...state,
        typingUsers: newTypingUsers,
        participants: state.participants.map((p) =>
          p.id === userId ? { ...p, typing: isTyping } : p
        ),
      };
    }

    default:
      return state;
  }
};
