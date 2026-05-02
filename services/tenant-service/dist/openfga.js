"use strict";
/**
 * OpenFGA tuple-write helper for tenant-service (Patch 1).
 *
 * Lightweight HTTP-only client (no @openfga/sdk dep) — mirrors the
 * fgaCheck pattern used by services/ui-os-service/src/middleware/openfga.ts
 * but exposes a `writeTuples()` op so /register can seed the canonical
 * tenant-admin / tenant-member / ui_os_tenant.ui_admin relations atomically.
 *
 * Configuration (read once at module load):
 *   OPENFGA_API_URL     — base URL, e.g. http://127.0.0.1:8080
 *   OPENFGA_STORE_ID
 *   OPENFGA_MODEL_ID
 *   OPENFGA_API_TOKEN   — optional bearer
 *   OPENFGA_TIMEOUT_MS  — optional, defaults to 500 (writes are slower than checks)
 *   TENANT_SERVICE_OPENFGA_ENFORCE — 'true' to fail closed when OpenFGA
 *                                    is unavailable; defaults 'false'.
 *
 * If OPENFGA_API_URL is not set, the helper logs a single warning and
 * returns 'disabled' (caller treats as no-op). This matches the dual-mode
 * rollout pattern used everywhere else in the platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpenFgaEnforced = exports.isOpenFgaConfigured = exports.buildRegistrationTuples = exports.writeTuples = void 0;
const API_URL = (process.env.OPENFGA_API_URL || '').replace(/\/$/, '');
const STORE_ID = process.env.OPENFGA_STORE_ID || '';
const MODEL_ID = process.env.OPENFGA_MODEL_ID || '';
const API_TOKEN = process.env.OPENFGA_API_TOKEN || '';
const TIMEOUT_MS = Number(process.env.OPENFGA_TIMEOUT_MS || 500);
const ENFORCE = String(process.env.TENANT_SERVICE_OPENFGA_ENFORCE || 'false').toLowerCase() === 'true';
let warnedDisabled = false;
/**
 * Idempotently write a batch of (user, relation, object) tuples.
 *
 * OpenFGA Write requires non-existing tuples; existing ones return 400.
 * To stay idempotent we send tuples one at a time and tolerate the
 * "already exists" error. This is acceptable for /register because the
 * batch is bounded (≤ 6 tuples per new tenant).
 */
async function writeTuples(tuples) {
    if (!API_URL || !STORE_ID || !MODEL_ID) {
        if (!warnedDisabled) {
            console.warn('[tenant-service/fga] OpenFGA not configured — writeTuples returns "disabled"');
            warnedDisabled = true;
        }
        return { outcome: 'disabled', written: 0, skipped: tuples.length, failed: 0 };
    }
    if (tuples.length === 0) {
        return { outcome: 'ok', written: 0, skipped: 0, failed: 0 };
    }
    let written = 0;
    let skipped = 0;
    let failed = 0;
    let lastErr;
    for (const t of tuples) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(API_TOKEN ? { authorization: `Bearer ${API_TOKEN}` } : {}),
                },
                body: JSON.stringify({
                    authorization_model_id: MODEL_ID,
                    writes: { tuple_keys: [t] },
                }),
                signal: ctrl.signal,
            });
            if (res.ok) {
                written += 1;
            }
            else if (res.status === 400) {
                // Most likely "tuple already exists" — treat as idempotent skip.
                const body = await res.text().catch(() => '');
                if (/already exists|write_failed_due_to_invalid_input/i.test(body)) {
                    skipped += 1;
                }
                else {
                    failed += 1;
                    lastErr = `HTTP 400: ${body.slice(0, 200)}`;
                }
            }
            else {
                failed += 1;
                lastErr = `HTTP ${res.status}`;
            }
        }
        catch (e) {
            failed += 1;
            lastErr = e.message;
        }
        finally {
            clearTimeout(timer);
        }
    }
    if (failed === 0)
        return { outcome: 'ok', written, skipped, failed };
    if (written + skipped === 0) {
        return { outcome: 'unavailable', written, skipped, failed, message: lastErr };
    }
    return { outcome: 'partial', written, skipped, failed, message: lastErr };
}
exports.writeTuples = writeTuples;
/**
 * Build the canonical tuple set seeded for a freshly registered tenant.
 *
 * Tuples (per Patch 1):
 *   1. (tenant:<T>, platform, platform:dos)               — anchor tenant to platform plane
 *   2. (user:<U>,   admin,    tenant:<T>)                 — registrant is workspace admin
 *   3. (user:<U>,   member,   tenant:<T>)                 — baseline viewer access
 *   4. (ui_os_tenant:<T>, tenant, tenant:<T>)             — link UI-OS plane to tenant
 *   5. (ui_os_tenant:<T>, platform, platform:dos)         — UI-OS plane platform anchor
 *   6. (user:<U>,   ui_admin, ui_os_tenant:<T>)           — UI-OS admin governance
 *
 * Owner relation is intentionally NOT seeded; owner is appointed later via
 * the verified legal-rep / billing flow.
 */
function buildRegistrationTuples(args) {
    const tenant = `tenant:${args.tenantId}`;
    const user = `user:${args.userId}`;
    const platform = `platform:${args.platformId || 'dos'}`;
    const uiOs = `ui_os_tenant:${args.tenantId}`;
    return [
        { user: platform, relation: 'platform', object: tenant },
        { user, relation: 'admin', object: tenant },
        { user, relation: 'member', object: tenant },
        { user: tenant, relation: 'tenant', object: uiOs },
        { user: platform, relation: 'platform', object: uiOs },
        { user, relation: 'ui_admin', object: uiOs },
    ];
}
exports.buildRegistrationTuples = buildRegistrationTuples;
function isOpenFgaConfigured() {
    return Boolean(API_URL && STORE_ID && MODEL_ID);
}
exports.isOpenFgaConfigured = isOpenFgaConfigured;
function isOpenFgaEnforced() {
    return ENFORCE;
}
exports.isOpenFgaEnforced = isOpenFgaEnforced;
//# sourceMappingURL=openfga.js.map