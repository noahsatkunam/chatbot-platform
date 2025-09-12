import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  MicOff, 
  X, 
  FileText, 
  Image as ImageIcon,
  Bold,
  Italic,
  Code,
  Link
} from 'lucide-react';
import { useChat } from './providers/ChatProvider';
import { ChatFeatures } from './types';
import { cn } from '@/lib/utils';
import { FileUpload } from './FileUpload';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface MessageInputProps {
  placeholder?: string;
  features: ChatFeatures;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = 'Type a message...',
  features,
}) => {
  const { sendMessage, setTyping } = useChat();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle typing indicator
  useEffect(() => {
    if (content.length > 0 && features.typing) {
      setTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 1000);
    } else if (content.length === 0 && features.typing) {
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [content, features.typing, setTyping]);

  const handleSend = async () => {
    if (!content.trim() && files.length === 0) return;

    await sendMessage(content, files);
    setContent('');
    setFiles([]);
    setShowFileUpload(false);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    const cursor = textareaRef.current?.selectionStart || content.length;
    const newContent = content.slice(0, cursor) + emoji.native + content.slice(cursor);
    setContent(newContent);
    setShowEmojiPicker(false);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursor = cursor + emoji.native.length;
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles([...files, ...selectedFiles]);
      setShowFileUpload(true);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (files.length === 1) {
      setShowFileUpload(false);
    }
  };

  const insertFormatting = (format: string) => {
    if (!textareaRef.current || !features.markdown) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'text'}**`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'text'}*`;
        newCursorPos = start + 1;
        break;
      case 'code':
        if (selectedText.includes('\n')) {
          newText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
          newCursorPos = start + 4;
        } else {
          newText = `\`${selectedText || 'code'}\``;
          newCursorPos = start + 1;
        }
        break;
      case 'link':
        newText = `[${selectedText || 'text'}](url)`;
        newCursorPos = start + selectedText.length + 3;
        break;
    }

    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);

    // Restore focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        newCursorPos,
        newCursorPos + (selectedText.length || 4)
      );
    }, 0);
  };

  const handleVoiceInput = () => {
    if (!features.voiceInput) return;

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement actual voice recording logic
    } else {
      // Start recording
      setIsRecording(true);
      // TODO: Implement actual voice recording logic
    }
  };

  return (
    <div className="border-t">
      {/* File Upload Preview */}
      <AnimatePresence>
        {showFileUpload && files.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b"
          >
            <FileUpload
              files={files}
              onRemove={removeFile}
              maxFileSize={features.maxFileSize}
              allowedFileTypes={features.allowedFileTypes}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Formatting toolbar */}
        {features.markdown && (
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => insertFormatting('bold')}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => insertFormatting('italic')}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => insertFormatting('code')}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => insertFormatting('link')}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Link"
            >
              <Link size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className={cn(
                'w-full resize-none rounded-lg px-4 py-2 pr-12',
                'bg-muted/50 border border-transparent',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-all scrollbar-thin scrollbar-thumb-muted',
                'min-h-[40px] max-h-[120px]'
              )}
              style={{ lineHeight: '1.5' }}
            />

            {/* Character counter */}
            {content.length > 0 && (
              <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {content.length}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* File upload */}
            {features.fileUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={features.allowedFileTypes?.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Attach files"
                >
                  <Paperclip size={20} />
                </motion.button>
              </>
            )}

            {/* Emoji picker */}
            {features.emoji && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </motion.button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="auto"
                      previewPosition="none"
                      skinTonePosition="none"
                      maxFrequentRows={1}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Voice input */}
            {features.voiceInput && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceInput}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isRecording
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'hover:bg-muted'
                )}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </motion.button>
            )}

            {/* Send button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!content.trim() && files.length === 0}
              className={cn(
                'p-2 rounded-lg transition-colors',
                content.trim() || files.length > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </div>

        {/* Quick replies */}
        {features.quickReplies && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {['👍 Yes', '👎 No', '🤔 Tell me more', '✅ Thanks!'].map((reply) => (
              <button
                key={reply}
                onClick={() => {
                  setContent(reply);
                  handleSend();
                }}
                className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
