import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  decryptPayload,
  encryptPayload,
  ensureEncryptionKey,
  EncryptedPayload,
  isEncryptedPayload
} from '../utils/encryption';

export interface ApiConnection {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  authentication: AuthConfig;
  headers: Record<string, string>;
  rateLimit: RateLimitConfig;
  retryConfig: RetryConfig;
  isActive: boolean;
  metadata: any;
}

export interface AuthConfig {
  type: 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic';
  credentials: any;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableStatusCodes: number[];
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
  duration: number;
}

interface CachedApiConnection {
  tenantId: string;
  connection: ApiConnection;
}

export class ApiConnector extends EventEmitter {
  private prisma: PrismaClient;
  private connections: Map<string, CachedApiConnection> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private readonly encryptionKey: string | null;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    const configuredKey =
      process.env.API_CONNECTOR_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';
    const trimmedKey = configuredKey.trim();
    this.encryptionKey = trimmedKey.length > 0 ? trimmedKey : null;
    if (!this.encryptionKey) {
      console.warn(
        'ApiConnector encryption key is not configured. Connector creation will be blocked until a key is provided.'
      );
    }
    this.loadConnections();
  }

  private getCacheKey(tenantId: string, connectionId: string): string {
    return `${tenantId}:${connectionId}`;
  }

  // Create new API connection
  async createConnection(
    tenantId: string,
    connectionData: Omit<ApiConnection, 'id'>
  ): Promise<string> {
    try {
      // Ensure encryption configuration is present before proceeding
      this.requireEncryptionKey();

      // Validate connection
      await this.validateConnection(connectionData);

      // Encrypt sensitive data
      const encryptedAuth = await this.encryptAuthCredentials(connectionData.authentication);

      // Save to database
      const connection = await this.prisma.apiConnection.create({
        data: {
          tenantId,
          name: connectionData.name,
          type: connectionData.type,
          baseUrl: connectionData.baseUrl,
          authentication: encryptedAuth,
          headers: connectionData.headers,
          rateLimit: connectionData.rateLimit,
          retryConfig: connectionData.retryConfig,
          isActive: connectionData.isActive,
          metadata: connectionData.metadata
        }
      });

      // Cache connection
      const apiConnection: ApiConnection = {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        baseUrl: connection.baseUrl,
        authentication: connectionData.authentication, // Keep decrypted in memory
        headers: connection.headers as Record<string, string>,
        rateLimit: connection.rateLimit as RateLimitConfig,
        retryConfig: connection.retryConfig as RetryConfig,
        isActive: connection.isActive,
        metadata: connection.metadata
      };

      const cacheKey = this.getCacheKey(tenantId, connection.id);
      this.connections.set(cacheKey, {
        tenantId,
        connection: apiConnection
      });

      // Create HTTP client
      await this.createHttpClient(tenantId, connection.id, apiConnection);

      // Setup rate limiter
      this.setupRateLimiter(tenantId, connection.id, apiConnection.rateLimit);

      this.emit('connection:created', {
        connectionId: connection.id,
        tenantId,
        type: connectionData.type
      });

      return connection.id;

    } catch (error) {
      console.error('Error creating API connection:', error);
      throw error;
    }
  }

  // Update API connection
  async updateConnection(
    connectionId: string,
    tenantId: string,
    updates: Partial<ApiConnection>
  ): Promise<void> {
    const connection = await this.prisma.apiConnection.findFirst({
      where: { id: connectionId, tenantId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    let decryptedAuthForCache: AuthConfig | undefined;
    let encryptedAuth: EncryptedPayload | any = connection.authentication;

    if (updates.authentication) {
      decryptedAuthForCache = updates.authentication;
      encryptedAuth = await this.encryptAuthCredentials(updates.authentication);
    } else if (connection.authentication && !isEncryptedPayload(connection.authentication as any)) {
      decryptedAuthForCache = await this.decryptAuthCredentials(connection.authentication as any);
      encryptedAuth = await this.encryptAuthCredentials(decryptedAuthForCache);
    }

    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: new Date()
    };

    if (typeof encryptedAuth !== 'undefined') {
      updateData.authentication = encryptedAuth;
    }

    // Update database
    await this.prisma.apiConnection.update({
      where: { id: connectionId },
      data: updateData
    });

    // Update cache
    const cacheKey = this.getCacheKey(tenantId, connectionId);
    const cachedConnection = this.connections.get(cacheKey);
    if (cachedConnection) {
      Object.assign(cachedConnection.connection, updates);

      if (decryptedAuthForCache) {
        cachedConnection.connection.authentication = decryptedAuthForCache;
      }

      // Recreate HTTP client if needed
      if (updates.baseUrl || updates.authentication || updates.headers) {
        await this.createHttpClient(tenantId, connectionId, cachedConnection.connection);
      }

      // Update rate limiter if needed
      if (updates.rateLimit) {
        this.setupRateLimiter(tenantId, connectionId, updates.rateLimit);
      }
    }

    this.emit('connection:updated', {
      connectionId,
      tenantId,
      updates
    });
  }

  // Delete API connection
  async deleteConnection(connectionId: string, tenantId: string): Promise<void> {
    await this.prisma.apiConnection.deleteMany({
      where: { id: connectionId, tenantId }
    });

    // Clean up cache
    const cacheKey = this.getCacheKey(tenantId, connectionId);
    this.connections.delete(cacheKey);
    this.clients.delete(cacheKey);
    this.rateLimiters.delete(cacheKey);

    this.emit('connection:deleted', {
      connectionId,
      tenantId
    });
  }

  // Make API request
  async makeRequest(
    connectionId: string,
    request: ApiRequest,
    tenantId: string
  ): Promise<ApiResponse> {
    const startTime = Date.now();

    try {
      // Get connection
      const connection = await this.getConnection(connectionId, tenantId);
      if (!connection || !connection.isActive) {
        throw new Error('Connection not found or inactive');
      }

      const cacheKey = this.getCacheKey(tenantId, connectionId);

      const cachedEntry = this.connections.get(cacheKey);
      if (!cachedEntry || cachedEntry.tenantId !== tenantId) {
        throw new Error('Connection not found for tenant');
      }

      // Check rate limits
      await this.checkRateLimit(tenantId, connectionId);

      // Get HTTP client
      const client = this.clients.get(cacheKey);
      if (!client) {
        throw new Error('HTTP client not initialized');
      }

      // Prepare request config
      const config: AxiosRequestConfig = {
        method: request.method,
        url: request.endpoint,
        data: request.data,
        params: request.params,
        headers: { ...connection.headers, ...request.headers },
        timeout: request.timeout || 30000
      };

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(client, config, connection.retryConfig);

      const duration = Date.now() - startTime;

      // Log successful request
      await this.logApiRequest(connectionId, tenantId, request, response.status, duration);

      const apiResponse: ApiResponse = {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        duration
      };

      this.emit('request:success', {
        connectionId,
        tenantId,
        request,
        response: apiResponse
      });

      return apiResponse;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const statusCode = error.response?.status || 0;

      // Log failed request
      await this.logApiRequest(connectionId, tenantId, request, statusCode, duration, error.message);

      const apiResponse: ApiResponse = {
        success: false,
        error: error.message,
        statusCode,
        headers: error.response?.headers || {},
        duration
      };

      this.emit('request:error', {
        connectionId,
        tenantId,
        request,
        error: apiResponse
      });

      return apiResponse;
    }
  }

  // Test API connection
  async testConnection(connectionId: string, tenantId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(connectionId, tenantId);
      if (!connection) {
        return false;
      }

      // Make a simple test request (usually GET to root or health endpoint)
      const testRequest: ApiRequest = {
        method: 'GET',
        endpoint: '/health' // or '/' depending on API
      };

      const response = await this.makeRequest(connectionId, testRequest, tenantId);
      return response.success && response.statusCode < 400;

    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Get connection by ID
  async getConnection(connectionId: string, tenantId: string): Promise<ApiConnection | null> {
    const cacheKey = this.getCacheKey(tenantId, connectionId);

    // Check cache first
    const cached = this.connections.get(cacheKey);
    if (cached) {
      if (cached.tenantId !== tenantId) {
        console.warn(`Tenant mismatch for cached connection ${connectionId}`);
        return null;
      }
      return cached.connection;
    }

    // Load from database
    const connection = await this.prisma.apiConnection.findFirst({
      where: { id: connectionId, tenantId }
    });

    if (!connection) {
      return null;
    }

    // Decrypt authentication
    const decryptedAuth = await this.decryptAuthCredentials(connection.authentication as any);

    const apiConnection: ApiConnection = {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      baseUrl: connection.baseUrl,
      authentication: decryptedAuth,
      headers: connection.headers as Record<string, string>,
      rateLimit: connection.rateLimit as RateLimitConfig,
      retryConfig: connection.retryConfig as RetryConfig,
      isActive: connection.isActive,
      metadata: connection.metadata
    };

    // Cache and setup
    this.connections.set(cacheKey, {
      tenantId,
      connection: apiConnection
    });
    await this.createHttpClient(tenantId, connectionId, apiConnection);
    this.setupRateLimiter(tenantId, connectionId, apiConnection.rateLimit);

    return apiConnection;
  }

  // Get connections for tenant
  async getConnections(tenantId: string): Promise<ApiConnection[]> {
    const connections = await this.prisma.apiConnection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    const result: ApiConnection[] = [];

    for (const conn of connections) {
      const decryptedAuth = await this.decryptAuthCredentials(conn.authentication as any);
      
      result.push({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        baseUrl: conn.baseUrl,
        authentication: decryptedAuth,
        headers: conn.headers as Record<string, string>,
        rateLimit: conn.rateLimit as RateLimitConfig,
        retryConfig: conn.retryConfig as RetryConfig,
        isActive: conn.isActive,
        metadata: conn.metadata
      });
    }

    return result;
  }

  // Private helper methods
  private async createHttpClient(
    tenantId: string,
    connectionId: string,
    connection: ApiConnection
  ): Promise<void> {
    const client = axios.create({
      baseURL: connection.baseUrl,
      headers: connection.headers
    });

    // Add authentication interceptor
    client.interceptors.request.use(async (config) => {
      return await this.addAuthentication(config, connection.authentication);
    });

    // Add response interceptor for token refresh
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && connection.authentication.type === 'oauth2') {
          // Try to refresh token
          const refreshed = await this.refreshOAuth2Token(connectionId, connection);
          if (refreshed) {
            // Retry original request
            return client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );

    const cacheKey = this.getCacheKey(tenantId, connectionId);
    this.clients.set(cacheKey, client);
  }

  private async addAuthentication(
    config: AxiosRequestConfig,
    auth: AuthConfig
  ): Promise<AxiosRequestConfig> {
    switch (auth.type) {
      case 'api_key':
        if (auth.credentials.headerName) {
          config.headers = {
            ...config.headers,
            [auth.credentials.headerName]: auth.credentials.apiKey
          };
        } else {
          config.params = {
            ...config.params,
            [auth.credentials.paramName || 'api_key']: auth.credentials.apiKey
          };
        }
        break;

      case 'bearer':
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${auth.credentials.token}`
        };
        break;

      case 'oauth2':
        if (auth.credentials.accessToken) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${auth.credentials.accessToken}`
          };
        }
        break;

      case 'basic':
        const credentials = Buffer.from(
          `${auth.credentials.username}:${auth.credentials.password}`
        ).toString('base64');
        config.headers = {
          ...config.headers,
          'Authorization': `Basic ${credentials}`
        };
        break;
    }

    return config;
  }

  private setupRateLimiter(
    tenantId: string,
    connectionId: string,
    rateLimit: RateLimitConfig
  ): void {
    const limiter = new RateLimiter(rateLimit);
    const cacheKey = this.getCacheKey(tenantId, connectionId);
    this.rateLimiters.set(cacheKey, limiter);
  }

  private async checkRateLimit(tenantId: string, connectionId: string): Promise<void> {
    const cacheKey = this.getCacheKey(tenantId, connectionId);
    const limiter = this.rateLimiters.get(cacheKey);
    if (limiter) {
      await limiter.checkLimit();
    }
  }

  private async makeRequestWithRetry(
    client: AxiosInstance,
    config: AxiosRequestConfig,
    retryConfig: RetryConfig
  ): Promise<AxiosResponse> {
    let lastError: any;
    let delay = 1000; // Start with 1 second

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await client.request(config);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if not a retryable status code
        if (error.response && !retryConfig.retryableStatusCodes.includes(error.response.status)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxBackoffMs);
      }
    }

    throw lastError;
  }

  private async validateConnection(connection: Omit<ApiConnection, 'id'>): Promise<void> {
    // Validate URL
    try {
      new URL(connection.baseUrl);
    } catch {
      throw new Error('Invalid base URL');
    }

    // Validate authentication
    if (!this.isValidAuthConfig(connection.authentication)) {
      throw new Error('Invalid authentication configuration');
    }

    // Validate rate limits
    if (connection.rateLimit.requestsPerSecond <= 0) {
      throw new Error('Invalid rate limit configuration');
    }
  }

  private isValidAuthConfig(auth: AuthConfig): boolean {
    switch (auth.type) {
      case 'none':
        return true;
      case 'api_key':
        return !!(auth.credentials?.apiKey);
      case 'bearer':
        return !!(auth.credentials?.token);
      case 'oauth2':
        return !!(auth.credentials?.clientId && auth.credentials?.clientSecret);
      case 'basic':
        return !!(auth.credentials?.username && auth.credentials?.password);
      default:
        return false;
    }
  }

  private requireEncryptionKey(): string {
    return ensureEncryptionKey(this.encryptionKey, 'ApiConnector');
  }

  private async encryptAuthCredentials(auth: AuthConfig): Promise<EncryptedPayload | null> {
    if (!auth) {
      return null;
    }

    const key = this.requireEncryptionKey();
    return encryptPayload(auth, key);
  }

  private async decryptAuthCredentials(encryptedAuth: any): Promise<AuthConfig> {
    if (!encryptedAuth) {
      return { type: 'none', credentials: {} } as AuthConfig;
    }

    if (isEncryptedPayload(encryptedAuth)) {
      const key = this.requireEncryptionKey();
      return decryptPayload<AuthConfig>(encryptedAuth, key);
    }

    try {
      if (typeof encryptedAuth?.credentials === 'string') {
        const decoded = Buffer.from(encryptedAuth.credentials, 'base64').toString();
        const credentials = JSON.parse(decoded);
        return {
          ...encryptedAuth,
          credentials
        } as AuthConfig;
      }
    } catch (error) {
      console.error('Failed to parse legacy authentication credentials', error);
    }

    return encryptedAuth as AuthConfig;
  }

  private async refreshOAuth2Token(connectionId: string, connection: ApiConnection): Promise<boolean> {
    // Mock OAuth2 refresh - implement actual OAuth2 refresh logic
    try {
      // Make refresh request to OAuth2 provider
      // Update connection with new tokens
      // Return true if successful
      return false;
    } catch {
      return false;
    }
  }

  private async logApiRequest(
    connectionId: string,
    tenantId: string,
    request: ApiRequest,
    statusCode: number,
    duration: number,
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.apiRequestLog.create({
        data: {
          connectionId,
          tenantId,
          method: request.method,
          endpoint: request.endpoint,
          statusCode,
          duration,
          error,
          requestData: request.data ? JSON.stringify(request.data) : null,
          createdAt: new Date()
        }
      });
    } catch (logError) {
      console.error('Error logging API request:', logError);
    }
  }

  private async loadConnections(): Promise<void> {
    try {
      const connections = await this.prisma.apiConnection.findMany({
        where: { isActive: true }
      });

      for (const conn of connections) {
        const decryptedAuth = await this.decryptAuthCredentials(conn.authentication as any);
        
        const apiConnection: ApiConnection = {
          id: conn.id,
          name: conn.name,
          type: conn.type,
          baseUrl: conn.baseUrl,
          authentication: decryptedAuth,
          headers: conn.headers as Record<string, string>,
          rateLimit: conn.rateLimit as RateLimitConfig,
          retryConfig: conn.retryConfig as RetryConfig,
          isActive: conn.isActive,
          metadata: conn.metadata
        };

        const cacheKey = this.getCacheKey(conn.tenantId, conn.id);
        this.connections.set(cacheKey, {
          tenantId: conn.tenantId,
          connection: apiConnection
        });
        await this.createHttpClient(conn.tenantId, conn.id, apiConnection);
        this.setupRateLimiter(conn.tenantId, conn.id, apiConnection.rateLimit);
      }
    } catch (error) {
      console.error('Error loading API connections:', error);
    }
  }
}

// Rate limiter class
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 60000); // Keep last minute
    
    // Check limits
    const recentRequests = this.requests.filter(time => now - time < 1000).length;
    if (recentRequests >= this.config.requestsPerSecond) {
      throw new Error('Rate limit exceeded: requests per second');
    }

    const minuteRequests = this.requests.length;
    if (minuteRequests >= this.config.requestsPerMinute) {
      throw new Error('Rate limit exceeded: requests per minute');
    }

    // Add current request
    this.requests.push(now);
  }
}
