import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { FRAMEWORK_REGISTRY } from './jurisdiction-registry.service';

export type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface DiagnosticCheck {
  checkId: string;
  name: string;
  category: 'mapping' | 'evidence' | 'readiness' | 'obligation' | 'catalog' | 'data_integrity';
  status: DiagnosticStatus;
  message: string;
  detail: string | null;
  value: number | null;
  threshold: number | null;
  runAt: string;
}

export interface KsaDiagnosticsReport {
  tenantId: string;
  overallStatus: DiagnosticStatus;
  checks: DiagnosticCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
  generatedAt: string;
}

function check(
  checkId: string,
  name: string,
  category: DiagnosticCheck['category'],
  status: DiagnosticStatus,
  message: string,
  detail: string | null = null,
  value: number | null = null,
  threshold: number | null = null
): DiagnosticCheck {
  return { checkId, name, category, status, message, detail, value, threshold, runAt: new Date().toISOString() };
}

async function checkMappingDiagnostics(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const mappingRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COUNT(*)::int AS total_mappings,
       COUNT(*) FILTER (WHERE mapping_strength = 'exact')::int AS exact_count,
       COUNT(*) FILTER (WHERE mapping_strength IS NULL)::int AS unmapped_count
     FROM "${schema}".control_mappings
     WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
    []
  ), { tenantId, operation: 'mapping diagnostic' });

  const mr = mappingRes.rows[0] ?? {};
  const total = Number(mr.total_mappings ?? 0);
  const unmapped = Number(mr.unmapped_count ?? 0);

  if (total === 0) {
    results.push(check(
      'mapping-001', 'Cross-Framework Mapping Coverage', 'mapping',
      'warn', 'No cross-framework mappings found', 'Consider running mapping job or importing KSA framework maps'
    ));
  } else {
    const unmappedPct = Math.round((unmapped / total) * 100);
    results.push(check(
      'mapping-001', 'Cross-Framework Mapping Coverage', 'mapping',
      unmappedPct > 20 ? 'warn' : 'pass',
      `${total} mappings found, ${unmapped} without strength classification`,
      null, unmappedPct, 20
    ));
  }

  return results;
}

async function checkEvidenceDiagnostics(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const evidenceRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COUNT(DISTINCT c.control_id)::int AS total_controls,
       COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NOT NULL)::int AS controls_with_evidence,
       COUNT(DISTINCT c.control_id) FILTER (WHERE c.implementation_status IN ('implemented','effective') AND e.evidence_id IS NULL)::int AS implemented_without_evidence
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence_evidences e
       ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
       AND e.status IN ('accepted', 'submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
     WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())`,
    []
  ), { tenantId, operation: 'evidence diagnostic' });

  const er = evidenceRes.rows[0] ?? {};
  const total = Number(er.total_controls ?? 0);
  const withEvidence = Number(er.controls_with_evidence ?? 0);
  const implNoEvidence = Number(er.implemented_without_evidence ?? 0);

  if (total > 0) {
    const coveragePct = Math.round((withEvidence / total) * 100);
    results.push(check(
      'evidence-001', 'Evidence Coverage for Controls', 'evidence',
      coveragePct < 50 ? 'fail' : coveragePct < 75 ? 'warn' : 'pass',
      `${coveragePct}% of controls have accepted evidence`,
      null, coveragePct, 75
    ));

    if (implNoEvidence > 0) {
      results.push(check(
        'evidence-002', 'Implemented Controls Without Evidence', 'evidence',
        implNoEvidence > 10 ? 'fail' : 'warn',
        `${implNoEvidence} implemented controls lack accepted evidence`,
        'These controls claim implementation but have no supporting evidence'
      ));
    } else {
      results.push(check(
        'evidence-002', 'Implemented Controls Without Evidence', 'evidence',
        'pass', 'All implemented controls have evidence'
      ));
    }
  }

  return results;
}

async function checkReadinessDiagnostics(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const snapshotRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT MAX(snapshot_at) AS last_snapshot FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`,
    [tenantId]
  ), { tenantId, operation: 'readiness snapshot check' });

  const lastSnapshot = snapshotRes.rows[0]?.last_snapshot;
  if (!lastSnapshot) {
    results.push(check(
      'readiness-001', 'Readiness Snapshot Freshness', 'readiness',
      'warn', 'No readiness snapshot recorded',
      'Run a readiness assessment to capture baseline'
    ));
  } else {
    const daysSince = Math.floor((Date.now() - new Date((lastSnapshot as any)).getTime()) / 86400000);
    results.push(check(
      'readiness-001', 'Readiness Snapshot Freshness', 'readiness',
      daysSince > 30 ? 'warn' : 'pass',
      `Last readiness snapshot was ${daysSince} day(s) ago`,
      null, daysSince, 30
    ));
  }

  const frameworkRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(DISTINCT framework_code)::int AS fw_count FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
    []
  ), { tenantId, operation: 'framework count check' });

  const fwCount = Number(frameworkRes.rows[0]?.fw_count ?? 0);
  const ksaCount = FRAMEWORK_REGISTRY.filter(f => f.jurisdiction === 'KSA').length;
  results.push(check(
    'readiness-002', 'KSA Framework Coverage', 'readiness',
    fwCount === 0 ? 'fail' : fwCount < 2 ? 'warn' : 'pass',
    `${fwCount} framework(s) with controls (${ksaCount} KSA frameworks available in catalog)`,
    null, fwCount, 2
  ));

  return results;
}

