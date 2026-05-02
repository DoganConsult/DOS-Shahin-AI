#!/usr/bin/env tsx
/**
 * Phase 3 exit gate — parallel identical register requests.
 * Expect: exactly one 201 (or 200), remainder 409 EMAIL_EXISTS / ORG_NAME_EXISTS, zero orphan pattern in logs.
 *
 * Usage:
 *   DATABASE_URL=... GATEWAY_URL=http://127.0.0.1:4000 pnpm exec tsx ops/scripts/load/register-dup.ts
 *   REGISTER_PARALLEL=200 pnpm exec tsx ops/scripts/load/register-dup.ts
 *
 * Body matches `registerBody` in services/onboarding-service/src/schemas/onboarding-journey.schemas.ts
 */
const base =
  process.env.GATEWAY_URL?.replace(/\/$/, '') ??
  process.env.ONBOARDING_SERVICE_URL?.replace(/\/$/, '') ??
  'http://127.0.0.1:4010';
const path = '/api/public/onboarding/new-user/register';
const url = `${base}${path}`;
const parallel = Math.min(500, Math.max(1, Number(process.env.REGISTER_PARALLEL ?? '50')));
const runId = process.env.REGISTER_RUN_ID ?? String(Date.now());

const body = JSON.stringify({
  companyNameEn: `Dup Org ${runId}`,
  companyNameAr: '',
  email: `dup.${runId}@example.com`,
  password: 'Str0ng!Passw0rd',
  userName: 'Dup User',
  consent: true,
});

async function main(): Promise<void> {
  const tasks = Array.from({ length: parallel }, () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    }).then(async (r) => ({ status: r.status, text: await r.text().catch(() => '') }))
  );
  const results = await Promise.all(tasks);
  const byStatus = results.reduce<Record<number, number>>((acc, x) => {
    acc[x.status] = (acc[x.status] ?? 0) + 1;
    return acc;
  }, {});
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ url, parallel, byStatus, sample: results[0]?.text?.slice(0, 200) }, null, 2));
  const ok = (byStatus[201] ?? 0) + (byStatus[200] ?? 0);
  const conflict = (byStatus[409] ?? 0) + (byStatus[422] ?? 0);
  if (ok !== 1) {
    throw new Error(`Expected exactly one 200/201, got ${ok}`);
  }
  if (conflict < parallel - 1) {
    throw new Error(`Expected at least ${parallel - 1} conflicts (409/422), got ${conflict}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
