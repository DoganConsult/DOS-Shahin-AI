"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
exports.withTransactionIsolation = withTransactionIsolation;
const tenant_1 = require("./tenant");
async function withTransaction(tenantId, fn) {
    return (0, tenant_1.withTenantClient)(tenantId, async (client) => {
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK').catch(() => { });
            throw err;
        }
    });
}
async function withTransactionIsolation(tenantId, isolationLevel, fn) {
    return (0, tenant_1.withTenantClient)(tenantId, async (client) => {
        try {
            // secrets-scan-allow: isolationLevel is a TypeScript union of four literal strings
            await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK').catch(() => { });
            throw err;
        }
    });
}
