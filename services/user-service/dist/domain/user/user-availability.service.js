"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAvailability = getUserAvailability;
exports.setUserAvailability = setUserAvailability;
const db_1 = require("@dos/db");
async function getUserAvailability(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_availability WHERE user_id = $1 LIMIT 1`, [userId]);
    if (!rows[0])
        return null;
    const row = rows[0];
    return {
        userId,
        tenantId,
        status: row['status'] ?? 'offline',
        statusMessage: row['status_message'] != null ? String(row['status_message']) : null,
        availableUntil: row['available_until'] != null ? String(row['available_until']) : null,
        updatedAt: String(row['updated_at'] ?? ''),
    };
}
async function setUserAvailability(tenantId, userId, availability) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_availability
       (user_id, status, status_message, available_until)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET status = EXCLUDED.status,
           status_message = EXCLUDED.status_message,
           available_until = EXCLUDED.available_until,
           updated_at = NOW()
     RETURNING *`, [userId, availability.status, availability.statusMessage ?? null, availability.availableUntil ?? null]);
    const row = rows[0] ?? {};
    return {
        userId,
        tenantId,
        status: row['status'] ?? availability.status,
        statusMessage: row['status_message'] != null ? String(row['status_message']) : availability.statusMessage ?? null,
        availableUntil: row['available_until'] != null ? String(row['available_until']) : availability.availableUntil ?? null,
        updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
    };
}
//# sourceMappingURL=user-availability.service.js.map