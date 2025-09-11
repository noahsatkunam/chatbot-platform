import { PrismaClient, Tenant, TenantStatus, TenantPlan, TenantUsage } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../utils/redis';
import { 
  CreateTenantDto, 
  UpdateTenantDto,
  TenantContext,
  TENANT_PLAN_LIMITS,
  TENANT_PLAN_FEATURES,
  DEFAULT_TENANT_SETTINGS,
  DEFAULT_TENANT_FEATURES,
  TenantSettings,
  TenantFeatures,
  TenantLimits
} from '../models/tenantModel';
import { generateSlug, validateSubdomain } from '../utils/tenantUtils';

const prisma = new PrismaClient();
const redis = getRedisClient();

class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    // Validate subdomain
    if (!validateSubdomain(data.subdomain)) {
      throw new AppError('Invalid subdomain format', 400);
    }

    // Check if subdomain is available
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: data.subdomain },
          { slug: data.slug },
        ],
      },
    });

    if (existingTenant) {
      throw new AppError('Subdomain or slug already exists', 409);
    }

    // Calculate trial end date
    const trialDays = data.trialDays || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Get plan-specific settings and limits
    const plan = data.plan || 'FREE';
    const settings = { ...DEFAULT_TENANT_SETTINGS };
    const features = { ...TENANT_PLAN_FEATURES[plan] };
    const limits = { ...TENANT_PLAN_LIMITS[plan] };

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        subdomain: data.subdomain.toLowerCase(),
        status: plan === 'FREE' ? 'ACTIVE' : 'TRIAL',
        plan,
        trialEndsAt: plan !== 'FREE' ? trialEndsAt : null,
        contactEmail: data.contactEmail,
        settings,
        features,
        limits,
      },
    });

    // Cache tenant data
    await this.cacheTenant(tenant);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'TENANT_CREATED',
        entity: 'Tenant',
        entityId: tenant.id,
        metadata: { plan, trialDays },
      },
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenant(id: string): Promise<Tenant | null> {
    // Try cache first
    const cached = await this.getCachedTenant(id);
    if (cached) return cached;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (tenant) {
      await this.cacheTenant(tenant);
    }

    return tenant;
  }

  /**
   * Get tenant by subdomain or custom domain
   */
  async getTenantByIdentifier(identifier: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: identifier.toLowerCase() },
          { customDomain: identifier.toLowerCase() },
        ],
        status: {
          notIn: ['INACTIVE'],
        },
      },
    });

    if (tenant) {
      await this.cacheTenant(tenant);
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.getTenant(id);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Merge settings, features, and limits
    const settings = data.settings ? { ...tenant.settings as any, ...data.settings } : tenant.settings;
    const features = data.features ? { ...tenant.features as any, ...data.features } : tenant.features;
    const limits = data.limits ? { ...tenant.limits as any, ...data.limits } : tenant.limits;

    // Validate custom domain if provided
    if (data.customDomain) {
      const existingWithDomain = await prisma.tenant.findFirst({
        where: {
          customDomain: data.customDomain,
          id: { not: id },
        },
      });

      if (existingWithDomain) {
        throw new AppError('Custom domain already in use', 409);
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        settings,
        features,
        limits,
      },
    });

    // Invalidate cache
    await this.invalidateTenantCache(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: id,
        action: 'TENANT_UPDATED',
        entity: 'Tenant',
        entityId: id,
        metadata: data,
      },
    });

    return updatedTenant;
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(id: string, status: TenantStatus, reason?: string): Promise<Tenant> {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status,
        suspendedAt: status === 'SUSPENDED' ? new Date() : null,
        suspendReason: reason,
      },
    });

    // Invalidate cache
    await this.invalidateTenantCache(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: id,
        action: `TENANT_${status}`,
        entity: 'Tenant',
        entityId: id,
        metadata: { reason },
      },
    });

    return tenant;
  }

  /**
   * Upgrade tenant plan
   */
  async upgradeTenantPlan(id: string, newPlan: TenantPlan): Promise<Tenant> {
    const tenant = await this.getTenant(id);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Update features and limits based on new plan
    const features = { ...TENANT_PLAN_FEATURES[newPlan] };
    const limits = { ...TENANT_PLAN_LIMITS[newPlan] };

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        plan: newPlan,
        status: 'ACTIVE',
        features,
        limits,
        trialEndsAt: null, // Clear trial end date
      },
    });

    // Invalidate cache
    await this.invalidateTenantCache(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: id,
        action: 'TENANT_PLAN_UPGRADED',
        entity: 'Tenant',
        entityId: id,
        metadata: {
          oldPlan: tenant.plan,
          newPlan,
        },
      },
    });

    return updatedTenant;
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId: string, period?: Date): Promise<TenantUsage | null> {
    const date = period || new Date();
    date.setHours(0, 0, 0, 0);

    let usage = await prisma.tenantUsage.findUnique({
      where: {
        tenantId_period: {
          tenantId,
          period: date,
        },
      },
    });

    // Create entry if it doesn't exist
    if (!usage) {
      usage = await prisma.tenantUsage.create({
        data: {
          tenantId,
          period: date,
        },
      });
    }

    return usage;
  }

  /**
   * Update tenant usage
   */
  async updateTenantUsage(
    tenantId: string,
    metric: keyof Omit<TenantUsage, 'id' | 'tenantId' | 'period' | 'createdAt' | 'updatedAt'>,
    increment: number = 1
  ): Promise<void> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    await prisma.tenantUsage.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: date,
        },
      },
      update: {
        [metric]: {
          increment,
        },
      },
      create: {
        tenantId,
        period: date,
        [metric]: increment,
      },
    });
  }

  /**
   * Get tenant resource usage
   */
  async getTenantResourceUsage(tenantId: string, resource: keyof TenantLimits): Promise<number> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    switch (resource) {
      case 'maxUsers':
        return await prisma.user.count({ where: { tenantId } });

      case 'maxChatbots':
        // Placeholder for when Chatbot model is implemented
        return 0;

      case 'maxMessagesPerMonth':
        const usage = await this.getTenantUsage(tenantId);
        return usage?.messagesCount || 0;

      case 'maxApiCallsPerMonth':
        const apiUsage = await this.getTenantUsage(tenantId);
        return apiUsage?.apiCalls || 0;

      case 'maxStorageGB':
        const storageUsage = await this.getTenantUsage(tenantId);
        return Number(storageUsage?.storageUsed || 0) / (1024 * 1024 * 1024);

      default:
        return 0;
    }
  }

  /**
   * Consume rate limit
   */
  async consumeRateLimit(tenantId: string, points: number, limit: number): Promise<number> {
    const key = `rate_limit:tenant:${tenantId}:${new Date().getHours()}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 3600); // 1 hour
    }

    return current;
  }

  /**
   * List tenants (admin only)
   */
  async listTenants(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: TenantStatus;
      plan?: TenantPlan;
      search?: string;
    }
  ): Promise<{ tenants: Tenant[]; total: number }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.plan) {
      where.plan = filters.plan;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { subdomain: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return { tenants, total };
  }

  /**
   * Get tenant statistics (admin only)
   */
  async getTenantStatistics(): Promise<any> {
    const stats = await prisma.tenant.groupBy({
      by: ['status', 'plan'],
      _count: true,
    });

    const totalUsers = await prisma.user.count();
    const totalTenants = await prisma.tenant.count();

    return {
      totalTenants,
      totalUsers,
      byStatus: stats.filter(s => s.status),
      byPlan: stats.filter(s => s.plan),
    };
  }

  /**
   * Cache tenant data
   */
  private async cacheTenant(tenant: Tenant): Promise<void> {
    const key = `tenant:${tenant.id}`;
    const subdomainKey = `tenant:subdomain:${tenant.subdomain}`;

    await redis.setEx(key, 3600, JSON.stringify(tenant));
    await redis.setEx(subdomainKey, 3600, tenant.id);

    if (tenant.customDomain) {
      const domainKey = `tenant:domain:${tenant.customDomain}`;
      await redis.setEx(domainKey, 3600, tenant.id);
    }
  }

  /**
   * Get cached tenant
   */
  private async getCachedTenant(id: string): Promise<Tenant | null> {
    const key = `tenant:${id}`;
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  }

  /**
   * Invalidate tenant cache
   */
  private async invalidateTenantCache(id: string): Promise<void> {
    const tenant = await this.getTenant(id);
    if (!tenant) return;

    const keys = [
      `tenant:${id}`,
      `tenant:subdomain:${tenant.subdomain}`,
    ];

    if (tenant.customDomain) {
      keys.push(`tenant:domain:${tenant.customDomain}`);
    }

    await Promise.all(keys.map(key => redis.del(key)));
  }
}

export const tenantService = new TenantService();
