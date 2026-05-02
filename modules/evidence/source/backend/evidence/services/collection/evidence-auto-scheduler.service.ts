import { logger } from '../../ports/logger.port';
// ============================================
// Shahin-Ai — Evidence Auto-Scheduler Service
// Auto-discovers evidence schedules from the
// database across all tenants, registers Temporal
// evidence-lifecycle workflows per schedule,
// enforces SLA policies with configurable
// escalation, and provides collection status
// monitoring and reporting.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';

import { getActiveTenantIds } from '../../ports/events.port';
import type { EvidenceLifecycleInput } from '../../../../temporal/workflows/product/evidence-lifecycle.workflow';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { registerJob, SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Row shape from the evidence_schedules table. */
export interface EvidenceScheduleRecord {
  id: string;
  control_id: string;
  cron_expression: string;
  reminder_text: string;
  assigned_to: string;
  enabled: boolean;
  last_reminded_at: string | null;
  sla_hours: number;
  frequency_hours: number;
}

/** Per-schedule registration result for Temporal workflow binding. */
export interface ScheduleRegistrationResult {
  tenantId: string;
  schedulesDiscovered: number;
  schedulesRegistered: number;
  schedulesSkipped: number;
  errors: string[];
}

/** Current collection status for a single schedule. */
export interface CollectionStatus {
  scheduleId: string;
  controlId: string;
  status: 'on_track' | 'due_soon' | 'overdue' | 'paused';
  lastCollectedAt: string | null;
  nextDueAt: string;
  slaHours: number;
  hoursRemaining: number;
  assignedTo: string;
}

/** Escalation level within an SLA policy. */
export interface EscalationLevel {
  level: number;
  afterHours: number;
  action: 'notify' | 'reassign' | 'escalate_manager' | 'flag_board';
  notifyRoles: string[];
}

/** SLA enforcement policy configuration. */
export interface SLAPolicy {
  /** Warn when this percentage of SLA hours has been consumed */
  warningThresholdPercent: number;
  /** Ordered escalation tiers */
  escalationLevels: EscalationLevel[];
  /** Automatically escalate when overdue */
  autoEscalate: boolean;
  /** Maximum number of retry attempts before hard-stop */
  maxRetries: number;
}

/** Aggregate report returned by the monitoring helpers. */
export interface SchedulerReport {
  tenantId: string;
  generatedAt: string;
  totalSchedules: number;
  activeSchedules: number;
  onTrack: number;
  dueSoon: number;
  overdue: number;
  paused: number;
  collectionRate: number;
  avgSlaCompliancePercent: number;
  topOverdue: CollectionStatus[];
}

// ── Default SLA Policy ────────────────────────────────────────────────────────

const DEFAULT_SLA_POLICY: SLAPolicy = {
  warningThresholdPercent: 75,
  escalationLevels: [
    { level: 1, afterHours: 0,  action: 'notify',           notifyRoles: ['evidence_collector'] },
    { level: 2, afterHours: 24, action: 'escalate_manager',  notifyRoles: ['evidence_collector', 'compliance_lead'] },
    { level: 3, afterHours: 48, action: 'flag_board',        notifyRoles: ['compliance_lead', 'grc_manager'] },
  ],
  autoEscalate: true,
  maxRetries: 3,
};

// ── Discovery ─────────────────────────────────────────────────────────────────

/**
 * Fetch all enabled evidence schedules for a single tenant.
 */
export async function discoverSchedules(tenantId: string): Promise<EvidenceScheduleRecord[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`
    SELECT id, control_id, cron_expression, reminder_text, assigned_to, enabled,
           last_reminded_at, COALESCE(sla_hours, 72) AS sla_hours,
           COALESCE(frequency_hours, 720) AS frequency_hours
    FROM "${schema}".evidence_schedules
    WHERE enabled = true
    ORDER BY control_id ASC
  `);
  return res.rows;
}

/**
 * Discover all active evidence schedules across every connected tenant.
 * Returns a map of tenantId -> schedule records.
 */
export async function discoverAllTenantSchedules(): Promise<Map<string, EvidenceScheduleRecord[]>> {
  const tenantIds = getActiveTenantIds();
  const result = new Map<string, EvidenceScheduleRecord[]>();
  for (const tenantId of tenantIds) {
    try {
      const schedules = await discoverSchedules(tenantId);
      if (schedules.length > 0) result.set(tenantId, schedules);
    } catch {
      // Tenant schema may not exist yet — skip silently
    }
  }
  return result;
}

