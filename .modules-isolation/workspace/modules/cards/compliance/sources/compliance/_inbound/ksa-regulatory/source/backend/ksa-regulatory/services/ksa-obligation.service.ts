import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { eventBus } from '../ports/events.port';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/db';
import type { GenericRow } from '@dos/types';

export type ObligationStatus =
  | 'open'
  | 'in_progress'
  | 'compliant'
  | 'overdue'
  | 'waived'
  | 'closed';

export type ObligationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface KsaObligation {
  obligationId: string;
  frameworkCode: string;
  regulatorCode: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  severity: ObligationSeverity;
  status: ObligationStatus;
  dueDate: string | null;
  complianceDeadline: string | null;
  ownerId: string | null;
  evidenceRequired: boolean;
  linkedControlCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KsaObligationFilters {
  frameworkCode?: string;
  regulatorCode?: string;
  status?: ObligationStatus;
  severity?: ObligationSeverity;
  overdueOnly?: boolean;
}

export interface KsaObligationListResult {
  obligations: KsaObligation[];
  total: number;
  overdueCount: number;
  openCount: number;
}

export interface KsaObligationStatusUpdate {
  status: ObligationStatus;
  reason?: string;
  updatedBy: string;
}

export interface KsaObligationSummary {
  total: number;
  byStatus: Record<ObligationStatus, number>;
  bySeverity: Record<ObligationSeverity, number>;
  overdueCount: number;
  completionRate: number;
}

function rowToObligation(r: GenericRow): KsaObligation {
  return {
    obligationId: String(r.obligation_id ?? r.id ?? ''),
    frameworkCode: String(r.framework_code ?? ''),
    regulatorCode: String(r.regulator_code ?? r.authority_code ?? ''),
    titleEn: String(r.title_en ?? r.title ?? ''),
    titleAr: String(r.title_ar ?? r.title_en ?? r.title ?? ''),
    descriptionEn: String(r.description_en ?? r.description ?? ''),
    descriptionAr: String(r.description_ar ?? r.description_en ?? r.description ?? ''),
    severity: (r.severity as ObligationSeverity) ?? 'medium',
    status: (r.status as ObligationStatus) ?? 'open',
    dueDate: r.due_date ? String(r.due_date) : null,
    complianceDeadline: r.compliance_deadline ? String(r.compliance_deadline) : null,
    ownerId: r.owner_id ? String(r.owner_id) : null,
    evidenceRequired: Boolean(r.evidence_required ?? false),
    linkedControlCount: Number(r.linked_control_count ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

export async function listKsaObligations(
  tenantId: string,
  filters: KsaObligationFilters = {}
): Promise<KsaObligationListResult> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = ['(o.deleted_at IS NULL OR o.deleted_at > NOW())'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.frameworkCode) {
    conditions.push(`o.framework_code = $${paramIdx++}`);
    params.push(filters.frameworkCode);
  }
  if (filters.regulatorCode) {
    conditions.push(`o.regulator_code = $${paramIdx++}`);
    params.push(filters.regulatorCode);
  }
  if (filters.status) {
    conditions.push(`o.status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters.severity) {
    conditions.push(`o.severity = $${paramIdx++}`);
    params.push(filters.severity);
  }
  if (filters.overdueOnly) {
    conditions.push(`o.status = 'overdue' OR (o.due_date < NOW() AND o.status NOT IN ('compliant', 'closed', 'waived'))`);
  }

  const where = conditions.join(' AND ');

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT o.*,
       (SELECT COUNT(*) FROM "${schema}".compliance_control_mappings ccm WHERE ccm.obligation_id = o.obligation_id AND (ccm.deleted_at IS NULL OR ccm.deleted_at > NOW()))::int AS linked_control_count
     FROM "${schema}".obligations o
     WHERE ${where}
     ORDER BY
       CASE o.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       o.due_date ASC NULLS LAST`,
    params
  ), { tenantId, operation: 'list ksa obligations' });

  const obligations = res.rows.map(rowToObligation);
  const overdueCount = obligations.filter(o =>
    o.status === 'overdue' ||
    (o.dueDate && new Date(o.dueDate) < new Date() && !['compliant', 'closed', 'waived'].includes(o.status))
  ).length;
  const openCount = obligations.filter(o => ['open', 'in_progress'].includes(o.status)).length;

  return { obligations, total: obligations.length, overdueCount, openCount };
}

export async function getKsaObligation(
  tenantId: string,
  obligationId: string
): Promise<KsaObligation | null> {
  const schema = tenantSchema(tenantId);

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT o.*,
       (SELECT COUNT(*) FROM "${schema}".compliance_control_mappings ccm WHERE ccm.obligation_id = o.obligation_id AND (ccm.deleted_at IS NULL OR ccm.deleted_at > NOW()))::int AS linked_control_count
     FROM "${schema}".obligations o
     WHERE o.obligation_id = $1 AND (o.deleted_at IS NULL OR o.deleted_at > NOW())`,
    [obligationId]
  ), { tenantId, operation: 'get ksa obligation' });

  if (res.rows.length === 0) return null;
  return rowToObligation(res.rows[0]);
}

export async function updateKsaObligationStatus(
  tenantId: string,
  obligationId: string,
  update: KsaObligationStatusUpdate
): Promise<KsaObligation | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".obligations
     SET status = $1, updated_at = NOW()
     WHERE obligation_id = $2 AND (deleted_at IS NULL OR deleted_at > NOW())
     RETURNING *`,
    [update.status, obligationId]
  );

  if (res.rows.length === 0) return null;

  await eventBus.publish(({
      eventType: 'ksa_regulatory.obligation_status_updated',
      tenantId,
      sourceService: 'ksa_obligation_service',
      entityType: 'obligation',
      entityId: obligationId,
      severity: update.status === 'overdue' ? 'warning' : 'info',
      payload: {
        obligationId,
        newStatus: update.status,
        reason: update.reason ?? null,
        updatedBy: update.updatedBy,
      },
    } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

  logger.info('[KsaObligation] status updated', { tenantId, obligationId, status: update.status });
  return rowToObligation(res.rows[0]);
}

export async function getKsaObligationSummary(
  tenantId: string,
  frameworkCode?: string
): Promise<KsaObligationSummary> {
  const schema = tenantSchema(tenantId);

  const params: unknown[] = [];
  let where = `(deleted_at IS NULL OR deleted_at > NOW())`;
  if (frameworkCode) {
    where += ` AND framework_code = $1`;
    params.push(frameworkCode);
  }

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
       COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant_count,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
       COUNT(*) FILTER (WHERE status = 'waived')::int AS waived_count,
       COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high_count,
       COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium_count,
       COUNT(*) FILTER (WHERE severity = 'low')::int AS low_count
     FROM "${schema}".obligations
     WHERE ${where}`,
    params
  ), { tenantId, operation: 'obligation summary' });

  const r = res.rows[0] ?? {};
  const total = Number(r.total ?? 0);
  const compliantCount = Number(r.compliant_count ?? 0);
  const closedCount = Number(r.closed_count ?? 0);
  const completionRate = total > 0
    ? Math.round(((compliantCount + closedCount) / total) * 100)
    : 0;

  return {
    total,
    byStatus: {
      open: Number(r.open_count ?? 0),
      in_progress: Number(r.in_progress_count ?? 0),
      compliant: compliantCount,
      overdue: Number(r.overdue_count ?? 0),
      waived: Number(r.waived_count ?? 0),
      closed: closedCount,
    },
    bySeverity: {
      critical: Number(r.critical_count ?? 0),
      high: Number(r.high_count ?? 0),
      medium: Number(r.medium_count ?? 0),
      low: Number(r.low_count ?? 0),
    },
    overdueCount: Number(r.overdue_count ?? 0),
    completionRate,
  };
}

export async function syncOverdueObligations(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `UPDATE "${schema}".obligations
       SET status = 'overdue', updated_at = NOW()
       WHERE status IN ('open', 'in_progress')
         AND due_date < NOW()
         AND (deleted_at IS NULL OR deleted_at > NOW())
       RETURNING obligation_id`,
      []
    );

    const count = res.rows.length;
    if (count > 0) {
      logger.info('[KsaObligation] synced overdue obligations', { tenantId, count });
    }
    return count;
  } catch (err) {
    logger.error('[KsaObligation] syncOverdueObligations failed', {
      tenantId, error: toErrorMessage(err),
    });
    return 0;
  }
}
