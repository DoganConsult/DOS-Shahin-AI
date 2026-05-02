import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { FRAMEWORK_REGISTRY } from './jurisdiction-registry.service';
import { runKsaDiagnostics } from './ksa-diagnostics.service';
import { syncOverdueObligations } from './ksa-obligation.service';

export interface KsaModuleHealthReport {
  status: 'healthy' | 'degraded' | 'critical';
  tenantId: string;
  frameworksEnabled: number;
  totalObligations: number;
  overdueObligations: number;
  controlsWithEvidence: number;
  totalControls: number;
  readinessSnapshotAge: number | null;
  lastRunAt: string;
}

export interface KsaAdminConfig {
  changeTrackingEnabled: boolean;
  autoSyncOverdueEnabled: boolean;
  readinessSnapshotSchedule: string | null;
  notifyOnNewFrameworkUpdates: boolean;
  sectorCode: string | null;
}

export interface KsaAdminConfigUpdate {
  changeTrackingEnabled?: boolean;
  autoSyncOverdueEnabled?: boolean;
  readinessSnapshotSchedule?: string | null;
  notifyOnNewFrameworkUpdates?: boolean;
  sectorCode?: string | null;
}

export interface KsaModuleStats {
  catalogSize: number;
  ksaFrameworkCount: number;
  enabledFrameworkCount: number;
  totalControls: number;
  implementedControls: number;
  totalObligations: number;
  openObligations: number;
  overdueObligations: number;
  totalMappings: number;
  readinessSnapshotCount: number;
  lastUpdatedAt: string;
}

export interface KsaRunbookEntry {
  id: string;
  title: string;
  description: string;
  steps: string[];
  category: 'setup' | 'maintenance' | 'incident' | 'recovery';
}

const KSA_RUNBOOK: KsaRunbookEntry[] = [
  {
    id: 'rb-001',
    title: 'Enable a KSA Regulatory Framework',
    description: 'Steps to activate a new KSA framework for compliance tracking',
    steps: [
      'Navigate to KSA Regulatory → Catalog',
      'Find the target framework (e.g., NCA-ECC, SAMA-CSF, PDPL)',
      'Click "Enable Framework" and confirm',
      'Import or create controls for the framework',
      'Assign control owners and set implementation status',
      'Run diagnostics to verify coverage',
    ],
    category: 'setup',
  },
  {
    id: 'rb-002',
    title: 'Resolve Overdue Obligations',
    description: 'Process for handling obligations past their due date',
    steps: [
      'Run KSA Diagnostics → Obligation checks to identify overdue items',
      'Notify obligation owners via the notification system',
      'Review and update compliance plans with new target dates',
      'Escalate critical obligations through the workflow engine',
      'After remediation, update obligation status to in_progress or compliant',
      'Re-run diagnostics to confirm resolution',
    ],
    category: 'incident',
  },
  {
    id: 'rb-003',
    title: 'Handle Missing Evidence for Controls',
    description: 'Process to address controls without accepted evidence',
    steps: [
      'Run KSA Diagnostics → Evidence checks to identify gaps',
      'Export the list of controls without evidence',
      'Assign evidence collection tasks to control owners',
      'Submit evidence through the Evidence module',
      'Review and accept submitted evidence',
      'Re-run evidence diagnostics to confirm coverage',
    ],
    category: 'maintenance',
  },
  {
    id: 'rb-004',
    title: 'Regulatory Change Response',
    description: 'Steps for responding to a new regulatory change',
    steps: [
      'Review change in KSA Regulatory → Change Tracking',
      'Assess impact on active frameworks and controls',
      'Create remediation tasks for affected controls',
      'Update obligation status for impacted obligations',
      'Document response in the audit trail',
      'Run readiness snapshot after remediation',
    ],
    category: 'incident',
  },
  {
    id: 'rb-005',
    title: 'Restore KSA Module Health',
    description: 'Recovery steps when module health is degraded or critical',
    steps: [
      'Run full diagnostics: Admin → Run Diagnostics',
      'Review all failing checks and prioritize by severity',
      'Resolve data integrity issues first (orphan records)',
      'Fix evidence gaps for critical controls',
      'Resolve overdue obligations via escalation workflow',
      'Re-enable disabled frameworks if needed',
      'Save readiness snapshot after recovery',
      'Confirm health status returns to healthy',
    ],
    category: 'recovery',
  },
];

