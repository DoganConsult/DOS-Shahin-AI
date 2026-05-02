import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate } from '../middleware/session.middleware';
import { resolveUserRoles } from '../identity/auth-orchestrator.service';
import { getAccessSnapshot } from '../access/access-snapshot.service';
import { getMfaStatus } from '../mfa/mfa.service';
import { safeQuery } from '@dos/db';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;

  const userResult = await safeQuery(
    `SELECT user_id, email, name, role, status, tenant_id, onboarding_complete,
            member_onboarded, is_super_admin, avatar_url, locale, timezone,
            created_at, last_login_at
     FROM users WHERE user_id = $1`,
    [userId],
  );
  const user = userResult.rows[0] as {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
    name?: string;
    status?: string;
    onboarding_complete?: boolean;
    is_super_admin?: boolean;
    member_onboarded?: boolean;
    avatar_url?: string | null;
    locale?: string | null;
    timezone?: string | null;
    created_at?: string;
    last_login_at?: string | null;
  } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    return;
  }

  const allRoles = await resolveUserRoles(userId, tenantId || user.tenant_id, user.role);

  let orgName = '';
  try {
    const tenantResult = await safeQuery('SELECT org_name FROM tenants WHERE tenant_id = $1', [user.tenant_id]);
    orgName = tenantResult.rows[0]?.org_name || '';
  } catch (_e) { /* non-critical */ }

  let mfaEnabled = false;
  try {
    const mfa = await getMfaStatus(userId);
    mfaEnabled = mfa.enabled;
  } catch (_e) { /* non-critical */ }

  res.json({
    userId: user.user_id,
    email: user.email,
    name: user.name || '',
    role: allRoles[0] || user.role,
    roles: allRoles,
    tenantId: user.tenant_id,
    orgName,
    status: user.status,
    onboardingComplete: user.onboarding_complete ?? false,
    memberOnboarded: user.member_onboarded ?? false,
    isSuperAdmin: user.is_super_admin === true,
    avatarUrl: user.avatar_url || null,
    locale: user.locale || 'en',
    timezone: user.timezone || 'UTC',
    mfaEnabled,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  });
}));

router.get('/access-snapshot', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const snapshot = await getAccessSnapshot(tenantId, userId);
  res.json({ data: snapshot });
}));

export default router;
