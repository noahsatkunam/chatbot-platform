import { WebSocketMessage } from '../types';

interface WebSocketConfig {
  tenantId: string;
  userId?: string;
  conversationId?: string;
  onMessage: (message: WebSocketMessage) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const { tenantId, userId, conversationId } = this.config;
    
    const params = new URLSearchParams({
      tenantId,
      ...(userId && { userId }),
      ...(conversationId && { conversationId }),
    });

    const wsUrl = `${protocol}//${host}/ws?${params.toString()}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.isConnecting = false;
      this.config.onError(error as Error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.config.onConnectionChange(true);
      this.startHeartbeat();
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle ping/pong for heartbeat
        if (message.type === 'pong' as any) {
          return;
        }

        this.config.onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.config.onError(new Error('Invalid message format'));
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.isConnecting = false;
      this.config.onError(new Error('WebSocket connection error'));
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnecting = false;
      this.config.onConnectionChange(false);
      this.stopHeartbeat();

      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.config.onError(new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  send(message: Omit<WebSocketMessage, 'timestamp' | 'tenantId' | 'conversationId'>) {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date(),
      tenantId: this.config.tenantId,
      conversationId: this.config.conversationId || '',
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for sending when reconnected
      this.messageQueue.push(fullMessage);
      
      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift(); // Remove oldest message
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.messageQueue = [];
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}