export async function getKsaModuleHealth(tenantId: string): Promise<KsaModuleHealthReport> {
  const schema = tenantSchema(tenantId);
  const lastRunAt = new Date().toISOString();

  try {
    const [fwRes, obRes, ctrlRes, snapRes] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT COUNT(DISTINCT framework_code)::int AS count FROM "${schema}".frameworks WHERE status IN ('active','enabled') OR status IS NULL`,
        []
      ), { tenantId, operation: 'health fw count' }),

      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
         FROM "${schema}".obligations WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
        []
      ), { tenantId, operation: 'health obligation count' }),

      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT
           COUNT(DISTINCT c.control_id)::int AS total,
           COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NOT NULL)::int AS with_evidence
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".evidence_evidences e
           ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
           AND e.status IN ('accepted','submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
         WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())`,
        []
      ), { tenantId, operation: 'health control count' }),

      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT MAX(snapshot_at) AS last_snap FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`,
        [tenantId]
      ), { tenantId, operation: 'health snapshot age' }),
    ]);

    const frameworksEnabled = Number(fwRes.rows[0]?.count ?? 0);
    const totalObligations = Number(obRes.rows[0]?.total ?? 0);
    const overdueObligations = Number(obRes.rows[0]?.overdue ?? 0);
    const totalControls = Number(ctrlRes.rows[0]?.total ?? 0);
    const controlsWithEvidence = Number(ctrlRes.rows[0]?.with_evidence ?? 0);
    const lastSnap = snapRes.rows[0]?.last_snap;
    const readinessSnapshotAge = lastSnap
      ? Math.floor((Date.now() - new Date((lastSnap as any)).getTime()) / 86400000)
      : null;

    let status: KsaModuleHealthReport['status'] = 'healthy';
    if (overdueObligations > 5 || frameworksEnabled === 0) {
      status = 'critical';
    } else if (overdueObligations > 0 || (readinessSnapshotAge !== null && readinessSnapshotAge > 30)) {
      status = 'degraded';
    }

    return {
      status,
      tenantId,
      frameworksEnabled,
      totalObligations,
      overdueObligations,
      controlsWithEvidence,
      totalControls,
      readinessSnapshotAge,
      lastRunAt,
    };
  } catch (err) {
    logger.error('[KsaAdmin] getKsaModuleHealth failed', { tenantId, error: toErrorMessage(err) });
    return {
      status: 'critical',
      tenantId,
      frameworksEnabled: 0,
      totalObligations: 0,
      overdueObligations: 0,
      controlsWithEvidence: 0,
      totalControls: 0,
      readinessSnapshotAge: null,
      lastRunAt,
    };
  }
}

export async function getKsaAdminConfig(tenantId: string): Promise<KsaAdminConfig> {
  const schema = tenantSchema(tenantId);

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT key, value FROM "${schema}".tenant_preferences WHERE key LIKE 'ksa_regulatory.%'`,
    []
  ), { tenantId, operation: 'get ksa admin config' });

  const prefs: Record<string, string> = {};
  for (const row of res.rows as GenericRow[]) {
    prefs[String(row.key)] = String(row.value ?? '');
  }

  return {
    changeTrackingEnabled: prefs['ksa_regulatory.change_tracking_enabled'] !== 'false',
    autoSyncOverdueEnabled: prefs['ksa_regulatory.auto_sync_overdue'] === 'true',
    readinessSnapshotSchedule: prefs['ksa_regulatory.readiness_snapshot_schedule'] ?? null,
    notifyOnNewFrameworkUpdates: prefs['ksa_regulatory.notify_framework_updates'] !== 'false',
    sectorCode: prefs['ksa_regulatory.sector_code'] ?? null,
  };
}

