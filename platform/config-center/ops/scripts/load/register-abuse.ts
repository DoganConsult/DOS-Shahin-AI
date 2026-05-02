#!/usr/bin/env tsx
/**
 * Phase 7 — abuse / rate-limit probe: many rapid registers with distinct emails.
 *
 * Expect (when gateway rate limiting is enabled): mix of 201 and 429/503.
 * Without rate limiting: mostly 201 (still useful to measure throughput).
 *
 * Usage:
 *   GATEWAY_URL=http://127.0.0.1:4000 ABUSE_REQUESTS=60 pnpm exec tsx ops/scripts/load/register-abuse.ts
 */
const base =
  process.env.GATEWAY_URL?.replace(/\/$/, '') ??
  process.env.ONBOARDING_SERVICE_URL?.replace(/\/$/, '') ??
  'http://127.0.0.1:4010';
const path = '/api/public/onboarding/new-user/register';
const url = `${base}${path}`;
const n = Math.min(500, Math.max(1, Number(process.env.ABUSE_REQUESTS ?? '40')));
const delayMs = Math.max(0, Number(process.env.ABUSE_DELAY_MS ?? '0'));
const runId = process.env.ABUSE_RUN_ID ?? String(Date.now());

const strongPassword = 'AbuseProbe1!Strong';

async function one(i: number): Promise<number> {
  const body = JSON.stringify({
    companyNameEn: `Abuse Org ${runId}-${i}`,
    companyNameAr: '',
    email: `abuse.${runId}.${i}@example.com`,
    password: strongPassword,
    userName: `Abuser${i}`,
    consent: true,
  });
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'dos-abuse-script/1.0',
    },
    body,
  });
  return r.status;
}

async function main(): Promise<void> {
  const statuses: number[] = [];
  for (let i = 0; i < n; i++) {
    statuses.push(await one(i));
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  const byStatus = statuses.reduce<Record<number, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ url, requests: n, byStatus }, null, 2));
  const limited = (byStatus[429] ?? 0) + (byStatus[503] ?? 0);
  if (limited === 0 && process.env.ABUSE_EXPECT_RATE_LIMIT === '1') {
    throw new Error('ABUSE_EXPECT_RATE_LIMIT=1 but no 429/503 observed');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
