import { query, safeQuery } from '../ports/database.port';
import { EngineRunContext, EngineWorkerResult } from '../agrc-engine.types';
import { canRunDedupAction } from '../helpers/dedup.helper';
import { createNotification } from '../helpers/notification.helper';
import { isFeatureEnabled } from '../helpers/feature-flag.helper';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';

export class ControlMonitorWorker {
  async run(ctx: EngineRunContext): Promise<EngineWorkerResult> {
    if (!(await isFeatureEnabled(ctx.schema, 'agrc_control_monitor_enabled'))) {
      return {};
    }

    const stale = await safeQuery(
      `
      SELECT
        c.control_id,
        c.title,
        c.owner,
        c.workspace_id,
        MAX(e.expiry_date) AS latest_expiry
      FROM "${ctx.schema}".controls c
      LEFT JOIN "${ctx.schema}".evidence e
        ON e.control_id = c.control_id
      WHERE c.status = 'active'
      GROUP BY c.control_id, c.title, c.owner, c.workspace_id
      HAVING MAX(e.expiry_date) IS NULL OR MAX(e.expiry_date) < CURRENT_DATE
      `
    );

    let tasksCreated = 0;
    let notificationsCreated = 0;

    for (const row of stale.rows) {
      const dedupKey = `stale-evidence:${row.control_id}`;
      const canCreate = await canRunDedupAction(
        ctx.schema, dedupKey, 'control', row.control_id, 'create_evidence_task', 24
      );
      if (!canCreate) continue;

      const autoTask = await isFeatureEnabled(ctx.schema, 'agrc_auto_task_creation_enabled');
      const autoNotify = await isFeatureEnabled(ctx.schema, 'agrc_auto_notification_enabled');

      if (autoTask) {
        await swallowNull(EC.FALLBACK_QUERY, query(
          `
          INSERT INTO "${ctx.schema}".evidence_tasks
          (task_id, tenant_id, workspace_id, control_id, evidence_requirement_id, due_at, status, assigned_role, cadence)
          VALUES (gen_random_uuid(), $1::text, $2::uuid, $3::text, NULL, now() + interval '7 days', 'open', 'control_owner', 'ad-hoc')
          `,
          [ctx.tenantId, row.workspace_id ?? null, row.control_id]
        ), { operation: 'insert evidence_tasks' });
        tasksCreated++;
      }

      await swallowNull(EC.FALLBACK_QUERY, query(
        `
        INSERT INTO "${ctx.schema}".agrc_event_log
        (event_id, event_type, source_service, entity_type, entity_id, severity, payload)
        VALUES (gen_random_uuid(), 'control_evidence_stale', 'agrc-engine', 'control', $1::text, 'high', $2::jsonb)
        `,
        [row.control_id, JSON.stringify({ title: row.title, latestExpiry: row.latest_expiry, runId: ctx.runId })]
      ), { operation: 'insert agrc_event_log' });

      if (autoNotify && row.owner) {
        await createNotification(
          ctx.schema, String(row.owner), 'control_evidence_stale',
          'Evidence expired or missing',
          `Control "${row.title}" needs fresh evidence.`,
          `/controls/${row.control_id}`
        );
        notificationsCreated++;
      }
    }

    await swallowNull(EC.FALLBACK_QUERY, query(
      `
      INSERT INTO "${ctx.schema}".ccm_cycle_log
      (cycle_id, controls_evaluated, stale_controls, escalations_triggered, risk_recalculated, cycle_ms)
      VALUES ($1::uuid, $2::int, $3::int, 0, 0, 0)
      `,
      [ctx.runId, stale.rows.length, stale.rows.length]
    ), { operation: 'insert ccm_cycle_log' });

    return {
      controlsEvaluated: stale.rows.length,
      staleControls: stale.rows.length,
      tasksCreated,
      notificationsCreated,
    };
  }
}
