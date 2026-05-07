// Module Orchestrator Service
// ----------------------------------------------------------------------------
// Three logical surfaces share one process & port (pragmatic; reduces fleet
// surface area). Backed by dos.module_readiness, dos.module_pool_slots,
// dos.module_capabilities, dos.module_capability_bindings, dos.tenant_modules
// (created by ops/migrations/public/20260430_2200_module_orchestrator.sql).
//
//   GET  /health
//   ── Readiness ───────────────────────────────────────────────────────────
//   GET  /readiness                       → list all module verdicts
//   GET  /readiness/:module               → single module verdict
//   POST /readiness/:module               → upsert verdict { version, verdict, gates, evidence }
//   ── Pool keeper ─────────────────────────────────────────────────────────
//   GET  /pool                            → list slots
//   GET  /pool/:module                    → slots for module
//   POST /pool/:module/build              → enqueue build of new slot
//   POST /pool/:module/attach             → attach a hot slot to a tenant
//   ── Capability broker ───────────────────────────────────────────────────
//   GET  /capabilities                    → list active capabilities
//   GET  /capabilities/:key               → resolve provider for capability
//   POST /capabilities                    → upsert provider (used at module boot)
//   POST /capabilities/:key/bind          → bind consumer→provider
// ----------------------------------------------------------------------------
import express, { Request, Response, NextFunction } from 'express';
import pg from 'pg';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('module_orchestrator', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

const PORT = Number(process.env.PORT || 4150);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[module-orchestrator] DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10_000),
  application_name: 'module-orchestrator-service',
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

const VALID_VERDICTS = new Set(['GOLDEN_READY', 'DRIFT', 'BLOCKED', 'UNKNOWN']);
const VALID_SLOT_STATES = new Set(['building', 'hot', 'attached', 'draining', 'failed']);

function asyncHandler<T extends Request>(fn: (req: T, res: Response) => Promise<unknown>) {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', asyncHandler(async (_req, res) => {
  const r = await pool.query('SELECT 1 AS ok');
  res.json({ ok: r.rows[0]?.ok === 1, ts: new Date().toISOString() });
}));

// ── Readiness ───────────────────────────────────────────────────────────────
app.get('/readiness', asyncHandler(async (_req, res) => {
  const r = await pool.query(
    `SELECT module_code, module_version, verdict, gates, evidence, computed_at, computed_by
       FROM dos.module_readiness
       ORDER BY module_code`
  );
  res.json({ data: r.rows });
}));

app.get('/readiness/:module', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT module_code, module_version, verdict, gates, evidence, computed_at, computed_by
       FROM dos.module_readiness
      WHERE module_code = $1
      ORDER BY computed_at DESC LIMIT 1`,
    [req.params.module]
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

app.post('/readiness/:module', asyncHandler(async (req, res) => {
  const { version, verdict, gates, evidence } = req.body ?? {};
  if (!version || typeof version !== 'string') {
    res.status(400).json({ error: 'version_required' }); return;
  }
  if (!VALID_VERDICTS.has(String(verdict))) {
    res.status(400).json({ error: 'invalid_verdict' }); return;
  }
  await pool.query(
    `INSERT INTO dos.module_readiness
       (module_code, module_version, verdict, gates, evidence, computed_at, computed_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW(), $6)
     ON CONFLICT (module_code, module_version) DO UPDATE
       SET verdict = EXCLUDED.verdict,
           gates = EXCLUDED.gates,
           evidence = EXCLUDED.evidence,
           computed_at = EXCLUDED.computed_at,
           computed_by = EXCLUDED.computed_by`,
    [req.params.module, version, verdict,
     JSON.stringify(gates ?? {}), JSON.stringify(evidence ?? {}),
     req.header('x-actor') || 'verifier']
  );
  res.json({ ok: true });
}));

// ── Pool keeper ─────────────────────────────────────────────────────────────
app.get('/pool', asyncHandler(async (_req, res) => {
  const r = await pool.query(
    `SELECT slot_id, module_code, module_version, schema_template, state,
            built_at, attached_tenant, attached_at, last_error
       FROM dos.module_pool_slots
       ORDER BY module_code, state, built_at NULLS LAST`
  );
  res.json({ data: r.rows });
}));

app.get('/pool/:module', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT slot_id, module_code, module_version, schema_template, state,
            built_at, attached_tenant, attached_at, last_error
       FROM dos.module_pool_slots
      WHERE module_code = $1
      ORDER BY state, built_at NULLS LAST`,
    [req.params.module]
  );
  res.json({ data: r.rows });
}));

