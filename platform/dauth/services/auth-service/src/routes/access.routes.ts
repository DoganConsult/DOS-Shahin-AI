import { Router, Request, Response } from 'express';
import axios from 'axios';
import {
  COOKIE_ACCESS,
  verifySession,
  TENANT_SERVICE_URL,
} from '../lib/session';

export const accessRouter = Router();

accessRouter.get('/my-permissions', async (req: Request, res: Response) => {
  const access = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  if (!access) return res.status(401).json({ error: 'NO_SESSION' });

  try {
    const claims = await verifySession(access);
    const sub = typeof claims.sub === 'string' ? claims.sub : '';
    const email = typeof claims.email === 'string' ? claims.email : '';
    const name = typeof claims.name === 'string' ? claims.name : (claims.preferred_username as string) || '';

    if (!TENANT_SERVICE_URL) {
      return res.status(500).json({ error: 'TENANT_SERVICE_NOT_CONFIGURED' });
    }

    const headers = {
      'x-user-sub': sub,
      'x-user-email': email,
      'x-user-name': name,
    };

    // Parallel fetch for speed
    const [meResp, permResp] = await Promise.all([
      axios.get(`${TENANT_SERVICE_URL}/me`, { headers, timeout: 5000, validateStatus: () => true }),
      axios.get(`${TENANT_SERVICE_URL}/permissions`, { headers, timeout: 5000, validateStatus: () => true }),
    ]);

    if (meResp.status !== 200 || permResp.status !== 200) {
      return res.status(meResp.status === 200 ? permResp.status : meResp.status).json({
        error: 'TENANT_SERVICE_ERROR',
        details: meResp.data?.message || permResp.data?.message
      });
    }

    const me = meResp.data;
    const perms = permResp.data;

    const snapshot = {
      version: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      actor: {
        userId: me.user.id,
        email: me.user.email,
        displayName: me.user.name,
        actorType: 'user'
      },
      tenant: {
        tenantId: me.tenant.id,
        status: me.tenant.status,
        plan: 'standard' // Default for now
      },
      permissions: perms.permissions || [],
      roles: perms.roles || [],
      modules: perms.modules || [],
      dashboards: [] as unknown[],
      landingPage: me.membership?.landingRoute ?? null,
      scopeBindings: [] as unknown[],
      decisionAuthorities: [] as unknown[],
      accessProfiles: [] as unknown[],
    };

    return res.json({ success: true, data: snapshot });
  } catch (err: any) {
    console.error('[access-routes] my-permissions failed', err.message);
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
});
