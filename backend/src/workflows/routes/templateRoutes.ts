import { Router } from 'express';
import { TemplateController } from '../controllers/templateController';
import { authMiddleware } from '../../auth/middleware/authMiddleware';
import { tenantMiddleware } from '../../auth/middleware/tenantMiddleware';
import { validateRequest } from '../../common/middleware/validateRequest';
import { templateValidators } from '../validators/templateValidators';

const router = Router();
const templateController = new TemplateController();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Template Management Routes
router.get(
  '/',
  validateRequest(templateValidators.listTemplates),
  templateController.listTemplates.bind(templateController)
);

router.get(
  '/:templateId',
  validateRequest(templateValidators.getTemplate),
  templateController.getTemplate.bind(templateController)
);

router.post(
  '/',
  validateRequest(templateValidators.createTemplate),
  templateController.createTemplate.bind(templateController)
);

router.put(
  '/:templateId',
  validateRequest(templateValidators.updateTemplate),
  templateController.updateTemplate.bind(templateController)
);

router.delete(
  '/:templateId',
  validateRequest(templateValidators.deleteTemplate),
  templateController.deleteTemplate.bind(templateController)
);

// Template Usage Routes
router.post(
  '/:templateId/create-workflow',
  validateRequest(templateValidators.createFromTemplate),
  templateController.createFromTemplate.bind(templateController)
);

router.get(
  '/popular/list',
  templateController.getPopularTemplates.bind(templateController)
);

router.get(
  '/categories/overview',
  templateController.getTemplatesByCategory.bind(templateController)
);

export { router as templateRoutes };