app.post('/pool/:module/build', asyncHandler(async (req, res) => {
  const { module_version, schema_template } = req.body ?? {};
  if (!module_version || !schema_template) {
    res.status(400).json({ error: 'module_version_and_schema_template_required' }); return;
  }
  const r = await pool.query(
    `INSERT INTO dos.module_pool_slots
       (module_code, module_version, schema_template, state)
     VALUES ($1, $2, $3, 'building')
     ON CONFLICT (module_code, schema_template) DO NOTHING
     RETURNING slot_id, state`,
    [req.params.module, module_version, schema_template]
  );
  res.json({ ok: true, slot: r.rows[0] ?? null });
}));

app.post('/pool/:module/attach', asyncHandler(async (req, res) => {
  const { tenant_id } = req.body ?? {};
  if (!tenant_id) { res.status(400).json({ error: 'tenant_id_required' }); return; }
  // Atomic claim of one hot slot.
  const r = await pool.query(
    `WITH claimed AS (
       SELECT slot_id FROM dos.module_pool_slots
        WHERE module_code = $1 AND state = 'hot'
        ORDER BY built_at NULLS LAST LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE dos.module_pool_slots s
        SET state = 'attached', attached_tenant = $2, attached_at = NOW(), updated_at = NOW()
       FROM claimed
      WHERE s.slot_id = claimed.slot_id
      RETURNING s.slot_id, s.module_code, s.module_version, s.schema_template`,
    [req.params.module, tenant_id]
  );
  if (r.rows.length === 0) { res.status(409).json({ error: 'no_hot_slot_available' }); return; }
  res.json({ ok: true, slot: r.rows[0] });
}));

// ── Capability broker ───────────────────────────────────────────────────────
app.get('/capabilities', asyncHandler(async (_req, res) => {
  const r = await pool.query(
    `SELECT capability_key, provider_module, provider_version, shape_ref,
            http_route, fga_relation, description, is_active
       FROM dos.module_capabilities
      WHERE is_active = TRUE
      ORDER BY capability_key`
  );
  res.json({ data: r.rows });
}));