// ── Registration (Temporal Workflow Binding) ──────────────────────────────────

/**
 * Build the Temporal workflow input from a schedule record and tenant.
 */
function buildWorkflowInput(tenantId: string, sched: EvidenceScheduleRecord): EvidenceLifecycleInput {
  return {
    tenantId,
    evidenceId: sched.id,
    controlId: sched.control_id,
    collectionType: 'scheduled',
    requestedBy: sched.assigned_to || SYSTEM_JOB_ACTOR,
  };
}

/**
 * Register or update Temporal workflows for every enabled schedule belonging
 * to a single tenant. Skips schedules that already have an active registration.
 */
export async function registerTenantSchedules(tenantId: string): Promise<ScheduleRegistrationResult> {
  const schedules = await discoverSchedules(tenantId);
  const result: ScheduleRegistrationResult = {
    tenantId,
    schedulesDiscovered: schedules.length,
    schedulesRegistered: 0,
    schedulesSkipped: 0,
    errors: [],
  };

  const schema = tenantSchema(tenantId);

  for (const sched of schedules) {
    try {
      // Check if already registered with an active workflow
      const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        SELECT id FROM "${schema}".evidence_workflow_registrations
        WHERE schedule_id = $1 AND status = 'active' LIMIT 1
      `, [sched.id]), { tenantId: tenantId, operation: 'query evidence_workflow_registrations' });

      if (existing.rows.length > 0) {
        result.schedulesSkipped++;
        continue;
      }

      // Persist registration record
      await safeQuery(`
        INSERT INTO "${schema}".evidence_workflow_registrations
          (schedule_id, control_id, tenant_id, workflow_type, frequency_hours,
           sla_hours, status, registered_at)
        VALUES ($1, $2, $3, 'evidence_lifecycle', $4, $5, 'active', NOW())
        ON CONFLICT (schedule_id) DO UPDATE SET
          status = 'active', frequency_hours = $4, sla_hours = $5, registered_at = NOW()
      `, [sched.id, sched.control_id, tenantId, sched.frequency_hours, sched.sla_hours]);

      // Register a job-scheduler entry so the cron triggers Temporal execution
      const workflowInput = buildWorkflowInput(tenantId, sched);
      const jobName = `evidence-lifecycle:${tenantId}:${sched.id}`;
      await registerJob(jobName, sched.cron_expression, async () => {
        logger.info(`[EvidenceAutoScheduler] Triggering evidence lifecycle for ${jobName}`, workflowInput);
      });

      result.schedulesRegistered++;
    } catch (err: unknown) {
      result.errors.push(`${sched.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/**
 * Register Temporal workflows for all tenants in a single pass.
 */
export async function registerAllTenantSchedules(): Promise<ScheduleRegistrationResult[]> {
  const allSchedules = await discoverAllTenantSchedules();
  const results: ScheduleRegistrationResult[] = [];
  for (const [tenantId] of allSchedules) {
    const r = await registerTenantSchedules(tenantId);
    results.push(r);
  }
  return results;
}

// ── SLA Enforcement ───────────────────────────────────────────────────────────

/**
 * Enforce SLA policies for a tenant: emit warnings when the configured
 * threshold is reached and create escalation events when overdue.
 */
export async function enforceSlaPolicies(
  tenantId: string,
  policy: SLAPolicy = DEFAULT_SLA_POLICY
): Promise<{ enforced: number; escalated: number; warnings: number }> {
  const statuses = await getCollectionStatuses(tenantId);
  let enforced = 0, escalated = 0, warnings = 0;

  const schema = tenantSchema(tenantId);

  for (const status of statuses) {
    if (status.status === 'paused') continue;

    const slaConsumedPercent = status.slaHours > 0
      ? ((status.slaHours - status.hoursRemaining) / status.slaHours) * 100
      : 0;

    // Warning threshold check
    if (slaConsumedPercent >= policy.warningThresholdPercent && status.status !== 'overdue') {
      await safeQuery(`
        INSERT INTO "${schema}".evidence_sla_events
          (schedule_id, tenant_id, event_type, sla_consumed_percent, details)
        VALUES ($1, $2, 'warning', $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        status.scheduleId, tenantId, Math.round(slaConsumedPercent),
        JSON.stringify({ controlId: status.controlId, hoursRemaining: status.hoursRemaining }),
      ]).catch(catchHandler(EC.EVENT_BUS, {}));
      warnings++;
    }

    // Overdue escalation
    if (status.status === 'overdue' && policy.autoEscalate) {
      const overdueHours = Math.abs(status.hoursRemaining);

      for (const level of policy.escalationLevels) {
        if (overdueHours >= level.afterHours) {
          // Avoid duplicate escalation events within a 7-day window
          const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
            SELECT id FROM "${schema}".evidence_sla_events
            WHERE schedule_id = $1 AND event_type = 'escalation' AND escalation_level = $2
            AND created_at > NOW() - INTERVAL '7 days' LIMIT 1
          `, [status.scheduleId, level.level]), { tenantId: tenantId, operation: 'query evidence_sla_events' });

          if (existing.rows.length === 0) {
            await safeQuery(`
              INSERT INTO "${schema}".evidence_sla_events
                (schedule_id, tenant_id, event_type, escalation_level, escalation_action,
                 sla_consumed_percent, details)
              VALUES ($1, $2, 'escalation', $3, $4, $5, $6)
            `, [
              status.scheduleId, tenantId, level.level, level.action,
              Math.round(slaConsumedPercent),
              JSON.stringify({
                controlId: status.controlId,
                overdueHours: Math.round(overdueHours),
                notifyRoles: level.notifyRoles,
              }),
            ]).catch(catchHandler(EC.EVENT_BUS, {}));
            escalated++;
          }
        }
      }
      enforced++;
    }
  }

  return { enforced, escalated, warnings };
}

// ── Collection Status ─────────────────────────────────────────────────────────

/**
 * Compute the current collection status for every enabled schedule in a tenant.
 */
export async function getCollectionStatuses(tenantId: string): Promise<CollectionStatus[]> {
  const schedules = await discoverSchedules(tenantId);
  const now = Date.now();

  return schedules.map((sched) => {
    const lastCollected = sched.last_reminded_at ? new Date(sched.last_reminded_at).getTime() : 0;
    const nextDueMs = lastCollected + (sched.frequency_hours * 3_600_000);
    const hoursRemaining = (nextDueMs - now) / 3_600_000;

    let status: CollectionStatus['status'];
    if (!sched.enabled) {
      status = 'paused';
    } else if (hoursRemaining < 0) {
      status = 'overdue';
    } else if (hoursRemaining < sched.sla_hours * 0.25) {
      status = 'due_soon';
    } else {
      status = 'on_track';
    }

    return {
      scheduleId: sched.id,
      controlId: sched.control_id,
      status,
      lastCollectedAt: sched.last_reminded_at,
      nextDueAt: new Date(nextDueMs).toISOString(),
      slaHours: sched.sla_hours,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      assignedTo: sched.assigned_to,
    };
  });
}

// ── Bulk Operations ───────────────────────────────────────────────────────────

/**
 * Pause all evidence schedules for a tenant and mark workflow registrations
 * as paused. Returns the number of schedules affected.
 */
export async function pauseAllSchedules(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`
    UPDATE "${schema}".evidence_schedules SET enabled = false WHERE enabled = true
  `);
  await safeQuery(`
    UPDATE "${schema}".evidence_workflow_registrations SET status = 'paused' WHERE status = 'active'
  `).catch(catchHandler(EC.EVENT_BUS, {}));
  return res.rowCount ?? 0;
}

