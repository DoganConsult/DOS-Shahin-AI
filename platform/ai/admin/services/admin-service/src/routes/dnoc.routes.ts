import { Router } from 'express';
import { q, one, exec } from '../db';
import { asyncHandler, paginate, audit, AdminRequest } from '../middleware';

const r = Router();

// ── metrics ──────────────────────────────────────────
r.get('/metrics', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const name = req.query.name as string | undefined;
  const where = name ? 'WHERE name=$1' : '';
  const params = name ? [name, limit, offset] : [limit, offset];
  res.json({ data: await q(`SELECT * FROM platform_dnoc.metrics ${where} ORDER BY recorded_at DESC LIMIT $${name?2:1} OFFSET $${name?3:2}`, params) });
}));

// ── logs ─────────────────────────────────────────────
r.get('/logs', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const level = req.query.level as string | undefined;
  const module = req.query.module_code as string | undefined;
  const conds: string[] = []; const params: any[] = [];
  if (level) { params.push(level); conds.push(`level=$${params.length}`); }
  if (module) { params.push(module); conds.push(`module_code=$${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  params.push(limit); params.push(offset);
  res.json({ data: await q(`SELECT * FROM platform_dnoc.logs ${where} ORDER BY emitted_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params) });
}));

// ── traces ───────────────────────────────────────────
r.get('/traces', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT trace_id, name, started_at, ended_at, duration_ms FROM platform_dnoc.traces WHERE parent_span_id IS NULL ORDER BY started_at DESC LIMIT $1 OFFSET $2', [limit, offset]) });
}));
r.get('/traces/:traceId', asyncHandler(async (req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dnoc.traces WHERE trace_id=$1 ORDER BY started_at', [req.params.traceId]) });
}));

// ── routes ───────────────────────────────────────────
r.get('/routes', asyncHandler(async (req, res) => {
  const svc = req.query.service_code as string | undefined;
  const mod = req.query.module_code as string | undefined;
  const conds: string[] = ['deregistered_at IS NULL']; const params: any[] = [];
  if (svc) { params.push(svc); conds.push(`service_code=$${params.length}`); }
  if (mod) { params.push(mod); conds.push(`module_code=$${params.length}`); }
  res.json({ data: await q(`SELECT * FROM platform_dnoc.routes WHERE ${conds.join(' AND ')} ORDER BY service_code, path`, params) });
}));

r.get('/route-hits', asyncHandler(async (req, res) => {
  const routeId = req.query.route_id as string;
  if (!routeId) return res.status(400).json({ error: 'route_id required' });
  res.json({ data: await q('SELECT * FROM platform_dnoc.route_hits WHERE route_id=$1 ORDER BY bucket_start DESC LIMIT 200', [routeId]) });
}));

// ── health-checks ────────────────────────────────────
r.get('/health-checks', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT DISTINCT ON (service_code) service_code, status, details, checked_at FROM platform_dnoc.health_checks ORDER BY service_code, checked_at DESC') });
}));
r.get('/health-checks/:service', asyncHandler(async (req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dnoc.health_checks WHERE service_code=$1 ORDER BY checked_at DESC LIMIT 200', [req.params.service]) });
}));

// ── service-deployments ──────────────────────────────
r.get('/service-deployments', asyncHandler(async (req, res) => {
  const svc = req.query.service_code as string | undefined;
  const where = svc ? 'WHERE service_code=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dnoc.service_deployments ${where} ORDER BY deployed_at DESC LIMIT 500`, svc ? [svc] : []) });
}));
r.post('/service-deployments', asyncHandler(async (req: AdminRequest, res) => {
  const { service_code, version, commit_sha, environment = 'production', deployed_by, rollback_of } = req.body;
  await exec(
    `INSERT INTO platform_dnoc.service_deployments(service_code,version,commit_sha,environment,deployed_by,rollback_of) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(service_code,version,environment) DO NOTHING`,
    [service_code, version, commit_sha ?? null, environment, deployed_by ?? req.actor?.userId, rollback_of ?? null]
  );
  await audit('dnoc', 'deployment.create', req.actor, { type: 'deployment', id: `${service_code}@${version}` });
  res.status(201).json({ ok: true });
}));

