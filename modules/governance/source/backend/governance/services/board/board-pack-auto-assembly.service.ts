import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus } from '../../ports/events.port';
import { swallow, EC, catchHandler as _catchHandler } from '@dos/platform-core/resilience';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { v4 as uuid } from 'uuid';
import _PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface BoardPackSection {
  sectionType: string;
  titleEn: string;
  titleAr: string;
  data: Record<string, unknown>;
  sourceModule: string;
  sortOrder: number;
}

async function fetchRiskSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_risks,
         COUNT(*) FILTER (WHERE residual_score >= 15)::int AS critical_risks,
         COUNT(*) FILTER (WHERE residual_score BETWEEN 10 AND 14)::int AS high_risks,
         COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_risks,
         ROUND(AVG(residual_score)::numeric, 1) AS avg_residual,
         COUNT(*) FILTER (WHERE has_open_findings = true)::int AS risks_with_findings
       FROM "${schema}".risks WHERE deleted_at IS NULL`,
    );
    const s = getFirstRow(stats) ?? {};
    const appetite = await safeQuery(
      `SELECT appetite_level, threshold_value FROM "${schema}".risk_appetite_config WHERE active = true LIMIT 5`,
    );
    return {
      sectionType: 'risk_summary', titleEn: 'Risk Posture Summary', titleAr: 'ملخص وضع المخاطر',
      data: { ...s, appetiteStatements: appetite.rows }, sourceModule: 'risk', sortOrder: 1,
    };
  } catch {
    return { sectionType: 'risk_summary', titleEn: 'Risk Posture Summary', titleAr: 'ملخص وضع المخاطر', data: { error: 'unavailable' }, sourceModule: 'risk', sortOrder: 1 };
  }
}

async function fetchComplianceSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(DISTINCT cf.framework_id)::int AS total_frameworks,
         COUNT(cc.control_id)::int AS total_controls,
         COUNT(cc.control_id) FILTER (WHERE cc.effectiveness_score >= 70)::int AS effective_controls,
         COUNT(cc.control_id) FILTER (WHERE cc.effectiveness_score < 40)::int AS failed_controls,
         ROUND(AVG(cc.effectiveness_score)::numeric, 1) AS avg_effectiveness
       FROM "${schema}".compliance_frameworks cf
       LEFT JOIN "${schema}".compliance_controls cc ON cc.framework_id = cf.framework_id
       WHERE cf.deleted_at IS NULL`,
    );
    const gaps = await safeQuery(
      `SELECT COUNT(*)::int AS open_gaps FROM "${schema}".compliance_gaps
       WHERE status NOT IN ('closed','resolved','remediated')`,
    );
    return {
      sectionType: 'compliance_summary', titleEn: 'Compliance Posture', titleAr: 'وضع الامتثال',
      data: { ...getFirstRow(stats), ...getFirstRow(gaps) }, sourceModule: 'compliance', sortOrder: 2,
    };
  } catch {
    return { sectionType: 'compliance_summary', titleEn: 'Compliance Posture', titleAr: 'وضع الامتثال', data: { error: 'unavailable' }, sourceModule: 'compliance', sortOrder: 2 };
  }
}

async function fetchAuditSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_findings,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_findings,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high_findings,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_findings,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_findings,
         CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE status = 'closed')::numeric / COUNT(*)::numeric * 100, 1)
           ELSE 100 END AS closure_rate
       FROM "${schema}".audit_findings WHERE deleted_at IS NULL`,
    );
    return {
      sectionType: 'audit_summary', titleEn: 'Audit Findings Overview', titleAr: 'نظرة عامة على نتائج التدقيق',
      data: getFirstRow(stats) ?? {}, sourceModule: 'audit', sortOrder: 3,
    };
  } catch {
    return { sectionType: 'audit_summary', titleEn: 'Audit Findings Overview', titleAr: 'نظرة عامة على نتائج التدقيق', data: { error: 'unavailable' }, sourceModule: 'audit', sortOrder: 3 };
  }
}

async function fetchVendorSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_vendors,
         COUNT(*) FILTER (WHERE risk_rating = 'critical')::int AS critical_vendors,
         COUNT(*) FILTER (WHERE risk_rating = 'high')::int AS high_risk_vendors,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant
       FROM "${schema}".vendors WHERE deleted_at IS NULL`,
    );
    return {
      sectionType: 'vendor_summary', titleEn: 'Third-Party Risk Summary', titleAr: 'ملخص مخاطر الأطراف الثالثة',
      data: getFirstRow(stats) ?? {}, sourceModule: 'vendor', sortOrder: 4,
    };
  } catch {
    return { sectionType: 'vendor_summary', titleEn: 'Third-Party Risk Summary', titleAr: 'ملخص مخاطر الأطراف الثالثة', data: { error: 'unavailable' }, sourceModule: 'vendor', sortOrder: 4 };
  }
}

