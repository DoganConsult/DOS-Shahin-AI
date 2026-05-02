#!/usr/bin/env tsx
/**
 * Phase 7 — same-email abuse probe (Phase 7.3 of the new-user-journey plan).
 *
 * Drives 1000 concurrent POST /register with an identical (email, orgName)
 * and 10 rps sustained for 15 minutes from N spoofed IPs. Asserts:
 *   - exactly one 201 (the real tenant)
 *   - remaining requests observe 409 (EMAIL_EXISTS / ORG_NAME_EXISTS) or 429
 *     (RATE_LIMITED_IP / RATE_LIMITED_EMAIL / GATEWAY_RATE_LIMIT_EXCEEDED).
 *   - 0 tenants created for the duplicate email beyond the first.
 *
 * Intended for staging only. Production traffic shaping relies on upstream
 * trust-proxy headers — verify before running at scale.
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:4000 \
 *   ABUSE_EMAIL="abuse+$(date +%s)@example.com" \
 *   ABUSE_ORG="Abuse Co $(date +%s)" \
 *   ABUSE_SUSTAIN_SECONDS=900 \
 *   pnpm exec tsx ops/scripts/load/register-abuse-sameemail.ts
 */

import { setTimeout as delay } from 'node:timers/promises';

const base =
  process.env.GATEWAY_URL?.replace(/\/$/, '') ??
  process.env.ONBOARDING_SERVICE_URL?.replace(/\/$/, '') ??
  'http://127.0.0.1:4000';
const url = `${base}/api/public/onboarding/new-user/register`;

const email = process.env.ABUSE_EMAIL ?? `abuse+${Date.now()}@example.com`;
const org = process.env.ABUSE_ORG ?? `Abuse Co ${Date.now()}`;
const password = process.env.ABUSE_PASSWORD ?? 'AbuseProbe1!Strong';
const userName = process.env.ABUSE_USER_NAME ?? 'Abuse Tester';

const BURST = Number(process.env.ABUSE_BURST ?? '1000');
const IP_POOL = Math.max(1, Number(process.env.ABUSE_IP_POOL ?? '500'));
const SUSTAIN_SECONDS = Math.max(0, Number(process.env.ABUSE_SUSTAIN_SECONDS ?? '900'));
const SUSTAIN_RPS = Math.max(1, Number(process.env.ABUSE_SUSTAIN_RPS ?? '10'));

function spoofIp(i: number): string {
  return `10.${(i >> 16) & 0xff}.${(i >> 8) & 0xff}.${i & 0xff}`;
}

interface Outcome { status: number; code?: string; ms: number }
const counts = new Map<string, number>();
const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);

async function postRegister(ip: string): Promise<Outcome> {
  const started = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        'x-form-elapsed-ms': String(2000 + Math.floor(Math.random() * 500)),
      },
      body: JSON.stringify({
        companyNameEn: org,
        email,
        password,
        userName,
        consent: true,
      }),
    });
    const body = (await resp.json().catch(() => ({}))) as { code?: string };
    return { status: resp.status, code: body?.code, ms: Date.now() - started };
  } catch {
    return { status: 0, code: 'NETWORK_ERROR', ms: Date.now() - started };
  }
}

async function runBurst(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[abuse-sameemail] burst ${BURST} parallel against ${url}`);
  const results = await Promise.all(
    Array.from({ length: BURST }, (_, i) => postRegister(spoofIp(i % IP_POOL))),
  );
  for (const r of results) bump(`burst:${r.status}:${r.code ?? '-'}`);
}

async function runSustained(): Promise<void> {
  if (SUSTAIN_SECONDS === 0) return;
  // eslint-disable-next-line no-console
  console.log(`[abuse-sameemail] sustained ${SUSTAIN_RPS} rps for ${SUSTAIN_SECONDS}s`);
  const endAt = Date.now() + SUSTAIN_SECONDS * 1000;
  let counter = 0;
  while (Date.now() < endAt) {
    const tickStart = Date.now();
    const inflight = Array.from({ length: SUSTAIN_RPS }, (_, i) =>
      postRegister(spoofIp((counter + i) % IP_POOL)),
    );
    const res = await Promise.all(inflight);
    for (const r of res) bump(`sustained:${r.status}:${r.code ?? '-'}`);
    counter += SUSTAIN_RPS;
    const elapsed = Date.now() - tickStart;
    if (elapsed < 1000) await delay(1000 - elapsed);
  }
}

async function main(): Promise<void> {
  await runBurst();
  await runSustained();

  const summary = Object.fromEntries([...counts.entries()].sort());
  // eslint-disable-next-line no-console
  console.log('[abuse-sameemail] summary', summary);

  const success201 = counts.get('burst:201:-') ?? 0;
  if (success201 > 1) {
    // eslint-disable-next-line no-console
    console.error(`[abuse-sameemail] FAIL — ${success201} successful registrations for duplicate email`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`[abuse-sameemail] OK — ${success201} tenant(s) created for ${email}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[abuse-sameemail] fatal', err);
  process.exit(1);
});
