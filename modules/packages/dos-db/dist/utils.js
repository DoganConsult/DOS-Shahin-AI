"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirstRow = getFirstRow;
exports.getFirstRowOrThrow = getFirstRowOrThrow;
exports.assertHasRows = assertHasRows;
exports.columnExists = columnExists;
exports.resetColumnExistsCache = resetColumnExistsCache;
const query_1 = require("./query");
function getFirstRow(result) {
    return result.rows.length > 0 ? result.rows[0] : null;
}
function getFirstRowOrThrow(result, errorMsg = 'Expected at least one row') {
    const row = getFirstRow(result);
    if (row === null)
        throw new Error(errorMsg);
    return row;
}
function assertHasRows(result) {
    if (result.rows.length === 0) {
        throw new Error('Expected at least one row');
    }
}
const COLUMN_EXISTS_TTL_MS = 60_000;
const columnExistsMemo = new Map();
async function columnExists(schema, table, column) {
    const key = `${schema}|${table}|${column}`.toLowerCase();
    const now = Date.now();
    const hit = columnExistsMemo.get(key);
    if (hit && now - hit.at < COLUMN_EXISTS_TTL_MS) {
        return hit.exists;
    }
    const res = await (0, query_1.safeQuery)(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     LIMIT 1`, [schema, table, column]);
    const exists = res.rows.length > 0;
    columnExistsMemo.set(key, { at: now, exists });
    return exists;
}
function resetColumnExistsCache() {
    columnExistsMemo.clear();
}
//# sourceMappingURL=utils.js.map