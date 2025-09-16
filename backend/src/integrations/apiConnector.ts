import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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

export class ApiConnector extends EventEmitter {
  private prisma: PrismaClient;
  private connections: Map<string, ApiConnection> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.loadConnections();
  }

  // Create new API connection
  async createConnection(
    tenantId: string,
    connectionData: Omit<ApiConnection, 'id'>
  ): Promise<string> {
    try {
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

      this.connections.set(connection.id, apiConnection);

      // Create HTTP client
      await this.createHttpClient(connection.id, apiConnection);

      // Setup rate limiter
      this.setupRateLimiter(connection.id, apiConnection.rateLimit);

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

    // Encrypt auth if updated
    let encryptedAuth = connection.authentication;
    if (updates.authentication) {
      encryptedAuth = await this.encryptAuthCredentials(updates.authentication);
    }

    // Update database
    await this.prisma.apiConnection.update({
      where: { id: connectionId },
      data: {
        ...updates,
        authentication: encryptedAuth,
        updatedAt: new Date()
      }
    });

    // Update cache
    const cachedConnection = this.connections.get(connectionId);
    if (cachedConnection) {
      Object.assign(cachedConnection, updates);
      
      // Recreate HTTP client if needed
      if (updates.baseUrl || updates.authentication || updates.headers) {
        await this.createHttpClient(connectionId, cachedConnection);
      }

      // Update rate limiter if needed
      if (updates.rateLimit) {
        this.setupRateLimiter(connectionId, updates.rateLimit);
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
    this.connections.delete(connectionId);
    this.clients.delete(connectionId);
    this.rateLimiters.delete(connectionId);

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

      // Check rate limits
      await this.checkRateLimit(connectionId);

      // Get HTTP client
      const client = this.clients.get(connectionId);
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
    // Check cache first
    const cached = this.connections.get(connectionId);
    if (cached) {
      return cached;
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
    this.connections.set(connectionId, apiConnection);
    await this.createHttpClient(connectionId, apiConnection);
    this.setupRateLimiter(connectionId, apiConnection.rateLimit);

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
  private async createHttpClient(connectionId: string, connection: ApiConnection): Promise<void> {
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

    this.clients.set(connectionId, client);
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

  private setupRateLimiter(connectionId: string, rateLimit: RateLimitConfig): void {
    const limiter = new RateLimiter(rateLimit);
    this.rateLimiters.set(connectionId, limiter);
  }

  private async checkRateLimit(connectionId: string): Promise<void> {
    const limiter = this.rateLimiters.get(connectionId);
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

  private async encryptAuthCredentials(auth: AuthConfig): Promise<any> {
    // Mock encryption - replace with actual encryption service
    return {
      ...auth,
      credentials: Buffer.from(JSON.stringify(auth.credentials)).toString('base64')
    };
  }

  private async decryptAuthCredentials(encryptedAuth: any): Promise<AuthConfig> {
    // Mock decryption - replace with actual decryption service
    try {
      const credentials = JSON.parse(Buffer.from(encryptedAuth.credentials, 'base64').toString());
      return {
        ...encryptedAuth,
        credentials
      };
    } catch {
      return encryptedAuth;
    }
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

        this.connections.set(conn.id, apiConnection);
        await this.createHttpClient(conn.id, apiConnection);
        this.setupRateLimiter(conn.id, apiConnection.rateLimit);
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
