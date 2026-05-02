// ============================================
// Notification Service — minimal CRUD ported from monolith
// Source: modules/notification/source/backend/notification/services/notification.service.ts
// (only the functions actually called from ai-engine-service)
// ============================================
import { withTenantClient, getFirstRow } from '@dos/db';
export async function createNotification(tenantId, data) {
    return withTenantClient(tenantId, async (client) => {
        const result = await client.query(`INSERT INTO notifications
         (user_id, type, title, body, link, entity_type, entity_id, module, severity, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
       RETURNING *`, [
            data.userId,
            data.type,
            data.title,
            data.body ?? null,
            data.link ?? null,
            data.entityType ?? null,
            data.entityId ?? null,
            data.module ?? null,
            data.severity ?? null,
        ]);
        return getFirstRow(result);
    });
}
export async function getNotifications(tenantId, userId) {
    return withTenantClient(tenantId, async (client) => {
        const result = await client.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        return result.rows;
    });
}
export async function markAsRead(tenantId, notificationId) {
    return withTenantClient(tenantId, async (client) => {
        const result = await client.query(`UPDATE notifications SET read = true, read_at = NOW()
       WHERE notification_id = $1 RETURNING *`, [notificationId]);
        return getFirstRow(result) ?? null;
    });
}
export async function markAllAsRead(tenantId, userId) {
    return withTenantClient(tenantId, async (client) => {
        const result = await client.query(`UPDATE notifications SET read = true, read_at = NOW()
       WHERE user_id = $1 AND read = false`, [userId]);
        return result.rowCount ?? 0;
    });
}
//# sourceMappingURL=notification.service.js.map