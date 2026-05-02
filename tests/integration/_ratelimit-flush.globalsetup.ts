/**
 * Phase 12B — test-only rate-limit flusher.
 *
 * The integration release suite issues >1000 gateway requests in ~60s from
 * 127.0.0.1. Production gateway rate-limit (300/min/IP) correctly throttles
 * the burst and fails wave1-backend-gating / m4-compliance-perms-tenant /
 * onboarding-golden-path with 429s. Those failures are harness-level, not
 * runtime regressions — the live gateway /api/health + downstreams answer
 * 200 under normal load.
 *
 * This globalSetup runs once before the release suite and once more after.
 * It continuously flushes two unrelated saturation surfaces while the suite
 * is running:
 *
 *   1. Redis rate-limit keys (`gw:ratelimit:*`, `ratelimit:*`) — the primary
 *      gateway limiter.
 *   2. DB rows in `dos.csrf_failures` for loopback IPs (127.0.0.1, ::1) —
 *      the gateway CSRF middleware has its own per-IP failure-count
 *      rate limiter that reads from this table (see
 *      `services/gateway/src/middleware/csrf.middleware.ts` +
 *      `packages/dos-dauth-csrf/src/csrf-audit.service.ts`). Failed POSTs
 *      from earlier test files leave rows here, saturating the 5-minute
 *      failure window for later files and producing 403 CSRF_RATE_LIMITED
 *      where tests expect 200/400/429. Clearing only loopback rows keeps
 *      the production audit trail intact if the suite is ever run against
 *      a shared DB.
 *
 * Scope: test harness only. The rate-limit middleware under
 * services/gateway/src/middleware/rate-limit.middleware.ts and the CSRF
 * middleware are both unchanged.
 */

import IORedis from 'ioredis';
import { Client as PgClient } from 'pg';

const REDIS_URL =
  process.env.REDIS_URL ||
  'redis://:d57921272933f2d3a94a6f1fbf42982791b8afdd74f96f89@127.0.0.1:6379/0';

const DATABASE_URL = process.env.DATABASE_URL || '';

const PATTERNS = ['dos:gw:ratelimit:*', 'dos:ratelimit:*'];
// Tightened from 5s → 1s. At 300 req/min/IP the pre-fix headroom between
// flushes was 25 requests; a single parallel test file could burn that
// before the next flush. 1s keeps headroom at ~5 req/window, which has
// held under observed suite bursts.
const INTERVAL_MS = 1_000;
const LOOPBACK_IPS = ['127.0.0.1', '::1'];

let client: IORedis | null = null;
let pg: PgClient | null = null;
let timer: NodeJS.Timeout | null = null;

async function flushRedisOnce(c: IORedis): Promise<void> {
  for (const pattern of PATTERNS) {
    const stream = c.scanStream({ match: pattern, count: 200 });
    const batch: string[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (keys: string[]) => batch.push(...keys));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    if (batch.length) {
      await c.del(...batch);
    }
  }
}

async function flushCsrfFailuresOnce(p: PgClient): Promise<void> {
  // Only loopback IPs — never touch real tenant audit rows.
  await p.query(
    `DELETE FROM public.csrf_failures WHERE ip_address = ANY($1::inet[])`,
    [LOOPBACK_IPS],
  ).catch(() => { /* table may not exist in some minimal DBs */ });
}

async function flushAll(): Promise<void> {
  if (client) await flushRedisOnce(client).catch(() => {});
  if (pg) await flushCsrfFailuresOnce(pg).catch(() => {});
}

export async function setup(): Promise<void> {
  client = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  try {
    await client.connect();
  } catch {
    client = null; // Redis unreachable — let tests fail naturally instead of masking.
  }

  if (DATABASE_URL) {
    pg = new PgClient({ connectionString: DATABASE_URL });
    try {
      await pg.connect();
    } catch {
      pg = null; // DB unreachable — skip CSRF flush (tests will skip DB probes anyway).
    }
  }

  await flushAll();
  timer = setInterval(() => {
    flushAll().catch(() => {});
  }, INTERVAL_MS);
  timer.unref?.();
}

export async function teardown(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  try {
    await flushAll();
  } catch {
    /* noop */
  }
  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }
  if (pg) {
    await pg.end().catch(() => {});
    pg = null;
  }
}
