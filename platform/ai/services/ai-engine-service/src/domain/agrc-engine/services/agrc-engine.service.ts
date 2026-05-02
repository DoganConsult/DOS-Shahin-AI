// @ts-nocheck
import { safeQuery, tenantSchema } from '../ports/database.port';

import { emitEvent, notifyDomainChange } from '../ports/events.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

export async function list(tenantId: string, query_: any): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conds = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;
  if (query_?.status) { conds.push(`status = $${idx++}`); params.push(query_.status); }
  if (query_?.engineType) { conds.push(`engine_type = $${idx++}`); params.push(query_.engineType); }
  if (query_?.category) { conds.push(`category = $${idx++}`); params.push(query_.category); }
  const limit = Math.min(Number(query_?.limit) || 50, 200);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".agrc_engine_runs WHERE ${conds.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit}`,
    params as string[],
  ).catch(() => ({ rows: [] }));
  return rows.map(mapRow);
}

export async function getById(tenantId: string, id: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".agrc_engine_runs WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function create(tenantId: string, body: Record<string, unknown>, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".agrc_engine_runs
       (tenant_id, engine_type, category, config, status, triggered_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'queued',$5,NOW(),NOW()) RETURNING *`,
    [
      tenantId, body.engineType ?? 'assessment',
      body.category ?? 'general',
      JSON.stringify(body.config ?? {}),
      uid,
    ],
  ).catch((e) => { logger.warn('[agrc-engine] create query failed', { error: (e as Error).message }); return { rows: [] }; });
  if (rows.length === 0) return { id: 'pending', status: 'failed', tenantId };

  const record = mapRow(rows[0]);
  const runId = record.id as string;

  recordAudit({
    tenantId, userId: uid, module: 'agrc-engine', action: 'create',
    entityType: 'agrc_engine_run', entityId: runId,
    afterState: { engineType: record.engineType, category: record.category, status: 'queued' },
  }).catch((e) => logger.warn('[agrc-engine] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: uid, module: 'agrc-engine', event: 'run.created',
      entityType: 'agrc_engine_run', entityId: runId,
      data: { engineType: record.engineType, category: record.category },
    } as any)).catch((e) => logger.warn('[agrc-engine] event emission failed', { error: (e as Error).message }));

  notifyDomainChange(tenantId, 'agrc-engine', 'create', runId);

  enrichWithAI(tenantId, runId, record).catch(catchHandler(EC.EVENT_BUS));

  logger.info('[agrc-engine] run created', { tenantId, runId, engineType: record.engineType });

  return record;
}

export async function update(tenantId: string, id: string, body: Record<string, unknown>, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;

  const { rows: beforeRows } = await safeQuery(
    `SELECT * FROM "${schema}".agrc_engine_runs WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  ).catch(() => ({ rows: [] }));
  const beforeState = beforeRows.length > 0 ? mapRow(beforeRows[0]) : null;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id];
  let idx = 2;
  if (body.status) { sets.push(`status = $${idx++}`); params.push(body.status); }
  if (body.result) { sets.push(`result = $${idx++}`); params.push(JSON.stringify(body.result)); }
  if (body.config) { sets.push(`config = $${idx++}`); params.push(JSON.stringify(body.config)); }
  if (body.completedAt) { sets.push(`completed_at = $${idx++}`); params.push(body.completedAt); }
  const { rows } = await safeQuery(
    `UPDATE "${schema}".agrc_engine_runs SET ${sets.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    params as string[],
  ).catch(() => ({ rows: [] }));
  if (rows.length === 0) return null;

  const record = mapRow(rows[0]);

  recordAudit({
    tenantId, userId: uid, module: 'agrc-engine', action: 'update',
    entityType: 'agrc_engine_run', entityId: id,
    beforeState, afterState: { status: record.status, result: record.result },
  }).catch((e) => logger.warn('[agrc-engine] audit failed', { error: (e as Error).message }));

  const eventName = body.status === 'completed' ? 'run.completed'
    : body.status === 'failed' ? 'run.failed'
    : 'run.updated';

  emitEvent(({
      tenantId, userId: uid, module: 'agrc-engine', event: eventName,
      entityType: 'agrc_engine_run', entityId: id,
      data: { status: record.status, previousStatus: beforeState?.status, engineType: record.engineType },
    } as any)).catch((e) => logger.warn('[agrc-engine] event emission failed', { error: (e as Error).message }));

  notifyDomainChange(tenantId, 'agrc-engine', 'update', id);

  if (body.status === 'completed') {
    publishHealthSnapshot(tenantId, id, record).catch(catchHandler(EC.EVENT_BUS));
  }

  logger.info('[agrc-engine] run updated', { tenantId, runId: id, status: record.status });

  return record;
}

async function enrichWithAI(tenantId: string, runId: string, _record: Record<string, unknown>): Promise<void> {
  try {
    // Attempt LangGraph orchestrator (preferred path)
    const langGraphEnabled = process.env.LANGGRAPH_AGENTS_ENABLED === 'true';
    if (langGraphEnabled) {
      const { runOrchestratorGraph } = await import(
        /* webpackIgnore: true */
        '../../../../../../../services/tenant-service/src/domain/langgraph/graphs/orchestrator.graph'
      );
      logger.info('[agrc-engine] Starting LangGraph orchestrator cycle', { tenantId, runId });

      const config = {
        configurable: { thread_id: `${tenantId}:engine:${runId}` },
        tags: [`tenant:${tenantId}`, 'graph:orchestrator', `run:${runId}`],
        metadata: { source: 'ai-engine-service', runId },
      };

      const result = await runOrchestratorGraph(tenantId, config);

      // Update run record with results
      const schema = tenantSchema(tenantId);
      await safeQuery(
        `UPDATE "${schema}".agrc_engine_runs
         SET status = 'completed', results = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [runId, JSON.stringify({
          cycleId: result?.cycleId,
          discoveryCount: result?.allDiscoveries?.length ?? 0,
          correlationCount: result?.correlations?.length ?? 0,
          agentResults: Object.keys(result?.agentResults ?? {}),
        })],
      ).catch(() => {});

      logger.info('[agrc-engine] LangGraph orchestrator cycle completed', {
        tenantId, runId,
        discoveries: result?.allDiscoveries?.length ?? 0,
        correlations: result?.correlations?.length ?? 0,
      });
      return;
    }

    // Fallback: legacy agent service

    const { getAgent } = await import('../../runtime/ai/services/agents/core/ai-agent.service');
    const agent = await getAgent(tenantId, 'agrc-engine-analyst');
    if (!agent || agent.status !== 'active') return;

    logger.info('[agrc-engine] AI enrichment available for run (legacy path)', { tenantId, runId });
  } catch (err) {
    logger.warn('[agrc-engine] AI enrichment failed — graceful degradation', {
      tenantId, runId, error: (err as Error).message,
    });
  }
}

