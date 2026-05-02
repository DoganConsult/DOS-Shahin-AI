#!/usr/bin/env tsx
/**
 * Phase 18.1 — end-to-end new-user journey load harness.
 *
 * Drives the complete flow per virtual user at a configurable rate:
 *   1. GET  /api/public/captcha/challenge        (svg-self-hosted CAPTCHA)
 *   2. POST /api/public/onboarding/new-user/register
 *   3. GET  /api/onboarding/new-user/status      (with Bearer token)
 *   4. POST /api/onboarding/new-user/complete-onboarding
 *   5. Poll GET /api/onboarding/new-user/workspace-status until `workspace.ready`
 *
 * Reports p50 / p95 / p99 per endpoint and the end-to-end p95 for
 * the register → workspace.ready funnel. Fails the run if the p95 for
 * workspace.ready exceeds the configured SLO (default 120s).
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:4000 \
 *   JOURNEY_RPS=10 JOURNEY_DURATION=900 \
 *   pnpm exec tsx ops/scripts/load/journey.ts
 */

import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.GATEWAY_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:4000';
const RPS = Math.max(1, Number(process.env.JOURNEY_RPS ?? '10'));
const DURATION = Math.max(10, Number(process.env.JOURNEY_DURATION ?? '900'));
const WORKSPACE_SLO_MS = Number(process.env.JOURNEY_SLO_MS ?? '120000');
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = WORKSPACE_SLO_MS + 30_000;

interface Timed<T> { result: T; ms: number }

const samples = new Map<string, number[]>();
function record(name: string, ms: number): void {
  const arr = samples.get(name) ?? [];
  arr.push(ms);
  samples.set(name, arr);
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length) - 1));
  return sorted[idx];
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<Timed<T>> {
  const started = Date.now();
  const result = await fn();
  const ms = Date.now() - started;
  record(label, ms);
  return { result, ms };
}

async function runOne(i: number): Promise<{ ok: boolean; totalMs: number; failStep?: string }> {
  const email = `journey+${Date.now()}-${i}@example.com`;
  const org = `Journey Co ${Date.now()}-${i}`;
  const password = 'JourneyTest1!Strong';

  const start = Date.now();

  const { result: captcha } = await timed('captcha-challenge', async () => {
    const r = await fetch(`${base}/api/public/captcha/challenge`);
    if (!r.ok) throw new Error(`captcha ${r.status}`);
    return (await r.json()) as { captchaId: string };
  });

  // In CAPTCHA_DEV_BYPASS=true mode the server accepts any token. Outside that,
  // this harness cannot solve the SVG — it relies on bypass for staging runs.
  const { result: reg } = await timed('register', async () => {
    const r = await fetch(`${base}/api/public/onboarding/new-user/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-form-elapsed-ms': String(2000 + Math.floor(Math.random() * 500)),
      },
      body: JSON.stringify({
        companyNameEn: org,
        email,
        password,
        userName: `Journey ${i}`,
        consent: true,
        captchaId: captcha.captchaId,
        captchaToken: 'dev-bypass',
      }),
    });
    if (!r.ok) throw new Error(`register ${r.status}`);
    return (await r.json()) as { token: string };
  });

  const token = reg.token;
  const auth = { authorization: `Bearer ${token}` };

  await timed('status', async () => {
    const r = await fetch(`${base}/api/onboarding/new-user/status`, { headers: auth });
    if (!r.ok) throw new Error(`status ${r.status}`);
    return r.status;
  });

  await timed('complete-onboarding', async () => {
    const r = await fetch(`${base}/api/onboarding/new-user/complete-onboarding`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: '{}',
    });
    // Accept 200 (already complete) or 202 (queued).
    if (r.status !== 200 && r.status !== 202 && r.status !== 409) {
      throw new Error(`complete ${r.status}`);
    }
    return r.status;
  });

  // Poll workspace-status until ready or deadline.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let ready = false;
  while (Date.now() < deadline) {
    const r = await fetch(`${base}/api/onboarding/new-user/workspace-status`, { headers: auth });
    if (r.ok) {
      const body = (await r.json()) as { ready?: boolean; workspaceStatus?: string };
      if (body?.ready || body?.workspaceStatus === 'active') { ready = true; break; }
    }
    await delay(POLL_INTERVAL_MS);
  }
  const totalMs = Date.now() - start;
  record('workspace-ready', totalMs);
  return ready
    ? { ok: true, totalMs }
    : { ok: false, totalMs, failStep: 'workspace-ready-timeout' };
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[journey] base=${base} rps=${RPS} duration=${DURATION}s slo=${WORKSPACE_SLO_MS}ms`);
  const endAt = Date.now() + DURATION * 1000;
  let ok = 0;
  let fail = 0;
  let counter = 0;

  while (Date.now() < endAt) {
    const tickStart = Date.now();
    const batch = await Promise.allSettled(
      Array.from({ length: RPS }, (_, i) => runOne(counter + i)),
    );
    for (const r of batch) {
      if (r.status === 'fulfilled' && r.value.ok) ok++;
      else fail++;
    }
    counter += RPS;
    const rest = 1000 - (Date.now() - tickStart);
    if (rest > 0) await delay(rest);
  }

  const summary: Record<string, unknown> = { ok, fail, total: ok + fail };
  for (const [k, v] of samples.entries()) {
    summary[k] = {
      n: v.length,
      p50: percentile(v, 0.50),
      p95: percentile(v, 0.95),
      p99: percentile(v, 0.99),
    };
  }
  // eslint-disable-next-line no-console
  console.log('[journey] summary', JSON.stringify(summary, null, 2));

  const p95Workspace = percentile(samples.get('workspace-ready') ?? [], 0.95);
  if (p95Workspace > WORKSPACE_SLO_MS) {
    // eslint-disable-next-line no-console
    console.error(`[journey] FAIL — workspace-ready p95 ${p95Workspace}ms > SLO ${WORKSPACE_SLO_MS}ms`);
    process.exit(1);
  }
  if (fail > 0) {
    // eslint-disable-next-line no-console
    console.error(`[journey] FAIL — ${fail} failed journeys`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('[journey] OK');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[journey] fatal', err);
  process.exit(1);
});
