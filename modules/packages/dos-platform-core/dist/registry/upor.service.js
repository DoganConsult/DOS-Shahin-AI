"use strict";
/**
 * UPOR Service — Unified Platform Object Registry
 * Dr-Dogan-AGRC-OS / Shahin-AI GRC Platform
 *
 * All queries against master.* tables use masterQuery (sets search_path=public,
 * so we always use explicit schema prefix: master.<table>).
 * All queries against per-tenant tables use safeQuery + tenantSchema.
 *
 * RESOLVER GATE ORDER (non-negotiable — from locked Q1/Q3 decisions):
 *   Gate 1 — catalog status:      po.status IN ('active','beta')
 *   Gate 2 — runtime enabled:     cc.is_runtime_enabled = true
 *   Gate 3 — default enable mode: cc.default_enable_mode = 'on'
 *             OR (override exists AND override.is_enabled = true)
 *   Gate 4 — module activation:   parent module active in module_workflow_registry
 *             (ONLY when cc.module_activation_source = 'module_workflow_registry'
 *              OR the component belongs to a module layer)
 *   Gate 5 — tenant override:     co.uuid IS NULL OR co.is_enabled = true
 *   Gate 6 — compatibility check: (applied in TS after DB query)
 *   Gate 7 — permission/flags:    (applied by caller — context-dependent)
 *   Order  — COALESCE(co.sort_order, cc.sort_order)
 *
 * Hard blocks (CANNOT be bypassed by any tenant override):
 *   - status IN ('deprecated','retired','draft')
 *   - is_runtime_enabled = false
 *   - module disabled in module_workflow_registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveComponents = getEffectiveComponents;
exports.getCatalog = getCatalog;
exports.getCatalogByCsn = getCatalogByCsn;
exports.getDependencyGraph = getDependencyGraph;
exports.getRouteBindings = getRouteBindings;
exports.getWidgetBindings = getWidgetBindings;
exports.getNavBindings = getNavBindings;
exports.writeAuditLog = writeAuditLog;
exports.getAuditLog = getAuditLog;
exports.enableComponent = enableComponent;
exports.disableComponent = disableComponent;
exports.setConfigOverride = setConfigOverride;
exports.reorderComponent = reorderComponent;
const db_1 = require("@dos/db");
const logger_1 = require("../observability/logger");
const upor_types_1 = require("./upor.types");
// ─────────────────────────────────────────────────────────────────────────────
// Internal mappers
// ─────────────────────────────────────────────────────────────────────────────
function mapPlatformObject(r) {
    return {
        uuid: r.uuid,
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        kind: r.kind,
        layer: r.layer,
        ownerType: r.owner_type,
        ownerCode: r.owner_code,
        status: r.status,
        version: r.version,
        registryVersion: r.registry_version,
        description: r.description,
        scope: r.scope,
        sourceOfTruth: r.source_of_truth,
        specRef: r.spec_ref ?? null,
        dependsOn: r.depends_on ?? [],
        usedBy: r.used_by ?? [],
        permissions: r.permissions ?? [],
        featureFlags: r.feature_flags ?? [],
        tags: r.tags ?? [],
        auditEnabled: r.audit_enabled,
        telemetryEnabled: r.telemetry_enabled,
        telemetryKey: r.telemetry_key ?? null,
        introducedInBuild: r.introduced_in_build ?? null,
        retiredInBuild: r.retired_in_build ?? null,
        metadata: r.metadata ?? {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapCatalogRow(r) {
    return {
        objectUuid: r.object_uuid,
        csn: r.csn,
        componentKey: r.component_key,
        selector: r.selector ?? null,
        routePath: r.route_path ?? null,
        parentObjectUuid: r.parent_object_uuid ?? null,
        sortOrder: r.sort_order,
        isRuntimeEnabled: r.is_runtime_enabled,
        isTenantOverridable: r.is_tenant_overridable,
        capabilities: r.capabilities ?? {},
        uiMetadata: r.ui_metadata ?? {},
        configSchemaRef: r.config_schema_ref ?? null,
        contractRef: r.contract_ref ?? null,
        loaderStrategy: r.loader_strategy,
        allowlistGroup: r.allowlist_group ?? null,
        i18nKey: r.i18n_key ?? null,
        testId: r.test_id ?? null,
        defaultEnableMode: r.default_enable_mode ?? 'on',
        compatibilityRules: r.compatibility_rules ?? {},
        rolloutGroup: r.rollout_group ?? null,
        moduleActivationSource: r.module_activation_source ?? 'component_overrides',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Gate 4 helper — fetch active module codes from module_workflow_registry
// ─────────────────────────────────────────────────────────────────────────────
async function fetchActiveModuleCodes(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT module_code FROM "${schema}".module_workflow_registry WHERE is_active = TRUE`, []);
        return new Set(rows.map(r => r.module_code));
    }
    catch (err) {
        logger_1.logger.warn(`[UPOR] module_workflow_registry query failed — defaulting to empty active module set`, { tenantId, err });
        return new Set();
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Compatibility check (Gate 6 — applied in TS)
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_BUILD = process.env.BUILD_VERSION ?? '2026.04.08';
function passesCompatibilityCheck(cc) {
    const rules = cc.compatibilityRules;
    if (!rules || Object.keys(rules).length === 0)
        return true;
    const minBuild = rules['minBuild'];
    if (minBuild && CURRENT_BUILD < minBuild)
        return false;
    const maxBuild = rules['maxBuild'];
    if (maxBuild && CURRENT_BUILD > maxBuild)
        return false;
    return true;
}
// ─────────────────────────────────────────────────────────────────────────────
// CORE RESOLVER — getEffectiveComponents
// Implements all 7 gates in declared order.
// ─────────────────────────────────────────────────────────────────────────────
async function getEffectiveComponents(input) {
    const { tenantId, layer, type } = input;
    const schema = (0, db_1.tenantSchema)(tenantId);
    // Optional layer/type filters building SQL
    const layerClause = layer ? `AND po.layer = $1` : '';
    const typeClause = type ? `AND po.type  = ${layer ? '$2' : '$1'}` : '';
    const params = [];
    if (layer)
        params.push(layer);
    if (type)
        params.push(type);
    // Main effective query:
    // Gates 1+2+3+5 are applied in SQL for efficiency.
    // Gate 4 (module activation) is applied in TS post-query using module_workflow_registry.
    // Gate 6 (compatibility) is applied in TS post-query.
    const { rows } = await (0, db_1.masterQuery)(`
    SELECT
      po.uuid               AS po_uuid,
      po.id                 AS po_id,
      po.code               AS po_code,
      po.name               AS po_name,
      po.type               AS po_type,
      po.kind               AS po_kind,
      po.layer              AS po_layer,
      po.owner_code         AS po_owner_code,
      po.status             AS po_status,
      po.spec_ref           AS po_spec_ref,
      po.permissions        AS po_permissions,
      po.feature_flags      AS po_feature_flags,
      po.depends_on         AS po_depends_on,

      cc.csn,
      cc.component_key,
      cc.route_path,
      cc.sort_order         AS cc_sort_order,
      cc.is_runtime_enabled,
      cc.is_tenant_overridable,
      cc.loader_strategy,
      cc.allowlist_group,
      cc.i18n_key,
      cc.test_id,
      cc.capabilities,
      cc.ui_metadata,
      cc.default_enable_mode,
      cc.compatibility_rules,
      cc.rollout_group,
      cc.module_activation_source,

      co.uuid               AS co_uuid,
      co.is_enabled         AS co_is_enabled,
      co.sort_order         AS co_sort_order,
      co.config_override    AS co_config_override,
      co.label_override     AS co_label_override,
      co.i18n_key           AS co_i18n_key_override

    FROM master.platform_objects po
    JOIN master.component_catalog cc ON cc.object_uuid = po.uuid
    LEFT JOIN "${schema}".component_overrides co
      ON co.component_object_uuid = cc.object_uuid

    WHERE
      -- Gate 1: catalog status gate (hard blocks filtered here)
      po.status IN ('active', 'beta')
      -- Gate 2: runtime-enabled gate
      AND cc.is_runtime_enabled = true
      -- Gate 3: default enable mode + tenant override gate combined
      AND (
        -- default-on: show unless explicitly disabled
        (cc.default_enable_mode = 'on' AND (co.uuid IS NULL OR co.is_enabled = true))
        OR
        -- default-off: show only when explicitly enabled
        (cc.default_enable_mode = 'off' AND co.is_enabled = true)
      )
      ${layerClause}
      ${typeClause}

    ORDER BY COALESCE(co.sort_order, cc.sort_order) ASC, po.id ASC
  `, params);
    // Gate 4: module activation (module_workflow_registry authority)
    // Fetch active modules once for this tenant, then filter.
    const activeModules = input.activeModules
        ? new Set(input.activeModules)
        : await fetchActiveModuleCodes(tenantId);
    // Platform modules (foundation, navigation, admin, etc.) are always active
    // unless explicitly deactivated in module_workflow_registry.
    const results = [];
    for (const r of rows) {
        const moduleActivationSource = r.module_activation_source;
        const ownerCode = r.po_owner_code;
        // Gate 4: if module_workflow_registry controls this component's module, check it
        if (moduleActivationSource === 'module_workflow_registry') {
            if (!activeModules.has(ownerCode)) {
                continue; // module disabled — skip all child components
            }
        }
        else {
            // component_overrides strategy: still check if owning module is active
            // (pages/widgets under a disabled module should not appear)
            if (ownerCode && !activeModules.has(ownerCode)) {
                // For platform-layer objects (foundation, navigation) skip this check
                const poLayer = r.po_layer;
                if (poLayer !== 'platform' && poLayer !== 'package') {
                    continue;
                }
            }
        }
        // Gate 6: compatibility check (applied in TS)
        const ccRow = mapCatalogRow({
            object_uuid: r.po_uuid,
            csn: r.csn,
            component_key: r.component_key,
            route_path: r.route_path,
            sort_order: r.cc_sort_order,
            is_runtime_enabled: r.is_runtime_enabled,
            is_tenant_overridable: r.is_tenant_overridable,
            loader_strategy: r.loader_strategy,
            allowlist_group: r.allowlist_group,
            i18n_key: r.i18n_key,
            test_id: r.test_id,
            capabilities: r.capabilities,
            ui_metadata: r.ui_metadata,
            default_enable_mode: r.default_enable_mode,
            compatibility_rules: r.compatibility_rules,
            rollout_group: r.rollout_group,
            module_activation_source: r.module_activation_source,
            created_at: '',
            updated_at: '',
        });
        if (!passesCompatibilityCheck(ccRow))
            continue;
        const effectiveSortOrder = (r.co_sort_order ?? r.cc_sort_order);
        results.push({
            csn: r.csn,
            objectId: r.po_id,
            componentKey: r.component_key,
            routePath: r.route_path ?? null,
            name: r.po_name,
            type: r.po_type,
            kind: r.po_kind,
            layer: r.po_layer,
            ownerCode: r.po_owner_code,
            sortOrder: effectiveSortOrder,
            loaderStrategy: r.loader_strategy,
            allowlistGroup: r.allowlist_group ?? null,
            i18nKey: (r.co_i18n_key_override ?? r.i18n_key) ?? null,
            testId: r.test_id ?? null,
            capabilities: r.capabilities ?? {},
            uiMetadata: r.ui_metadata ?? {},
            configOverride: r.co_config_override ?? {},
            labelOverride: r.co_label_override ?? null,
            moduleActivationSource: r.module_activation_source,
            specRef: r.po_spec_ref ?? null,
            rolloutGroup: r.rollout_group ?? null,
            _resolverGates: {
                catalogStatus: r.po_status,
                runtimeEnabled: r.is_runtime_enabled,
                defaultEnableMode: r.default_enable_mode,
                moduleActive: true, // only reaches here if module gate passed
                tenantOverridePresent: r.co_uuid !== null,
                tenantOverrideEnabled: r.co_is_enabled ?? true,
            },
        });
    }
    return results;
}
// ─────────────────────────────────────────────────────────────────────────────
// CATALOG QUERIES (read-only, master schema)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Get full catalog with optional filters.
 * Does NOT apply tenant gates — returns global catalog truth.
 */
