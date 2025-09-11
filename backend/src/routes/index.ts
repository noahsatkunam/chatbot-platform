import { Router } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import chatbotRoutes from './chatbot.routes';
import conversationRoutes from './conversation.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/chatbots', chatbotRoutes);
router.use('/conversations', conversationRoutes);

export default router;