// ── service-dependencies ─────────────────────────────
r.get('/service-dependencies', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dnoc.service_dependencies ORDER BY service_code, depends_on') });
}));

// ── rate-limit-policies ──────────────────────────────
r.get('/rate-limit-policies', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dnoc.rate_limit_policies ORDER BY policy_code') });
}));
r.post('/rate-limit-policies', asyncHandler(async (req: AdminRequest, res) => {
  const { policy_code, description, scope = 'tenant', window_seconds = 60, max_requests, burst_limit, action = 'reject' } = req.body;
  await exec(
    `INSERT INTO platform_dnoc.rate_limit_policies(policy_code,description,scope,window_seconds,max_requests,burst_limit,action) VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(policy_code) DO UPDATE SET description=EXCLUDED.description, scope=EXCLUDED.scope, window_seconds=EXCLUDED.window_seconds, max_requests=EXCLUDED.max_requests, burst_limit=EXCLUDED.burst_limit, action=EXCLUDED.action`,
    [policy_code, description ?? null, scope, window_seconds, max_requests, burst_limit ?? null, action]
  );
  await audit('dnoc', 'rate_limit.upsert', req.actor, { type: 'rate_limit_policy', id: policy_code });
  res.status(201).json({ ok: true });
}));

// ── circuit-breakers ────────────────────────────────
r.get('/circuit-breaker-state', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dnoc.circuit_breaker_state ORDER BY state DESC, service_code, dependency') });
}));
r.post('/circuit-breaker-state/:id/reset', asyncHandler(async (req: AdminRequest, res) => {
  await exec(`UPDATE platform_dnoc.circuit_breaker_state SET state='closed', failure_count=0, opened_at=NULL, half_open_at=NULL, updated_at=NOW() WHERE id=$1`, [req.params.id]);
  await audit('dnoc', 'circuit_breaker.reset', req.actor, { type: 'circuit_breaker', id: req.params.id });
  res.json({ ok: true });
}));

// ── error-budgets ───────────────────────────────────
r.get('/error-budget-snapshots', asyncHandler(async (req, res) => {
  const svc = req.query.service_code as string | undefined;
  const where = svc ? 'WHERE service_code=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dnoc.error_budget_snapshots ${where} ORDER BY captured_at DESC LIMIT 500`, svc ? [svc] : []) });
}));

// ── overview ────────────────────────────────────────
r.get('/overview', asyncHandler(async (_req, res) => {
  const [routes, services, openBreakers, deploys24h, errors24h, unhealthy] = await Promise.all([
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dnoc.routes WHERE deregistered_at IS NULL`),
    one<{ c: string }>(`SELECT COUNT(DISTINCT service_code)::text c FROM platform_dnoc.routes WHERE deregistered_at IS NULL`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dnoc.circuit_breaker_state WHERE state <> 'closed'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dnoc.service_deployments WHERE deployed_at > NOW() - INTERVAL '24 hours'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dnoc.logs WHERE level IN ('error','fatal') AND emitted_at > NOW() - INTERVAL '24 hours'`),
    one<{ c: string }>(`SELECT COUNT(DISTINCT service_code)::text c FROM platform_dnoc.health_checks WHERE status IN ('unhealthy','degraded') AND checked_at > NOW() - INTERVAL '10 minutes'`),
  ]);
  res.json({
    data: {
      routes: +routes!.c, services: +services!.c, open_breakers: +openBreakers!.c,
      deployments_24h: +deploys24h!.c, errors_24h: +errors24h!.c, unhealthy_services: +unhealthy!.c,
    },
  });
}));

export default r;
