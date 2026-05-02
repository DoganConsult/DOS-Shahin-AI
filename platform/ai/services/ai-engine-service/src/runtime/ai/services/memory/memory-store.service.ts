import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../../ports/logger.port';
import * as https from 'https';
import * as http from 'http';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';
import { SYSTEM_JOB_ACTOR, DEFAULT_EMBEDDING_DIM } from '../../ports/platform.port';

const EMBEDDING_DIM = DEFAULT_EMBEDDING_DIM;

// ── Memory RBAC ──────────────────────────────────────────────────
// Validates that the caller has the required memory permission scope.
// Returns true if permitted, false otherwise.
async function checkMemoryPermission(
  tenantId: string,
  userId: string | undefined,
  requiredScope: 'memory.store.read' | 'memory.store.write',
): Promise<boolean> {
  // System/agent callers (no userId) are always permitted
  if (!userId || userId === SYSTEM_JOB_ACTOR) return true;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT effective_permissions FROM "${schema}".users WHERE user_id = $1`,
      [userId],
    );
    const perms: string[] = getFirstRow(result)?.effective_permissions ?? [];
    if (perms.length === 0) return false;
    return perms.includes(requiredScope);
  } catch {
    return false;
  }
}

export type MemoryType = 'personal' | 'task' | 'tool' | 'working' | 'session' | 'workflow' | 'workspace' | 'product' | 'platform';

export interface MemoryEntry {
  memory_id: string;
  tenant_id: string;
  user_id: string | null;
  agent_id: string | null;
  memory_type: MemoryType;
  namespace: string;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  importance_score: number;
  similarity?: number;
  created_at: string;
}

export interface StoreMemoryInput {
  tenantId: string;
  userId?: string;
  agentId?: string;
  memoryType: MemoryType;
  content: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  sourceRunId?: string;
  sourceProposalId?: string;
  importanceScore?: number;
  expiresInDays?: number;
}

export interface RetrieveMemoryInput {
  tenantId: string;
  userId?: string;
  agentId?: string;
  query: string;
  types?: MemoryType[];
  topK?: number;
  minScore?: number;
}

export interface CommitMemoryInput {
  tenantId: string;
  userId?: string;
  agentId?: string;
  runId?: string;
  facts: { kind: MemoryType; text: string; importance?: number; metadata?: Record<string, unknown> }[];
  summary?: string;
}

function buildNamespace(tenantId: string, userId?: string, agentId?: string, memoryType?: string): string {
  let ns = `mem:tenant:${tenantId}`;
  if (userId) ns += `:user:${userId}`;
  if (agentId) ns += `:agent:${agentId}`;
  if (memoryType) ns += `:${memoryType}`;
  return ns;
}

// ── Embedding via Azure OpenAI ─────────────────────────────────

let _embeddingCache = new Map<string, { embedding: number[]; ts: number }>();
const CACHE_TTL = 300_000;

async function embedViaOllama(text: string): Promise<number[]> {
  const host = process.env.OLLAMA_HOST || '127.0.0.1:11434';
  const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  return new Promise((resolve) => {
    const body = JSON.stringify({ model, input: text.slice(0, 8000) });
    const req = http.request(
      { hostname: host.split(':')[0], port: parseInt(host.split(':')[1] || '11434', 10), path: '/api/embed', method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const emb: number[] = parsed.embeddings?.[0] || [];
            if (emb.length === 0) { resolve(new Array(EMBEDDING_DIM).fill(0)); return; }
            if (emb.length < EMBEDDING_DIM) {
              resolve([...emb, ...new Array(EMBEDDING_DIM - emb.length).fill(0)]);
            } else {
              resolve(emb.slice(0, EMBEDDING_DIM));
            }
          } catch { resolve(new Array(EMBEDDING_DIM).fill(0)); }
        });
      },
    );
    req.on('error', () => resolve(new Array(EMBEDDING_DIM).fill(0)));
    req.on('timeout', () => { req.destroy(); resolve(new Array(EMBEDDING_DIM).fill(0)); });
    req.write(body);
    req.end();
  });
}

export async function embedText(text: string): Promise<number[]> {
  const cacheKey = text.slice(0, 200);
  const cached = _embeddingCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.embedding;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
  const deploymentName = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';

  if (!endpoint || !apiKey) {
    const ollamaResult = await embedViaOllama(text);
    if (ollamaResult.some(v => v !== 0)) {
      _embeddingCache.set(cacheKey, { embedding: ollamaResult, ts: Date.now() });
      return ollamaResult;
    }
    return new Array(EMBEDDING_DIM).fill(0);
  }

  const url = new URL(endpoint);
  const path = `/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`;
  const body = JSON.stringify({ input: text.slice(0, 8000) });

  return new Promise((resolve, _reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              logger.warn(`[MemoryStore] Azure embedding error: ${parsed.error} — trying Ollama`);
              embedViaOllama(text).then(resolve);
              return;
            }
            const emb = parsed.data?.[0]?.embedding;
            if (!emb || emb.length !== EMBEDDING_DIM) {
              logger.warn(`[MemoryStore] Unexpected embedding dimension: ${emb?.length}`);
              resolve(new Array(EMBEDDING_DIM).fill(0));
              return;
            }
            _embeddingCache.set(cacheKey, { embedding: emb, ts: Date.now() });
            if (_embeddingCache.size > 500) {
              const oldest = [..._embeddingCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
              if (oldest) _embeddingCache.delete(oldest[0]);
            }
            resolve(emb);
          } catch {
            resolve(new Array(EMBEDDING_DIM).fill(0));
          }
        });
      },
    );
    req.on('error', () => embedViaOllama(text).then(resolve));
    req.on('timeout', () => { req.destroy(); embedViaOllama(text).then(resolve); });
    req.write(body);
    req.end();
  });
}

export function vectorToSql(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

// ── Deduplication ──────────────────────────────────────────────

const DEDUP_SIMILARITY_THRESHOLD = 0.95;

/**
 * Check if a near-duplicate memory already exists.
 * Returns the existing memory_id if a duplicate is found, null otherwise.
 */
async function findDuplicate(
  schema: string,
  tenantId: string,
  embedding: number[],
  agentId?: string,
): Promise<string | null> {
  try {
    const conditions = ['tenant_id = $2', 'is_deleted = FALSE'];
    const params: unknown[] = [vectorToSql(embedding), tenantId];
    let idx = 3;
    if (agentId) {
      conditions.push(`agent_id = $${idx}`);
      params.push(agentId);
      idx++;
    }
    const result = await safeQuery(
      `SELECT memory_id, 1 - (embedding <=> $1::vector) AS similarity
       FROM "${schema}".agent_memories
       WHERE ${conditions.join(' AND ')}
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      params,
    );
    const row = getFirstRow(result);
    if (row && row.similarity >= DEDUP_SIMILARITY_THRESHOLD) {
      return row.memory_id;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Retention policies ─────────────────────────────────────────

const DEFAULT_RETENTION_DAYS: Record<MemoryType, number> = {
  working: 7,
  task: 90,
  tool: 180,
  personal: 365,
  session: 1,
  workflow: 30,
  workspace: 365,
  product: 365,
  platform: 365,
};

/**
 * Purge expired memories based on retention policies.
 * Deletes memories past their expires_at OR past the default retention for their type.
 */
export async function purgeExpiredMemories(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let totalPurged = 0;

  // Purge explicitly expired memories
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".agent_memories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING memory_id`,
      [tenantId],
    );
    totalPurged += result.rows.length;
  } catch { /* non-fatal */ }

  // Purge by default retention policies for memories without explicit expiry
  for (const [memType, days] of Object.entries(DEFAULT_RETENTION_DAYS)) {
    try {
      const result = await safeQuery(
        `UPDATE "${schema}".agent_memories
         SET is_deleted = TRUE, updated_at = NOW()
         WHERE tenant_id = $1 AND is_deleted = FALSE AND memory_type = $2
           AND expires_at IS NULL AND created_at < NOW() - make_interval(days => $3)
         RETURNING memory_id`,
        [tenantId, memType, days],
      );
      totalPurged += result.rows.length;
    } catch { /* non-fatal */ }
  }

  if (totalPurged > 0) {
    logger.info(`[MemoryStore] Purged ${totalPurged} expired memories for tenant ${tenantId}`);
  }
  return totalPurged;
}

