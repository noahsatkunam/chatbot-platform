import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from './providers/ChatProvider';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Message } from './types';
import { cn } from '@/lib/utils';
import { useDebounce } from './hooks/useDebounce';

interface MessageListProps {
  welcomeMessage?: string;
  showSearch?: boolean;
}

const ITEM_SIZE_CACHE = new Map<string, number>();

export const MessageList: React.FC<MessageListProps> = ({
  welcomeMessage,
  showSearch,
}) => {
  const { messages, participants, isLoading, loadMoreMessages, searchMessages } = useChat();
  const listRef = useRef<List>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Hide welcome message when first message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages]);

  // Search functionality
  useEffect(() => {
    if (debouncedSearchQuery && showSearch) {
      performSearch();
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchMessages(debouncedSearchQuery);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScroll = useCallback((event: any) => {
    const { scrollOffset } = event;
    
    // Load more messages when scrolled to top
    if (scrollOffset === 0 && !isLoading && messages.length > 0) {
      loadMoreMessages();
    }
  }, [isLoading, messages.length, loadMoreMessages]);

  const getItemSize = (index: number) => {
    const message = messages[index];
    const cached = ITEM_SIZE_CACHE.get(message.id);
    if (cached) return cached;
    
    // Estimate based on content length
    const baseHeight = 80; // Base height for message bubble
    const charsPerLine = 50;
    const lines = Math.ceil(message.content.length / charsPerLine);
    const contentHeight = lines * 20; // Approximate line height
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const attachmentHeight = hasAttachments ? 120 : 0;
    
    return baseHeight + contentHeight + attachmentHeight;
  };

  const setItemSize = (messageId: string, size: number) => {
    ITEM_SIZE_CACHE.set(messageId, size);
    listRef.current?.resetAfterIndex(0);
  };

  const renderMessage = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    const participant = participants.find(p => p.id === message.userId);
    const isLastMessage = index === messages.length - 1;
    const nextMessage = messages[index + 1];
    const showAvatar = !nextMessage || nextMessage.userId !== message.userId;

    return (
      <div style={style}>
        <MessageBubble
          message={message}
          participant={participant}
          showAvatar={showAvatar}
          isLastMessage={isLastMessage}
          onHeightChange={(height) => setItemSize(message.id, height)}
        />
      </div>
    );
  };

  const typingUsers = participants.filter(p => p.typing && p.type !== 'user');

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      {showSearch && (
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className={cn(
                'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
                'bg-muted/50 border border-transparent',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-colors'
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      <AnimatePresence>
        {showSearchResults && searchResults.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-muted/30"
          >
            <div className="p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">
                Found {searchResults.length} results
              </p>
              {searchResults.slice(0, 5).map((result) => (
                <div
                  key={result.id}
                  className="p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  onClick={() => {
                    // Scroll to message
                    const index = messages.findIndex(m => m.id === result.id);
                    if (index !== -1 && listRef.current) {
                      listRef.current.scrollToItem(index, 'center');
                    }
                  }}
                >
                  <p className="truncate">{result.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 relative">
        {/* Welcome Message */}
        <AnimatePresence>
          {showWelcome && welcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              <div className="text-center max-w-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-2xl">👋</span>
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
                <p className="text-muted-foreground">{welcomeMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator at top */}
        {isLoading && messages.length > 0 && (
          <div className="absolute top-0 left-0 right-0 p-4 text-center">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {/* Virtual List */}
        {messages.length > 0 && (
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={messages.length}
                itemSize={getItemSize}
                onScroll={handleScroll}
                overscanCount={5}
                className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              >
                {renderMessage}
              </List>
            )}
          </AutoSizer>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="absolute bottom-2 left-4">
            <TypingIndicator users={typingUsers} />
          </div>
        )}
      </div>
    </div>
  );
};
