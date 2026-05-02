import { createHash } from 'node:crypto';
/**
 * Wave 11d-§8 Search — manager for the 7 §8 tables (migrations
 * 20260502_0109/0110): providers, indexes, scopes, scope_indexes,
 * history, saved_queries, command_execution_log.
 */
export class UiOsSearchManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── Providers ───────────────────────────────────────────────
    async listProviders(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text, provider_code, display_name_key, endpoint_url, auth_secret_ref, config, is_active
         FROM dos.ui_search_providers
        WHERE tenant_id=$1 ORDER BY provider_code`, [tenantId]);
        return rows;
    }
    async upsertProvider(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_providers
        (tenant_id, provider_code, display_name_key, endpoint_url, auth_secret_ref, config, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,TRUE),$8,$8)
       ON CONFLICT (tenant_id, provider_code) DO UPDATE
         SET display_name_key=EXCLUDED.display_name_key,
             endpoint_url=EXCLUDED.endpoint_url,
             auth_secret_ref=EXCLUDED.auth_secret_ref,
             config=EXCLUDED.config,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, provider_code, is_active`, [tenantId, body.provider_code, body.display_name_key ?? null,
            body.endpoint_url ?? null, body.auth_secret_ref ?? null,
            body.config !== undefined ? JSON.stringify(body.config) : null,
            body.is_active ?? null, userId]);
        return rows[0];
    }
    async deleteProvider(tenantId, providerId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_search_providers WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, providerId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Indexes ─────────────────────────────────────────────────
    async listIndexes(tenantId, providerId) {
        const { rows } = await this.pool.query(`SELECT id::text, provider_id::text AS provider_id, index_code, module_code,
              schema_payload, last_built_at, document_count, is_active
         FROM dos.ui_search_indexes
        WHERE tenant_id=$1 AND ($2::uuid IS NULL OR provider_id=$2)
        ORDER BY index_code`, [tenantId, providerId ?? null]);
        return rows;
    }
    async upsertIndex(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_indexes
        (tenant_id, provider_id, index_code, module_code, schema_payload, last_built_at, document_count, is_active)
       VALUES ($1,$2::uuid,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),$6::timestamptz,$7,COALESCE($8,TRUE))
       ON CONFLICT (tenant_id, index_code) DO UPDATE
         SET provider_id=EXCLUDED.provider_id,
             module_code=EXCLUDED.module_code,
             schema_payload=EXCLUDED.schema_payload,
             last_built_at=EXCLUDED.last_built_at,
             document_count=EXCLUDED.document_count,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, index_code, is_active`, [tenantId, body.provider_id, body.index_code, body.module_code ?? null,
            body.schema_payload !== undefined ? JSON.stringify(body.schema_payload) : null,
            body.last_built_at ?? null, body.document_count ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteIndex(tenantId, indexId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_search_indexes WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, indexId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Scopes ──────────────────────────────────────────────────
    async listScopes(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text, scope_code, display_name_key, default_filters, is_active
         FROM dos.ui_search_scopes WHERE tenant_id=$1 ORDER BY scope_code`, [tenantId]);
        return rows;
    }
    async upsertScope(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_scopes
        (tenant_id, scope_code, display_name_key, default_filters, is_active)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb),COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, scope_code) DO UPDATE
         SET display_name_key=EXCLUDED.display_name_key,
             default_filters=EXCLUDED.default_filters,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, scope_code, is_active`, [tenantId, body.scope_code, body.display_name_key ?? null,
            body.default_filters !== undefined ? JSON.stringify(body.default_filters) : null,
            body.is_active ?? null]);
        return rows[0];
    }
    async deleteScope(tenantId, scopeId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_search_scopes WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, scopeId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Scope ↔ index bindings ──────────────────────────────────
    async listScopeIndexes(tenantId, scopeId) {
        const { rows } = await this.pool.query(`SELECT id::text, scope_id::text AS scope_id, index_id::text AS index_id, weight
         FROM dos.ui_search_scope_indexes
        WHERE tenant_id=$1 AND scope_id=$2::uuid ORDER BY weight DESC`, [tenantId, scopeId]);
        return rows;
    }
    async bindScopeIndex(tenantId, scopeId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_scope_indexes (tenant_id, scope_id, index_id, weight)
       VALUES ($1,$2::uuid,$3::uuid,COALESCE($4,1))
       ON CONFLICT (scope_id, index_id) DO UPDATE SET weight=EXCLUDED.weight
       RETURNING id::text, scope_id::text AS scope_id, index_id::text AS index_id, weight`, [tenantId, scopeId, body.index_id, body.weight ?? null]);
        return rows[0];
    }
    async unbindScopeIndex(tenantId, bindingId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_search_scope_indexes WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, bindingId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── History ─────────────────────────────────────────────────
    async listHistory(tenantId, userId, limit = 100) {
        const { rows } = await this.pool.query(`SELECT id::text, scope_id::text AS scope_id, query_text, query_hash,
              result_count, duration_ms, searched_at
         FROM dos.ui_search_history
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY searched_at DESC LIMIT $3`, [tenantId, userId, Math.min(limit, 500)]);
        return rows;
    }
    async recordHistory(tenantId, userId, body) {
        const hash = createHash('sha256').update(`${body.scope_id ?? ''}|${body.query_text}`).digest('hex').slice(0, 64);
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_history
        (tenant_id, user_id, scope_id, query_text, query_hash, result_count, duration_ms)
       VALUES ($1,$2,$3::uuid,$4,$5,COALESCE($6,0),$7)
       RETURNING id::text, query_hash, searched_at`, [tenantId, userId, body.scope_id ?? null, body.query_text,
            hash, body.result_count ?? null, body.duration_ms ?? null]);
        return rows[0];
    }
    // ── Saved queries ───────────────────────────────────────────
    async listSavedQueries(tenantId, userId) {
        const { rows } = await this.pool.query(`SELECT id::text, scope_id::text AS scope_id, query_key, name_key, query_payload, is_active
         FROM dos.ui_search_saved_queries
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY query_key`, [tenantId, userId]);
        return rows;
    }
    async upsertSavedQuery(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_search_saved_queries
        (tenant_id, user_id, scope_id, query_key, name_key, query_payload, is_active)
       VALUES ($1,$2,$3::uuid,$4,$5,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,TRUE))
       ON CONFLICT (tenant_id, user_id, query_key) DO UPDATE
         SET scope_id=EXCLUDED.scope_id,
             name_key=EXCLUDED.name_key,
             query_payload=EXCLUDED.query_payload,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, query_key, is_active`, [tenantId, userId, body.scope_id ?? null, body.query_key,
            body.name_key ?? null,
            body.query_payload !== undefined ? JSON.stringify(body.query_payload) : null,
            body.is_active ?? null]);
        return rows[0];
    }
    async deleteSavedQuery(tenantId, userId, queryId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_search_saved_queries WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid`, [tenantId, userId, queryId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── §22 user-facing search (federated facade) ───────────────
    /** Federated query: lex-search across saved queries + history seeded scopes. */
    async search(tenantId, q, limit = 25) {
        if (!q || q.trim().length === 0)
            return [];
        const { rows } = await this.pool.query(`SELECT 'saved_query' AS kind, id::text, query_key AS title, query_payload AS payload
         FROM dos.ui_search_saved_queries
        WHERE tenant_id=$1 AND is_active=TRUE
          AND (query_key ILIKE '%'||$2||'%' OR name_key ILIKE '%'||$2||'%')
        ORDER BY query_key LIMIT $3`, [tenantId, q, Math.min(limit, 100)]);
        return rows;
    }
    /** Type-ahead suggestions from history. */
    async suggestions(tenantId, q, limit = 10) {
        if (!q || q.trim().length === 0)
            return [];
        const { rows } = await this.pool.query(`SELECT DISTINCT ON (query_text) query_text, MAX(searched_at) AS last_used
         FROM dos.ui_search_history
        WHERE tenant_id=$1 AND query_text ILIKE $2||'%'
        GROUP BY query_text
        ORDER BY query_text, last_used DESC
        LIMIT $3`, [tenantId, q, Math.min(limit, 50)]);
        return rows.map((r) => ({ text: r.query_text, last_used: r.last_used }));
    }
    /** §22 alias: save a free-form query (creates a saved_query row). */
    async saveQuery(tenantId, userId, query, name) {
        return this.upsertSavedQuery(tenantId, userId, {
            query_key: name ?? `q_${Date.now()}`,
            name_key: name ?? null,
            query_payload: { query },
        });
    }
    // ── Command execution log ───────────────────────────────────
    async listCommandLog(tenantId, filter, limit = 100) {
        const { rows } = await this.pool.query(`SELECT id::text, user_id, command_key, surface::text AS surface, payload,
              result, duration_ms, error_code, executed_at
         FROM dos.ui_command_execution_log
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR user_id=$2)
          AND ($3::text IS NULL OR command_key=$3)
        ORDER BY executed_at DESC LIMIT $4`, [tenantId, filter.userId ?? null, filter.commandKey ?? null, Math.min(limit, 500)]);
        return rows;
    }
    async recordCommand(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_command_execution_log
        (tenant_id, user_id, command_key, surface, payload, result, duration_ms, error_code)
       VALUES ($1,$2,$3,$4::dos.ui_command_surface_t,COALESCE($5::jsonb,'{}'::jsonb),$6,$7,$8)
       RETURNING id::text, command_key, surface::text AS surface, executed_at`, [tenantId, userId, body.command_key, body.surface,
            body.payload !== undefined ? JSON.stringify(body.payload) : null,
            body.result ?? null, body.duration_ms ?? null, body.error_code ?? null]);
        return rows[0];
    }
}
//# sourceMappingURL=ui-os-search.manager.js.map