/**
 * Calculate simple text similarity using Jaccard similarity on word sets
 * (Can be enhanced with embeddings later)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0.0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Cluster memories by semantic similarity
 */
function clusterMemoriesBySimilarity(
  memories: Array<{ memory_id: string; content: string; importance_score: number }>,
  similarityThreshold: number = 0.3,
): Array<Array<{ memory_id: string; content: string; importance_score: number }>> {
  const clusters: Array<Array<{ memory_id: string; content: string; importance_score: number }>> = [];
  const assigned = new Set<string>();
  
  for (const mem of memories) {
    if (assigned.has(mem.memory_id)) continue;
    
    const cluster = [mem];
    assigned.add(mem.memory_id);
    
    // Find similar memories
    for (const other of memories) {
      if (assigned.has(other.memory_id)) continue;
      
      const similarity = calculateTextSimilarity(mem.content, other.content);
      if (similarity >= similarityThreshold) {
        cluster.push(other);
        assigned.add(other.memory_id);
      }
    }
    
    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

/**
 * Consolidate similar memories within a namespace into summarized entries.
 * Enhanced with semantic clustering to group similar content together.
 * Requirements: 2.3 Enhanced Memory Consolidation
 */
export async function consolidateMemories(
  tenantId: string,
  agentId?: string,
): Promise<{ consolidated: number; summariesCreated: number }> {
  const schema = tenantSchema(tenantId);
  let consolidated = 0;
  let summariesCreated = 0;

  try {
    // Find groups with many memories that could be consolidated
    let groupQuery = `SELECT agent_id, memory_type, COUNT(*)::int AS cnt
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE AND importance_score < 0.7
       GROUP BY agent_id, memory_type
       HAVING COUNT(*) > 10`;
    const groupParams: unknown[] = [tenantId];
    if (agentId) {
      groupQuery = `SELECT agent_id, memory_type, COUNT(*)::int AS cnt
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE AND importance_score < 0.7 AND agent_id = $2
       GROUP BY agent_id, memory_type
       HAVING COUNT(*) > 10`;
      groupParams.push(agentId);
    }

    const groups = await safeQuery(groupQuery, groupParams);

    for (const group of groups.rows) {
      // Get oldest low-importance memories in this group
      const oldMemories = await safeQuery(
        `SELECT memory_id, content, importance_score, created_at
         FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND agent_id = $2 AND memory_type = $3
           AND is_deleted = FALSE AND importance_score < 0.7
         ORDER BY created_at ASC
         LIMIT 50`,
        [tenantId, group.agent_id, group.memory_type],
      );

      if (oldMemories.rows.length < 5) continue;

      // Cluster memories by semantic similarity
      const memoryList = oldMemories.rows.map((m: GenericRow) => ({
        memory_id: m.memory_id,
        content: m.content,
        importance_score: m.importance_score,
      }));

      const clusters = clusterMemoriesBySimilarity(memoryList, 0.3);

      // Process each cluster
      for (const cluster of clusters) {
        if (cluster.length < 3) continue; // Skip small clusters

        // Sort by importance (lower first) and take up to 20
        const sortedCluster = cluster
          .sort((a, b) => a.importance_score - b.importance_score)
          .slice(0, 20);

        // Create consolidated summary
        const combinedContent = sortedCluster.map((m) => m.content).join('\n---\n');
        const summaryContent = `[Consolidated ${sortedCluster.length} similar ${group.memory_type} memories for agent ${group.agent_id}]\n${combinedContent.slice(0, 4000)}`;

        // Calculate average importance for the summary
        const avgImportance = sortedCluster.reduce((sum, m) => sum + m.importance_score, 0) / sortedCluster.length;

        // Store the consolidated summary
        const summaryId = await storeMemory({
          tenantId,
          agentId: group.agent_id,
          memoryType: group.memory_type,
          content: summaryContent,
          summary: `Consolidated from ${sortedCluster.length} semantically similar memories`,
          metadata: {
            consolidated: true,
            sourceCount: sortedCluster.length,
            clusterSize: cluster.length,
            semanticClustering: true,
            sourceMemoryIds: sortedCluster.map((m) => m.memory_id),
          },
          importanceScore: Math.min(0.7, avgImportance + 0.1), // Slightly boost importance
        });

        if (summaryId) {
          summariesCreated++;
          // Soft-delete the originals
          const ids = sortedCluster.map((m) => m.memory_id);
          await safeQuery(
            `UPDATE "${schema}".agent_memories
             SET is_deleted = TRUE, updated_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{consolidated_into}', $2::jsonb)
             WHERE memory_id = ANY($1)`,
            [ids, JSON.stringify(summaryId)],
          );
          consolidated += ids.length;
        }
      }

      // Also handle remaining unclustered memories (old behavior for backward compatibility)
      const clusteredIds = new Set(
        clusters.flatMap((c) => c.map((m) => m.memory_id)),
      );
      const unclustered = memoryList.filter((m) => !clusteredIds.has(m.memory_id));

      if (unclustered.length >= 5) {
        const combinedContent = unclustered.map((m: GenericRow) => m.content).join('\n---\n');
        const summaryContent = `[Consolidated ${unclustered.length} ${group.memory_type} memories for agent ${group.agent_id}]\n${combinedContent.slice(0, 4000)}`;

        const summaryId = await storeMemory({
          tenantId,
          agentId: group.agent_id,
          memoryType: group.memory_type,
          content: summaryContent,
          summary: `Consolidated from ${unclustered.length} memories`,
          metadata: { consolidated: true, sourceCount: unclustered.length },
          importanceScore: 0.6,
        });

        if (summaryId) {
          summariesCreated++;
          const ids = unclustered.map((m: GenericRow) => m.memory_id);
          await safeQuery(
            `UPDATE "${schema}".agent_memories
             SET is_deleted = TRUE, updated_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{consolidated_into}', $2::jsonb)
             WHERE memory_id = ANY($1)`,
            [ids, JSON.stringify(summaryId)],
          );
          consolidated += ids.length;
        }
      }
    }
  } catch (err: unknown) {
    logger.warn(`[MemoryStore] consolidateMemories failed: ${toErrorMessage(err)}`);
  }

  return { consolidated, summariesCreated };
}

// ── Store ──────────────────────────────────────────────────────

export async function storeMemory(input: StoreMemoryInput): Promise<string | null> {
  // RBAC: verify caller has memory:write permission
  const hasPermission = await checkMemoryPermission(input.tenantId, input.userId, 'memory.store.write');
  if (!hasPermission) {
    logger.warn(`[MemoryStore] storeMemory blocked — user ${input.userId} lacks memory:write`);
    return null;
  }

  const schema = tenantSchema(input.tenantId);
  const namespace = buildNamespace(input.tenantId, input.userId, input.agentId, input.memoryType);

  let contentToStore = input.content;
  if (input.userId) {
    try {

      const { shouldRedactForUser, redactPII } = await import('../../platform/services/misc/pii-redaction.service');
      const shouldRedact = await shouldRedactForUser(input.tenantId, input.userId);
      if (shouldRedact) {
        const result = redactPII(contentToStore);
        contentToStore = result.text;
      }
    } catch { /* redaction non-fatal */ }
  }

  const embedding = await embedText(contentToStore);

  // Dedup check: skip if a near-identical memory already exists
  const existingId = await findDuplicate(schema, input.tenantId, embedding, input.agentId);
  if (existingId) {
    // Update importance if the new one is more important
    if ((input.importanceScore ?? 0.5) > 0.5) {
      await safeQuery(
        `UPDATE "${schema}".agent_memories
         SET importance_score = GREATEST(importance_score, $1), updated_at = NOW()
         WHERE memory_id = $2`,
        [input.importanceScore ?? 0.5, existingId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }
    return existingId;
  }

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null;

  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_memories
         (tenant_id, user_id, agent_id, memory_type, namespace, content, summary,
          metadata, source_run_id, source_proposal_id, embedding,
          importance_score, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, $12, $13)
       RETURNING memory_id`,
      [
        input.tenantId,
        input.userId || null,
        input.agentId || null,
        input.memoryType,
        namespace,
        contentToStore,
        input.summary || null,
        JSON.stringify(input.metadata || {}),
        input.sourceRunId || null,
        input.sourceProposalId || null,
        vectorToSql(embedding),
        input.importanceScore ?? 0.5,
        expiresAt,
      ],
    );
    return getFirstRow(result)?.memory_id || null;
  } catch (err: unknown) {
    logger.warn(`[MemoryStore] storeMemory failed: ${toErrorMessage(err)}`);
    return null;
  }
}

// ── Retrieve (vector similarity search) ────────────────────────

export async function retrieveMemories(input: RetrieveMemoryInput): Promise<MemoryEntry[]> {
  // RBAC: verify caller has memory:read permission
  const hasPermission = await checkMemoryPermission(input.tenantId, input.userId, 'memory.store.read');
  if (!hasPermission) {
    logger.warn(`[MemoryStore] retrieveMemories blocked — user ${input.userId} lacks memory:read`);
    return [];
  }

  const schema = tenantSchema(input.tenantId);
  const queryEmbedding = await embedText(input.query);
  const topK = input.topK || 8;

  const conditions: string[] = ['tenant_id = $2', 'is_deleted = FALSE'];
  const params: unknown[] = [vectorToSql(queryEmbedding), input.tenantId];
  let idx = 3;

  if (input.userId) {
    conditions.push(`(user_id = $${idx} OR user_id IS NULL)`);
    params.push(input.userId);
    idx++;
  } else {
    conditions.push('user_id IS NULL');
  }
  if (input.agentId) {
    conditions.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
    params.push(input.agentId);
    idx++;
  }
  if (input.types && input.types.length > 0) {
    conditions.push(`memory_type = ANY($${idx})`);
    params.push(input.types);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const result = await safeQuery(
      `SELECT memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
              content, summary, metadata, importance_score, created_at,
              1 - (embedding <=> $1::vector) AS similarity
       FROM "${schema}".agent_memories
       WHERE ${where}
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY embedding <=> $1::vector
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(topK)) || 50))}`,
      params,
    );

    await safeQuery(
      `INSERT INTO "${schema}".memory_access_log
         (tenant_id, user_id, agent_id, namespace, action, query_text, result_count)
       VALUES ($1, $2, $3, $4, 'retrieve', $5, $6)`,
      [input.tenantId, input.userId || null, input.agentId || null,
       buildNamespace(input.tenantId, input.userId, input.agentId),
       input.query.slice(0, 500), result.rows.length],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    if (result.rows.length > 0) {
      const ids = result.rows.map((r: GenericRow) => r.memory_id);
      await safeQuery(
        `UPDATE "${schema}".agent_memories
         SET access_count = access_count + 1, last_accessed_at = NOW()
         WHERE memory_id = ANY($1)`,
        [ids],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    return result.rows;
  } catch (err: unknown) {
    logger.warn(`[MemoryStore] retrieveMemories failed: ${toErrorMessage(err)}`);
    return [];
  }
}

// ── Commit (batch write after agent run) ───────────────────────

export async function commitMemories(input: CommitMemoryInput): Promise<string[]> {
  const ids: string[] = [];

  for (const fact of input.facts) {
    const id = await storeMemory({
      tenantId: input.tenantId,
      userId: input.userId,
      agentId: input.agentId,
      memoryType: fact.kind,
      content: fact.text,
      summary: input.summary,
      metadata: fact.metadata || {},
      sourceRunId: input.runId,
      importanceScore: fact.importance ?? 0.5,
    });
    if (id) ids.push(id);
  }

  const schema = tenantSchema(input.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".memory_access_log
       (tenant_id, user_id, agent_id, namespace, action, result_count)
     VALUES ($1, $2, $3, $4, 'commit', $5)`,
    [input.tenantId, input.userId || null, input.agentId || null,
     buildNamespace(input.tenantId, input.userId, input.agentId),
     ids.length],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return ids;
}

