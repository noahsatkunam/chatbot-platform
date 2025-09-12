# Multi-Tenant Chatbot Platform

A modern, scalable multi-tenant chatbot platform with enterprise-grade security and isolation.

## 🚀 Phase 1 Status: ✅ COMPLETE

### Implemented Features

#### 🔒 Security
- **SUPER_ADMIN Creation Prevention**: Public registration endpoints cannot create admin users
- **Tenant-Scoped Authentication**: Login requires valid tenant context from subdomain
- **JWT Security**: Tokens include tenant context and are validated on every request
- **Password Security**: Bcrypt hashing with configurable rounds
- **Rate Limiting**: Per-tenant rate limits using Redis
- **CSRF Protection**: Token-based CSRF protection for state-changing operations

#### 🏢 Multi-Tenant Architecture
- **Subdomain Routing**: Each tenant gets a unique subdomain (tenant.platform.com)
- **Data Isolation**: Complete row-level security with tenant-scoped queries
- **Tenant Management**: Full CRUD operations for tenant administration
- **Custom Domains**: Support for enterprise custom domains
- **Resource Limits**: Configurable limits per tenant plan
- **Feature Flags**: Enable/disable features per tenant

#### 🔐 Authentication System
- **Registration Flow**: Email verification required, tenant-scoped
- **Login Flow**: Secure session management with HttpOnly cookies
- **Password Reset**: Tenant-scoped password recovery
- **Two-Factor Authentication**: TOTP-based 2FA support
- **JWT Refresh**: Automatic token refresh with refresh tokens
- **Session Management**: Redis-backed session storage

#### 📊 Tenant Plans
- **FREE**: Basic features, 5 users, 1GB storage
- **STARTER**: Custom branding, API access, 20 users, 10GB storage
- **PROFESSIONAL**: Advanced features, 100 users, 100GB storage
- **ENTERPRISE**: Unlimited resources, all features, custom limits

## 📋 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatbot-platform.git
cd chatbot-platform
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
# Edit .env with your configuration
```

3. Start services with Docker:
```bash
docker-compose up -d
```

4. Initialize the database:
```bash
cd backend
npm install
npx prisma migrate dev
```

5. Run the application:
```bash
npm run dev
```

## 🧪 Testing & Verification

### Run Complete Test Suite
```bash
# Set up test environment
./scripts/setup-test-env.sh

# Run security tests
./scripts/run-security-tests.sh

# Test tenant isolation
./scripts/test-tenant-isolation.sh

# Complete Phase 1 verification
./scripts/verify-phase1.sh
```

### Manual Testing
See [Manual Testing Guide](docs/MANUAL_TESTING_GUIDE.md) for detailed testing instructions.

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (tenant-scoped) |
| POST | `/api/auth/login` | Login with tenant context |
| POST | `/api/auth/logout` | Logout and clear session |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/verify-email/:token` | Verify email address |

### Tenant Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tenants/register` | Register new tenant |
| GET | `/api/tenants/current` | Get current tenant details |
| PUT | `/api/tenants/current` | Update tenant settings |
| POST | `/api/tenants/:id/upgrade` | Upgrade tenant plan |
| GET | `/api/tenants/:id/usage` | Get usage statistics |

## 🏗️ Architecture

### Backend Structure
```
backend/
├── src/
│   ├── auth/          # Authentication system
│   ├── tenant/        # Multi-tenant infrastructure
│   ├── middlewares/   # Express middlewares
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Helper functions
│   └── tests/         # Test suites
├── prisma/
│   └── schema.prisma  # Database schema
└── docker-compose.yml # Container configuration
```

### Security Features
- **JWT Tokens**: Secure token generation with tenant context
- **Password Hashing**: Bcrypt with configurable rounds
- **Rate Limiting**: Redis-backed per-tenant limits
- **CSRF Protection**: Token-based protection
- **SQL Injection**: Parameterized queries via Prisma
- **XSS Prevention**: Input sanitization and validation

## 🚀 Phase 2 Roadmap

- [ ] Chatbot engine integration
- [ ] Natural language processing
- [ ] Conversation management
- [ ] Analytics dashboard
- [ ] Webhook integrations
- [ ] Custom chatbot training
- [ ] Multi-language support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Supabase account (for production)
- Git

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form with Zod validation

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT with Supabase Auth
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis
- **Monitoring**: Prometheus & Grafana

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/chatbot-platform.git
cd chatbot-platform
```

### 2. Environment Setup

Copy the example environment files:

```bash
# Frontend environment
cp frontend/.env.example frontend/.env.local

# Backend environment
cp backend/.env backend/.env
```

Update the environment variables with your configuration:

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 4. Database Setup

If using Supabase cloud:
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` through the Supabase dashboard

For local development with Docker:
```bash
# The docker-compose file includes a PostgreSQL instance
docker-compose up postgres
```

### 5. Start Development Servers

#### Option 1: Using Docker Compose (Recommended)
```bash
docker-compose up
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

#### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 📁 Project Structure

```
chatbot-platform/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   ├── public/            # Static assets
│   └── Dockerfile         # Frontend container config
│
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middlewares/   # Express middlewares
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helper utilities
│   │   └── types/         # TypeScript types
│   └── Dockerfile         # Backend container config
│
├── supabase/              # Database configuration
│   ├── migrations/        # SQL migration files
│   ├── functions/         # Edge functions (if needed)
│   └── seed/              # Seed data for development
│
├── monitoring/            # Monitoring configuration
│   ├── prometheus/        # Prometheus config
│   └── grafana/           # Grafana dashboards
│
├── docs/                  # Additional documentation
└── docker-compose.yml     # Multi-container setup
```

## 🔧 Development Workflow

### Code Quality

The project uses ESLint and Prettier for code quality:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

## 🚀 Deployment

### Docker Deployment

Build and run production containers:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Environment Variables

Ensure all required environment variables are set in production:

- `NODE_ENV=production`
- Database credentials
- API keys
- JWT secrets

### Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT secrets
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable Supabase RLS policies

## 📊 Monitoring

Access monitoring dashboards:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

Key metrics monitored:
- API response times
- Error rates
- Database query performance
- Resource utilization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@yourcompany.com

## 🔮 Roadmap

- [ ] WebSocket support for real-time chat
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Plugin system for chatbot extensions
- [ ] Mobile applications
- [ ] Kubernetes deployment configuration
