"use strict";
// ============================================
// Asset Module — Repository Layer
// Encapsulates all data access for the `assets` aggregate root
// plus `asset_dependencies` and `asset_classifications`.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetDependencyRepository = exports.AssetRepository = void 0;
const database_port_1 = require("../ports/database.port");
const db_1 = require("@dos/db");
// ── Repository ───────────────────────────────────────
class AssetRepository {
    constructor(tenantId) {
        this.schema = (0, database_port_1.tenantSchema)(tenantId);
    }
    // --- Single entity reads ---
    async findById(assetId) {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT a.*,
             c.name_en AS classification_name, c.level AS classification_level, c.code AS classification_code
      FROM "${this.schema}".assets a
      LEFT JOIN "${this.schema}".asset_classifications c ON c.classification_id = a.data_classification_id
      WHERE a.asset_id = $1 AND a.deleted_at IS NULL
    `, [assetId]);
        return (0, db_1.getFirstRow)(result);
    }
    // --- List with filters + pagination ---
    async findAll(filters = {}) {
        const conditions = ['a.deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (filters.search) {
            conditions.push(`(a.name ILIKE $${idx} OR a.description ILIKE $${idx})`);
            params.push(`%${filters.search}%`);
            idx++;
        }
        if (filters.type) {
            conditions.push(`a.type = $${idx++}`);
            params.push(filters.type);
        }
        if (filters.category) {
            conditions.push(`a.asset_category = $${idx++}`);
            params.push(filters.category);
        }
        if (filters.criticality) {
            conditions.push(`a.criticality = $${idx++}`);
            params.push(filters.criticality);
        }
        if (filters.classification) {
            conditions.push(`a.classification = $${idx++}`);
            params.push(filters.classification);
        }
        if (filters.status) {
            conditions.push(`a.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.lifecycleStage) {
            conditions.push(`a.lifecycle_stage = $${idx++}`);
            params.push(filters.lifecycleStage);
        }
        if (filters.ownerId) {
            conditions.push(`a.owner = $${idx++}`);
            params.push(filters.ownerId);
        }
        if (filters.serviceId) {
            conditions.push(`a.business_service_id = $${idx++}`);
            params.push(filters.serviceId);
        }
        const where = conditions.join(' AND ');
        const page = Math.max(1, filters.page || 1);
        const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));
        const offset = (page - 1) * pageSize;
        const SORTABLE = {
            name: 'a.name', type: 'a.type', criticality: 'a.criticality',
            status: 'a.status', created_at: 'a.created_at', updated_at: 'a.updated_at',
            lifecycle_stage: 'a.lifecycle_stage', asset_category: 'a.asset_category',
        };
        const sortCol = SORTABLE[filters.sortBy || ''] || 'a.created_at';
        const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
        const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${this.schema}".assets a WHERE ${where}`, params);
        const total = (0, db_1.getFirstRow)(countResult)?.total ?? 0;
        const dataResult = await (0, database_port_1.safeQuery)(`
      SELECT a.*,
             c.name_en AS classification_name, c.level AS classification_level,
             o.owner_user_id AS primary_owner_id
      FROM "${this.schema}".assets a
      LEFT JOIN "${this.schema}".asset_classifications c ON c.classification_id = a.data_classification_id
      LEFT JOIN "${this.schema}".asset_owners o ON o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.owner_type = 'business_owner' AND o.revoked_at IS NULL
      WHERE ${where}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);
        return { rows: dataResult.rows, total };
    }
    // --- Create ---
    async create(userId, data) {
        const result = await (0, database_port_1.safeQuery)(`
      INSERT INTO "${this.schema}".assets (
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
            data.name, data.name_en || data.name, data.name_ar || '', data.type || 'server',
            data.asset_category || 'hardware', data.description || '', data.criticality || 'medium',
            data.owner || null, data.custodian_id || null, data.department || null,
            data.location || null, data.ip_address || null, data.mac_address || null, data.os || null,
            data.classification || 'internal', data.status || 'active', data.lifecycle_stage || 'operation',
            data.business_service_id || null, data.data_classification_id || null, data.parent_asset_id || null,
            data.cia_confidentiality ?? 3, data.cia_integrity ?? 3, data.cia_availability ?? 3,
            data.external_exposure ?? false, data.cmdb_external_id || null,
            data.valuation_amount || null, data.valuation_currency || 'SAR',
            data.tags || [], data.metadata || {}, userId,
        ]);
        return (0, db_1.getFirstRow)(result);
    }
    // --- Update (dynamic) ---
    async update(assetId, updates) {
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
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".assets SET ${sets.join(', ')}, updated_at = NOW()
       WHERE asset_id = $1 AND deleted_at IS NULL RETURNING *`, [assetId, ...vals]);
        return (0, db_1.getFirstRow)(result);
    }
    // --- Soft delete ---
    async softDelete(assetId) {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".assets SET deleted_at = NOW()
       WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`, [assetId]);
        return (result.rows?.length ?? 0) > 0;
    }
    async bulkSoftDelete(assetIds) {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".assets SET deleted_at = NOW()
       WHERE asset_id = ANY($1) AND deleted_at IS NULL`, [assetIds]);
        return result.rowCount ?? 0;
    }
    // --- Stats ---
    async getStats() {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
        COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE owner IS NULL OR owner = '')::int AS without_owner,
        COUNT(*) FILTER (WHERE external_exposure = true)::int AS externally_exposed,
        COUNT(*) FILTER (WHERE lifecycle_stage IN ('decommission','disposed'))::int AS retired,
        COUNT(*) FILTER (WHERE last_scan_at IS NULL OR last_scan_at < NOW() - INTERVAL '90 days')::int AS scan_overdue,
        COUNT(*) FILTER (WHERE data_classification_id IS NULL)::int AS unclassified
      FROM "${this.schema}".assets WHERE deleted_at IS NULL
    `);
        return (0, db_1.getFirstRow)(result);
    }
    // --- Count ---
    async count(filters = {}) {
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.criticality) {
            conditions.push(`criticality = $${idx++}`);
            params.push(filters.criticality);
        }
        const result = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${this.schema}".assets WHERE ${conditions.join(' AND ')}`, params);
        return (0, db_1.getFirstRow)(result)?.total ?? 0;
    }
}
exports.AssetRepository = AssetRepository;
// ── Asset Dependency Repository ──────────────────────
class AssetDependencyRepository {
    constructor(tenantId) {
        this.schema = (0, database_port_1.tenantSchema)(tenantId);
    }
    async findAll(filters = {}) {
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (filters.source_type) {
            conditions.push(`source_type = $${idx++}`);
            params.push(filters.source_type);
        }
        if (filters.source_id) {
            conditions.push(`source_id = $${idx++}`);
            params.push(filters.source_id);
        }
        if (filters.target_type) {
            conditions.push(`target_type = $${idx++}`);
            params.push(filters.target_type);
        }
        if (filters.target_id) {
            conditions.push(`target_id = $${idx++}`);
            params.push(filters.target_id);
        }
        if (filters.dependency_type) {
            conditions.push(`dependency_type = $${idx++}`);
            params.push(filters.dependency_type);
        }
        const where = conditions.join(' AND ');
        const page = Math.max(1, filters.page || 1);
        const pageSize = Math.min(200, Math.max(1, filters.pageSize || 50));
        const offset = (page - 1) * pageSize;
        const countR = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${this.schema}".asset_dependencies WHERE ${where}`, params);
        const total = (0, db_1.getFirstRow)(countR)?.total ?? 0;
        const dataR = await (0, database_port_1.safeQuery)(`
      SELECT * FROM "${this.schema}".asset_dependencies WHERE ${where}
      ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);
        return { rows: dataR.rows, total };
    }
    async create(userId, data) {
        const result = await (0, database_port_1.safeQuery)(`
      INSERT INTO "${this.schema}".asset_dependencies (
        source_type, source_id, target_type, target_id,
        dependency_type, criticality, direction, notes, metadata, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (source_type, source_id, target_type, target_id, dependency_type) WHERE deleted_at IS NULL
      DO UPDATE SET notes = EXCLUDED.notes, criticality = EXCLUDED.criticality, updated_at = NOW()
      RETURNING *
    `, [
            data.source_type, data.source_id, data.target_type, data.target_id,
            data.dependency_type || 'depends_on', data.criticality || 'medium',
            data.direction || 'outbound', data.notes || '', data.metadata || {}, userId,
        ]);
        return (0, db_1.getFirstRow)(result);
    }
    async softDelete(dependencyId) {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".asset_dependencies SET deleted_at = NOW()
       WHERE dependency_id = $1 AND deleted_at IS NULL RETURNING dependency_id`, [dependencyId]);
        return (result.rows?.length ?? 0) > 0;
    }
    async getUpstreamChain(entityType, entityId, maxDepth = 10) {
        const result = await (0, database_port_1.safeQuery)(`
      WITH RECURSIVE chain AS (
        SELECT dependency_id, source_type, source_id, target_type, target_id,
               dependency_type, criticality, 1 AS depth
        FROM "${this.schema}".asset_dependencies
        WHERE target_type = $1 AND target_id = $2 AND deleted_at IS NULL
        UNION ALL
        SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
               d.dependency_type, d.criticality, c.depth + 1
        FROM "${this.schema}".asset_dependencies d
        JOIN chain c ON d.target_type = c.source_type AND d.target_id = c.source_id
        WHERE d.deleted_at IS NULL AND c.depth < $3
      )
      SELECT * FROM chain ORDER BY depth
    `, [entityType, entityId, maxDepth]);
        return result.rows;
    }
    async getDownstreamChain(entityType, entityId, maxDepth = 10) {
        const result = await (0, database_port_1.safeQuery)(`
      WITH RECURSIVE chain AS (
        SELECT dependency_id, source_type, source_id, target_type, target_id,
               dependency_type, criticality, 1 AS depth
        FROM "${this.schema}".asset_dependencies
        WHERE source_type = $1 AND source_id = $2 AND deleted_at IS NULL
        UNION ALL
        SELECT d.dependency_id, d.source_type, d.source_id, d.target_type, d.target_id,
               d.dependency_type, d.criticality, c.depth + 1
        FROM "${this.schema}".asset_dependencies d
        JOIN chain c ON d.source_type = c.target_type AND d.source_id = c.target_id
        WHERE d.deleted_at IS NULL AND c.depth < $3
      )
      SELECT * FROM chain ORDER BY depth
    `, [entityType, entityId, maxDepth]);
        return result.rows;
    }
    async getStats() {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_edges,
        COUNT(DISTINCT source_type || ':' || source_id::text)::int AS unique_sources,
        COUNT(DISTINCT target_type || ':' || target_id::text)::int AS unique_targets,
        COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_deps,
        COUNT(*) FILTER (WHERE dependency_type = 'depends_on')::int AS hard_dependencies
      FROM "${this.schema}".asset_dependencies WHERE deleted_at IS NULL
    `);
        return (0, db_1.getFirstRow)(result);
    }
}
exports.AssetDependencyRepository = AssetDependencyRepository;
//# sourceMappingURL=asset.repository.js.map