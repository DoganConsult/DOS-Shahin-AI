/**
 * Auth-service OpenFGA tuple writer.
 *
 * Mirrors services/tenant-service/src/openfga.ts but exposes only the
 * login-time helper used by the post-login-roles hook. Lightweight HTTP
 * client (no @openfga/sdk dep) so the auth-service stays a thin BFF.
 *
 * Tuples written per login (idempotent):
 *   1. (user:<sub>, member, tenant:<tenantId>)        — baseline membership
 *   2. (user:<sub>, admin,  tenant:<tenantId>)        — when role = tenant_admin
 *   3. (user:<sub>, admin,  platform:dos)             — when role = platform_admin
 *
 * The auth-service is always advisory: when AUTH_SERVICE_OPENFGA_ENFORCE
 * is unset/false, write failures are logged-and-swallowed so a transient
 * OpenFGA outage cannot block login. tenant-service /register remains the
 * authoritative seed surface.
 */

const API_URL    = (process.env.OPENFGA_API_URL || '').replace(/\/$/, '');
const STORE_ID   = process.env.OPENFGA_STORE_ID || '';
const MODEL_ID   = process.env.OPENFGA_MODEL_ID || '';
const TIMEOUT_MS = Number(process.env.OPENFGA_TIMEOUT_MS || 500);
const ENFORCE    = String(process.env.AUTH_SERVICE_OPENFGA_ENFORCE || 'false').toLowerCase() === 'true';
const PLATFORM_ID = process.env.OPENFGA_PLATFORM_ID || 'dos';

let warnedDisabled = false;

interface FgaTuple {
  user: string;
  relation: string;
  object: string;
}

export interface LoginTupleArgs {
  userSub: string;
  tenantId: string;
  role: string;
}

export type LoginTupleOutcome = 'ok' | 'partial' | 'unavailable' | 'disabled' | 'error';

export interface LoginTupleResult {
  outcome: LoginTupleOutcome;
  written: number;
  skipped: number;
  failed: number;
  message?: string;
}

function buildTuples(args: LoginTupleArgs): FgaTuple[] {
  const tenant = `tenant:${args.tenantId}`;
  const user = `user:${args.userSub}`;
  const platform = `platform:${PLATFORM_ID}`;
  const tuples: FgaTuple[] = [
    { user, relation: 'member', object: tenant },
  ];
  if (args.role === 'tenant_admin') {
    tuples.push({ user, relation: 'admin', object: tenant });
  }
  if (args.role === 'platform_admin') {
    // Platform admins get tenant admin AND a platform-plane admin tuple.
    tuples.push({ user, relation: 'admin', object: tenant });
    tuples.push({ user, relation: 'admin', object: platform });
  }
  return tuples;
}

async function writeOne(tuple: FgaTuple, token: string): Promise<'ok' | 'skip' | 'fail' | 'unavail'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        authorization_model_id: MODEL_ID,
        writes: { tuple_keys: [tuple] },
      }),
      signal: ctrl.signal,
    });
    if (res.ok) return 'ok';
    if (res.status === 400) {
      const body = await res.text().catch(() => '');
      if (/already exists|write_failed_due_to_invalid_input/i.test(body)) return 'skip';
      return 'fail';
    }
    return res.status >= 500 ? 'unavail' : 'fail';
  } catch {
    return 'unavail';
  } finally {
    clearTimeout(timer);
  }
}

export async function writeLoginTuples(args: LoginTupleArgs): Promise<LoginTupleResult> {
  if (!API_URL || !STORE_ID || !MODEL_ID) {
    if (!warnedDisabled) {
      console.warn('[auth-service/fga] OpenFGA not configured — writeLoginTuples skipped');
      warnedDisabled = true;
    }
    return { outcome: 'disabled', written: 0, skipped: 0, failed: 0 };
  }
  const tuples = buildTuples(args);
  const token = process.env.OPENFGA_API_TOKEN || '';
  let written = 0; let skipped = 0; let failed = 0; let unavail = 0;
  for (const t of tuples) {
    const r = await writeOne(t, token);
    if (r === 'ok') written += 1;
    else if (r === 'skip') skipped += 1;
    else if (r === 'unavail') unavail += 1;
    else failed += 1;
  }
  if (failed === 0 && unavail === 0) {
    return { outcome: 'ok', written, skipped, failed };
  }
  if (written === 0 && skipped === 0) {
    if (ENFORCE) {
      throw new Error(`OpenFGA login tuple seed unavailable (failed=${failed}, unavail=${unavail})`);
    }
    return { outcome: 'unavailable', written, skipped, failed: failed + unavail };
  }
  return { outcome: 'partial', written, skipped, failed: failed + unavail };
}

export function isAuthOpenFgaEnforced(): boolean {
  return ENFORCE;
}