async function getCatalog(filter = {}) {
    const conditions = [];
    const params = [];
    if (filter.type) {
        params.push(filter.type);
        conditions.push(`po.type = $${params.length}`);
    }
    if (filter.layer) {
        params.push(filter.layer);
        conditions.push(`po.layer = $${params.length}`);
    }
    if (filter.ownerCode) {
        params.push(filter.ownerCode);
        conditions.push(`po.owner_code = $${params.length}`);
    }
    if (filter.status) {
        params.push(filter.status);
        conditions.push(`po.status = $${params.length}`);
    }
    if (filter.kind) {
        params.push(filter.kind);
        conditions.push(`po.kind = $${params.length}`);
    }
    if (filter.specRef) {
        params.push(filter.specRef);
        conditions.push(`po.spec_ref = $${params.length}`);
    }
    if (filter.tag) {
        params.push(filter.tag);
        conditions.push(`po.tags @> $${params.length}::jsonb`);
    }
    if (filter.allowlistGroup) {
        params.push(filter.allowlistGroup);
        conditions.push(`cc.allowlist_group = $${params.length}`);
    }
    if (filter.rolloutGroup) {
        params.push(filter.rolloutGroup);
        conditions.push(`cc.rollout_group = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    params.push(limit, offset);
    const { rows } = await (0, db_1.masterQuery)(`
    SELECT
      po.*,
      cc.csn,
      cc.route_path,
      cc.component_key,
      cc.loader_strategy,
      cc.allowlist_group,
      cc.rollout_group,
      cc.default_enable_mode,
      cc.is_runtime_enabled,
      cc.sort_order AS catalog_sort_order
    FROM master.platform_objects po
    LEFT JOIN master.component_catalog cc ON cc.object_uuid = po.uuid
    ${where}
    ORDER BY po.type, po.id
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
    return rows.map(r => ({
        ...mapPlatformObject(r),
        csn: r.csn ?? null,
        routePath: r.route_path ?? null,
        componentKey: r.component_key ?? null,
        loaderStrategy: r.loader_strategy,
        allowlistGroup: r.allowlist_group,
        rolloutGroup: r.rollout_group,
        defaultEnableMode: r.default_enable_mode,
        isRuntimeEnabled: r.is_runtime_enabled,
    }));
}
/**
 * Get a single catalog entry by CSN.
 * Returns null if not found.
 * Hard 404 is enforced at the route layer.
 */
async function getCatalogByCsn(csn) {
    const { rows } = await (0, db_1.masterQuery)(`
    SELECT po.*, cc.*
    FROM master.component_catalog cc
    JOIN master.platform_objects po ON po.uuid = cc.object_uuid
    WHERE cc.csn = $1
    LIMIT 1
  `, [csn]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        ...mapPlatformObject(r),
        catalog: mapCatalogRow(r),
    };
}
/**
 * Dependency graph: upstream (what this depends on) + downstream (what depends on this).
 */
async function getDependencyGraph(objectId) {
    // Validate the object exists
    const { rows: selfRows } = await (0, db_1.masterQuery)(`SELECT csn FROM master.component_catalog cc
     JOIN master.platform_objects po ON po.uuid = cc.object_uuid
     WHERE po.id = $1 LIMIT 1`, [objectId]);
    // Check if main object exists
    const { rows: existRows } = await (0, db_1.masterQuery)(`SELECT uuid FROM master.platform_objects WHERE id = $1 LIMIT 1`, [objectId]);
    if (!existRows[0])
        return null;
    const csn = selfRows[0]?.csn ?? null;
    // Upstream: objects this one depends on (via depends_on JSON array)
    const { rows: upstreamRows } = await (0, db_1.masterQuery)(`
    SELECT po.*
    FROM master.platform_objects po
    WHERE po.id = ANY(
      SELECT jsonb_array_elements_text(depends_on)
      FROM master.platform_objects
      WHERE id = $1
    )
    ORDER BY po.type, po.id
  `, [objectId]);
    // Downstream: objects that list this object in their depends_on
    const { rows: downstreamRows } = await (0, db_1.masterQuery)(`
    SELECT po.*
    FROM master.platform_objects po
    WHERE po.depends_on @> to_jsonb($1::text)
      AND po.id != $1
    ORDER BY po.type, po.id
  `, [objectId]);
    return {
        objectId,
        csn,
        upstream: upstreamRows.map(mapPlatformObject),
        downstream: downstreamRows.map(mapPlatformObject),
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// BINDINGS — route / widget / nav (for shell bootstrap)
// ─────────────────────────────────────────────────────────────────────────────
async function getRouteBindings(tenantId) {
    const effective = await getEffectiveComponents({ tenantId, type: 'page' });
    return effective
        .filter(c => c.routePath)
        .map(c => ({
        csn: c.csn,
        componentKey: c.componentKey,
        routePath: c.routePath,
        loaderStrategy: c.loaderStrategy,
        allowlistGroup: c.allowlistGroup,
        i18nKey: c.i18nKey,
    }));
}
async function getWidgetBindings(tenantId) {
    const effective = await getEffectiveComponents({ tenantId, type: 'widget' });
    return effective.map(c => ({
        csn: c.csn,
        componentKey: c.componentKey,
        capabilities: c.capabilities,
        uiMetadata: c.uiMetadata,
        configOverride: c.configOverride,
    }));
}
async function getNavBindings(tenantId) {
    const effective = await getEffectiveComponents({ tenantId, type: 'nav' });
    return effective.map(c => ({
        csn: c.csn,
        componentKey: c.componentKey,
        sortOrder: c.sortOrder,
        i18nKey: c.i18nKey,
        labelOverride: c.labelOverride,
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// AUDIT
// ─────────────────────────────────────────────────────────────────────────────
async function writeAuditLog(input) {
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    try {
        await (0, db_1.safeQuery)(`
      INSERT INTO "${schema}".component_audit_log (
        tenant_id, component_object_uuid, csn,
        change_type, changed_by,
        old_value, new_value, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            input.tenantId,
            input.componentObjectUuid,
            input.csn,
            input.changeType,
            input.changedBy,
            input.oldValue ? JSON.stringify(input.oldValue) : null,
            input.newValue ? JSON.stringify(input.newValue) : null,
            input.reason ?? null,
        ]);
    }
    catch (err) {
        logger_1.logger.error(`[UPOR] Failed to write audit log`, { err, csn: input.csn, tenantId: input.tenantId });
        // Non-fatal: audit failure should not block the mutation
    }
}
async function getAuditLog(tenantId, csn, from, to, limit = 100) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    if (csn) {
        params.push(csn);
        conditions.push(`csn = $${params.length}`);
    }
    if (from) {
        params.push(from);
        conditions.push(`created_at >= $${params.length}`);
    }
    if (to) {
        params.push(to);
        conditions.push(`created_at <= $${params.length}`);
    }
    params.push(limit);
    const { rows } = await (0, db_1.safeQuery)(`
    SELECT * FROM "${schema}".component_audit_log
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `, params);
    return rows;
}
// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS — enable / disable / config / reorder
// All mutations: validate CSN exists, check hard blocks, upsert override, write audit.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveCatalogEntry(csn) {
    const { rows } = await (0, db_1.masterQuery)(`
    SELECT
      cc.object_uuid,
      po.status,
      cc.is_runtime_enabled,
      cc.is_tenant_overridable,
      cc.default_enable_mode
    FROM master.component_catalog cc
    JOIN master.platform_objects po ON po.uuid = cc.object_uuid
    WHERE cc.csn = $1
    LIMIT 1
  `, [csn]);
    if (!rows[0])
        return null;
    return {
        objectUuid: rows[0].object_uuid,
        status: rows[0].status,
        isRuntimeEnabled: rows[0].is_runtime_enabled,
        isTenantOverridable: rows[0].is_tenant_overridable,
        defaultEnableMode: rows[0].default_enable_mode,
    };
}
function assertNotHardBlocked(status, csn) {
    if (upor_types_1.HARD_BLOCK_STATUSES.has(status)) {
        throw Object.assign(new Error(`Component ${csn} has status '${status}' and cannot be modified`), { statusCode: 409 });
    }
}
function assertTenantOverridable(isTenantOverridable, csn) {
    if (!isTenantOverridable) {
        throw Object.assign(new Error(`Component ${csn} is not tenant-overridable`), { statusCode: 403 });
    }
}
async function getExistingOverride(schema, componentObjectUuid, tenantId) {
    const { rows } = await (0, db_1.safeQuery)(`
    SELECT * FROM "${schema}".component_overrides
    WHERE component_object_uuid = $1 AND tenant_id = $2
    LIMIT 1
  `, [componentObjectUuid, tenantId]);
    return rows[0] ?? null;
}
/**
 * Enable a component for a tenant.
 * Creates override row if absent, sets is_enabled=true.
 * Audit log written on every call.
 * HARD BLOCK: cannot enable a retired/deprecated/draft component.
 */
async function enableComponent(input) {
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const entry = await resolveCatalogEntry(input.csn);
    if (!entry)
        throw Object.assign(new Error(`CSN not found: ${input.csn}`), { statusCode: 404 });
    assertNotHardBlocked(entry.status, input.csn);
    assertTenantOverridable(entry.isTenantOverridable, input.csn);
    const existing = await getExistingOverride(schema, entry.objectUuid, input.tenantId);
    const oldValue = existing ? { is_enabled: existing.is_enabled } : null;
    await (0, db_1.safeQuery)(`
    INSERT INTO "${schema}".component_overrides
      (tenant_id, component_object_uuid, is_enabled, enabled_at, enabled_by)
    VALUES ($1, $2, true, NOW(), $3)
    ON CONFLICT (tenant_id, component_object_uuid)
    DO UPDATE SET is_enabled = true, enabled_at = NOW(), enabled_by = $3,
                  disabled_at = NULL, disabled_by = NULL,
                  updated_at = NOW()
  `, [input.tenantId, entry.objectUuid, input.changedBy]);
    await writeAuditLog({
        tenantId: input.tenantId,
        componentObjectUuid: entry.objectUuid,
        csn: input.csn,
        changeType: 'ENABLED',
        changedBy: input.changedBy,
        oldValue: oldValue ?? undefined,
        newValue: { is_enabled: true },
        reason: input.reason,
    });
}
/**
 * Disable a component for a tenant.
 * Creates override row if absent, sets is_enabled=false.
 * NOTE: A retired/deprecated component cannot be re-enabled; disable is still valid
 * (they're already blocked by Gate 1 — but disabling an active one is the main use case).
 */
async function disableComponent(input) {
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const entry = await resolveCatalogEntry(input.csn);
    if (!entry)
        throw Object.assign(new Error(`CSN not found: ${input.csn}`), { statusCode: 404 });
    // Only rejected if HARD_BLOCK + trying to "enable" — disable is always allowed
    assertTenantOverridable(entry.isTenantOverridable, input.csn);
    const existing = await getExistingOverride(schema, entry.objectUuid, input.tenantId);
    const oldValue = existing ? { is_enabled: existing.is_enabled } : { is_enabled: true };
    await (0, db_1.safeQuery)(`
    INSERT INTO "${schema}".component_overrides
      (tenant_id, component_object_uuid, is_enabled, disabled_at, disabled_by)
    VALUES ($1, $2, false, NOW(), $3)
    ON CONFLICT (tenant_id, component_object_uuid)
    DO UPDATE SET is_enabled = false, disabled_at = NOW(), disabled_by = $3,
                  updated_at = NOW()
  `, [input.tenantId, entry.objectUuid, input.changedBy]);
    await writeAuditLog({
        tenantId: input.tenantId,
        componentObjectUuid: entry.objectUuid,
        csn: input.csn,
        changeType: 'DISABLED',
        changedBy: input.changedBy,
        oldValue,
        newValue: { is_enabled: false },
        reason: input.reason,
    });
}
/**
 * Set per-tenant config override (merges into existing config).
 */
async function setConfigOverride(input) {
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const entry = await resolveCatalogEntry(input.csn);
    if (!entry)
        throw Object.assign(new Error(`CSN not found: ${input.csn}`), { statusCode: 404 });
    assertNotHardBlocked(entry.status, input.csn);
    assertTenantOverridable(entry.isTenantOverridable, input.csn);
    const existing = await getExistingOverride(schema, entry.objectUuid, input.tenantId);
    const oldConfig = existing?.config_override ?? {};
    // Merge: new config takes precedence over existing
    const mergedConfig = { ...oldConfig, ...input.config };
    await (0, db_1.safeQuery)(`
    INSERT INTO "${schema}".component_overrides
      (tenant_id, component_object_uuid, config_override, is_enabled)
    VALUES ($1, $2, $3::jsonb, true)
    ON CONFLICT (tenant_id, component_object_uuid)
    DO UPDATE SET config_override = $3::jsonb, updated_at = NOW()
  `, [input.tenantId, entry.objectUuid, JSON.stringify(mergedConfig)]);
    await writeAuditLog({
        tenantId: input.tenantId,
        componentObjectUuid: entry.objectUuid,
        csn: input.csn,
        changeType: 'CONFIG_CHANGED',
        changedBy: input.changedBy,
        oldValue: { config_override: oldConfig },
        newValue: { config_override: mergedConfig },
        reason: input.reason,
    });
}
/**
 * Set sort order override for a component.
 */
async function reorderComponent(input) {
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const entry = await resolveCatalogEntry(input.csn);
    if (!entry)
        throw Object.assign(new Error(`CSN not found: ${input.csn}`), { statusCode: 404 });
    assertNotHardBlocked(entry.status, input.csn);
    const existing = await getExistingOverride(schema, entry.objectUuid, input.tenantId);
    const oldOrder = existing?.sort_order ?? null;
    await (0, db_1.safeQuery)(`
    INSERT INTO "${schema}".component_overrides
      (tenant_id, component_object_uuid, sort_order, is_enabled)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (tenant_id, component_object_uuid)
    DO UPDATE SET sort_order = $3, updated_at = NOW()
  `, [input.tenantId, entry.objectUuid, input.sortOrder]);
    await writeAuditLog({
        tenantId: input.tenantId,
        componentObjectUuid: entry.objectUuid,
        csn: input.csn,
        changeType: 'REORDERED',
        changedBy: input.changedBy,
        oldValue: { sort_order: oldOrder },
        newValue: { sort_order: input.sortOrder },
    });
}
//# sourceMappingURL=upor.service.js.map