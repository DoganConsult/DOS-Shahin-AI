import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface StrategicInsight {
  id: string;
  tenantId: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  sourceModule: string;
  createdAt: string;
}

export async function getInsights(tenantId: string, query_?: any): Promise<StrategicInsight[]> {
  const schema = tenantSchema(tenantId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;
  if (query_?.category) { conds.push(`category = $${idx++}`); params.push(query_.category); }
  if (query_?.severity) { conds.push(`severity = $${idx++}`); params.push(query_.severity); }
  const limit = Math.min(Number(query_?.limit) || 50, 200);

  const { rows } = await safeQuery(
    `SELECT id, tenant_id, category, title, description, severity, source_module, created_at
     FROM "${schema}".strategic_insights
     WHERE ${conds.join(' AND ')}
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
     LIMIT ${limit}`,
    params as string[],
  ).catch(() => ({ rows: [] }));

  const results = rows.map(( r: Record<string, unknown>) => ({
    id: r.id, tenantId: r.tenant_id ?? tenantId, category: r.category ?? 'general',
    title: r.title ?? '', description: r.description ?? '', severity: r.severity ?? 'info',
    sourceModule: r.source_module ?? 'platform', createdAt: r.created_at ?? new Date().toISOString(),
  }));

  const criticalCount = results.filter(i => i.severity === 'critical').length;
  if (criticalCount > 0) {
    emitEvent(({
          tenantId, userId: SYSTEM_JOB_ACTOR, module: 'proactive-leadership', event: 'insights.critical_detected',
          entityType: 'strategic_insight', entityId: tenantId,
          data: { total: results.length, criticalCount },
        } as any)).catch((e) => logger.warn('[proactive-leadership] event emission failed', { error: (e as Error).message }));
  }

  logger.info('[proactive-leadership] strategic insights retrieved', { tenantId, total: results.length, criticalCount });

  return results;
}
