import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import {
  approveOnboarding,
  provisionWorkspace,
  retryProvisioningJob,
  cancelProvisioningJob,
} from './provisioning.controller';

const router: ExpressRouter = Router();

router.post('/onboarding/:sessionId/approve', approveOnboarding as any);
router.post('/onboarding/:sessionId/provision', provisionWorkspace as any);
router.post('/provisioning/jobs/:jobId/retry', retryProvisioningJob as any);
router.delete('/provisioning/jobs/:jobId', cancelProvisioningJob as any);

export default router;
