import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import { verifyEmail, requestEmailVerification } from '../identity/credential-recovery.service';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const router = Router();

const verifyBody = z.object({
  token: z.string().min(1),
});

const resendBody = z.object({
  email: z.string().email().max(254),
});

router.post('/verify-email', validate({ body: verifyBody }), asyncHandler(async (req: Request, res: Response) => {
  const success = await verifyEmail(req.body.token);
  if (!success) {
    res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
    return;
  }
  res.json({ success: true, message: 'Email verified successfully' });
}));

router.post('/resend-verification', validate({ body: resendBody }), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const { safeQuery } = await import('@dos/db');
  const userResult = await safeQuery(
    'SELECT user_id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email],
  ).catch(() => ({ rows: [] }));
  const user = userResult.rows[0] as { user_id: string; tenant_id: string } | undefined;
  if (user) {
    await requestEmailVerification(user.user_id, email, user.tenant_id || 'system').catch(
      catchHandler(EC.EVENT_BUS, {
        tenantId: user.tenant_id || 'system',
        operation: 'dauth:resend-email-verification',
      }),
    );
  }
  res.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
}));

export default router;
