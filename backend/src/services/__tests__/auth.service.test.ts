import { authService } from '../auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middlewares/errorHandler';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../email.service');
jest.mock('../audit.service');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  authToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

// @ts-ignore
PrismaClient.mockImplementation(() => mockPrisma);

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
    process.env.BCRYPT_ROUNDS = '10';
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        fullName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '123',
        email: userData.email,
        fullName: userData.fullName,
        role: 'TENANT_USER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await authService.register(userData);

      expect(result.email).toBe(userData.email);
      expect(result.fullName).toBe(userData.fullName);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email.toLowerCase(),
          passwordHash: 'hashed_password',
        }),
      });
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '123', email: 'test@example.com' });

      await expect(authService.register({
        email: 'test@example.com',
        password: 'Test123!@#',
      })).rejects.toThrow(AppError);
    });

    it('should validate password requirements', async () => {
      const weakPasswords = ['short', 'nouppercase1!', 'NOLOWERCASE1!', 'NoNumbers!', 'NoSpecial123'];

      for (const password of weakPasswords) {
        await expect(authService.register({
          email: 'test@example.com',
          password,
        })).rejects.toThrow();
      }
    });
  });

  describe('login', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      emailVerified: true,
      lockedUntil: null,
      failedLoginAttempts: 0,
      tenantId: '456',
      role: 'TENANT_USER',
    };

    it('should login user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.authToken.create.mockResolvedValue({ id: '789', token: 'refresh_token' });
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt_token');

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrong_password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject unverified email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Please verify your email address');
    });

    it('should reject locked account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
      });

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Account is locked');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid_refresh_token';
      const userId = '123';

      (jwt.verify as jest.Mock).mockReturnValue({ sub: userId });
      mockPrisma.authToken.findUnique.mockResolvedValue({
        id: '789',
        token: refreshToken,
        usedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: userId, email: 'test@example.com', role: 'TENANT_USER' },
      });
      mockPrisma.authToken.update.mockResolvedValue({});
      mockPrisma.authToken.create.mockResolvedValue({});
      (jwt.sign as jest.Mock).mockReturnValue('new_jwt_token');

      const result = await authService.refreshTokens(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.authToken.update).toHaveBeenCalledWith({
        where: { id: '789' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should reject invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshTokens('invalid_token'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should reject used refresh token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: '123' });
      mockPrisma.authToken.findUnique.mockResolvedValue({
        id: '789',
        token: 'used_token',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(authService.refreshTokens('used_token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '123',
        email,
        tenantId: '456',
      });
      mockPrisma.authToken.create.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');

      await authService.forgotPassword(email);

      expect(mockPrisma.authToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '123',
          type: 'PASSWORD_RESET',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should not throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.forgotPassword('nonexistent@example.com'))
        .resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'reset_token';
      const newPassword = 'NewPass123!@#';

      mockPrisma.authToken.findMany.mockResolvedValue([{
        id: '789',
        token: 'hashed_token',
        userId: '123',
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: '123', tenantId: '456' },
      }]);
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.authToken.update.mockResolvedValue({});
      mockPrisma.authToken.updateMany.mockResolvedValue({});

      await authService.resetPassword(token, newPassword);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { passwordHash: 'new_hashed_password' },
      });
    });

    it('should reject invalid reset token', async () => {
      mockPrisma.authToken.findMany.mockResolvedValue([]);

      await expect(authService.resetPassword('invalid_token', 'NewPass123!@#'))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should validate new password requirements', async () => {
      await expect(authService.resetPassword('token', 'weak'))
        .rejects.toThrow();
    });
  });
});
