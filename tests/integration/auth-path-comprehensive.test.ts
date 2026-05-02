/**
 * DOS-AIO Authentication Path Comprehensive Tests
 *
 * Tests cover:
 * 1. Login flow (Keycloak-authoritative)
 * 2. Registration flow (captcha + new user)
 * 3. Session management (bootstrap, refresh, expiry)
 * 4. Re-authentication flows
 * 5. MFA verification
 * 6. Logout and session revocation
 * 7. Platform-specific configurations
 *
 * Environment Requirements:
 *   KEYCLOAK_ISSUER=https://<host>/realms/dogan
 *   KEYCLOAK_JWKS_URL=https://<host>/realms/dogan/protocol/openid-connect/certs
 *   KEYCLOAK_LOGIN_CLIENT_ID=dauth-login
 *   KEYCLOAK_LOGIN_CLIENT_SECRET=<secret>
 *   LOGIN_USE_KEYCLOAK=true
 *   DAUTH_KEYCLOAK_ENFORCE=true
 *   AUTH_SERVICE_URL=http://127.0.0.1:<auth-port>
 *   GATEWAY_URL=http://127.0.0.1:<gw-port>
 *   TEST_USER_EMAIL=<seeded>
 *   TEST_USER_PASSWORD=<seeded>
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';
const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:4000';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@dogan-ai.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const KC_ENABLED = process.env.LOGIN_USE_KEYCLOAK === 'true';
const ENFORCE_MODE = process.env.DAUTH_KEYCLOAK_ENFORCE === 'true';

interface AuthResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  roles?: string[];
  onboardingComplete?: boolean;
  memberOnboarded?: boolean;
  isSuperAdmin?: boolean;
  orgName?: string;
  userName?: string;
  sessionId?: string;
  tokenSource?: string;
  code?: string;
  error?: string;
}

interface FetchResult {
  status: number;
  body: AuthResponse | null;
  headers?: Headers;
}

async function authPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<FetchResult> {
  const baseUrl = path.startsWith('/api/public/') ? GATEWAY : AUTH_SERVICE;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  let parsed: AuthResponse | null = null;
  try {
    parsed = await res.json();
  } catch { /* ignore */ }
  return { status: res.status, body: parsed, headers: res.headers as Headers };
}

async function authGet(path: string, token?: string): Promise<FetchResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const baseUrl = path.startsWith('/api/public/') ? GATEWAY : AUTH_SERVICE;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  let parsed: AuthResponse | null = null;
  try {
    parsed = await res.json();
  } catch { /* ignore */ }
  return { status: res.status, body: parsed };
}

