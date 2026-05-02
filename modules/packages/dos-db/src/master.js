"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterQuery = masterQuery;
exports.masterGetFirst = masterGetFirst;
const pool_1 = require("./pool");
const logger_1 = require("./logger");
const errors_1 = require("./errors");
async function masterQuery(text, params) {
    const logger = (0, logger_1.getDbLogger)();
    const pool = (0, pool_1.getPool)();
    const client = await pool.connect();
    try {
        await client.query(`SET search_path TO public`);
        const result = await client.query(text, params);
        return { rows: result.rows, rowCount: result.rowCount };
    }
    finally {
        await client.query('RESET search_path').catch((err) => {
            logger.warn({ error: (0, errors_1.toErrorMessage)(err) }, '[DB] RESET search_path failed on master client release');
        });
        client.release();
    }
}
async function masterGetFirst(table, where, params) {
    const result = await masterQuery(`SELECT * FROM public.${table} WHERE ${where} LIMIT 1`, params);
    return result.rows[0] || null;
}
//# sourceMappingURL=master.js.map