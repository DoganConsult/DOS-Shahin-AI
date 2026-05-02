"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedSearch = unifiedSearch;
exports.federatedSearch = federatedSearch;
exports.nlqSearch = nlqSearch;
exports.saveQuery = saveQuery;
exports.listSavedQueries = listSavedQueries;
exports.deleteSavedQuery = deleteSavedQuery;
// @ts-nocheck
const db_1 = require("@dos/db");
const grc_query_ports_1 = require("../ports/grc-query.ports");
const crypto_1 = require("crypto");
function generateQueryHash(dsl) {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(dsl)).digest('hex');
}
async function logQuery(tenantId, userId, dslQuery, nlqPrompt, executionTimeMs, moduleHits) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const hash = generateQueryHash(dslQuery || { nlqPrompt });
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".grc_query_log (query_hash, user_id, execution_time_ms, module_hits, dsl_query, nlq_prompt)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (query_hash) DO UPDATE SET 
       execution_time_ms = EXCLUDED.execution_time_ms, 
       module_hits = EXCLUDED.module_hits, 
       created_at = NOW()`, [hash, userId, executionTimeMs, JSON.stringify(moduleHits), dslQuery ? JSON.stringify(dslQuery) : null, nlqPrompt]);
}
// ── Unified Search ──
async function unifiedSearch(tenantId, userId, query, _limit = 20, _modules) {
    const t0 = Date.now();
    // Stub for cross-module search
    const results = [
        { type: 'risk', title: `Risk matching ${query}`, id: 'risk-1' },
        { type: 'incident', title: `Incident matching ${query}`, id: 'inc-1' }
    ];
    const executionTimeMs = Date.now() - t0;
    const moduleHits = { risk: 1, incident: 1 };
    await logQuery(tenantId, userId, null, query, executionTimeMs, moduleHits);
    return { results, totalHits: results.length, executionTimeMs, moduleHits };
}
// ── Federated Advanced Search ──
async function federatedSearch(tenantId, userId, dsl, _limit = 100, _modules) {
    const t0 = Date.now();
    // Stub for parsing DSL and querying multiple tables with DAuth row-level security
    const results = [
        { type: 'control', title: `Control matching criteria`, id: 'ctrl-1' }
    ];
    const executionTimeMs = Date.now() - t0;
    const moduleHits = { control: 1 };
    await logQuery(tenantId, userId, dsl, null, executionTimeMs, moduleHits);
    return { results, totalHits: results.length, executionTimeMs, moduleHits };
}
// ── NLQ Search ──
async function nlqSearch(tenantId, userId, prompt, _limit = 20) {
    const t0 = Date.now();
    // Stub for LLM translation from prompt to DSL
    const translatedDsl = { query: prompt, type: 'nlq_translated' };
    const results = [
        { type: 'policy', title: `LLM Found Policy related to ${prompt}`, id: 'pol-1' }
    ];
    const executionTimeMs = Date.now() - t0;
    const moduleHits = { policy: 1 };
    await logQuery(tenantId, userId, translatedDsl, prompt, executionTimeMs, moduleHits);
    return { results, totalHits: results.length, executionTimeMs, moduleHits };
}
// ── Saved Queries CRUD ──
async function saveQuery(tenantId, userId, name, dsl, isPublic = false) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".grc_saved_queries (user_id, name, query_dsl_json, is_public)
     VALUES ($1, $2, $3, $4)
     RETURNING query_id as "queryId", user_id as "userId", name, query_dsl_json as "queryDslJson", is_public as "isPublic", created_at as "createdAt", updated_at as "updatedAt"`, [userId, name, JSON.stringify(dsl), isPublic]);
    await (0, grc_query_ports_1.setAuditData)(tenantId, 'grc_saved_queries', result.rows[0].queryId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
async function listSavedQueries(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT query_id as "queryId", user_id as "userId", name, query_dsl_json as "queryDslJson", is_public as "isPublic", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".grc_saved_queries WHERE user_id = $1 OR is_public = true ORDER BY name`, [userId]);
    return result.rows;
}
async function deleteSavedQuery(tenantId, userId, queryId) {
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.grc_query_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
//# sourceMappingURL=grc-query.service.js.map