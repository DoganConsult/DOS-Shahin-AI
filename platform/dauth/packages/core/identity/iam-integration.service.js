"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIamConnections = listIamConnections;
exports.getIamConnection = getIamConnection;
exports.createIamConnection = createIamConnection;
exports.updateIamConnectionStatus = updateIamConnectionStatus;
exports.listIamIdentities = listIamIdentities;
exports.linkIamIdentity = linkIamIdentity;
exports.listIamAccessReviews = listIamAccessReviews;
exports.logIamSync = logIamSync;
exports.getIamSyncHistory = getIamSyncHistory;
/**
 * DAuth IAM Integration — manages external IAM connections and sync.
 * Tables: iam_connections, iam_identities, iam_access_reviews, iam_sync_history,
 *         external_user_scopes
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── iam_connections ──
async function listIamConnections(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".iam_connections WHERE is_active = TRUE ORDER BY provider_name`, []);
    return result.rows;
}
async function getIamConnection(tenantId, connectionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".iam_connections WHERE connection_id = $1`, [connectionId]);
    return (0, db_2.getFirstRow)(result);
}
async function createIamConnection(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".iam_connections (provider_name, provider_type, config, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4) RETURNING *`, [data.provider_name, data.provider_type, JSON.stringify(data.config || {}), data.created_by]);
    return (0, db_2.getFirstRow)(result);
}
async function updateIamConnectionStatus(tenantId, connectionId, isActive) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".iam_connections SET is_active = $2, updated_at = NOW() WHERE connection_id = $1 RETURNING *`, [connectionId, isActive]);
    return (0, db_2.getFirstRow)(result);
}
// ── iam_identities ──
async function listIamIdentities(tenantId, connectionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".iam_identities WHERE connection_id = $1 ORDER BY external_username`, [connectionId]);
    return result.rows;
}
async function linkIamIdentity(tenantId, connectionId, userId, externalId, externalUsername) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".iam_identities (connection_id, user_id, external_id, external_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (connection_id, user_id) DO UPDATE SET external_id = $3, external_username = $4, updated_at = NOW()
     RETURNING *`, [connectionId, userId, externalId, externalUsername]);
    return (0, db_2.getFirstRow)(result);
}
// ── iam_access_reviews ──
async function listIamAccessReviews(tenantId, connectionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".iam_access_reviews WHERE connection_id = $1 ORDER BY created_at DESC`, [connectionId]);
    return result.rows;
}
// ── iam_sync_history ──
async function logIamSync(tenantId, connectionId, status, usersProcessed, errors = []) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".iam_sync_history (connection_id, status, users_processed, errors)
     VALUES ($1, $2, $3, $4)`, [connectionId, status, usersProcessed, JSON.stringify(errors)]);
}
async function getIamSyncHistory(tenantId, connectionId, limit = 20) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".iam_sync_history WHERE connection_id = $1 ORDER BY created_at DESC LIMIT $2`, [connectionId, limit]);
    return result.rows;
}
//# sourceMappingURL=iam-integration.service.js.map