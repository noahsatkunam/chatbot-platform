# Multi-Tenant Chatbot Platform

A scalable, enterprise-grade multi-tenant chatbot platform built with modern web technologies. This platform allows organizations to create and manage multiple AI-powered chatbots with complete tenant isolation and comprehensive security features.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete tenant isolation with row-level security
- **Modern Tech Stack**: Next.js 14+, Express.js, TypeScript, and Supabase
- **Enterprise Security**: JWT authentication, rate limiting, and environment-based configuration
- **Containerized Development**: Docker and Docker Compose for consistent development environments
- **Real-time Monitoring**: Prometheus and Grafana integration for system metrics
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **API-First Design**: RESTful API with comprehensive error handling

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
