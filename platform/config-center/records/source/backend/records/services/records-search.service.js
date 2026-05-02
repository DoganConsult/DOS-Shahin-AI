"use strict";
// ============================================
// Shahin GRC — Records Search Service
// Full-text search, metadata search,
// classification filtering, cross-module
// discovery, saved searches
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTextSearchCondition = buildTextSearchCondition;
exports.buildFilterConditions = buildFilterConditions;
exports.searchRecords = searchRecords;
exports.searchByMetadata = searchByMetadata;
exports.crossModuleDiscovery = crossModuleDiscovery;
exports.saveSearch = saveSearch;
exports.runSavedSearch = runSavedSearch;
const database_port_1 = require("../ports/database.port");
// === Pure Functions ===
function buildTextSearchCondition(query, idx) {
    const cleaned = query.trim().replace(/[%_\\]/g, c => `\\${c}`);
    return {
        clause: `(to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${idx}) OR title ILIKE $${idx + 1})`,
        value: cleaned,
    };
}
function buildFilterConditions(filters, startIdx) {
    const conditions = ["deleted_at IS NULL"];
    const params = [];
    let idx = startIdx;
    if (filters.recordType) {
        conditions.push(`record_type = $${idx++}`);
        params.push(filters.recordType);
    }
    if (filters.classification) {
        conditions.push(`classification = $${idx++}`);
        params.push(filters.classification);
    }
    if (filters.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters.legalHold !== undefined) {
        conditions.push(`legal_hold = $${idx++}`);
        params.push(filters.legalHold);
    }
    if (filters.createdAfter) {
        conditions.push(`created_at >= $${idx++}`);
        params.push(filters.createdAfter);
    }
    if (filters.createdBefore) {
        conditions.push(`created_at <= $${idx++}`);
        params.push(filters.createdBefore);
    }
    if (filters.tags && filters.tags.length > 0) {
        conditions.push(`tags @> $${idx++}::jsonb`);
        params.push(JSON.stringify(filters.tags));
    }
    return { conditions, params, nextIdx: idx };
}
// === DB-backed Functions ===
function mapSearchResult(r, score = 1) {
    return {
        id: r.id,
        title: r.title,
        description: r.description || "",
        recordType: r.record_type,
        classification: r.classification,
        status: r.status,
        tags: r.tags || [],
        relevanceScore: score,
        createdAt: r.created_at?.toISOString?.() || r.created_at,
        updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
    };
}
async function searchRecords(tenantId, filters, limit = 50, offset = 0) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const { conditions, params, nextIdx } = buildFilterConditions(filters, 1);
    let idx = nextIdx;
    let textClause = "";
    if (filters.query) {
        const { clause, value } = buildTextSearchCondition(filters.query, idx);
        textClause = clause;
        conditions.push(textClause);
        params.push(value);
        params.push(`%${value}%`);
        idx += 2;
    }
    const where = `WHERE ${conditions.join(" AND ")}`;
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".records_records ${where}`, params);
    params.push(limit);
    params.push(offset);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".records_records ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx}`, params);
    return {
        results: result.rows.map(r => mapSearchResult(r)),
        total: parseInt(countResult.rows[0]?.cnt, 10) || 0,
    };
}
async function searchByMetadata(tenantId, metadataKey, metadataValue) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".records_records
     WHERE metadata @> $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 100`, [JSON.stringify({ [metadataKey]: metadataValue })]);
    return result.rows.map(r => mapSearchResult(r));
}
async function crossModuleDiscovery(tenantId, query) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const results = [];
    const sources = [
        { table: "records_records", idCol: "id", source: "records" },
        { table: "ucf_controls", idCol: "control_id", source: "controls" },
        { table: "policy_documents", idCol: "document_id", source: "policy" },
        { table: "evidence_items", idCol: "evidence_id", source: "evidence" },
    ];
    for (const s of sources) {
        try {
            const r = await (0, database_port_1.safeQuery)(`SELECT ${s.idCol} AS id, title, status, created_at
         FROM "${schema}".${s.table}
         WHERE title ILIKE $1 AND deleted_at IS NULL
         LIMIT 10`, [`%${query}%`]);
            for (const row of r.rows) {
                results.push({
                    source: s.source,
                    id: row.id,
                    title: row.title,
                    status: row.status || "unknown",
                    createdAt: row.created_at?.toISOString?.() || row.created_at,
                });
            }
        }
        catch { /* table may not exist in this tenant */ }
    }
    return results;
}
async function saveSearch(tenantId, userId, name, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".record_saved_searches (user_id, name, filters)
     VALUES ($1, $2, $3)
     RETURNING *`, [userId, name, JSON.stringify(filters)]);
    const r = result.rows[0];
    return {
        savedSearchId: r.saved_search_id, userId: r.user_id, name: r.name,
        filters: r.filters, createdAt: r.created_at?.toISOString?.() || r.created_at,
        lastRunAt: null, resultCount: null,
    };
}
async function runSavedSearch(tenantId, savedSearchId, userId) {
    await (0, database_port_1.safeQuery)("UPDATE __TENANT_SCHEMA__.records_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
//# sourceMappingURL=records-search.service.js.map