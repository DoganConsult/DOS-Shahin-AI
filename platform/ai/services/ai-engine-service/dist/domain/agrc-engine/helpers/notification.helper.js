import { query } from '../ports/database.port';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export async function createNotification(schema, userId, type, title, body, link) {
    await swallowNull(EC.FALLBACK_QUERY, query(`
    INSERT INTO "${schema}".notifications
    (notification_id, user_id, type, title, body, link, read, read_at)
    VALUES (gen_random_uuid(), $1::text, $2::text, $3::text, $4::text, $5::text, false, NULL)
    `, [userId, type, title, body, link ?? null]), { operation: 'insert notifications' });
}
//# sourceMappingURL=notification.helper.js.map