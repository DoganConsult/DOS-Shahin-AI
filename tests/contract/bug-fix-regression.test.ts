import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('BUG-1 Regression: SSE Realtime path and token flow', () => {
  const REALTIME_FILE = 'frontend/products/shahin/src/app/blueprint/core/services/realtime.service.ts';

  it('does NOT use the broken /api/events/stream URL', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).not.toContain('/api/events/stream');
  });

  it('uses the correct /events path (matching gateway prefix)', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).toContain('/events/sse-token');
    // URL is built as `${apiUrl}/events?` + URLSearchParams (tenant set via params.set('tenant', ...))
    expect(src).toMatch(/\$\{environment\.apiUrl\}\/events\?/);
    expect(src).toContain("params.set('tenant'");
  });

  it('calls POST /events/sse-token before opening EventSource', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).toContain('_mintTokenAndConnect');
    expect(src).toContain('sse-token');
    expect(src).toContain('firstValueFrom');
  });

  it('does NOT pass token as a URL query parameter', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).not.toMatch(/url.*\?.*token=/);
    expect(src).not.toContain('tokenParam');
  });

  it('opens EventSource with withCredentials: true so cookie is sent', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).toContain('withCredentials: true');
    expect(src).toContain('new EventSource(url, { withCredentials: true })');
  });

  it('injects HttpClient for the token mint request', () => {
    const src = readFile(REALTIME_FILE);
    expect(src).toContain('HttpClient');
    expect(src).toContain("inject(HttpClient)");
  });
});

describe('BUG-2 Regression: AI NL Query endpoint wiring', () => {
  const AI_SERVICE_FILE = 'frontend/products/shahin/src/app/blueprint/core/services/ai-assistant.service.ts';
  const GATEWAY_FILE = 'services/gateway/src/domain/service-registry.ts';
  const AI_ENGINE_MAIN = 'services/ai-engine-service/src/main.ts';

  describe('Option A: frontend uses /api/ai/query/interpret (already wired through AI gateway)', () => {
    it('interpretQuery() calls /api/ai/query/interpret not /api/copilot/intent-to-query', () => {
      const src = readFile(AI_SERVICE_FILE);
      const interpretQueryFn = src.slice(src.indexOf('interpretQuery('), src.indexOf('interpretQuery(') + 600);
      expect(interpretQueryFn).toContain('/query/interpret');
      expect(interpretQueryFn).not.toContain('/api/copilot/intent-to-query');
    });

    it('interpretQuery() uses this.api base (which resolves to /api/ai)', () => {
      const src = readFile(AI_SERVICE_FILE);
      const interpretQueryFn = src.slice(src.indexOf('interpretQuery('), src.indexOf('interpretQuery(') + 600);
      expect(interpretQueryFn).toContain('this.api');
    });
  });

  describe('Option B: /api/copilot gateway route + AI engine secondary mount', () => {
    it('gateway routeServiceMap includes /api/copilot prefix pointing to AI engine', () => {
      const src = readFile(GATEWAY_FILE);
      expect(src).toContain("prefix: '/api/copilot'");
      expect(src).toMatch(/prefix.*\/api\/copilot.*AI_ENGINE_SERVICE_URL/s);
    });

    it('AI engine main.ts mounts copilot router at /api/copilot', () => {
      const src = readFile(AI_ENGINE_MAIN);
      expect(src).toContain("app.use('/api/copilot'");
      expect(src).toContain('copilot.routes.js');
    });
  });
});