export async function updateKsaAdminConfig(
  tenantId: string,
  updates: KsaAdminConfigUpdate
): Promise<KsaAdminConfig> {
  const schema = tenantSchema(tenantId);

  const mappings: Array<[string, unknown]> = [];
  if (updates.changeTrackingEnabled !== undefined) {
    mappings.push(['ksa_regulatory.change_tracking_enabled', String(updates.changeTrackingEnabled)]);
  }
  if (updates.autoSyncOverdueEnabled !== undefined) {
    mappings.push(['ksa_regulatory.auto_sync_overdue', String(updates.autoSyncOverdueEnabled)]);
  }
  if (updates.readinessSnapshotSchedule !== undefined) {
    mappings.push(['ksa_regulatory.readiness_snapshot_schedule', updates.readinessSnapshotSchedule ?? '']);
  }
  if (updates.notifyOnNewFrameworkUpdates !== undefined) {
    mappings.push(['ksa_regulatory.notify_framework_updates', String(updates.notifyOnNewFrameworkUpdates)]);
  }
  if (updates.sectorCode !== undefined) {
    mappings.push(['ksa_regulatory.sector_code', updates.sectorCode ?? '']);
  }

  for (const [key, value] of mappings) {
    await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  logger.info('[KsaAdmin] config updated', { tenantId, keys: mappings.map(m => m[0]) });
  return getKsaAdminConfig(tenantId);
}

export async function getKsaModuleStats(tenantId: string): Promise<KsaModuleStats> {
  const schema = tenantSchema(tenantId);

  const [ctrlRes, obRes, mappingRes, snapRes, fwRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented','effective'))::int AS implemented
       FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
      []
    ), { tenantId, operation: 'stats controls' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
       FROM "${schema}".obligations WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
      []
    ), { tenantId, operation: 'stats obligations' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".control_mappings WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
      []
    ), { tenantId, operation: 'stats mappings' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`,
      [tenantId]
    ), { tenantId, operation: 'stats snapshots' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT COUNT(DISTINCT framework_code)::int AS enabled FROM "${schema}".frameworks WHERE status IN ('active','enabled') OR status IS NULL`,
      []
    ), { tenantId, operation: 'stats enabled fw' }),
  ]);

  return {
    catalogSize: FRAMEWORK_REGISTRY.length,
    ksaFrameworkCount: FRAMEWORK_REGISTRY.filter(f => f.jurisdiction === 'KSA').length,
    enabledFrameworkCount: Number(fwRes.rows[0]?.enabled ?? 0),
    totalControls: Number(ctrlRes.rows[0]?.total ?? 0),
    implementedControls: Number(ctrlRes.rows[0]?.implemented ?? 0),
    totalObligations: Number(obRes.rows[0]?.total ?? 0),
    openObligations: Number(obRes.rows[0]?.open_count ?? 0),
    overdueObligations: Number(obRes.rows[0]?.overdue ?? 0),
    totalMappings: Number(mappingRes.rows[0]?.total ?? 0),
    readinessSnapshotCount: Number(snapRes.rows[0]?.count ?? 0),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function runKsaAdminDiagnostics(tenantId: string) {
  return runKsaDiagnostics(tenantId);
}

export async function runKsaAdminSyncOverdue(tenantId: string): Promise<{ synced: number }> {
  const count = await syncOverdueObligations(tenantId);
  logger.info('[KsaAdmin] synced overdue obligations', { tenantId, count });
  return { synced: count };
}

export function getKsaRunbook(): KsaRunbookEntry[] {
  return KSA_RUNBOOK;
}

export function getKsaRunbookEntry(id: string): KsaRunbookEntry | null {
  return KSA_RUNBOOK.find(e => e.id === id) ?? null;
}
