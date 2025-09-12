# Chat Widget Documentation

A comprehensive, customizable chat interface for the multi-tenant chatbot platform.

## Features

- 🎨 **Fully Customizable**: Theme, branding, and layout customization per tenant
- 💬 **Real-time Messaging**: WebSocket-based real-time communication
- 📎 **File Upload**: Drag-and-drop file sharing with progress tracking
- 😊 **Rich Text Support**: Markdown formatting, emoji picker, and reactions
- 🔍 **Message Search**: Built-in search functionality
- ⚡ **Performance Optimized**: Virtual scrolling for large conversations
- 📱 **Mobile Responsive**: Adaptive design for all screen sizes
- ♿ **Accessible**: WCAG 2.1 AA compliant
- 🔒 **Secure**: XSS prevention and input sanitization

## Quick Start

```tsx
import { ChatWidget } from '@/components/chat';

function App() {
  const tenantBranding = {
    tenantId: 'tenant-123',
    companyName: 'Acme Corp',
    logoUrl: '/logo.png',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '0.5rem',
      messageBubbleUser: {
        backgroundColor: '#3B82F6',
        textColor: '#FFFFFF',
      },
      messageBubbleAssistant: {
        backgroundColor: '#F3F4F6',
        textColor: '#1F2937',
      },
    },
    features: {
      fileUpload: true,
      emoji: true,
      reactions: true,
      markdown: true,
      quickReplies: true,
      typing: true,
      search: true,
      voiceInput: false,
      readReceipts: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/*', '.pdf', '.doc', '.docx'],
    },
    welcomeMessage: 'Hello! How can I help you today?',
    placeholder: 'Type your message...',
  };

  return (
    <ChatWidget
      tenantId="tenant-123"
      userId="user-456" // Optional
      branding={tenantBranding}
      config={{
        position: 'bottom-right',
        size: 'medium',
        animation: 'slide',
        zIndex: 9999,
        mobileBreakpoint: 768,
      }}
      onClose={() => console.log('Chat closed')}
    />
  );
}
```

## Configuration

### TenantBranding

| Property | Type | Description |
|----------|------|-------------|
| `tenantId` | string | Unique tenant identifier |
| `companyName` | string | Company name displayed in header |
| `logoUrl` | string? | Company logo URL |
| `theme` | ChatTheme | Visual theme configuration |
| `features` | ChatFeatures | Feature toggles |
| `welcomeMessage` | string? | Initial welcome message |
| `placeholder` | string? | Input placeholder text |
| `poweredByText` | string \| false | Footer text (false to hide) |

### ChatTheme

```typescript
interface ChatTheme {
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
  customCSS?: string; // Additional custom styles
}
```

### ChatFeatures

```typescript
interface ChatFeatures {
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
```

### ChatWidgetConfig

```typescript
interface ChatWidgetConfig {
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
```

## Advanced Usage

### Custom Theme with CSS

```tsx
const customTheme = {
  // ... base theme properties
  customCSS: `
    .chat-widget-root {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }
    
    .chat-widget-root .message-bubble {
      transition: transform 0.2s;
    }
    
    .chat-widget-root .message-bubble:hover {
      transform: translateY(-1px);
    }
  `,
};
```

### Programmatic Control

```tsx
import { ChatProvider, useChat } from '@/components/chat';

function ChatControl() {
  const { sendMessage, searchMessages, loadMoreMessages } = useChat();
  
  const handleProgrammaticSend = async () => {
    await sendMessage('Hello from code!');
  };
  
  const handleSearch = async (query: string) => {
    const results = await searchMessages(query);
    console.log('Search results:', results);
  };
  
  return (
    <div>
      <button onClick={handleProgrammaticSend}>Send Message</button>
      <button onClick={() => handleSearch('help')}>Search</button>
      <button onClick={loadMoreMessages}>Load More</button>
    </div>
  );
}
```

### Integration with Backend

The chat widget expects the following API endpoints:

- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/messages` - Get messages (paginated)
- `POST /api/conversations/:id/messages` - Send message
- `PATCH /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add reaction
- `DELETE /api/messages/:id/reactions/:emoji` - Remove reaction
- `POST /api/upload` - Upload files
- `WS /ws` - WebSocket connection

### WebSocket Events

The chat widget handles the following WebSocket events:

- `message` - New message received
- `typing` - User typing status
- `presence` - User online/offline status
- `reaction` - Reaction added/removed
- `edit` - Message edited
- `delete` - Message deleted

## Styling

Import the CSS file for default styles:

```tsx
import '@/components/chat/styles/chat.css';
```

Or use CSS-in-JS with the provided CSS custom properties:

```css
.chat-widget-root {
  --chat-primary-color: #your-color;
  --chat-secondary-color: #your-color;
  --chat-background-color: #your-color;
  --chat-text-color: #your-color;
  --chat-font-family: 'Your Font', sans-serif;
}
```

## Accessibility

The chat widget is built with accessibility in mind:

- ✅ Keyboard navigation support
- ✅ Screen reader announcements
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ High contrast mode support
- ✅ Reduced motion support

## Performance

- **Virtual Scrolling**: Handles thousands of messages efficiently
- **Lazy Loading**: Messages load on demand
- **Image Optimization**: Thumbnails for image previews
- **Bundle Splitting**: Chat widget can be dynamically imported
- **Memoization**: Prevents unnecessary re-renders

## Security

- **XSS Prevention**: All user input is sanitized
- **File Validation**: File type and size checking
- **URL Validation**: Only safe URLs are allowed
- **Rate Limiting**: Built-in client-side rate limiting
- **Content Security**: DOMPurify for HTML sanitization
