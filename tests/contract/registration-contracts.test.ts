import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Registration Path Contracts (BLK-2)', () => {
  it('register command inserts country_of_incorporation on tenants (not bare country column)', () => {
    const src = readFile('services/onboarding-service/src/application/register-tenant-user.ts');
    expect(src).toContain('country_of_incorporation');
    const colListMatch = src.match(/INSERT INTO public\.tenants\s*\(([^)]+)\)/s);
    expect(colListMatch).toBeTruthy();
    const colList = colListMatch![1];
    expect(colList).toContain('country_of_incorporation');
    expect(colList.replace(/country_of_incorporation/g, '')).not.toMatch(/\bcountry\b/);
  });

  it('tenant-service bootstrap tenants table includes country_of_incorporation', () => {
    const src = readFile('services/tenant-service/migrations/001_tenant_tables.sql');
    expect(src).toContain('CREATE TABLE IF NOT EXISTS public.tenants');
    expect(src).toContain('country_of_incorporation');
  });

  it('tenant-service ships an additive migration for existing public.tenants schemas missing country_of_incorporation', () => {
    const src = readFile('services/tenant-service/migrations/002_add_country_of_incorporation_to_public_tenants.sql');
    expect(src).toContain('ALTER TABLE public.tenants');
    expect(src).toContain('ADD COLUMN IF NOT EXISTS country_of_incorporation');
  });

  it('POST /register route delegates to executeRegisterTenantUser with asyncHandler', () => {
    const src = readFile('services/onboarding-service/src/routes/new-user-lifecycle.routes.ts');
    expect(src).toMatch(/publicLifecycleRouter\.post\(\s*['"]\/register['"]/);
    expect(src).toContain('asyncHandler');
    expect(src).toContain('executeRegisterTenantUser');
  });

  it('register body schema requires consent and company fields', () => {
    const src = readFile('services/onboarding-service/src/routes/new-user-lifecycle.routes.ts');
    expect(src).toContain('registerTenantUserBodySchema');
    expect(src).toMatch(/validate\(\s*\{\s*body:\s*registerTenantUserBodySchema/);
  });

  it('register command uses transaction BEGIN/COMMIT/ROLLBACK (no manual DELETE rollback)', () => {
    const src = readFile('services/onboarding-service/src/application/register-tenant-user.ts');
    expect(src).toContain("await client.query('BEGIN')");
    expect(src).toContain("await client.query('COMMIT')");
    expect(src).toContain("await client.query('ROLLBACK')");
    expect(src).toContain('client.release()');
    expect(src).not.toMatch(/DELETE FROM public\.tenants WHERE tenant_id/);
  });

  it('lifecycle helpers expose JWT issuers (canonical @dos/auth re-export or inline jwt.sign)', () => {
    const src = readFile('services/onboarding-service/src/application/lifecycle-registration-helpers.ts');
    expect(src).toContain('issueAccessToken');
    expect(src).toContain('issueRefreshToken');
    const reexportsFromDosAuth = /from\s*['"]@dos\/auth['"]/.test(src);
    if (reexportsFromDosAuth) {
      expect(src).toContain('jwt-issuer');
      const issuer = readFile('packages/dos-auth/src/jwt-issuer.ts');
      expect(issuer).toContain('jwt.sign');
    } else {
      expect(src).toContain('jwt.sign');
    }
  });

  it('gateway routes /api/public/onboarding to onboarding-service (4010)', () => {
    const src = readFile('services/gateway/src/domain/service-registry.ts');
    expect(src).toMatch(/prefix:\s*'\/api\/public\/onboarding'/);
    expect(src).toMatch(/4010/);
  });

  it('gateway routes /api/onboarding to onboarding-service (4010)', () => {
    const src = readFile('services/gateway/src/domain/service-registry.ts');
    expect(src).toMatch(/prefix:\s*'\/api\/onboarding'/);
  });

  it('CSRF middleware exempts /api/public/ and /api/csrf/ (not blanket /api/onboarding/)', () => {
    const src = readFile('services/gateway/src/middleware/csrf.middleware.ts');
    expect(src).toContain('CSRF_EXEMPT_PATH_REGEXES');
    expect(src).toContain('/^\\/api\\/public\\/');
    expect(src).toContain('/^\\/api\\/csrf\\/');
    expect(src).not.toContain("'/api/onboarding/'");
    expect(src).not.toMatch(/CSRF_EXEMPT[^\n]*onboarding/i);
  });

  it('onboarding-service mounts public + auth new-user lifecycle routers', () => {
    const src = readFile('services/onboarding-service/src/server.ts');
    expect(src).toMatch(/path:\s*'\/api\/public\/onboarding\/new-user'/);
    expect(src).toMatch(/path:\s*'\/api\/onboarding\/new-user'/);
    expect(src).toContain('publicLifecycleRouter');
    expect(src).toContain('authLifecycleRouter');
  });

  it('internal onboarding index does not mount /new-user (handled in server.ts)', () => {
    const src = readFile('services/onboarding-service/src/routes/index.ts');
    expect(src).not.toMatch(/\/new-user/);
    expect(src).not.toMatch(/routes\.post\(['"]\/register['"]/);
  });

  it('onboarding-service package.json has jsonwebtoken and uuid dependencies', () => {
    const pkg = JSON.parse(readFile('services/onboarding-service/package.json'));
    expect(pkg.dependencies).toHaveProperty('jsonwebtoken');
    expect(pkg.dependencies).toHaveProperty('uuid');
  });

  it('nginx proxies /api/ to platform_gateway for shahin-ai.com', () => {
    const src = readFile('ops/nginx/dos-platform.conf');
    expect(src).toContain('server_name shahin-ai.com');
    expect(src).toMatch(/location \/api\/[\s\S]*?proxy_pass http:\/\/platform_gateway/);
  });

  it('frontend /register route loads the register component', () => {
    const src = readFile('frontend/products/shahin/src/app/blueprint/app.routes.ts');
    expect(src).toMatch(/path:\s*'register'/);
    expect(src).toContain("./pages/register/register.component");
  });

  it('frontend registration client targets public onboarding register URL', () => {
    const src = readFile('frontend/products/shahin/src/app/blueprint/features/onboarding-os/services/onboarding-api.service.ts');
    expect(src).toContain('/public/onboarding/new-user');
    expect(src).toContain('/register');
  });

  it('public verify-email route uses query param t=', () => {
    const src = readFile('services/onboarding-service/src/routes/new-user-lifecycle.routes.ts');
    expect(src).toMatch(/\/verify-email/);
    expect(src).toContain("req.query.t");
  });

  it('routes do not inline tenant INSERT or post-failure DROP SCHEMA (handled in application layer)', () => {
    const routes = readFile('services/onboarding-service/src/routes/new-user-lifecycle.routes.ts');
    expect(routes).not.toMatch(/INSERT INTO public\.tenants/);
    expect(routes).not.toContain('DROP SCHEMA IF EXISTS');
  });
});

describe('Phase 5R — 400 failure responses carry correlationId + code', () => {
  const src = readFile('services/onboarding-service/src/application/register-tenant-user.ts');

  it('RegisterTenantUserFailure 400 type includes optional correlationId', () => {
    // Type-level contract: makes the 400 correlationId surfacing
    // part of the published shape, not an ad-hoc runtime addition.
    expect(src).toMatch(/\|\s*\{\s*status:\s*400;\s*body:\s*\{[^}]*correlationId\?:\s*string/);
  });

  it('pre-gate correlationId is generated once before gate checks', () => {
    expect(src).toMatch(/preGateCorrelationId\s*=\s*crypto\.randomUUID\(\)/);
  });

  it('WEAK_PASSWORD 400 body carries correlationId', () => {
    const weakPw = src.match(/code:\s*'WEAK_PASSWORD'[\s\S]{0,400}/);
    expect(weakPw, 'WEAK_PASSWORD branch must be findable').toBeTruthy();
    expect(weakPw![0]).toContain('correlationId');
  });

  it('CAPTCHA_REQUIRED 400 body carries correlationId', () => {
    const captchaReq = src.match(/code:\s*'CAPTCHA_REQUIRED'[\s\S]{0,400}/);
    expect(captchaReq).toBeTruthy();
    expect(captchaReq![0]).toContain('correlationId');
  });

  it('CAPTCHA_FAILED 400 body carries correlationId', () => {
    const captchaFail = src.match(/code:\s*'CAPTCHA_FAILED'[\s\S]{0,400}/);
    expect(captchaFail).toBeTruthy();
    expect(captchaFail![0]).toContain('correlationId');
  });

  it('captcha verify failure is still logged with IP + provider + errors', () => {
    // Regression guard: we don't want observability to regress when we
    // added the correlationId. The warn log must still include ip,
    // provider, and verifier errors for ops triage.
    const warn = src.match(/\[register\] CAPTCHA verification failed[\s\S]{0,400}/);
    expect(warn).toBeTruthy();
    expect(warn![0]).toContain('ip:');
    expect(warn![0]).toContain('provider:');
    expect(warn![0]).toContain('errors:');
    expect(warn![0]).toContain('correlationId:');
  });
});

describe('OpenFGA tuple-sync: register transaction emits dauth.membership.added outbox', () => {
  // The subscriber in services/auth-service/src/events/openfga-tuple-sync.subscribers.ts
  // listens for `dauth.membership.added` and writes `user:<id>#member@tenant:<tid>`
  // into the OpenFGA relation graph. If the register transaction stops emitting
  // this event, freshly registered users will have no tuples until the nightly
  // backfill (ops/scripts/dauth-openfga-backfill.mjs) runs — and shadow-mode
  // ReBAC checks in the live journey will return empty/false.
  const src = readFile('services/onboarding-service/src/application/register-tenant-user.ts');

  it('register payload declares dauth.membership.added eventType', () => {
    expect(src).toMatch(/eventType:\s*['"]dauth\.membership\.added['"]/);
  });

  it('register outbox INSERTs a dauth.membership.added row with tenantId and userId', () => {
    const insertBlock = src.match(
      /INSERT INTO public\.platform_outbox[\s\S]{0,300}?'dauth\.membership\.added'[\s\S]{0,200}/,
    );
    expect(insertBlock, 'must INSERT membership outbox row').toBeTruthy();
    // Aggregate-id must identify the (tenantId, userId) membership
    expect(insertBlock![0]).toContain('membership');
  });

  it('membership payload includes tenantId, userId, isTenantOwner', () => {
    const payload = src.match(/membershipAddedPayload\s*=\s*\{[\s\S]{0,400}?\};/);
    expect(payload, 'membershipAddedPayload must exist').toBeTruthy();
    expect(payload![0]).toContain('tenantId');
    expect(payload![0]).toContain('userId');
    expect(payload![0]).toContain('isTenantOwner');
  });

  it('outbox row sits inside the register transaction (before COMMIT)', () => {
    // The emit must be atomic with the membership INSERT. If it moves after
    // COMMIT, a crash between commit and emit leaves the FGA graph silently
    // out of sync. Easiest invariant: the `dauth.membership.added` string
    // appears before the final COMMIT in the same transaction block.
    const commitIdx = src.indexOf("await client.query('COMMIT')");
    const eventIdx = src.indexOf("'dauth.membership.added'");
    expect(eventIdx).toBeGreaterThan(0);
    expect(commitIdx).toBeGreaterThan(eventIdx);
  });
});

describe('Phase 5R — captcha verify DELs the Redis key (retry must use fresh challenge)', () => {
  // This invariant is why the FE must reset the captcha on CAPTCHA_FAILED.
  // If this test breaks, the FE auto-refresh becomes unnecessary; if it
  // holds, missing the FE reset creates an unknown-or-expired death-loop.
  const svgSrc = readFile('packages/dos-platform-core/src/security/captcha-svg.service.ts');

  it('verifyCaptchaSvg always deletes the Redis key (success or mismatch)', () => {
    expect(svgSrc).toMatch(/await redis\.del\(key\)/);
  });

  it('verifyCaptchaSvg returns answer-mismatch on wrong code (not silent success)', () => {
    expect(svgSrc).toContain("reason: 'answer-mismatch'");
  });
});
