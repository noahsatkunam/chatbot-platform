import { Message, Conversation, Attachment } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface MessagePayload {
  conversationId: string;
  content: string;
  attachments?: Attachment[];
}

interface GetMessagesOptions {
  limit?: number;
  before?: Date;
  after?: Date;
}

interface UploadOptions {
  conversationId: string;
  onProgress?: (progress: number) => void;
}

class ChatAPI {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      // Auth headers will be added by auth interceptor
    };
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }

    return response.json();
  }

  async createConversation(tenantId: string, userId?: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tenantId, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return response.json();
  }

  async getMessages(
    conversationId: string,
    options: GetMessagesOptions = {}
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.before) params.append('before', options.before.toISOString());
    if (options.after) params.append('after', options.after.toISOString());

    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages?${params}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    return data.messages || data;
  }

  async sendMessage(payload: MessagePayload): Promise<Message> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${payload.conversationId}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to edit message');
    }

    return response.json();
  }

  async deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      throw new Error('Failed to add reaction');
    }

    return response.json();
  }

  async removeReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await fetch(
      `${API_BASE_URL}/messages/${messageId}/reactions/${emoji}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to remove reaction');
    }

    return response.json();
  }

  async uploadFiles(
    files: File[],
    options: UploadOptions
  ): Promise<Attachment[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('conversationId', options.conversationId);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options.onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          options.onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const attachments = JSON.parse(xhr.responseText);
            resolve(attachments);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload`);
      // Auth headers will be set by interceptor
      xhr.send(formData);
    });
  }

  async searchMessages(conversationId: string, query: string): Promise<Message[]> {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages/search?${params}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search messages');
    }

    return response.json();
  }
}

export const chatAPI = new ChatAPI();