// ── Delete / Forget ────────────────────────────────────────────

export async function forgetMemories(
  tenantId: string,
  opts: { userId?: string; agentId?: string; memoryIds?: string[]; namespace?: string },
): Promise<number> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (opts.memoryIds && opts.memoryIds.length > 0) {
    conditions.push(`memory_id = ANY($${idx})`);
    params.push(opts.memoryIds);
    idx++;
  }
  if (opts.userId) {
    conditions.push(`user_id = $${idx}`);
    params.push(opts.userId);
    idx++;
  }
  if (opts.agentId) {
    conditions.push(`agent_id = $${idx}`);
    params.push(opts.agentId);
    idx++;
  }
  if (opts.namespace) {
    conditions.push(`namespace LIKE $${idx}`);
    params.push(`${opts.namespace}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const result = await safeQuery(
      `UPDATE "${schema}".agent_memories SET is_deleted = TRUE, updated_at = NOW()
       WHERE ${where} RETURNING memory_id`,
      params,
    );

    const count = result.rows.length;

    await safeQuery(
      `INSERT INTO "${schema}".memory_access_log
         (tenant_id, user_id, agent_id, namespace, action, memory_ids, result_count)
       VALUES ($1, $2, $3, $4, 'delete', $5, $6)`,
      [tenantId, opts.userId || null, opts.agentId || null,
       opts.namespace || buildNamespace(tenantId, opts.userId, opts.agentId),
       result.rows.map((r: GenericRow) => r.memory_id), count],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return count;
  } catch (err: unknown) {
    logger.warn(`[MemoryStore] forgetMemories failed: ${toErrorMessage(err)}`);
    return 0;
  }
}

// ── Search (for UI) ────────────────────────────────────────────

export async function searchMemories(
  tenantId: string,
  opts: { query?: string; userId?: string; agentId?: string; type?: MemoryType; limit?: number },
): Promise<MemoryEntry[]> {
  if (opts.query) {
    return retrieveMemories({
      tenantId,
      userId: opts.userId,
      agentId: opts.agentId,
      query: opts.query,
      types: opts.type ? [opts.type] : undefined,
      topK: opts.limit || 20,
    });
  }

  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['tenant_id = $1', 'is_deleted = FALSE'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (opts.userId) { conditions.push(`user_id = $${idx++}`); params.push(opts.userId); }
  if (opts.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(opts.agentId); }
  if (opts.type) { conditions.push(`memory_type = $${idx++}`); params.push(opts.type); }

  try {
    const result = await safeQuery(
      `SELECT memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
              content, summary, metadata, importance_score, created_at
       FROM "${schema}".agent_memories
       WHERE ${conditions.join(' AND ')}
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY importance_score DESC, created_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(opts.limit || 20)) || 50))}`,
      params,
    );
    return result.rows;
  } catch { return []; }
}

// ── Memory stats ───────────────────────────────────────────────

export async function getMemoryStats(tenantId: string): Promise<{
  total: number;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
  recentCommits: number;
}> {
  const schema = tenantSchema(tenantId);
  const defaults = { total: 0, byType: {}, byAgent: {}, recentCommits: 0 };
  try {
    const [totalR, typeR, agentR, recentR] = await Promise.allSettled([
      safeQuery(`SELECT COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE`, [tenantId]),
      safeQuery(`SELECT memory_type, COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE GROUP BY memory_type`, [tenantId]),
      safeQuery(`SELECT agent_id, COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE AND agent_id IS NOT NULL GROUP BY agent_id`, [tenantId]),
      safeQuery(`SELECT COUNT(*) as n FROM "${schema}".memory_access_log WHERE tenant_id = $1 AND action = 'commit' AND created_at > NOW() - INTERVAL '24 hours'`, [tenantId]),
    ]);

    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    if ((typeR as any).value) for (const r of (typeR as any).value.rows) byType[r.memory_type] = Number(r.n);
    if ((agentR as any).value) for (const r of (agentR as any).value.rows) byAgent[r.agent_id] = Number(r.n);

    return {

      total: Number((getFirstRow((totalR as any).value) as unknown)?.n ?? 0),
      byType,
      byAgent,

      recentCommits: Number((getFirstRow((recentR as any).value) as unknown)?.n ?? 0),
    };
  } catch { return defaults; }
}

// ── Working memory offload ─────────────────────────────────────

export async function offloadToMemory(
  tenantId: string,
  agentId: string,
  content: string,
  runId?: string,
): Promise<string | null> {
  return storeMemory({
    tenantId,
    agentId,
    memoryType: 'working',
    content,
    metadata: { offloaded: true, runId },
    sourceRunId: runId,
    importanceScore: 0.3,
    expiresInDays: 7,
  });
}

export async function reloadFromMemory(
  tenantId: string,
  memoryId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT content FROM "${schema}".agent_memories
       WHERE memory_id = $1 AND is_deleted = FALSE`,
      [memoryId],
    );
    return getFirstRow(result)?.content || null;
  } catch { return null; }
}
