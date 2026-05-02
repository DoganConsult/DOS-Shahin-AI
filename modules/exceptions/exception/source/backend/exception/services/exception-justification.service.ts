import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitEvent } from '../ports/events.port';
import { ExceptionRepository } from '../repositories/exception.repository';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface JustificationData {
  exceptionId: string;
  businessJustification: string;
  riskAcceptanceStatement?: string;
  impactAnalysis?: string;
  alternativesConsidered?: string[];
  justifiedBy: string;
}

export interface JustificationRecord {
  justificationId: string;
  exceptionId: string;
  businessJustification: string;
  riskAcceptanceStatement: string | null;
  impactAnalysis: string | null;
  alternativesConsidered: string[];
  justifiedBy: string;
  justifiedAt: string;
}

function validateJustificationData(data: JustificationData): void {
  const errors: string[] = [];
  if (!data.exceptionId?.trim()) errors.push('exceptionId is required');
  if (!data.businessJustification?.trim()) errors.push('businessJustification is required');
  if (data.businessJustification && data.businessJustification.length > 5000) errors.push('businessJustification must not exceed 5000 characters');
  if (data.riskAcceptanceStatement && data.riskAcceptanceStatement.length > 5000) errors.push('riskAcceptanceStatement must not exceed 5000 characters');
  if (data.impactAnalysis && data.impactAnalysis.length > 5000) errors.push('impactAnalysis must not exceed 5000 characters');
  if (data.alternativesConsidered) {
    if (data.alternativesConsidered.length > 20) errors.push('alternativesConsidered must not exceed 20 items');
    for (const item of data.alternativesConsidered) {
      if (item.length > 2000) { errors.push('each alternative must not exceed 2000 characters'); break; }
    }
  }
  if (!data.justifiedBy?.trim()) errors.push('justifiedBy is required');
  if (errors.length > 0) throw Object.assign(new Error(`Invalid justification: ${errors.join(', ')}`), { statusCode: 400 });
}

export async function upsertJustification(
  tenantId: string,
  data: JustificationData,
): Promise<JustificationRecord> {
  validateJustificationData(data);
  const schema = tenantSchema(tenantId);
  const repo = new ExceptionRepository(tenantId);

  let prevJustification: string | null = null;

  const r = await withTransaction(tenantId, async (client) => {
    const exc = await repo.findByIdForUpdate(data.exceptionId, client);
    if (!exc) throw Object.assign(new Error('Exception not found'), { statusCode: 404 });

    const prev = await safeQueryWithClient(
      `SELECT business_justification FROM "${schema}".exception_justifications WHERE exception_id = $1`,
      [data.exceptionId],
      client,
    );
    prevJustification = getFirstRow(prev)?.business_justification ?? null;

    const result = await safeQueryWithClient(
      `INSERT INTO "${schema}".exception_justifications
        (exception_id, business_justification, risk_acceptance_statement,
         impact_analysis, alternatives_considered, justified_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (exception_id) DO UPDATE SET
         business_justification = EXCLUDED.business_justification,
         risk_acceptance_statement = EXCLUDED.risk_acceptance_statement,
         impact_analysis = EXCLUDED.impact_analysis,
         alternatives_considered = EXCLUDED.alternatives_considered,
         justified_by = EXCLUDED.justified_by,
         updated_at = NOW()
       RETURNING *`,
      [
        data.exceptionId, data.businessJustification,
        data.riskAcceptanceStatement || null, data.impactAnalysis || null,
        JSON.stringify(data.alternativesConsidered || []), data.justifiedBy,
      ],
      client,
    );

    return getFirstRow(result)!;
  });

  await recordAudit({
    tenantId, userId: data.justifiedBy, module: 'exception', action: 'justification_update',
    entityType: 'exception', entityId: data.exceptionId,
    beforeState: prevJustification ? { businessJustification: prevJustification } : undefined,
    afterState: { businessJustification: data.businessJustification },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent(({
      tenantId, userId: data.justifiedBy, module: 'exception', event: 'justification_updated',
      entityType: 'exception', entityId: data.exceptionId,
      data: { businessJustification: data.businessJustification },
      previousData: prevJustification ? { businessJustification: prevJustification } : undefined,
    } as any)).catch(catchHandler(EC.EVENT_BUS));

  return mapRow(r);
}

export async function getJustification(
  tenantId: string,
  exceptionId: string,
): Promise<JustificationRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".exception_justifications WHERE exception_id = $1`,
    [exceptionId],
  );
  const r = getFirstRow(result)!;
  return r ? mapRow(r) : null;
}

export interface JustificationHistoryEntry {
  auditId: string;
  exceptionId: string;
  action: string;
  userId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  timestamp: string;
}

export async function getJustificationHistory(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: JustificationHistoryEntry[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const [countResult, result] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail
       WHERE module = 'exception' AND entity_id = $1 AND action IN ('justification_update', 'justification_create')`,
      [exceptionId],
    ),
    safeQuery(
      `SELECT audit_id, entity_id, action, user_id, before_state, after_state, created_at
       FROM "${schema}".audit_trail
       WHERE module = 'exception' AND entity_id = $1 AND action IN ('justification_update', 'justification_create')
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [exceptionId, safeSize, offset],
    ),
  ]);
  return {

    items: result.rows.map(( r: Record<string, unknown>) => ({
      auditId: r.audit_id || r.id,
      exceptionId: r.entity_id,
      action: r.action,
      userId: r.user_id,
      beforeState: r.before_state ? (typeof r.before_state === 'string' ? JSON.parse(r.before_state) : r.before_state) : null,
      afterState: r.after_state ? (typeof r.after_state === 'string' ? JSON.parse(r.after_state) : r.after_state) : null,

      timestamp: r.created_at?.toISOString?.() || r.created_at,
    })),
    total: countResult.rows[0]?.total ?? 0,
  };
}

function mapRow( r: Record<string, unknown>): JustificationRecord {
  return {

    justificationId: r.justification_id || r.id,

    exceptionId: r.exception_id,

    businessJustification: r.business_justification,

    riskAcceptanceStatement: r.risk_acceptance_statement || null,

    impactAnalysis: r.impact_analysis || null,
    alternativesConsidered: r.alternatives_considered ? (typeof r.alternatives_considered === 'string' ? JSON.parse(r.alternatives_considered) : r.alternatives_considered) : [],

    justifiedBy: r.justified_by,

    justifiedAt: r.justified_at?.toISOString?.() || r.created_at?.toISOString?.() || new Date().toISOString(),
  };
}
