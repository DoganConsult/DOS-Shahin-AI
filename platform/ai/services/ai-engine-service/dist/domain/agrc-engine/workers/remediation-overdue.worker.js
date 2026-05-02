import { query, safeQuery } from '../ports/database.port.js';
import { canRunDedupAction } from '../helpers/dedup.helper.js';
import { createNotification } from '../helpers/notification.helper.js';
import { isFeatureEnabled } from '../helpers/feature-flag.helper.js';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export class RemediationOverdueWorker {
    async run(ctx) {
        if (!(await isFeatureEnabled(ctx.schema, 'agrc_remediation_monitor_enabled'))) {
            return {};
        }
        const overdue = await safeQuery(`
      SELECT task_id, title, assigned_to, linked_entity_type, linked_entity_id, due_date
      FROM "${ctx.schema}".remediation_tasks
      WHERE status IN ('open', 'in_progress')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
      `);
        let escalationsTriggered = 0;
        let notificationsCreated = 0;
        for (const row of overdue.rows) {
            const dedupKey = `remediation-overdue:${row.task_id}`;
            const canCreate = await canRunDedupAction(ctx.schema, dedupKey, 'remediation_task', row.task_id, 'overdue_escalation', 24);
            if (!canCreate)
                continue;
            await swallowNull(EC.FALLBACK_QUERY, query(`
        INSERT INTO "${ctx.schema}".activity_stream
        (activity_id, user_id, module, action, entity_type, entity_id, summary, changes)
        VALUES (gen_random_uuid(), NULL, 'remediation', 'overdue_escalation', 'remediation_task', $1::text, $2::text, $3::jsonb)
        `, [
                row.task_id,
                `Remediation task "${row.title}" is overdue`,
                JSON.stringify({ dueDate: row.due_date, runId: ctx.runId }),
            ]), { operation: 'insert activity_stream' });
            if (row.assigned_to) {
                await createNotification(ctx.schema, String(row.assigned_to), 'remediation_overdue', 'Remediation overdue', `Remediation "${row.title}" is overdue and requires attention.`, `/remediation/${row.task_id}`);
                notificationsCreated++;
            }
            escalationsTriggered++;
        }
        return {
            overdueRemediations: overdue.rows.length,
            escalationsTriggered,
            notificationsCreated,
        };
    }
}
//# sourceMappingURL=remediation-overdue.worker.js.map