app.get('/capabilities/:key', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT capability_key, provider_module, provider_version, shape_ref,
            http_route, fga_relation, description, is_active
       FROM dos.module_capabilities
      WHERE capability_key = $1`,
    [req.params.key]
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

app.post('/capabilities', asyncHandler(async (req, res) => {
  const { capability_key, provider_module, provider_version, shape_ref,
          http_route, fga_relation, description } = req.body ?? {};
  if (!capability_key || !provider_module || !provider_version || !shape_ref) {
    res.status(400).json({ error: 'missing_required_fields' }); return;
  }
  await pool.query(
    `INSERT INTO dos.module_capabilities
       (capability_key, provider_module, provider_version, shape_ref,
        http_route, fga_relation, description, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
     ON CONFLICT (capability_key) DO UPDATE SET
       provider_module  = EXCLUDED.provider_module,
       provider_version = EXCLUDED.provider_version,
       shape_ref        = EXCLUDED.shape_ref,
       http_route       = EXCLUDED.http_route,
       fga_relation     = EXCLUDED.fga_relation,
       description      = EXCLUDED.description,
       is_active        = TRUE,
       updated_at       = NOW()`,
    [capability_key, provider_module, provider_version, shape_ref,
     http_route ?? null, fga_relation ?? null, description ?? null]
  );
  res.json({ ok: true });
}));

app.post('/capabilities/:key/bind', asyncHandler(async (req, res) => {
  const { consumer_module, semver_range, is_required } = req.body ?? {};
  if (!consumer_module) { res.status(400).json({ error: 'consumer_module_required' }); return; }
  await pool.query(
    `INSERT INTO dos.module_capability_bindings
       (consumer_module, capability_key, semver_range, is_required)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (consumer_module, capability_key) DO UPDATE SET
       semver_range = EXCLUDED.semver_range,
       is_required = EXCLUDED.is_required`,
    [consumer_module, req.params.key, semver_range ?? '*', is_required !== false]
  );
  res.json({ ok: true });
}));

// ── Tenant module enrollment ────────────────────────────────────────────────
// Idempotent: same idempotency_key → same result. Verdict-gated: refuses to
// enroll into modules that are not GOLDEN_READY unless ORCHESTRATOR_ENFORCE_GOLDEN=0.
const ENFORCE_GOLDEN = process.env.ORCHESTRATOR_ENFORCE_GOLDEN !== '0';

app.post('/enroll', asyncHandler(async (req, res) => {
  const { tenant_id, module_code, module_version, mode_override, idempotency_key } = req.body ?? {};
  if (!tenant_id || !module_code || !module_version) {
    res.status(400).json({ error: 'missing_required_fields' }); return;
  }

  // 1. Idempotency guard: replay same key returns prior row.
  if (idempotency_key) {
    const prior = await pool.query(
      `SELECT tenant_id, module_code, module_version, status, provisioning_mode, attached_slot_id, materialized_at
         FROM dos.tenant_modules WHERE idempotency_key = $1`,
      [idempotency_key]
    );
    if (prior.rows.length > 0) { res.json({ ok: true, replayed: true, row: prior.rows[0] }); return; }
  }

  // 2. Verdict gate.
  const v = await pool.query(
    `SELECT verdict FROM dos.module_readiness
      WHERE module_code = $1 AND module_version = $2`,
    [module_code, module_version]
  );
  const verdict = v.rows[0]?.verdict ?? 'UNKNOWN';
  if (ENFORCE_GOLDEN && verdict !== 'GOLDEN_READY') {
    res.status(409).json({ error: 'module_not_golden_ready', verdict, module_code, module_version });
    return;
  }

  // 3. Decide mode (override > readiness gate > default eager).
  const mode = mode_override === 'eager' || mode_override === 'on_demand' || mode_override === 'pool_warmed'
    ? mode_override : 'eager';

  // 4. For pool_warmed try to claim a hot slot atomically.
  let attached_slot_id: string | null = null;
  if (mode === 'pool_warmed') {
    const claim = await pool.query(
      `WITH claimed AS (
         SELECT slot_id FROM dos.module_pool_slots
          WHERE module_code = $1 AND module_version = $2 AND state = 'hot'
          ORDER BY built_at NULLS LAST LIMIT 1
          FOR UPDATE SKIP LOCKED
       )
       UPDATE dos.module_pool_slots s
          SET state = 'attached', attached_tenant = $3, attached_at = NOW(), updated_at = NOW()
         FROM claimed
        WHERE s.slot_id = claimed.slot_id
        RETURNING s.slot_id::text`,
      [module_code, module_version, tenant_id]
    );
    attached_slot_id = claim.rows[0]?.slot_id ?? null;
  }

  // 5. Insert enrollment row.
  const status = mode === 'on_demand' ? 'eligible'
              : mode === 'pool_warmed' ? (attached_slot_id ? 'active' : 'attaching')
              : 'attaching'; // eager: caller is expected to apply schema then PATCH /enroll/status
  const r = await pool.query(
    `INSERT INTO dos.tenant_modules
       (tenant_id, module_code, module_version, status, provisioning_mode,
        attached_slot_id, materialized_at, idempotency_key, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::uuid, CASE WHEN $4='active' THEN NOW() ELSE NULL END, $7, NOW())
     ON CONFLICT (tenant_id, module_code) DO UPDATE SET
       module_version = EXCLUDED.module_version,
       status = EXCLUDED.status,
       provisioning_mode = EXCLUDED.provisioning_mode,
       attached_slot_id = EXCLUDED.attached_slot_id,
       materialized_at = COALESCE(dos.tenant_modules.materialized_at, EXCLUDED.materialized_at),
       updated_at = NOW()
     RETURNING tenant_id, module_code, module_version, status, provisioning_mode, attached_slot_id, materialized_at`,
    [tenant_id, module_code, module_version, status, mode, attached_slot_id, idempotency_key ?? null]
  );

  res.json({ ok: true, replayed: false, row: r.rows[0] });
}));

app.patch('/enroll/:tenantId/:moduleCode/status', asyncHandler(async (req, res) => {
  const { status, last_error } = req.body ?? {};
  const valid = new Set(['eligible', 'attaching', 'active', 'failed', 'draining', 'disabled']);
  if (!valid.has(String(status))) { res.status(400).json({ error: 'invalid_status' }); return; }
  const r = await pool.query(
    `UPDATE dos.tenant_modules
        SET status = $3,
            last_error = $4,
            materialized_at = CASE WHEN $3='active' AND materialized_at IS NULL THEN NOW() ELSE materialized_at END,
            updated_at = NOW()
      WHERE tenant_id = $1 AND module_code = $2
      RETURNING status, materialized_at`,
    [req.params.tenantId, req.params.moduleCode, status, last_error ?? null]
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json({ ok: true, ...r.rows[0] });
}));

app.get('/enroll/:tenantId', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT tenant_id, module_code, module_version, status, provisioning_mode,
            attached_slot_id, materialized_at, last_error
       FROM dos.tenant_modules WHERE tenant_id = $1 ORDER BY module_code`,
    [req.params.tenantId]
  );
  res.json({ data: r.rows });
}));

// ── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[module-orchestrator] error', err);
  res.status(500).json({ error: err.message || 'internal_error' });
});

const server = app.listen(PORT, () => {
  console.log(`[module-orchestrator] listening on ${PORT}`);
});
server.on('error', (e) => { console.error('[module-orchestrator] listen error', e); process.exit(1); });

const shutdown = async (sig: string) => {
  console.log(`[module-orchestrator] ${sig} → draining`);
  server.close(() => pool.end().finally(() => process.exit(0)));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
