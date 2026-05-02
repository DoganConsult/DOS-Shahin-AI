import { query, safeQuery } from './ports/database.port.js';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export class AgrcEngineRepo {
    async openRun(ctx) {
        await safeQuery(`
      INSERT INTO "${ctx.schema}".agrc_engine_runs
      (run_id, engine_name, started_at, status, trigger_mode, triggered_by)
      VALUES ($1::uuid, 'agrc-os-v1', now(), 'running', $2::text, $3::text)
      `, [ctx.runId, ctx.triggerMode, ctx.triggeredBy ?? null]);
    }
    async completeRun(ctx, summary, cycleMs) {
        await safeQuery(`
      UPDATE "${ctx.schema}".agrc_engine_runs
      SET
        completed_at = now(),
        status = 'completed',
        controls_evaluated = $2,
        stale_controls = $3,
        overdue_remediations = $4,
        kri_breaches = $5,
        policy_reviews_started = $6,
        tasks_created = $7,
        notifications_created = $8,
        escalations_triggered = $9
      WHERE run_id = $1::uuid
      `, [
            ctx.runId,
            summary.controlsEvaluated,
            summary.staleControls,
            summary.overdueRemediations,
            summary.kriBreaches,
            summary.policyReviewsStarted,
            summary.tasksCreated,
            summary.notificationsCreated,
            summary.escalationsTriggered,
        ]);
        await swallowNull(EC.FALLBACK_QUERY, query(`
      INSERT INTO "${ctx.schema}".agrc_os_cycle_log
      (cycle_id, telemetry_ingested, controls_evaluated, risks_recomputed, policy_decisions, enforcement_actions, cycle_ms)
      VALUES ($1::uuid, 0, $2::int, $3::int, $4::int, $5::int, $6::int)
      `, [
            ctx.runId,
            summary.controlsEvaluated,
            summary.kriBreaches,
            summary.policyReviewsStarted,
            summary.escalationsTriggered,
            cycleMs,
        ]), { operation: 'insert agrc_os_cycle_log' });
    }
    async failRun(ctx, message) {
        await swallowNull(EC.FALLBACK_QUERY, query(`
      UPDATE "${ctx.schema}".agrc_engine_runs
      SET completed_at = now(), status = 'failed', error_message = $2::text
      WHERE run_id = $1::uuid
      `, [ctx.runId, message]), { operation: 'update agrc_engine_runs' });
    }
}
//# sourceMappingURL=agrc-engine.repo.js.map