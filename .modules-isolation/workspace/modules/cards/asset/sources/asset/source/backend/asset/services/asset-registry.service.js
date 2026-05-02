"use strict";
// ============================================
// Asset Registry Service
// Enhanced CRUD with pagination, search, joins
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssets = listAssets;
exports.getAssetById = getAssetById;
exports.createAsset = createAsset;
exports.updateAsset = updateAsset;
exports.deleteAsset = deleteAsset;
exports.bulkUpdateAssets = bulkUpdateAssets;
exports.bulkDeleteAssets = bulkDeleteAssets;
exports.getAssetStats = getAssetStats;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const privacy_gate_1 = require("../../../products/shahin-ai/cross-hub/privacy-gate");
const resilience_1 = require("@dos/platform-core/resilience");
async function listAssets(tenantId, params = {}) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = ['name', 'type', 'criticality', 'status', 'created_at', 'updated_at', 'lifecycle_stage', 'asset_category'].includes(params.sortBy || '') ? params.sortBy : 'created_at';
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const conditions = ['a.deleted_at IS NULL'];
    const values = [];
    let idx = 0;
    if (params.search) {
        idx++;
        conditions.push(`(a.name ILIKE $${idx} OR a.description ILIKE $${idx})`);
        values.push(`%${params.search}%`);
    }
    if (params.type) {
        idx++;
        conditions.push(`a.type = $${idx}`);
        values.push(params.type);
    }
    if (params.category) {
        idx++;
        conditions.push(`a.asset_category = $${idx}`);
        values.push(params.category);
    }
    if (params.criticality) {
        idx++;
        conditions.push(`a.criticality = $${idx}`);
        values.push(params.criticality);
    }
    if (params.classification) {
        idx++;
        conditions.push(`a.classification = $${idx}`);
        values.push(params.classification);
    }
    if (params.status) {
        idx++;
        conditions.push(`a.status = $${idx}`);
        values.push(params.status);
    }
    if (params.lifecycleStage) {
        idx++;
        conditions.push(`a.lifecycle_stage = $${idx}`);
        values.push(params.lifecycleStage);
    }
    if (params.ownerId) {
        idx++;
        conditions.push(`a.owner = $${idx}`);
        values.push(params.ownerId);
    }
    if (params.serviceId) {
        idx++;
        conditions.push(`a.business_service_id = $${idx}`);
        values.push(params.serviceId);
    }
    const where = conditions.join(' AND ');
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${ts}".assets a WHERE ${where}`, values);
    const total = countResult.rows[0]?.total || 0;
    const dataResult = await (0, database_port_1.safeQuery)(`
    SELECT a.*,
           c.name_en AS classification_name, c.level AS classification_level,
           o.owner_user_id AS primary_owner_id
    FROM "${ts}".assets a
    LEFT JOIN "${ts}".asset_classifications c ON c.classification_id = a.data_classification_id
    LEFT JOIN "${ts}".asset_owners o ON o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.owner_type = 'business_owner' AND o.revoked_at IS NULL
    WHERE ${where}
    ORDER BY a.${sortCol} ${sortDir}
    LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...values, pageSize, offset]);
    return { data: dataResult.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
async function getAssetById(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT a.*,
           c.name_en AS classification_name, c.level AS classification_level, c.code AS classification_code
    FROM "${ts}".assets a
    LEFT JOIN "${ts}".asset_classifications c ON c.classification_id = a.data_classification_id
    WHERE a.asset_id = $1 AND a.deleted_at IS NULL
  `, [assetId]);
    return rows[0] || null;
}
async function createAsset(tenantId, userId, input) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const isPersonalData = input.classification === 'restricted' || input.classification === 'confidential';
    // ── Privacy Gate Interception ──────────────────────────────────────────────
    const privacyCheck = await (0, privacy_gate_1.enforcePrivacyByDesign)(tenantId, 'asset', crypto.randomUUID(), isPersonalData);
    if (privacyCheck.quarantined) {
        // Override the input status to forcibly lock the asset deployment.
        input.status = 'quarantined';
        // Append the quarantine justification to metadata.
        input.metadata = {
            ...input.metadata,
            quarantineReason: privacyCheck.reason,
            zeroTrustGate: 'Privacy By-Design Enforced'
        };
    }
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".assets (
      name, name_en, name_ar, type, asset_category, description, criticality,
      owner, custodian_id, department, location, ip_address, mac_address, os,
      classification, status, lifecycle_stage, business_service_id,
      data_classification_id, parent_asset_id,
      cia_confidentiality, cia_integrity, cia_availability,
      external_exposure, cmdb_external_id, valuation_amount, valuation_currency,
      tags, metadata, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
    ) RETURNING *
  `, [
        input.name, input.name_en || input.name, input.name_ar || '', input.type || 'server',
        input.asset_category || 'hardware', input.description || '', input.criticality || 'medium',
        input.owner || null, input.custodian_id || null, input.department || null,
        input.location || null, input.ip_address || null, input.mac_address || null, input.os || null,
        input.classification || 'internal', input.status || 'active', input.lifecycle_stage || 'operation',
        input.business_service_id || null, input.data_classification_id || null, input.parent_asset_id || null,
        input.cia_confidentiality ?? 3, input.cia_integrity ?? 3, input.cia_availability ?? 3,
        input.external_exposure ?? false, input.cmdb_external_id || null,
        input.valuation_amount || null, input.valuation_currency || 'SAR',
        input.tags || [], input.metadata || {}, userId,
    ]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'created', entityType: 'asset', entityId: rows[0].asset_id, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function updateAsset(tenantId, userId, assetId, updates) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = [
        'name', 'name_en', 'name_ar', 'type', 'asset_category', 'description', 'criticality',
        'owner', 'custodian_id', 'department', 'location', 'ip_address', 'mac_address', 'os',
        'classification', 'status', 'lifecycle_stage', 'business_service_id',
        'data_classification_id', 'parent_asset_id', 'cia_confidentiality', 'cia_integrity',
        'cia_availability', 'external_exposure', 'cmdb_external_id', 'valuation_amount',
        'valuation_currency', 'tags', 'metadata',
    ];
    const cols = Object.keys(updates).filter(k => allowed.includes(k));
    if (!cols.length)
        return null;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = cols.map(c => updates[c]);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".assets SET ${sets.join(', ')}, updated_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING *`, [assetId, ...vals]);
    if (rows[0]) {
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'updated', entityType: 'asset', entityId: assetId, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return rows[0] || null;
}
async function deleteAsset(tenantId, userId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".assets SET deleted_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`, [assetId]);
    if (rows[0]) {
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'deleted', entityType: 'asset', entityId: assetId }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return rows[0] || null;
}
async function bulkUpdateAssets(tenantId, userId, ids, update) {
    const results = [];
    for (const id of ids) {
        const row = await updateAsset(tenantId, userId, id, update);
        if (row)
            results.push(row);
    }
    return results;
}
async function bulkDeleteAssets(tenantId, userId, ids) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".assets SET deleted_at = NOW() WHERE asset_id = ANY($1) AND deleted_at IS NULL RETURNING asset_id`, [ids]);
    for (const r of rows) {
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'deleted', entityType: 'asset', entityId: r.asset_id }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return rows;
}
async function getAssetStats(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE owner IS NULL OR owner = '')::int AS without_owner,
      COUNT(*) FILTER (WHERE external_exposure = true)::int AS externally_exposed,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'decommission' OR lifecycle_stage = 'disposed')::int AS retired,
      COUNT(*) FILTER (WHERE last_scan_at IS NULL OR last_scan_at < NOW() - INTERVAL '90 days')::int AS scan_overdue,
      COUNT(*) FILTER (WHERE data_classification_id IS NULL)::int AS unclassified
    FROM "${ts}".assets WHERE deleted_at IS NULL
  `);
    return rows[0];
}
//# sourceMappingURL=asset-registry.service.js.map