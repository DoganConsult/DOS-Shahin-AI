import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import {
  getProvisioningJob,
  getProvisioningSteps,
  getProvisioningEvents,
  getTemporalStatus,
} from './provisioning.controller';

const router: ExpressRouter = Router();

router.get('/jobs/:jobId', getProvisioningJob as any);
router.get('/jobs/:jobId/steps', getProvisioningSteps as any);
router.get('/jobs/:jobId/events', getProvisioningEvents as any);
router.get('/jobs/:jobId/temporal', getTemporalStatus as any);

export default router;
