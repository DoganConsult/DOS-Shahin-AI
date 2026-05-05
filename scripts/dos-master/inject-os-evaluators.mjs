#!/usr/bin/env node
/**
 * DOS Master L30 (Phase 3 D3) — inject deterministic per-OS evaluators
 * across the remaining 13 Phase-2 OS services.
 *
 * Mirrors the L28 feature-flag-os reference (`evaluateFlag`), exposing a
 * uniform `POST /api/admin/<os>/records/:record_key/evaluate` surface that:
 *   - reads the latest published `dos.<prefix>_record` row by key
 *   - runs a domain-aware deterministic decision over `kind` + `config`
 *   - emits an `<os>_evaluated` row to `dos.<prefix>_event`
 *   - returns `{ decision: 'on'|'off', reason, version, evaluated_at }`
 *
 * Idempotent: skips a service whose repo already exports `evaluateRecord`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OSES = [
  { code: 'ai-os',                 prefix: 'ai',                 router: 'aiOsRouter' },
  { code: 'notification-os',       prefix: 'notification',       router: 'notificationOsRouter' },
  { code: 'integration-os',        prefix: 'integration',        router: 'integrationOsRouter' },
  { code: 'data-governance-os',    prefix: 'data_governance',    router: 'dataGovernanceOsRouter' },
  { code: 'billing-os',            prefix: 'billing',            router: 'billingOsRouter' },
  { code: 'security-secrets-os',   prefix: 'security_secret',    router: 'securitySecretsOsRouter' },
  { code: 'telemetry-os',          prefix: 'telemetry',          router: 'telemetryOsRouter' },
  { code: 'schema-authoring-os',   prefix: 'schema_authoring',   router: 'schemaAuthoringOsRouter' },
  { code: 'deployment-os',         prefix: 'deployment',         router: 'deploymentOsRouter' },
  { code: 'release-os',            prefix: 'release',            router: 'releaseOsRouter' },
  { code: 'vendor-risk-os',        prefix: 'vendor_risk',        router: 'vendorRiskOsRouter' },
  { code: 'marketplace-os',        prefix: 'marketplace',        router: 'marketplaceOsRouter' },
  { code: 'dr-os',                 prefix: 'dr',                 router: 'drOsRouter' },
];

function evaluatorBlock(prefix) {
  return `
// ── Phase 3 / L30 — ${prefix} domain logic: deterministic record evaluator.
// Mirrors the feature-flag-os reference (L28). Decision is derived from
// (kind, config, ctx) and an audit ledger row is emitted.
export interface RecordEvalCtx { tenant_id?: string; user_id?: string; cohort?: string }
export interface RecordEvalResult { record_key: string; version: number; kind: string; decision: 'on'|'off'; reason: string; evaluated_at: string }

function _hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export async function evaluateRecord(recordKey: string, ctx: RecordEvalCtx): Promise<RecordEvalResult> {
  await actor();
  const r = await masterQuery(
    \`SELECT record_key, version, kind, status, config
       FROM dos.${prefix}_record
      WHERE record_key=$1 AND status='published'
      ORDER BY version DESC LIMIT 1\`,
    [recordKey],
  );
  if (!r.rows.length) throw new Error('record_not_published');
  const row = r.rows[0] as { record_key: string; version: number; kind: string; config: Record<string, unknown> };
  const cfg = row.config ?? {};
  let decision: 'on'|'off' = 'on';
  let reason = \`\${row.kind}:default_on\`;
  // Universal disable switches honoured across every OS.
  if (cfg.disabled === true)        { decision = 'off'; reason = \`\${row.kind}:disabled\`; }
  else if (cfg.killed === true)     { decision = 'off'; reason = \`\${row.kind}:killed\`; }
  else if (cfg.enabled === false)   { decision = 'off'; reason = \`\${row.kind}:enabled=false\`; }
  else if (typeof cfg.percentage === 'number') {
    const pct = Math.max(0, Math.min(100, Number(cfg.percentage)));
    const seed = \`\${recordKey}|\${ctx.tenant_id ?? ''}|\${ctx.user_id ?? ''}\`;
    const bucket = _hash32(seed) % 100;
    decision = bucket < pct ? 'on' : 'off';
    reason = \`\${row.kind}:percentage=\${pct},bucket=\${bucket}\`;
  } else if (Array.isArray(cfg.cohorts)) {
    const cohorts = cfg.cohorts as string[];
    decision = cohorts.includes(ctx.cohort ?? '') ? 'on' : 'off';
    reason = \`\${row.kind}:cohort=\${ctx.cohort ?? '∅'}\`;
  }
  const evaluatedAt = new Date().toISOString();
  // Audit ledger row via the same emitEvent path so writer-actor + triggers fire.
  const rec = await getRecord(recordKey);
  await masterQuery(
    \`INSERT INTO dos.${prefix}_event (record_id, record_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3,$4::jsonb,$5)\`,
    [rec ? (rec as { id: string }).id : null, recordKey, '${prefix}_evaluated',
     JSON.stringify({ ctx, decision, reason, version: row.version }), '${prefix}-os-service'],
  );
  return { record_key: row.record_key, version: row.version, kind: row.kind, decision, reason, evaluated_at: evaluatedAt };
}
`;
}

function routeBlock(router) {
  return `
// ── Phase 3 / L30 — domain-aware deterministic record evaluator.
${router}.post('/records/:record_key/evaluate', async (req: Request, res: Response) => {
  try {
    const ctx = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const result = await evaluateRecord(String(req.params.record_key), {
      tenant_id: typeof ctx.tenant_id === 'string' ? ctx.tenant_id : undefined,
      user_id:   typeof ctx.user_id === 'string'   ? ctx.user_id   : undefined,
      cohort:    typeof ctx.cohort === 'string'    ? ctx.cohort    : undefined,
    });
    res.json({ ok: true, evaluation: result });
  } catch (e) {
    const msg = String((e as Error).message);
    res.status(msg === 'record_not_published' ? 404 : 500).json({ error: 'evaluate_failed', detail: msg });
  }
});
`;
}

let touched = 0, skipped = 0;
for (const os of OSES) {
  const repoPath  = join(ROOT, 'services', `${os.code}-service`, 'src', 'lib',    `${os.code}-repo.ts`);
  const routePath = join(ROOT, 'services', `${os.code}-service`, 'src', 'routes', `${os.code}.route.ts`);
  const repoSrc   = readFileSync(repoPath, 'utf8');
  const routeSrc  = readFileSync(routePath, 'utf8');
  if (repoSrc.includes('export async function evaluateRecord(')) { skipped++; continue; }
  writeFileSync(repoPath,  repoSrc + evaluatorBlock(os.prefix));
  // Add evaluateRecord to imports in route file (extend the existing import line).
  const newRoute = routeSrc
    .replace(
      /import \{([^}]*?)\} from '\.\.\/lib\/[a-z-]+-repo\.js';/,
      (_m, inside) => `import {${inside}, evaluateRecord} from '../lib/${os.code}-repo.js';`,
    ) + routeBlock(os.router);
  writeFileSync(routePath, newRoute);
  console.log(`[L30] injected evaluator into ${os.code}`);
  touched++;
}
console.log(`[L30] done — touched=${touched}, skipped=${skipped}`);
