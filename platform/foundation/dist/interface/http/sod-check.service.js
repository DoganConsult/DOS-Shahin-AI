"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSod = checkSod;
exports.listSodRules = listSodRules;
exports.createSodRule = createSodRule;
exports.deleteSodRule = deleteSodRule;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const database_port_2 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
function mapRow(row, tenantId) {
    const ca = Array.isArray(row.conflict_a) ? row.conflict_a : [];
    const cb = Array.isArray(row.conflict_b) ? row.conflict_b : [];
    return {
        rule_id: row.rule_code ?? String(row.id),
        tenant_id: tenantId,
        role_a: ca[0] ?? '',
        role_b: cb[0] ?? '',
        severity: row.severity ?? 'high',
        description: row.description ?? row.rule_name ?? null,
        status: row.enabled === false ? 'inactive' : 'active',
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
async function checkSod(tenantId, userId, proposedRole) {
    return track('foundation.sod.check', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const schema = (0, database_port_2.tenantSchema)(tenantId);
        const rolesRes = await c.query(`SELECT role_code FROM dos.user_role_assignments
          WHERE user_id = $1 AND tenant_id = $2
            AND (revoked_at IS NULL)`, [userId, tenantId]);
        const currentRoles = rolesRes.rows.map((r) => r.role_code);
        const conflictsRes = await c.query(`SELECT * FROM "${schema}".sod_rules
          WHERE enabled = true
            AND ((conflict_a && ARRAY[$1]::text[] AND conflict_b && $2::text[])
              OR (conflict_b && ARRAY[$1]::text[] AND conflict_a && $2::text[]))`, [proposedRole, currentRoles.length > 0 ? currentRoles : ['__none__']]);
        const conflicts = conflictsRes.rows.map((r) => mapRow(r, tenantId));
        return {
            user_id: userId,
            proposed_role: proposedRole,
            current_roles: currentRoles,
            has_conflicts: conflicts.length > 0,
            conflicts,
            decision: conflicts.length > 0 ? 'BLOCKED' : 'ALLOWED',
        };
    }));
}
async function listSodRules(tenantId) {
    return track('foundation.sod.rules', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const schema = (0, database_port_2.tenantSchema)(tenantId);
        try {
            const r = await c.query(`SELECT * FROM "${schema}".sod_rules ORDER BY created_at DESC`);
            return r.rows.map((row) => mapRow(row, tenantId));
        }
        catch (err) {
            // 42P01 = undefined_table, 3F000 = invalid_schema_name. A platform-
            // scoped principal (no tenant schema provisioned) has no SoD rules.
            if (err?.code === '42P01' || err?.code === '3F000')
                return [];
            throw err;
        }
    }));
}
async function createSodRule(tenantId, input, _actorId) {
    const ruleCode = `SOD-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`;
    return track('foundation.sod.createRule', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const schema = (0, database_port_2.tenantSchema)(tenantId);
        const r = await c.query(`INSERT INTO "${schema}".sod_rules
           (tenant_id, rule_code, rule_name, description, severity,
            conflict_a, conflict_b, scope, action, enabled, metadata, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::text[], $7::text[], 'tenant', 'block',
                 COALESCE($8, true), '{}'::jsonb, NOW(), NOW())
         RETURNING *`, [
            tenantId,
            ruleCode,
            input.description ?? `${input.role_a} vs ${input.role_b}`,
            input.description ?? null,
            input.severity ?? 'high',
            [input.role_a],
            [input.role_b],
            input.status ? input.status === 'active' : true,
        ]);
        return mapRow(r.rows[0], tenantId);
    }));
}
async function deleteSodRule(tenantId, id) {
    return track('foundation.sod.deleteRule', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const schema = (0, database_port_2.tenantSchema)(tenantId);
        const r = await c.query(`DELETE FROM "${schema}".sod_rules
          WHERE rule_code = $1 OR id::text = $1
          RETURNING id`, [id]);
        return r.rows.length > 0;
    }));
}
//# sourceMappingURL=sod-check.service.js.map