async function fetchIncidentSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_incidents,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_incidents,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_incidents,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_incidents,
         ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) AS avg_resolution_hours
       FROM "${schema}".incidents WHERE deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '90 days'`,
    );
    return {
      sectionType: 'incident_summary', titleEn: 'Incident Summary (90d)', titleAr: 'ملخص الحوادث (90 يوم)',
      data: getFirstRow(stats) ?? {}, sourceModule: 'incident', sortOrder: 5,
    };
  } catch {
    return { sectionType: 'incident_summary', titleEn: 'Incident Summary (90d)', titleAr: 'ملخص الحوادث (90 يوم)', data: { error: 'unavailable' }, sourceModule: 'incident', sortOrder: 5 };
  }
}

async function fetchRemediationSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_plans,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date IS NOT NULL AND due_date < NOW() AND status != 'completed'))::int AS overdue
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL`,
    );
    return {
      sectionType: 'remediation_summary', titleEn: 'Remediation Progress', titleAr: 'تقدم المعالجة',
      data: getFirstRow(stats) ?? {}, sourceModule: 'remediation', sortOrder: 6,
    };
  } catch {
    return { sectionType: 'remediation_summary', titleEn: 'Remediation Progress', titleAr: 'تقدم المعالجة', data: { error: 'unavailable' }, sourceModule: 'remediation', sortOrder: 6 };
  }
}

async function fetchBCPSummary(tenantId: string): Promise<BoardPackSection> {
  const schema = tenantSchema(tenantId);
  try {
    const stats = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_plans,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_plans,
         COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL AND last_tested_at > NOW() - INTERVAL '1 year')::int AS tested_this_year,
         COUNT(*) FILTER (WHERE last_tested_at IS NULL OR last_tested_at < NOW() - INTERVAL '1 year')::int AS needs_testing
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`,
    );
    return {
      sectionType: 'bcp_summary', titleEn: 'Business Continuity Status', titleAr: 'حالة استمرارية الأعمال',
      data: getFirstRow(stats) ?? {}, sourceModule: 'bcp', sortOrder: 7,
    };
  } catch {
    return { sectionType: 'bcp_summary', titleEn: 'Business Continuity Status', titleAr: 'حالة استمرارية الأعمال', data: { error: 'unavailable' }, sourceModule: 'bcp', sortOrder: 7 };
  }
}

export async function autoAssembleBoardPack(
  tenantId: string,
  packType: 'quarterly' | 'monthly' | 'annual' = 'quarterly',
  createdBy?: string,
): Promise<{ packId: string; sections: BoardPackSection[] }> {
  const schema = tenantSchema(tenantId);
  const packId = uuid();

  const sections = await Promise.all([
    fetchRiskSummary(tenantId),
    fetchComplianceSummary(tenantId),
    fetchAuditSummary(tenantId),
    fetchVendorSummary(tenantId),
    fetchIncidentSummary(tenantId),
    fetchRemediationSummary(tenantId),
    fetchBCPSummary(tenantId),
  ]);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".board_packs
       (pack_id, tenant_id, title_en, title_ar, pack_type, period_start, period_end, narrative, created_by, auto_generated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [
        packId, tenantId,
        `GRC Board Pack — ${new Date().toISOString().slice(0, 7)}`,
        `حزمة مجلس الحوكمة والمخاطر — ${new Date().toISOString().slice(0, 7)}`,
        packType,
        new Date(Date.now() - 90 * 24 * 3600_000).toISOString(),
        new Date().toISOString(),
        'Auto-assembled by Shahin continuous compliance engine',
        createdBy ?? SYSTEM_JOB_ACTOR,
      ],
    );

    for (const section of sections) {
      const itemId = uuid();
      await safeQuery(
        `INSERT INTO "${schema}".board_pack_items
         (item_id, pack_id, item_type, title_en, title_ar, content, sort_order, source_entity_type, auto_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [itemId, packId, section.sectionType, section.titleEn, section.titleAr, JSON.stringify(section.data), section.sortOrder, section.sourceModule],
      );
    }
  } catch (err) {
    logger.error(`[BoardPackAssembly] pack creation failed: ${(err as Error).message}`);
  }

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'governance.board_pack_assembled' as any,

    tenantId, sourceService: 'board-pack-assembly', severity: 'info',
    entityType: 'board_pack', entityId: packId,
    payload: { packId, packType, sectionCount: sections.length },
  }));

  await swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: createdBy ?? SYSTEM_JOB_ACTOR, module: 'governance',
    action: 'auto_assemble', entityType: 'board_pack', entityId: packId,
  }));

  logger.info(`[BoardPackAssembly] auto-assembled pack ${packId} with ${sections.length} sections for tenant ${tenantId}`);
  return { packId, sections };
}

export async function exportBoardPackToExcel(tenantId: string, packId: string): Promise<Buffer> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
