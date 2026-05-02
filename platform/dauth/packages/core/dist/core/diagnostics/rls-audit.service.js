"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRls = auditRls;
exports.assertRlsCompliant = assertRlsCompliant;
/**
 * RLS audit tool — inspects every table in a target schema and reports which
 * ones have Row Level Security enabled, forced, and have at least one policy
 * attached. Intended to be run in CI as a gate:
 *   - In production, any tenant-scoped table without RLS fails the build.
 *   - In staging, a warning-only run produces a status dashboard.
 *
 * Usage (programmatic):
 *   const result = await auditRls({ schemas: ['dos', 'public'] });
 *   if (result.missing.length > 0) process.exit(1);
 */
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
async function auditRls(options = {}) {
    const schemas = options.schemas ?? ['dos', 'public'];
    const exempt = new Set(options.exempt ?? []);
    const rows = await (0, db_1.safeQuery)(`SELECT n.nspname AS schema,
            c.relname AS table,
            c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS rls_forced,
            (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid)::int AS policy_count
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = ANY($1::text[])
        AND c.relname NOT LIKE 'pg_%'
      ORDER BY n.nspname, c.relname`, [schemas]);
    const compliant = [];
    const missing = [];
    const forcedMissing = [];
    const noPolicies = [];
    for (const row of rows.rows) {
        const key = `${row.schema}.${row.table}`;
        if (exempt.has(key))
            continue;
        const status = {
            schema: row.schema,
            table: row.table,
            rlsEnabled: row.rls_enabled,
            rlsForced: row.rls_forced,
            policyCount: row.policy_count,
        };
        if (!status.rlsEnabled) {
            missing.push(status);
            continue;
        }
        if (!status.rlsForced) {
            forcedMissing.push(status);
        }
        if (status.policyCount === 0) {
            noPolicies.push(status);
        }
        if (status.rlsEnabled && status.rlsForced && status.policyCount > 0) {
            compliant.push(status);
        }
    }
    const result = {
        scannedTables: rows.rows.length,
        compliant,
        missing,
        forcedMissing,
        noPolicies,
    };
    if (missing.length > 0 || forcedMissing.length > 0 || noPolicies.length > 0) {
        observability_1.logger.warn('[DAuth:RLS] audit: non-compliant tables', {
            missing: missing.length,
            forcedMissing: forcedMissing.length,
            noPolicies: noPolicies.length,
        });
    }
    return result;
}
/**
 * CI gate — throws when run in a mode where RLS is required and not
 * compliant. `DAUTH_RLS_FAIL_CLOSED=true` is the default in production.
 */
async function assertRlsCompliant(options = {}) {
    if (!dauth_config_1.DAUTH_CONFIG.rls.enabled)
        return;
    const result = await auditRls(options);
    const fatal = dauth_config_1.DAUTH_CONFIG.rls.failClosedInProd && process.env.NODE_ENV === 'production';
    if (result.missing.length === 0 && result.forcedMissing.length === 0) {
        return;
    }
    const detail = [
        ...result.missing.map((t) => `  - MISSING RLS: ${t.schema}.${t.table}`),
        ...result.forcedMissing.map((t) => `  - RLS not FORCED: ${t.schema}.${t.table}`),
    ].join('\n');
    const message = `[DAuth:RLS] audit failed:\n${detail}`;
    if (fatal)
        throw new Error(message);
    observability_1.logger.error(message);
}
//# sourceMappingURL=rls-audit.service.js.map