async function checkObligationDiagnostics(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const obRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
       COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS unowned,
       COUNT(*) FILTER (WHERE due_date IS NULL AND status = 'open')::int AS no_deadline
     FROM "${schema}".obligations
     WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
    []
  ), { tenantId, operation: 'obligation diagnostic' });

  const or = obRes.rows[0] ?? {};
  const total = Number(or.total ?? 0);
  const overdue = Number(or.overdue ?? 0);
  const unowned = Number(or.unowned ?? 0);
  const noDeadline = Number(or.no_deadline ?? 0);

  if (overdue > 0) {
    results.push(check(
      'obligation-001', 'Overdue Obligations', 'obligation',
      overdue > 5 ? 'fail' : 'warn',
      `${overdue} obligation(s) are overdue`,
      'Escalate to obligation owners and update compliance plan',
      overdue, 0
    ));
  } else {
    results.push(check(
      'obligation-001', 'Overdue Obligations', 'obligation',
      'pass', 'No overdue obligations'
    ));
  }

  if (unowned > 0) {
    results.push(check(
      'obligation-002', 'Unowned Obligations', 'obligation',
      'warn', `${unowned} obligation(s) have no assigned owner`,
      null, unowned, 0
    ));
  }

  if (noDeadline > 0 && total > 0) {
    results.push(check(
      'obligation-003', 'Obligations Without Deadlines', 'obligation',
      'warn', `${noDeadline} open obligation(s) have no due date`,
      null, noDeadline, 0
    ));
  }

  return results;
}

async function checkCatalogDiagnostics(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const enabledRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(DISTINCT framework_code)::int AS enabled_count FROM "${schema}".frameworks WHERE status IN ('active', 'enabled') OR status IS NULL`,
    []
  ), { tenantId, operation: 'catalog diagnostic' });

  const enabledCount = Number(enabledRes.rows[0]?.enabled_count ?? 0);
  const ksaCount = FRAMEWORK_REGISTRY.filter(f => f.jurisdiction === 'KSA').length;

  results.push(check(
    'catalog-001', 'Enabled Framework Count', 'catalog',
    enabledCount === 0 ? 'fail' : 'pass',
    `${enabledCount} framework(s) enabled (${ksaCount} KSA frameworks available)`,
    null, enabledCount, 1
  ));

  return results;
}

async function checkDataIntegrity(schema: string, tenantId: string): Promise<DiagnosticCheck[]> {
  const results: DiagnosticCheck[] = [];

  const orphanRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(*)::int AS orphan_count
     FROM "${schema}".obligations o
     WHERE o.framework_code NOT IN (
       SELECT DISTINCT c.framework_code FROM "${schema}".controls c WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())
     ) AND (o.deleted_at IS NULL OR o.deleted_at > NOW())`,
    []
  ), { tenantId, operation: 'orphan obligation check' });

  const orphanCount = Number(orphanRes.rows[0]?.orphan_count ?? 0);
  results.push(check(
    'integrity-001', 'Obligation-Framework Consistency', 'data_integrity',
    orphanCount > 0 ? 'warn' : 'pass',
    orphanCount > 0
      ? `${orphanCount} obligation(s) reference frameworks with no controls`
      : 'All obligations reference frameworks with controls'
  ));

  return results;
}

export async function runKsaDiagnostics(tenantId: string): Promise<KsaDiagnosticsReport> {
  const schema = tenantSchema(tenantId);
  const generatedAt = new Date().toISOString();

  try {
    const [mappingChecks, evidenceChecks, readinessChecks, obligationChecks, catalogChecks, integrityChecks] =
      await Promise.all([
        checkMappingDiagnostics(schema, tenantId),
        checkEvidenceDiagnostics(schema, tenantId),
        checkReadinessDiagnostics(schema, tenantId),
        checkObligationDiagnostics(schema, tenantId),
        checkCatalogDiagnostics(schema, tenantId),
        checkDataIntegrity(schema, tenantId),
      ]);

    const checks = [
      ...mappingChecks,
      ...evidenceChecks,
      ...readinessChecks,
      ...obligationChecks,
      ...catalogChecks,
      ...integrityChecks,
    ];

    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    const overallStatus: DiagnosticStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass';

    logger.info('[KsaDiagnostics] diagnostics run complete', { tenantId, passCount, warnCount, failCount });

    return { tenantId, overallStatus, checks, passCount, warnCount, failCount, generatedAt };
  } catch (err) {
    logger.error('[KsaDiagnostics] runKsaDiagnostics failed', {
      tenantId, error: toErrorMessage(err),
    });
    return {
      tenantId,
      overallStatus: 'unknown',
      checks: [],
      passCount: 0,
      warnCount: 0,
      failCount: 0,
      generatedAt,
    };
  }
}

export async function runKsaDiagnosticCheck(
  tenantId: string,
  category: DiagnosticCheck['category']
): Promise<DiagnosticCheck[]> {
  const schema = tenantSchema(tenantId);

  switch (category) {
    case 'mapping': return checkMappingDiagnostics(schema, tenantId);
    case 'evidence': return checkEvidenceDiagnostics(schema, tenantId);
    case 'readiness': return checkReadinessDiagnostics(schema, tenantId);
    case 'obligation': return checkObligationDiagnostics(schema, tenantId);
    case 'catalog': return checkCatalogDiagnostics(schema, tenantId);
    case 'data_integrity': return checkDataIntegrity(schema, tenantId);
    default: return [];
  }
}
