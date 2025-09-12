import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, AlertCircle, Edit2, Trash2, Smile, Download, FileText, Image } from 'lucide-react';
import { format } from 'date-fns';
import { Message, Participant, Reaction } from './types';
import { useChat } from './providers/ChatProvider';
import { useTheme } from './providers/ThemeProvider';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
  participant?: Participant;
  showAvatar: boolean;
  isLastMessage: boolean;
  onHeightChange?: (height: number) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  participant,
  showAvatar,
  isLastMessage,
  onHeightChange,
}) => {
  const { editMessage, deleteMessage, addReaction, removeReaction } = useChat();
  const { theme } = useTheme();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  useEffect(() => {
    if (bubbleRef.current && onHeightChange) {
      const height = bubbleRef.current.getBoundingClientRect().height;
      onHeightChange(height);
    }
  }, [message.content, message.attachments, onHeightChange]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(message.id);
    }
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = message.reactions?.find(
      r => r.emoji === emoji && r.userId === participant?.id
    );
    
    if (existingReaction) {
      await removeReaction(message.id, emoji);
    } else {
      await addReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <div className="w-3 h-3 border-2 border-muted-foreground/50 border-t-transparent rounded-full animate-spin" />;
      case 'sent':
        return <Check size={12} className="text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck size={12} className="text-muted-foreground" />;
      case 'read':
        return <CheckCheck size={12} className="text-primary" />;
      case 'failed':
        return <AlertCircle size={12} className="text-destructive" />;
      default:
        return null;
    }
  };

  const renderAttachment = (attachment: any) => {
    const isImage = attachment.mimeType.startsWith('image/');
    
    return (
      <div
        key={attachment.id}
        className="mt-2 p-2 bg-muted/50 rounded-lg flex items-center gap-2"
      >
        {isImage ? (
          <img
            src={attachment.thumbnailUrl || attachment.url}
            alt={attachment.filename}
            className="w-20 h-20 object-cover rounded"
          />
        ) : (
          <FileText size={20} className="text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.filename}</p>
          <p className="text-xs text-muted-foreground">
            {(attachment.fileSize / 1024).toFixed(1)} KB
          </p>
        </div>
        {attachment.status === 'uploading' && (
          <div className="w-20">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${attachment.uploadProgress || 0}%` }}
              />
            </div>
          </div>
        )}
        {attachment.status === 'uploaded' && (
          <a
            href={attachment.url}
            download={attachment.filename}
            className="p-1 hover:bg-muted rounded"
          >
            <Download size={16} />
          </a>
        )}
      </div>
    );
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2 px-4">
        <p className="text-xs text-muted-foreground">{message.content}</p>
      </div>
    );
  }

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-2 px-4 py-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isUser && showAvatar && participant && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-auto">
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={participant.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium">
              {participant.name?.charAt(0) || 'A'}
            </span>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isUser && 'items-end')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          )}
          style={
            isUser
              ? {
                  backgroundColor: theme.messageBubbleUser.backgroundColor,
                  color: theme.messageBubbleUser.textColor,
                }
              : {
                  backgroundColor: theme.messageBubbleAssistant.backgroundColor,
                  color: theme.messageBubbleAssistant.textColor,
                }
          }
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 bg-background/10 rounded resize-none focus:outline-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-muted text-foreground rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <ReactMarkdown className="prose prose-sm max-w-none break-words">
                {message.content}
              </ReactMarkdown>
              {message.edited && (
                <p className="text-xs opacity-60 mt-1">(edited)</p>
              )}
            </>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(renderAttachment)}
            </div>
          )}
        </div>

        {/* Message Info & Actions */}
        <div className={cn('flex items-center gap-2 mt-1', isUser && 'flex-row-reverse')}>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          
          {isUser && getStatusIcon()}

          {/* Action Buttons */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1"
            >
              {isUser && (
                <>
                  <button
                    onClick={handleEdit}
                    className="p-1 hover:bg-muted rounded"
                    title="Edit message"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 hover:bg-muted rounded"
                    title="Delete message"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 hover:bg-muted rounded"
                  title="Add reaction"
                >
                  <Smile size={12} />
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-1 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-10">
                    {['👍', '❤️', '😊', '😮', '😢', '🎉'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="p-1 hover:bg-muted rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {Array.from(
              message.reactions.reduce((acc, reaction) => {
                const existing = acc.get(reaction.emoji);
                if (existing) {
                  existing.count++;
                  existing.users.push(reaction.userId);
                } else {
                  acc.set(reaction.emoji, {
                    emoji: reaction.emoji,
                    count: 1,
                    users: [reaction.userId],
                  });
                }
                return acc;
              }, new Map())
            ).map(([emoji, data]) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  'px-2 py-1 rounded-full text-xs flex items-center gap-1',
                  'bg-muted hover:bg-muted/80 transition-colors',
                  data.users.includes(participant?.id || '') && 'ring-1 ring-primary'
                )}
              >
                <span>{emoji}</span>
                {data.count > 1 && <span>{data.count}</span>}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