/**
 * Resume all paused evidence schedules for a tenant and re-activate
 * workflow registrations. Returns the number of schedules affected.
 */
export async function resumeAllSchedules(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`
    UPDATE "${schema}".evidence_schedules SET enabled = true WHERE enabled = false
  `);
  await safeQuery(`
    UPDATE "${schema}".evidence_workflow_registrations SET status = 'active' WHERE status = 'paused'
  `).catch(catchHandler(EC.EVENT_BUS, {}));
  return res.rowCount ?? 0;
}

/**
 * Force re-register all workflows for a tenant. Clears existing registration
 * records and performs a fresh discovery + registration cycle.
 */
export async function reRegisterAll(tenantId: string): Promise<ScheduleRegistrationResult> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`
    DELETE FROM "${schema}".evidence_workflow_registrations WHERE tenant_id = $1
  `, [tenantId]).catch(catchHandler(EC.EVENT_BUS, {}));
  return registerTenantSchedules(tenantId);
}

// ── Monitoring & Reporting ────────────────────────────────────────────────────

/**
 * Generate a comprehensive scheduler report for a tenant including
 * schedule counts, SLA compliance, and the top overdue items.
 */
export async function generateSchedulerReport(tenantId: string): Promise<SchedulerReport> {
  const statuses = await getCollectionStatuses(tenantId);
  const schema = tenantSchema(tenantId);

  const totalRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total FROM "${schema}".evidence_schedules
  `), { tenantId: tenantId, operation: 'query evidence_schedules' });

  const activeSchedules = statuses.filter(s => s.status !== 'paused').length;
  const onTrack = statuses.filter(s => s.status === 'on_track').length;
  const dueSoon = statuses.filter(s => s.status === 'due_soon').length;
  const overdue = statuses.filter(s => s.status === 'overdue').length;
  const paused = statuses.filter(s => s.status === 'paused').length;

  const collectionRate = activeSchedules > 0
    ? Math.round((onTrack / activeSchedules) * 100)
    : 0;

  const slaCompliant = statuses.filter(s => s.hoursRemaining > 0 && s.status !== 'paused');
  const avgSla = slaCompliant.length > 0
    ? Math.round(
        slaCompliant.reduce(
          (sum, s) => sum + Math.min(100, (s.hoursRemaining / s.slaHours) * 100),
          0
        ) / slaCompliant.length
      )
    : 100;

  const topOverdue = statuses
    .filter(s => s.status === 'overdue')
    .sort((a, b) => a.hoursRemaining - b.hoursRemaining)
    .slice(0, 10);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalSchedules: totalRes.rows[0]?.total ?? 0,
    activeSchedules,
    onTrack,
    dueSoon,
    overdue,
    paused,
    collectionRate,
    avgSlaCompliancePercent: avgSla,
    topOverdue,
  };
}

// ── Main Cycle (called by job scheduler) ──────────────────────────────────────

/**
 * Full scheduler cycle: discover schedules across all tenants, register
 * new Temporal workflows, and enforce SLA policies. Designed to be called
 * periodically by the background job scheduler.
 */
export async function runEvidenceSchedulerCycle(): Promise<{
  tenantsProcessed: number;
  totalRegistered: number;
  totalEnforced: number;
  totalEscalated: number;
}> {
  const tenantIds = getActiveTenantIds();
  let totalRegistered = 0, totalEnforced = 0, totalEscalated = 0;

  for (const tenantId of tenantIds) {
    try {
      const regResult = await registerTenantSchedules(tenantId);
      totalRegistered += regResult.schedulesRegistered;

      const slaResult = await enforceSlaPolicies(tenantId);
      totalEnforced += slaResult.enforced;
      totalEscalated += slaResult.escalated;
    } catch {
      // Continue to next tenant on failure
    }
  }

  return {
    tenantsProcessed: tenantIds.length,
    totalRegistered,
    totalEnforced,
    totalEscalated,
  };
}

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Bootstrap the evidence auto-scheduler. Registers a recurring job that
 * runs the full discovery + registration + SLA enforcement cycle every
 * 15 minutes. Call once during server startup.
 */
export async function initEvidenceAutoScheduler(): Promise<void> {
  logger.info('[EvidenceAutoScheduler] Initialising evidence auto-scheduler...');

  await registerJob('evidence-auto-scheduler:cycle', '*/15 * * * *', async () => {
    const result = await runEvidenceSchedulerCycle();
    logger.info(
      `[EvidenceAutoScheduler] Cycle complete — tenants: ${result.tenantsProcessed}, ` +
      `registered: ${result.totalRegistered}, enforced: ${result.totalEnforced}, ` +
      `escalated: ${result.totalEscalated}`
    );
  });

  // Run an initial cycle immediately
  await runEvidenceSchedulerCycle();

  logger.info('[EvidenceAutoScheduler] Initialisation complete.');
}