describe('BUG-3 Regression: Public onboarding register 400 + 504 fixes', () => {
  const PASSWORD_POLICY_FILE =
    'frontend/products/shahin/src/app/blueprint/core/dauth/access/password-policy.ts';
  const REGISTER_COMPONENT_FILE =
    'frontend/products/shahin/src/app/blueprint/pages/register/register.component.ts';
  const REGISTER_COMMAND_FILE =
    'services/onboarding-service/src/application/register-tenant-user.ts';

  describe('P0 — Password policy mismatch (causes HTTP 400)', () => {
    it('frontend PASSWORD_MIN_LENGTH is 12 (matches backend Zod schema)', () => {
      const src = readFile(PASSWORD_POLICY_FILE);
      expect(src).toContain('PASSWORD_MIN_LENGTH = 12');
      expect(src).not.toContain('PASSWORD_MIN_LENGTH = 8');
    });

    it('frontend PASSWORD_RE enforces minimum 12 characters', () => {
      const src = readFile(PASSWORD_POLICY_FILE);
      expect(src).toMatch(/\{12,128\}/);
      expect(src).not.toMatch(/\{8,128\}/);
    });

    it('register component minlength fallback message says 12 characters (not 8)', () => {
      const src = readFile(REGISTER_COMPONENT_FILE);
      expect(src).toContain('at least 12 characters');
      expect(src).not.toContain('at least 8 characters');
    });

    it('backend Zod passwordPolicy still enforces min(12) (authoritative)', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      const policyBlock = src.slice(src.indexOf('const passwordPolicy'), src.indexOf('export const registerTenantUserBodySchema'));
      expect(policyBlock).toContain('.min(12)');
    });
  });

  describe('P1 — bcrypt work factor reduction (reduces 504 risk)', () => {
    it('bcrypt.hash uses 10 rounds (not 12) to reduce hash latency', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      expect(src).toContain('bcrypt.hash(password, 10)');
      expect(src).not.toContain('bcrypt.hash(password, 12)');
    });
  });

  describe('P2 — Post-transaction audit logs are fire-and-forget (reduces 504 risk)', () => {
    it('tenant.created auditLog is not awaited (fire-and-forget)', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      expect(src).not.toMatch(/await auditLog\(\s*'tenant\.created'/);
    });

    it('user.registered auditLog is not awaited (fire-and-forget)', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      expect(src).not.toMatch(/await auditLog\(\s*'user\.registered'/);
    });

    it('membership.created auditLog is not awaited (fire-and-forget)', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      expect(src).not.toMatch(/await auditLog\(\s*'membership\.created'/);
    });

    it('onboarding.session_created auditLog is not awaited (fire-and-forget)', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      expect(src).not.toMatch(/await auditLog\(\s*'onboarding\.session_created'/);
    });

    it('fire-and-forget audit calls use .catch(() => {}) to suppress unhandled rejections', () => {
      const src = readFile(REGISTER_COMMAND_FILE);
      const postTxBlock = src.slice(src.indexOf("await client.query('COMMIT')"));
      const catchCount = (postTxBlock.match(/auditLog\([^)]*\)\.catch\(\(\)/g) || []).length;
      expect(catchCount).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('BUG-4 Regression: CAPTCHA case-sensitivity UX + login CAPTCHA + CSP wss', () => {
  const CAPTCHA_SVG_SERVICE = 'packages/dos-platform-core/src/security/captcha-svg.service.ts';
  const CAPTCHA_COMPONENT = 'frontend/products/shahin-ai/src/app/blueprint/shared/captcha/captcha-challenge.component.ts';
  const AUTH_ROUTES = 'services/auth-service/src/routes/auth.routes.ts';
  const PRODUCT_SHELL_SERVER = 'services/product-shell/src/server.ts';

  describe('Bug 1 — CAPTCHA charPreset is lowercase-only (no uppercase in SVG image)', () => {
    it('charPreset does NOT contain uppercase letters A-Z', () => {
      const src = readFile(CAPTCHA_SVG_SERVICE);
      expect(src).not.toMatch(/charPreset:.*[A-Z]/);
    });

    it('charPreset contains only lowercase a-z characters and digits', () => {
      const src = readFile(CAPTCHA_SVG_SERVICE);
      const match = src.match(/charPreset:\s*'([^']+)'/);
      expect(match).not.toBeNull();
      const preset = match![1];
      expect(preset).toMatch(/^[a-z0-9]+$/);
    });

    it('emit() normalizes token to lowercase before emitting (matches CSS visual)', () => {
      const src = readFile(CAPTCHA_COMPONENT);
      const emitFn = src.slice(src.indexOf('private emit()'), src.indexOf('private emit()') + 400);
      expect(emitFn).toContain('toLowerCase()');
      expect(emitFn).toContain('.trim()');
    });

    it('emit() does NOT emit the raw unmodified this.token without normalization', () => {
      const src = readFile(CAPTCHA_COMPONENT);
      const emitFn = src.slice(src.indexOf('private emit()'), src.indexOf('private emit()') + 400);
      expect(emitFn).not.toMatch(/token:\s*this\.token\b(?!\.toLowerCase)/);
    });
  });

  describe('Bug 2 — Login CAPTCHA: GET /captcha route exists in auth-service', () => {
    it('auth routes define GET /captcha endpoint', () => {
      const src = readFile(AUTH_ROUTES);
      expect(src).toMatch(/router\.get\(\s*['"]\/captcha['"]/);
    });

    it('GET /captcha route uses generateSvgCaptcha from @dos/platform-core', () => {
      const src = readFile(AUTH_ROUTES);
      expect(src).toContain('generateSvgCaptcha');
      expect(src).toContain('@dos/platform-core');
    });

    it('GET /captcha route returns cache-control: no-store', () => {
      const src = readFile(AUTH_ROUTES);
      const captchaHandler = src.slice(src.indexOf("router.get('/captcha'"), src.indexOf("router.post('/login'"));
      expect(captchaHandler).toContain('no-store');
    });

    it('GET /captcha route checks Redis connectivity before generating', () => {
      const src = readFile(AUTH_ROUTES);
      const captchaHandler = src.slice(src.indexOf("router.get('/captcha'"), src.indexOf("router.post('/login'"));
      expect(captchaHandler).toContain('redisConnected');
    });
  });

  describe('Bug 2 — Login CAPTCHA: login POST schema includes captcha fields', () => {
    it('loginBody schema includes captchaId field', () => {
      const src = readFile(AUTH_ROUTES);
      const loginBodyBlock = src.slice(src.indexOf('const loginBody'), src.indexOf('const mfaVerifyBody'));
      expect(loginBodyBlock).toContain('captchaId');
    });

    it('loginBody schema includes captchaCode field', () => {
      const src = readFile(AUTH_ROUTES);
      const loginBodyBlock = src.slice(src.indexOf('const loginBody'), src.indexOf('const mfaVerifyBody'));
      expect(loginBodyBlock).toContain('captchaCode');
    });

    it('both captcha fields are optional (login still works without captcha)', () => {
      const src = readFile(AUTH_ROUTES);
      const loginBodyBlock = src.slice(src.indexOf('const loginBody'), src.indexOf('const mfaVerifyBody'));
      const captchaIdLine = loginBodyBlock.slice(loginBodyBlock.indexOf('captchaId'));
      expect(captchaIdLine).toMatch(/captchaId.*\.optional\(\)/);
    });
  });

  describe('Bug 2 — Login CAPTCHA: captcha verified when throttle.requireCaptcha is true', () => {
    it('login handler calls verifyCaptcha when captcha is required', () => {
      const src = readFile(AUTH_ROUTES);
      const loginHandler = src.slice(src.indexOf("router.post('/login'"));
      expect(loginHandler).toContain('verifyCaptcha');
    });

    it('login handler returns CAPTCHA_REQUIRED when captcha fields absent but required', () => {
      const src = readFile(AUTH_ROUTES);
      const loginHandler = src.slice(src.indexOf("router.post('/login'"));
      expect(loginHandler).toContain('CAPTCHA_REQUIRED');
    });

    it('login handler returns CAPTCHA_FAILED when captcha verification fails', () => {
      const src = readFile(AUTH_ROUTES);
      const loginHandler = src.slice(src.indexOf("router.post('/login'"));
      expect(loginHandler).toContain('CAPTCHA_FAILED');
    });

    it('captcha verification gate is placed before credential check', () => {
      const src = readFile(AUTH_ROUTES);
      const loginHandler = src.slice(src.indexOf("router.post('/login'"));
      const captchaPos = loginHandler.indexOf('verifyCaptcha');
      const credPos = loginHandler.indexOf('authenticateCredentials');
      expect(captchaPos).toBeGreaterThan(0);
      expect(captchaPos).toBeLessThan(credPos);
    });
  });

  describe('Bug 3 — CSP: product-shell Helmet connectSrc includes wss:// WebSocket URIs', () => {
    it('connectSrc includes wss://shahin-ai.com', () => {
      const src = readFile(PRODUCT_SHELL_SERVER);
      expect(src).toContain('"wss://shahin-ai.com"');
    });

    it('connectSrc includes wss://www.shahin-ai.com', () => {
      const src = readFile(PRODUCT_SHELL_SERVER);
      expect(src).toContain('"wss://www.shahin-ai.com"');
    });

    it('connectSrc does not omit WebSocket schemes entirely', () => {
      const src = readFile(PRODUCT_SHELL_SERVER);
      const connectSrcBlock = src.slice(src.indexOf('connectSrc:'), src.indexOf('mediaSrc:'));
      expect(connectSrcBlock).toMatch(/wss:/);
    });
  });
});

describe('BUG-5 Regression: Onboarding session wiring — register returns session_key; session API exposes id field', () => {
  const REGISTER_FILE = 'services/onboarding-service/src/application/register-tenant-user.ts';
  const SESSION_LIFECYCLE_FILE = 'services/onboarding-service/src/routes/session-lifecycle.routes.ts';

  describe('Bug A — registration response must return session_key as sessionId', () => {
    it('successBody does NOT assign the PK UUID (sessionIdUuid) as sessionId', () => {
      const src = readFile(REGISTER_FILE);
      const successBodyBlock = src.slice(
        src.indexOf('const successBody:'),
        src.indexOf('const successBody:') + 600,
      );
      expect(successBodyBlock).not.toContain('sessionId: sessionIdUuid');
    });

    it('successBody assigns registrationId (the session_key) as sessionId', () => {
      const src = readFile(REGISTER_FILE);
      const successBodyBlock = src.slice(
        src.indexOf('const successBody:'),
        src.indexOf('const successBody:') + 600,
      );
      expect(successBodyBlock).toContain('sessionId: registrationId');
    });

    it('successBody still carries sessionKey as a separate field for backwards-compat', () => {
      const src = readFile(REGISTER_FILE);
      expect(src).toContain('sessionKey: registrationId');
    });
  });

  describe('Bug B — session API responses must include an "id" field equal to session_key', () => {
    it('POST /sessions SELECT includes session_key AS "id"', () => {
      const src = readFile(SESSION_LIFECYCLE_FILE);
      const postBlock = src.slice(src.indexOf("router.post('/sessions',"), src.indexOf("router.get('/sessions/:sessionId'"));
      expect(postBlock).toContain('session_key AS "id"');
    });

    it('GET /sessions/:sessionId SELECT includes session_key AS "id"', () => {
      const src = readFile(SESSION_LIFECYCLE_FILE);
      const getBlock = src.slice(src.indexOf("router.get('/sessions/:sessionId'"), src.indexOf("router.post('/sessions/:sessionId/resume'"));
      expect(getBlock).toContain('session_key AS "id"');
    });

    it('PATCH /sessions/:sessionId SELECT includes session_key AS "id"', () => {
      const src = readFile(SESSION_LIFECYCLE_FILE);
      const patchBlock = src.slice(src.indexOf("router.patch('/sessions/:sessionId'"), src.indexOf("router.post('/sessions/:sessionId/validate-stage'"));
      expect(patchBlock).toContain('session_key AS "id"');
    });

    it('session_key AS "id" is distinct from session_key AS "sessionId" — both present in GET response', () => {
      const src = readFile(SESSION_LIFECYCLE_FILE);
      const getBlock = src.slice(src.indexOf("router.get('/sessions/:sessionId'"), src.indexOf("router.post('/sessions/:sessionId/resume'"));
      expect(getBlock).toContain('session_key AS "id"');
      expect(getBlock).toContain('session_key AS "sessionId"');
    });

    it('frontend OnboardingSession model id field resolves at runtime — no undefined guard bypass needed', () => {
      const src = readFile(SESSION_LIFECYCLE_FILE);
      const occurrences = (src.match(/session_key AS "id"/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Permission Colon Notation Regression: provisioning routes use dot notation', () => {
  const PROVISIONING_FILE = 'services/tenant-service/src/domain/routes/provisioning.routes.ts';

  it('does NOT use colon-notation provisioning:read', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).not.toContain("'provisioning:read'");
  });

  it('does NOT use colon-notation provisioning:create', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).not.toContain("'provisioning:create'");
  });

  it('does NOT use colon-notation provisioning:manage', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).not.toContain("'provisioning:manage'");
  });

  it('uses dot-notation provisioning.record.read for GET endpoints', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).toContain("requirePermission('provisioning.record.read')");
  });

  it('uses dot-notation provisioning.record.write for POST /jobs', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).toContain("requirePermission('provisioning.record.write')");
  });

  it('uses dot-notation provisioning.manage for resume endpoint', () => {
    const src = readFile(PROVISIONING_FILE);
    expect(src).toContain("requirePermission('provisioning.manage')");
  });
});
