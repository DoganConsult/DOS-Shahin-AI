import { query, safeQuery } from '../ports/database.port.js';
import { canRunDedupAction } from '../helpers/dedup.helper.js';
import { createNotification } from '../helpers/notification.helper.js';
import { isFeatureEnabled } from '../helpers/feature-flag.helper.js';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export class PolicyReviewWorker {
    async run(ctx) {
        if (!(await isFeatureEnabled(ctx.schema, 'agrc_policy_review_enabled'))) {
            return {};
        }
        const due = await safeQuery(`
      SELECT policy_id, title, owner, status
      FROM "${ctx.schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date <= CURRENT_DATE
      `).catch(async () => {
            return { rows: [] };
        });
        let policyReviewsStarted = 0;
        let tasksCreated = 0;
        let notificationsCreated = 0;
        for (const row of due.rows) {
            const dedupKey = `policy-review:${row.policy_id}`;
            const canCreate = await canRunDedupAction(ctx.schema, dedupKey, 'policy', row.policy_id, 'policy_review_due', 168);
            if (!canCreate)
                continue;
            policyReviewsStarted++;
            if (await isFeatureEnabled(ctx.schema, 'agrc_auto_task_creation_enabled')) {
                await swallowNull(EC.FALLBACK_QUERY, query(`
          INSERT INTO "${ctx.schema}".action_items
          (item_id, title, source_type, source_id, assigned_to, deadline, reminder_schedule, status, priority, type)
          VALUES (
            gen_random_uuid(), $1::text, 'policy', $2::uuid, $3::text,
            now() + interval '14 days', '{}'::jsonb, 'open', 'medium', 'policy_review'
          )
          `, [`Policy review due: ${row.title}`, row.policy_id, row.owner ?? null]), { operation: 'insert action_items' });
                tasksCreated++;
            }
            if (row.owner && (await isFeatureEnabled(ctx.schema, 'agrc_auto_notification_enabled'))) {
                await createNotification(ctx.schema, String(row.owner), 'policy_review_due', 'Policy review due', `Policy "${row.title}" requires review.`, `/governance/policies/${row.policy_id}`);
                notificationsCreated++;
            }
        }
        return {
            policyReviewsStarted,
            tasksCreated,
            notificationsCreated,
        };
    }
}
//# sourceMappingURL=policy-review.worker.js.map