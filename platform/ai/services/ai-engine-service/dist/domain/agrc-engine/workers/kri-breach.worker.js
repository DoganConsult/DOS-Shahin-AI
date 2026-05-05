import { query, safeQuery } from '../ports/database.port';
import { canRunDedupAction } from '../helpers/dedup.helper';
import { createNotification } from '../helpers/notification.helper';
import { isFeatureEnabled } from '../helpers/feature-flag.helper';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export class KriBreachWorker {
    async run(ctx) {
        if (!(await isFeatureEnabled(ctx.schema, 'agrc_kri_monitor_enabled'))) {
            return {};
        }
        const breached = await safeQuery(`
      SELECT
        k.kri_id, k.name, k.linked_risk_id, k.owner,
        k.current_value, k.threshold_red, k.threshold_amber, k.status
      FROM "${ctx.schema}".risk_kris k
      WHERE k.status IN ('amber', 'red')
      `);
        let tasksCreated = 0;
        let notificationsCreated = 0;
        let escalationsTriggered = 0;
        for (const row of breached.rows) {
            const dedupKey = `kri-breach:${row.kri_id}:${row.status}`;
            const canCreate = await canRunDedupAction(ctx.schema, dedupKey, 'kri', row.kri_id, 'kri_breach', 12);
            if (!canCreate)
                continue;
            await swallowNull(EC.FALLBACK_QUERY, query(`
        INSERT INTO "${ctx.schema}".kri_breach_log
        (breach_id, kri_id, breach_value, threshold_breached, threshold_value, status, breached_at, resolved_at)
        VALUES (gen_random_uuid(), $1::uuid, $2::numeric, $3::text, $4::numeric, 'open', now(), NULL)
        `, [
                row.kri_id,
                row.current_value,
                row.status,
                row.status === 'red' ? row.threshold_red : row.threshold_amber,
            ]), { operation: 'insert kri_breach_log' });
            if (await isFeatureEnabled(ctx.schema, 'agrc_auto_task_creation_enabled')) {
                await swallowNull(EC.FALLBACK_QUERY, query(`
          INSERT INTO "${ctx.schema}".action_items
          (item_id, title, source_type, source_id, assigned_to, deadline, reminder_schedule, status, priority, type)
          VALUES (
            gen_random_uuid(), $1::text, 'kri', $2::uuid, $3::text,
            now() + interval '3 days', '{}'::jsonb, 'open', $4::text, 'risk_review'
          )
          `, [
                    `Review KRI breach: ${row.name}`,
                    row.kri_id,
                    row.owner ?? null,
                    row.status === 'red' ? 'critical' : 'high',
                ]), { operation: 'fallback query' });
                tasksCreated++;
            }
            if (row.owner && (await isFeatureEnabled(ctx.schema, 'agrc_auto_notification_enabled'))) {
                await createNotification(ctx.schema, String(row.owner), 'kri_breach', 'KRI threshold breached', `KRI "${row.name}" is in ${row.status.toUpperCase()} state.`, `/risk/kris/${row.kri_id}`);
                notificationsCreated++;
            }
            escalationsTriggered += row.status === 'red' ? 1 : 0;
        }
        return {
            kriBreaches: breached.rows.length,
            tasksCreated,
            notificationsCreated,
            escalationsTriggered,
        };
    }
}
//# sourceMappingURL=kri-breach.worker.js.map