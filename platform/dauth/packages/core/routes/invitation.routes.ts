import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import {
  validateInvitation,
  acceptInvitation,
} from '../identity/invitation-control.service';

const router = Router();

const acceptBody = z.object({
  token: z.string().min(1),
});

const tokenQuery = z.string().min(1).max(256);

router.get('/validate', asyncHandler(async (req: Request, res: Response) => {
  const parsed = tokenQuery.safeParse(req.query.token);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invitation token required', code: 'TOKEN_REQUIRED' });
    return;
  }
  const token = parsed.data;
  const invitation = await validateInvitation(token);
  if (!invitation) {
    res.status(400).json({ error: 'Invalid or expired invitation', code: 'INVALID_INVITATION' });
    return;
  }
  res.json({ valid: true, invitation });
}));

router.post('/accept', validate({ body: acceptBody }), asyncHandler(async (req: Request, res: Response) => {
  const success = await acceptInvitation(req.body.token);
  if (!success) {
    res.status(400).json({ error: 'Failed to accept invitation', code: 'ACCEPT_FAILED' });
    return;
  }
  res.json({ success: true, message: 'Invitation accepted' });
}));

export default router;