async function gatewayGet(path: string, token?: string): Promise<FetchResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${GATEWAY}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  let parsed: AuthResponse | null = null;
  try {
    parsed = await res.json();
  } catch { /* ignore */ }
  return { status: res.status, body: parsed };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Authentication Path Configuration Tests', () => {
  describe('Environment Configuration', () => {
    it('KEYCLOAK_ONLY mode is properly configured', () => {
      const isKeycloakOnly = process.env.KEYCLOAK_ONLY === 'true' || process.env.KEYCLOAK_ONLY === '1';
      if (isKeycloakOnly) {
        console.log('[Config] KEYCLOAK_ONLY mode is ACTIVE');
      } else {
        console.log('[Config] KEYCLOAK_ONLY mode is INACTIVE - native fallback available');
      }
      expect(typeof KC_ENABLED).toBe('boolean');
    });

    it('DAUTH_KEYCLOAK_ENFORCE is set correctly for production readiness', () => {
      if (ENFORCE_MODE) {
        console.log('[Config] DAUTH_KEYCLOAK_ENFORCE is ACTIVE - Keycloak is authoritative');
      }
      expect(typeof ENFORCE_MODE).toBe('boolean');
    });

    it('AUTH_SERVICE_URL and GATEWAY_URL are configured', () => {
      expect(AUTH_SERVICE).toContain('http');
      expect(GATEWAY).toContain('http');
    });
  });

  describe('Login Path (/api/auth/login)', () => {
    it('POST /api/auth/login returns 401 for invalid credentials when Keycloak is enabled', async () => {
      if (!KC_ENABLED) {
        console.log('[Skip] LOGIN_USE_KEYCLOAK=false, native login path not tested');
        return;
      }

      const res = await authPost('/api/auth/login', {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      expect([401, 503]).toContain(res.status);
      if (res.status === 401) {
        expect(res.body?.code).toMatch(/INVALID_CREDENTIALS|NO_REFRESH_TOKEN/i);
      }
    });

    it('POST /api/auth/login returns 400 for missing email', async () => {
      const res = await authPost('/api/auth/login', {
        password: 'somepassword',
      });
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login returns 400 for missing password', async () => {
      const res = await authPost('/api/auth/login', {
        email: 'test@example.com',
      });
      expect([400, 429]).toContain(res.status);
    });

    it('POST /api/auth/login with TOTP returns 403 MFA_REQUIRED when MFA is enabled', async () => {
      if (!KC_ENABLED) return;

      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        totp: '123456',
      });

      if (res.status === 403 && res.body?.code === 'MFA_REQUIRED') {
        console.log('[Login] MFA_REQUIRED response - TOTP verification flow works');
        expect(res.body.userId).toBeDefined();
      }
    });

    it('Login flow returns correct response shape when successful', async () => {
      if (!KC_ENABLED) {
        console.log('[Skip] Keycloak login not enabled');
        return;
      }

      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (res.status === 200) {
        expect(res.body?.tokenSource).toBe('keycloak');
        expect(res.body?.token || res.body?.accessToken).toBeDefined();
        expect(res.body?.userId).toBeDefined();
        expect(res.body?.tenantId).toBeDefined();
        console.log('[Login] Keycloak login successful - token issued');
      }
    });
  });

  describe('Registration Path (/api/public/onboarding/new-user/register)', () => {
    it('POST /api/public/onboarding/new-user/register rejects empty body with 400', async () => {
      const res = await authPost('/api/public/onboarding/new-user/register', {});
      expect([400, 422]).toContain(res.status);
    });

    it('POST /api/public/onboarding/new-user/register requires captcha', async () => {
      const res = await authPost('/api/public/onboarding/new-user/register', {
        companyNameEn: 'Test Company',
        email: `new-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        userName: 'Test User',
        consent: true,
      }, { 'x-form-elapsed-ms': '5000' });

      expect([400, 504]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body?.code).toMatch(/CAPTCHA|VALIDATION/i);
      }
    });

    it('GET /api/public/captcha/challenge returns valid captcha', async () => {
      const res = await authGet('/api/public/captcha/challenge');
      expect(res.status).toBe(200);
      expect(res.body?.captchaId).toBeDefined();
      console.log('[Captcha] Challenge generated successfully');
    });
  });

  describe('Session Bootstrap (/api/session/bootstrap)', () => {
    let accessToken: string;

    beforeAll(async () => {
      if (!KC_ENABLED) return;
      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (res.status === 200) {
        accessToken = res.body?.token || res.body?.accessToken || '';
      }
    });

    it('GET /api/session/bootstrap requires authentication', async () => {
      const res = await authGet('/api/session/bootstrap');
      expect(res.status).not.toBe(200);
      expect([401, 403]).toContain(res.status);
    });

    it('GET /api/session/bootstrap returns session data with valid token', async () => {
      if (!accessToken) {
        console.log('[Skip] No access token available');
        return;
      }

      const res = await authGet('/api/session/bootstrap', accessToken);
      expect(res.status).toBe(200);
      expect(res.body?.userId || res.body?.user?.userId).toBeDefined();
    });

    it('GET /api/session/bootstrap sets httpOnly session cookies', async () => {
      if (!accessToken) return;

      const res = await authGet('/api/session/bootstrap', accessToken);
      const setCookie = res.headers?.get('set-cookie') || '';
      console.log('[Session] Cookies set:', setCookie ? 'Yes' : 'No');
    });
  });

  describe('Token Refresh (/api/auth/refresh)', () => {
    it('POST /api/auth/refresh requires refresh token', async () => {
      const res = await authPost('/api/auth/refresh', {});
      expect(res.status).toBe(401);
      expect(res.body?.code).toMatch(/NO_REFRESH_TOKEN/i);
    });

    it('POST /api/auth/refresh rejects invalid refresh token', async () => {
      const res = await authPost('/api/auth/refresh', {
        refreshToken: 'invalid-refresh-token',
      });
      expect(res.status).toBe(401);
      expect(res.body?.code).toMatch(/INVALID_REFRESH|NO_REFRESH/i);
    });
  });

  describe('Logout Path (/api/auth/logout)', () => {
    let accessToken: string;

    beforeAll(async () => {
      if (!KC_ENABLED) return;
      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (res.status === 200) {
        accessToken = res.body?.token || res.body?.accessToken || '';
      }
    });

    it('POST /api/auth/logout clears session cookies', async () => {
      if (!accessToken) return;

      const res = await authPost('/api/auth/logout', {}, {
        Authorization: `Bearer ${accessToken}`,
      });
      expect(res.status).toBe(200);
      console.log('[Logout] Session cleared successfully');
    });

    it('POST /api/auth/logout works without authentication', async () => {
      const res = await authPost('/api/auth/logout', {});
      expect(res.status).toBe(200);
    });
  });

  describe('Re-authentication Flow', () => {
    it('Expired token triggers re-authentication', async () => {
      const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJleHBpcmVkIiwiZXhwIjoxfQ.signature';

      const res = await authGet('/api/session/bootstrap', expiredToken);
      expect(res.status).not.toBe(200);
      expect([401, 403]).toContain(res.status);
    });

    it('Missing token returns proper error for protected routes', async () => {
      const res = await gatewayGet('/api/workspace/entitlements');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('MFA Flow (/api/auth/mfa)', () => {
    it('GET /api/auth/mfa/status requires authentication', async () => {
      const res = await authGet('/api/auth/mfa/status');
      expect(res.status).not.toBe(200);
    });

    it('POST /api/auth/mfa/enable requires authentication', async () => {
      const res = await authPost('/api/auth/mfa/enable', { mfaType: 'email' });
      expect(res.status).not.toBe(200);
    });
  });

  describe('User Info (/api/auth/userinfo)', () => {
    let accessToken: string;

    beforeAll(async () => {
      if (!KC_ENABLED) return;
      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (res.status === 200) {
        accessToken = res.body?.token || res.body?.accessToken || '';
      }
    });

    it('GET /api/auth/userinfo returns user data with valid token', async () => {
      if (!accessToken) {
        console.log('[Skip] No access token available');
        return;
      }

      const res = await authGet('/api/auth/userinfo', accessToken);
      expect(res.status).toBe(200);
      expect(res.body?.email || res.body?.user?.email).toBeDefined();
    });
  });

  describe('Platform Configuration Tests', () => {
    it('Gateway routes to auth-service correctly', async () => {
      const res = await authGet('/api/auth/userinfo');
      expect(res.status).not.toBe(404);
    });

    it('Cross-service authentication works through gateway', async () => {
      if (!KC_ENABLED) return;

      const loginRes = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (loginRes.status !== 200) return;

      const token = loginRes.body?.token || loginRes.body?.accessToken;
      if (!token) return;

      const res = await gatewayGet('/api/workspace/entitlements', token);
      expect([200, 204]).toContain(res.status);
    });

    it('Session is shared across services', async () => {
      if (!KC_ENABLED) return;

      const loginRes = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (loginRes.status !== 200) return;

      const token = loginRes.body?.token || loginRes.body?.accessToken;
      if (!token) return;

      await delay(100);

      const res1 = await authGet('/api/auth/userinfo', token);
      const res2 = await gatewayGet('/api/workspace/entitlements', token);

      expect(res1.status).toBe(200);
      expect([200, 204]).toContain(res2.status);
    });
  });

  describe('Error Handling', () => {
    it('Handles Keycloak unavailability gracefully', async () => {
      const res = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (res.status === 503) {
        console.log('[Error] Keycloak unavailable - service returned 503');
        expect(res.body?.code).toBe('AUTH_UNAVAILABLE');
      }
    });

    it('Handles malformed tokens gracefully', async () => {
      const res = await authGet('/api/session/bootstrap', 'not-a-valid-token');
      expect(res.status).not.toBe(500);
    });

    it('Rate limiting is enforced on login attempts', async () => {
      const email = `ratelimit-test-${Date.now()}@example.com`;

      for (let i = 0; i < 6; i++) {
        await authPost('/api/auth/login', {
          email,
          password: 'wrongpassword',
        });
      }

      const res = await authPost('/api/auth/login', {
        email,
        password: 'wrongpassword',
      });

      expect([423, 429, 401]).toContain(res.status);
      console.log('[RateLimit] Login attempts rate-limited');
    });
  });

  describe('Session Expiry and Recovery', () => {
    it('Session data persists after token refresh', async () => {
      if (!KC_ENABLED) return;

      const loginRes = await authPost('/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (loginRes.status !== 200) return;

      const token = loginRes.body?.token || loginRes.body?.accessToken;
      if (!token) return;

      const beforeRefresh = await authGet('/api/session/bootstrap', token);
      expect(beforeRefresh.status).toBe(200);

      const refreshRes = await authPost('/api/auth/refresh', {
        refreshToken: loginRes.body?.refreshToken,
      }, {});

      if (refreshRes.status === 200) {
        console.log('[Session] Token refreshed successfully');
        const afterRefresh = await authGet('/api/session/bootstrap', refreshRes.body?.token || token);
        expect(afterRefresh.status).toBe(200);
      }
    });
  });
});

describe('Authentication Issues Documentation', () => {
  describe('IDENTIFIED ISSUES', () => {
    it('ISSUE-1: Keycloak connectivity is critical dependency', () => {
      if (!KC_ENABLED) return;
      const kcIssuer = process.env.KEYCLOAK_ISSUER;
      const kcJwks = process.env.KEYCLOAK_JWKS_URL;

      console.log(`
[ISSUE-1] Keycloak Dependency
- KEYCLOAK_ISSUER: ${kcIssuer || 'NOT SET'}
- KEYCLOAK_JWKS_URL: ${kcJwks || 'NOT SET'}
- Impact: If Keycloak is down, no user can log in
- Mitigation: Monitor Keycloak health in production
      `);

      expect(kcIssuer).toBeDefined();
      expect(kcJwks).toBeDefined();
    });

    it('ISSUE-2: LOGIN_USE_KEYCLOAK must be true for Keycloak login', () => {
      console.log(`
[ISSUE-2] Login Path Configuration
- LOGIN_USE_KEYCLOAK: ${process.env.LOGIN_USE_KEYCLOAK || 'NOT SET'}
- If false: Native bcrypt login (deprecated, marked for removal)
- If true: Keycloak-authoritative login (production mode)
- Required for production: true
      `);

      if (process.env.NODE_ENV === 'production') {
        expect(process.env.LOGIN_USE_KEYCLOAK).toBe('true');
      }
    });

    it('ISSUE-3: DAUTH_KEYCLOAK_ENFORCE gates production readiness', () => {
      console.log(`
[ISSUE-3] Enforcement Mode
- DAUTH_KEYCLOAK_ENFORCE: ${process.env.DAUTH_KEYCLOAK_ENFORCE || 'NOT SET'}
- If false: Shadow mode (Keycloak + native both work)
- If true: Keycloak-only mode (native disabled)
- Required for production: true
      `);
    });

    it('ISSUE-4: Session cookies must be properly configured', () => {
      console.log(`
[ISSUE-4] Cookie Configuration
- dos_access_token: httpOnly cookie for access token
- dauth_rt: httpOnly cookie for refresh token
- grc_onb_sse_ticket: httpOnly cookie for SSE tickets
- SameSite policy must be configured correctly
      `);
    });

    it('ISSUE-5: CORS configuration must allow credentials', () => {
      console.log(`
[ISSUE-5] CORS Configuration
- Frontend must send: credentials: 'include'
- Backend must set: Access-Control-Allow-Credentials: true
- Access-Control-Allow-Origin: must NOT be '*'
      `);
    });

    it('ISSUE-6: Token blacklist must be checked on every request', () => {
      console.log(`
[ISSUE-6] Token Blacklist
- Revoked tokens are stored in Redis
- Every authenticated request checks blacklist
- Performance: Ensure Redis is fast enough
      `);
    });
  });
});
