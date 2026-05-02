"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirstRow = getFirstRow;
exports.getFirstRowOrThrow = getFirstRowOrThrow;
exports.assertHasRows = assertHasRows;
exports.rowCount = rowCount;
exports.assertTenantId = assertTenantId;
exports.tenantSchema = tenantSchema;
exports.safeRows = safeRows;
const db_1 = require("@dos/db");
const logger_1 = require("./logger");
function getFirstRow(result) {
    return result.rows.length > 0 ? result.rows[0] : null;
}
function getFirstRowOrThrow(result, errorMsg = 'Expected at least one row') {
    const row = getFirstRow(result);
    if (row === null)
        throw new Error(errorMsg);
    return row;
}
function assertHasRows(result, errorMsg = 'Expected at least one row') {
    if (result.rows.length === 0)
        throw new Error(errorMsg);
}
function rowCount(result) {
    return result.rowCount ?? result.rows.length;
}
function assertTenantId(tenantId) {
    if (!tenantId)
        throw new Error('tenantId is required');
}
function tenantSchema(tenantId) {
    assertTenantId(tenantId);
    return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '')}`;
}
async function safeRows(sql, params) {
    try {
        const res = await (0, db_1.safeQuery)(sql, params);
        return res.rows;
    }
    catch (err) {
        logger_1.logger.warn('[safeRows] query failed', { sql: sql.slice(0, 120) });
        return [];
    }
}
//# sourceMappingURL=db.js.map