async function publishHealthSnapshot(tenantId: string, runId: string, _record: Record<string, unknown>): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    const [riskResult, complianceResult, incidentResult] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS cnt, COALESCE(AVG(risk_score),0)::numeric(5,1) AS avg FROM "${schema}".risks WHERE status != 'closed'`).catch(() => ({ rows: [{ cnt: 0, avg: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('implemented','effective'))::int AS passing FROM "${schema}".controls`).catch(() => ({ rows: [{ total: 0, passing: 0 }] })),
      safeQuery(`SELECT COUNT(*) FILTER (WHERE status != 'resolved')::int AS open FROM "${schema}".incidents`).catch(() => ({ rows: [{ open: 0 }] })),
    ]);

    const snapshot = {
      riskCount: riskResult.rows[0]?.cnt ?? 0,
      avgRiskScore: Number(riskResult.rows[0]?.avg ?? 0),
      controlTotal: complianceResult.rows[0]?.total ?? 0,
      controlPassing: complianceResult.rows[0]?.passing ?? 0,
      openIncidents: incidentResult.rows[0]?.open ?? 0,
      generatedAt: new Date().toISOString(),
    };

    emitEvent(({
          tenantId, userId: SYSTEM_JOB_ACTOR, module: 'agrc-engine', event: 'health_snapshot_created',
          entityType: 'health_snapshot', entityId: runId,
          data: snapshot,
        } as any)).catch((e) => logger.warn('[agrc-engine] health snapshot event failed', { error: (e as Error).message }));

    logger.info('[agrc-engine] health snapshot published', { tenantId, runId, snapshot });
  } catch (err) {
    logger.warn('[agrc-engine] health snapshot generation failed', { tenantId, error: (err as Error).message });
  }
}

function mapRow( r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id, tenantId: r.tenant_id, engineType: r.engine_type ?? 'assessment',
    category: r.category ?? 'general',
    config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config ?? {},
    result: typeof r.result === 'string' ? JSON.parse(r.result) : r.result ?? null,
    status: r.status ?? 'queued', triggeredBy: r.triggered_by ?? null,
    completedAt: r.completed_at ?? null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
