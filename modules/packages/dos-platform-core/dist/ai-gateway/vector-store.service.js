"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EMBEDDING_DIM = void 0;
exports.ensureVectorTable = ensureVectorTable;
exports.upsertVectors = upsertVectors;
exports.searchVectors = searchVectors;
exports.deleteVectors = deleteVectors;
const resilience_1 = require("../resilience");
const observability_1 = require("../observability");
const db_1 = require("@dos/db");
const resilience_2 = require("../resilience");
const SAFE_TABLE_RE = /^[a-z][a-z0-9_]{0,62}$/;
const SAFE_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
function assertSafeTableName(name) {
    if (!SAFE_TABLE_RE.test(name)) {
        throw new Error(`Invalid vector table name: ${name}`);
    }
}
function assertSafeKey(key) {
    if (!SAFE_KEY_RE.test(key)) {
        throw new Error(`Invalid filter key: ${key}`);
    }
}
exports.DEFAULT_EMBEDDING_DIM = 1536;
async function ensureVectorTable(tableName, dimensions = exports.DEFAULT_EMBEDDING_DIM) {
    assertSafeTableName(tableName);
    if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 4096) {
        throw new Error(`Invalid vector dimensions: ${dimensions}`);
    }
    try {
        const pool = (0, db_1.getPool)();
        // secrets-scan-allow: tableName validated by assertSafeTableName, dimensions integer-bounded
        await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(${dimensions}),
        metadata JSONB DEFAULT '{}',
        tenant_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        // secrets-scan-allow: tableName validated by assertSafeTableName
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_embedding
      ON ${tableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `).catch((0, resilience_2.catchHandler)(resilience_2.EC.EVENT_BUS));
        // secrets-scan-allow: tableName validated by assertSafeTableName
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant
      ON ${tableName} (tenant_id)
    `).catch((0, resilience_2.catchHandler)(resilience_2.EC.EVENT_BUS));
    }
    catch (err) {
        observability_1.logger.error(`[VectorStore] ensureVectorTable failed: ${(0, resilience_1.toErrorMessage)(err)}`);
    }
}
async function upsertVectors(tenantId, tableName, docs) {
    assertSafeTableName(tableName);
    if (docs.length === 0)
        return 0;
    try {
        const pool = (0, db_1.getPool)();
        let inserted = 0;
        for (const doc of docs) {
            if (!doc.embedding || doc.embedding.length === 0)
                continue;
            const embStr = `[${doc.embedding.join(',')}]`;
            await pool.query(`INSERT INTO ${tableName} (id, content, embedding, metadata, tenant_id)
         VALUES ($1, $2, $3::vector, $4, $5)
         ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3::vector, metadata = $4
         WHERE ${tableName}.tenant_id = $5`, [doc.id, doc.content, embStr, JSON.stringify(doc.metadata), tenantId]);
            inserted++;
        }
        return inserted;
    }
    catch (err) {
        observability_1.logger.error(`[VectorStore] upsertVectors failed: ${(0, resilience_1.toErrorMessage)(err)}`);
        return 0;
    }
}
async function searchVectors(tenantId, tableName, queryEmbedding, topK = 10, filter) {
    assertSafeTableName(tableName);
    try {
        const pool = (0, db_1.getPool)();
        const embStr = `[${queryEmbedding.join(',')}]`;
        const conditions = [`tenant_id = $3`];
        const params = [embStr, topK, tenantId];
        if (filter) {
            Object.entries(filter).forEach(([key, value], i) => {
                assertSafeKey(key);
                params.push(JSON.stringify(value));
                conditions.push(`metadata->>'${key}' = $${i + 4}`);
            });
        }
        const filterClause = `WHERE ${conditions.join(' AND ')}`;
        const result = await pool.query(`SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
       FROM ${tableName}
       ${filterClause}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`, params);
        return result.rows.map((r) => ({
            id: r.id,
            content: r.content,
            metadata: r.metadata,
            similarity: parseFloat(String(r.similarity)),
        }));
    }
    catch (err) {
        observability_1.logger.error(`[VectorStore] searchVectors failed: ${(0, resilience_1.toErrorMessage)(err)}`);
        return [];
    }
}
async function deleteVectors(tenantId, tableName, ids) {
    assertSafeTableName(tableName);
    if (ids.length === 0)
        return 0;
    try {
        const pool = (0, db_1.getPool)();
        const result = await pool.query(`DELETE FROM ${tableName} WHERE id = ANY($1) AND tenant_id = $2`, [ids, tenantId]);
        return result.rowCount ?? 0;
    }
    catch (err) {
        observability_1.logger.error(`[VectorStore] deleteVectors failed: ${(0, resilience_1.toErrorMessage)(err)}`);
        return 0;
    }
}
//# sourceMappingURL=vector-store.service.js.map