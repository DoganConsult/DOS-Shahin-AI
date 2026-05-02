"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCarbonOnlyBootProbe = runCarbonOnlyBootProbe;
/**
 * Layer 7 of the Carbon-only enforcement stack — boot health probe.
 *
 * Runs once at service start, BEFORE the HTTP server begins accepting
 * requests. Verifies catalog + runtime registry invariants:
 *
 *   1. Every row in dos.ui_carbon_components has vendor='ibm-carbon'.
 *      (CHECK constraint enforces this; a violation here means schema
 *      tampering or a corrupted DB.)
 *
 *   2. Every row in dos.dynamic_ui_component_registry either:
 *      (a) has carbon_key linking to a vendor='ibm-carbon' catalog row, OR
 *      (b) has approval_status<>'approved' (so the runtime allowlist
 *          query in Layer 2 already strips it). The probe still flags
 *          (b) as a warning — a row should not linger in unapproved
 *          state in production.
 *
 *   3. Every row whose runtime_status is in
 *      ('blocked-react-only','catalog-only','missing-upstream-angular-binding')
 *      has dynamic_ui_allowed=false (no React-only or unavailable row may
 *      ever be runtime-eligible).
 *
 * Behaviour: throws on any (1) or (3) violation, refusing to boot. Logs
 * (2) violations and proceeds.
 */
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
async function runCarbonOnlyBootProbe() {
    const started = Date.now();
    // (1) Catalog vendor invariant.
    const catalogRow = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE vendor <> 'ibm-carbon')::int AS non_ibm
       FROM dos.ui_carbon_components`);
    const catalog = catalogRow.rows[0] ?? { total: 0, non_ibm: 0 };
    // (2) Runtime registry invariants.
    const regRow = await (0, database_port_1.query)(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE r.approval_status <> 'approved')::int AS unapproved,
       (SELECT COUNT(*)::int
          FROM dos.dynamic_ui_component_registry r2
          JOIN dos.ui_carbon_components c2 ON c2.carbon_key = r2.carbon_key
         WHERE r2.approval_status = 'approved'
           AND c2.vendor <> 'ibm-carbon') AS pointing_to_blocked
       FROM dos.dynamic_ui_component_registry r`);
    const reg = regRow.rows[0] ?? { total: 0, unapproved: 0, pointing_to_blocked: 0 };
    // (3) blocked-react-only / catalog-only / missing-upstream rows that are runtime-allowed.
    const blockedRow = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS count
       FROM dos.ui_carbon_components
      WHERE runtime_status IN ('blocked-react-only', 'catalog-only', 'missing-upstream-angular-binding')
        AND dynamic_ui_allowed = true`);
    const blockedAllowed = blockedRow.rows[0]?.count ?? 0;
    const report = {
        ok: catalog.non_ibm === 0 &&
            reg.pointing_to_blocked === 0 &&
            blockedAllowed === 0,
        catalog_total: catalog.total,
        non_ibm_catalog: catalog.non_ibm,
        registry_total: reg.total,
        registry_unapproved: reg.unapproved,
        registry_pointing_to_blocked: reg.pointing_to_blocked,
        blocked_with_dynamic_allowed: blockedAllowed,
        duration_ms: Date.now() - started,
    };
    if (catalog.non_ibm > 0) {
        throw new Error(`[carbon-only/boot-probe] REFUSING TO BOOT: ${catalog.non_ibm} non-IBM rows in dos.ui_carbon_components`);
    }
    if (reg.pointing_to_blocked > 0) {
        throw new Error(`[carbon-only/boot-probe] REFUSING TO BOOT: ${reg.pointing_to_blocked} runtime registry rows point at non-IBM catalog rows`);
    }
    if (blockedAllowed > 0) {
        throw new Error(`[carbon-only/boot-probe] REFUSING TO BOOT: ${blockedAllowed} blocked-react-only/catalog-only/missing-upstream rows have dynamic_ui_allowed=true`);
    }
    if (reg.unapproved > 0) {
        logger_port_1.logger.warn('carbon-only.boot-probe.unapproved-registry-rows', {
            count: reg.unapproved,
            note: 'unapproved rows are filtered by Layer 2 resolver; consider deleting or approving them',
        });
    }
    logger_port_1.logger.info('carbon-only.boot-probe.ok', report);
    return report;
}
//# sourceMappingURL=carbon-only-boot-probe.js.map