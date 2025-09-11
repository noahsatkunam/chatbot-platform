import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, User, TokenType } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { auditService } from './audit.service';

const prisma = new PrismaClient();

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private readonly bcryptRounds: number;
  private readonly jwtSecret: string;
  private readonly jwtAccessExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;
  private readonly minPasswordLength: number;

  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.jwtIssuer = process.env.JWT_ISSUER || 'chatbot-platform';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'chatbot-platform-api';
    this.minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH || '8', 10);

    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    fullName?: string;
    tenantId?: string;
    role?: string;
  }): Promise<User> {
    // Validate password strength
    this.validatePassword(data.password);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        tenantId: data.tenantId,
        role: data.role as any || 'TENANT_USER',
      },
    });

    // Send verification email
    await this.sendVerificationEmail(user);

    // Audit log
    await auditService.log({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    });

    // Remove sensitive data
    delete (user as any).passwordHash;
    delete (user as any).twoFactorSecret;

    return user;
  }

  /**
   * Login user and generate tokens
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account is locked. Please try again later.', 423);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed login attempts
      await this.handleFailedLogin(user);
      throw new AppError('Invalid email or password', 401);
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new AppError('Please verify your email address', 401);
    }

    // Reset failed login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    // Audit log
    await auditService.log({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    // Remove sensitive data
    delete (user as any).passwordHash;
    delete (user as any).twoFactorSecret;

    return { user, tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      }) as JWTPayload;

      // Check if token exists in database and is not used
      const storedToken = await prisma.authToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.usedAt || storedToken.expiresAt < new Date()) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Mark token as used
      await prisma.authToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      });

      // Generate new token pair
      const tokens = await this.generateTokenPair(storedToken.user);

      return tokens;
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.authToken.updateMany({
      where: { token: refreshToken },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store token in database
    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    // Audit log
    await auditService.log({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
    });
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    this.validatePassword(newPassword);

    // Find all password reset tokens
    const resetTokens = await prisma.authToken.findMany({
      where: {
        type: TokenType.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    // Verify token against each stored token
    let validToken = null;
    for (const storedToken of resetTokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        validToken = storedToken;
        break;
      }
    }

    if (!validToken) {
      throw new AppError('Invalid or expired reset token', 401);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update user password
    await prisma.user.update({
      where: { id: validToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.authToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all other tokens for this user
    await prisma.authToken.updateMany({
      where: {
        userId: validToken.userId,
        type: TokenType.PASSWORD_RESET,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Audit log
    await auditService.log({
      userId: validToken.userId,
      tenantId: validToken.user.tenantId,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: validToken.userId,
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    // Find verification token
    const verificationTokens = await prisma.authToken.findMany({
      where: {
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    // Verify token
    let validToken = null;
    for (const storedToken of verificationTokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        validToken = storedToken;
        break;
      }
    }

    if (!validToken) {
      throw new AppError('Invalid or expired verification token', 401);
    }

    // Update user
    await prisma.user.update({
      where: { id: validToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Mark token as used
    await prisma.authToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() },
    });

    // Audit log
    await auditService.log({
      userId: validToken.userId,
      tenantId: validToken.user.tenantId,
      action: 'EMAIL_VERIFIED',
      entity: 'User',
      entityId: validToken.userId,
    });
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: `${process.env.TWO_FACTOR_APP_NAME} (${userId})`,
      length: 32,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: true,
      },
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || '',
    };
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: parseInt(process.env.TWO_FACTOR_WINDOW || '1', 10),
    });
  }

  /**
   * Private helper methods
   */

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtAccessExpiresIn,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });

    // Store refresh token in database
    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        type: TokenType.REFRESH,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const verificationToken = uuidv4();
    const hashedToken = await bcrypt.hash(verificationToken, 10);

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await emailService.sendVerificationEmail(user.email, verificationToken);
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: failedAttempts };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      updateData.failedLoginAttempts = 0;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  private validatePassword(password: string): void {
    if (password.length < this.minPasswordLength) {
      throw new AppError(
        `Password must be at least ${this.minPasswordLength} characters long`,
        400
      );
    }

    // Check for at least one uppercase, one lowercase, one number, and one special character
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new AppError(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        400
      );
    }
  }
}

export const authService = new AuthService();
