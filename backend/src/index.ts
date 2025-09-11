import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/rateLimiter';
import { logger } from './utils/logger';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
