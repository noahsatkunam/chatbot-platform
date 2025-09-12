import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image, Film, Music, Archive, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  files: File[];
  onRemove: (index: number) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onRemove,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedFileTypes,
}) => {
  const getFileIcon = (file: File) => {
    const type = file.type;
    
    if (type.startsWith('image/')) return <Image size={16} />;
    if (type.startsWith('video/')) return <Film size={16} />;
    if (type.startsWith('audio/')) return <Music size={16} />;
    if (type.includes('zip') || type.includes('rar')) return <Archive size={16} />;
    return <FileText size={16} />;
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isFileValid = (file: File) => {
    // Check file size
    if (file.size > maxFileSize) {
      return { valid: false, error: `File too large (max ${formatFileSize(maxFileSize)})` };
    }

    // Check file type if restrictions are set
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const isAllowed = allowedFileTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.includes(type);
      });

      if (!isAllowed) {
        return { valid: false, error: 'File type not allowed' };
      }
    }

    return { valid: true };
  };

  return (
    <div className="p-4 space-y-2">
      <AnimatePresence>
        {files.map((file, index) => {
          const validation = isFileValid(file);
          const preview = getFilePreview(file);

          return (
            <motion.div
              key={`${file.name}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                validation.valid
                  ? 'bg-muted/30 border-muted-foreground/20'
                  : 'bg-destructive/10 border-destructive/50'
              )}
            >
              {/* Preview or Icon */}
              {preview ? (
                <img
                  src={preview}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded"
                  onLoad={() => URL.revokeObjectURL(preview)}
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  {getFileIcon(file)}
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
                {!validation.valid && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle size={12} />
                    {validation.error}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRemove(index)}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Remove file"
              >
                <X size={16} />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
