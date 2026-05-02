import { Request, Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate } from "../ports/middleware.port";
const router = Router();

router.get('/providers', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('admin.system.read'), async (_req: Request, res: Response) => {
  res.json({ providers: ['microsoft365', 'google-workspace', 'jira', 'servicenow'] });
});

export default router;
