import { Router } from 'express';
import { ExecutionController } from '../controllers/executionController';
import { authMiddleware } from '../../auth/middleware/authMiddleware';
import { tenantMiddleware } from '../../auth/middleware/tenantMiddleware';
import { validateRequest } from '../../common/middleware/validateRequest';
import { executionValidators } from '../validators/executionValidators';

const router = Router();
const executionController = new ExecutionController();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Execution Management Routes
router.get(
  '/',
  validateRequest(executionValidators.listExecutions),
  executionController.listExecutions.bind(executionController)
);

router.get(
  '/:executionId',
  validateRequest(executionValidators.getExecution),
  executionController.getExecution.bind(executionController)
);

router.get(
  '/:executionId/logs',
  validateRequest(executionValidators.getExecutionLogs),
  executionController.getExecutionLogs.bind(executionController)
);

router.post(
  '/:executionId/cancel',
  validateRequest(executionValidators.cancelExecution),
  executionController.cancelExecution.bind(executionController)
);

router.post(
  '/:executionId/retry',
  validateRequest(executionValidators.retryExecution),
  executionController.retryExecution.bind(executionController)
);

// Execution Statistics
router.get(
  '/stats/overview',
  validateRequest(executionValidators.getExecutionStats),
  executionController.getExecutionStats.bind(executionController)
);

export { router as executionRoutes };
