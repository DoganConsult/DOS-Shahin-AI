// ============================================
// AI Module — Repository Layer
// Encapsulates data access for ai_agent_registry,
// agent_memories, llm_usage_log, and tenant_llm_budgets.
// Services call these methods instead of raw safeQuery().
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface RecordUsageInput {
  tenant_id: string;
  agent_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  provider?: string;
  latency_ms?: number;
  cache_hit?: boolean;
  endpoint_type?: string;
}

export interface ListAgentVersionsFilter {
  asset_id?: string;
  approval_status?: string;
  deployment_status?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListMemoriesFilter {
  user_id?: string;
  agent_id?: string;
  memory_type?: string;
  namespace?: string;
  page?: number;
  pageSize?: number;
}

export interface StoreMemoryInput {
  tenant_id: string;
  user_id?: string;
  agent_id?: string;
  memory_type: string;
  namespace: string;
  content: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  importance_score?: number;
  embedding?: number[];
  expires_at?: string;
  source_run_id?: string;
  source_proposal_id?: string;
}

// ── Repository ───────────────────────────────────────

export class AIRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // ── Agent Registry ───────────────────────────────────

  async findAgentVersionById(versionId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ai_agent_registry WHERE agent_version_id = $1`,
      [versionId],
    );
    return getFirstRow(result);
  }

  async findAgentVersionsByAsset(assetId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ai_agent_registry
       WHERE asset_id = $1
       ORDER BY version_number DESC`,
      [assetId],
    );
    return result.rows;
  }

  async findAllAgentVersions(filters: ListAgentVersionsFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.asset_id) { conditions.push(`asset_id = $${idx++}`); params.push(filters.asset_id); }
    if (filters.approval_status) { conditions.push(`approval_status = $${idx++}`); params.push(filters.approval_status); }
    if (filters.deployment_status) { conditions.push(`deployment_status = $${idx++}`); params.push(filters.deployment_status); }
    if (filters.is_active !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(filters.is_active); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".ai_agent_registry ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".ai_agent_registry ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async findActiveAgentVersion(assetId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ai_agent_registry
       WHERE asset_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [assetId],
    );
    return getFirstRow(result);
  }

  async findPreviousAgentVersion(assetId: string, currentVersionNum: number): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ai_agent_registry
       WHERE asset_id = $1 AND version_number < $2
       ORDER BY version_number DESC LIMIT 1`,
      [assetId, currentVersionNum],
    );
    return getFirstRow(result);
  }

  // ── Agent Memories ───────────────────────────────────

  async findMemoryById(memoryId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".agent_memories
       WHERE memory_id = $1 AND is_deleted = FALSE`,
      [memoryId],
    );
    return getFirstRow(result);
  }

  async findAllMemories(filters: ListMemoriesFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['is_deleted = FALSE'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.user_id) { conditions.push(`user_id = $${idx++}`); params.push(filters.user_id); }
    if (filters.agent_id) { conditions.push(`agent_id = $${idx++}`); params.push(filters.agent_id); }
    if (filters.memory_type) { conditions.push(`memory_type = $${idx++}`); params.push(filters.memory_type); }
    if (filters.namespace) { conditions.push(`namespace ILIKE $${idx++}`); params.push(`%${filters.namespace}%`); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".agent_memories ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
              content, summary, metadata, importance_score, created_at
       FROM "${this.schema}".agent_memories ${where}
       ORDER BY importance_score DESC, created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async storeMemory(data: StoreMemoryInput): Promise<GenericRow | null> {
    const embeddingClause = data.embedding
      ? `, embedding`
      : '';
    const embeddingPlaceholder = data.embedding
      ? `, $${11}::vector`
      : '';

    const params: unknown[] = [
      data.tenant_id,
      data.user_id || null,
      data.agent_id || null,
      data.memory_type,
      data.namespace,
      data.content,
      data.summary || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      data.importance_score ?? 0.5,
      data.expires_at || null,
    ];
    if (data.embedding) {
      params.push(`[${data.embedding.join(',')}]`);
    }

    const result = await safeQuery(
      `INSERT INTO "${this.schema}".agent_memories
        (tenant_id, user_id, agent_id, memory_type, namespace, content,
         summary, metadata, importance_score, expires_at${embeddingClause})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10${embeddingPlaceholder})
       RETURNING memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
                 content, summary, metadata, importance_score, created_at`,
      params,
    );
    return getFirstRow(result);
  }

  async softDeleteMemory(memoryId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".agent_memories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE memory_id = $1 AND is_deleted = FALSE
       RETURNING memory_id`,
      [memoryId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async purgeExpiredMemories(tenantId: string): Promise<number> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".agent_memories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE
         AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING memory_id`,
      [tenantId],
    );
    return result.rows.length;
  }

  // ── LLM Usage Log ───────────────────────────────────

  async recordUsage(data: RecordUsageInput): Promise<void> {
    const totalTokens = data.input_tokens + data.output_tokens;
    await safeQuery(
      `INSERT INTO "${this.schema}".llm_usage_log
        (tenant_id, agent_id, model, input_tokens, output_tokens, total_tokens,
         cost_usd, provider, latency_ms, cache_hit, endpoint_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        data.tenant_id,
        data.agent_id,
        data.model,
        data.input_tokens,
        data.output_tokens,
        totalTokens,
        data.cost_usd,
        data.provider || 'tracked',
        data.latency_ms ?? 0,
        data.cache_hit ?? false,
        data.endpoint_type || 'cost-tracker',
      ],
    );
  }

  async getUsageStats(tenantId: string, daysBack = 30): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS calls,
              COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
              COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
              COALESCE(SUM(cost_usd), 0)::real AS cost_usd
       FROM "${this.schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)`,
      [tenantId, daysBack],
    );
    return getFirstRow(result);
  }

  async getAgentUsageStats(agentId: string, daysBack = 30): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS calls,
              COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
              COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
              COALESCE(SUM(cost_usd), 0)::real AS cost_usd
       FROM "${this.schema}".llm_usage_log
       WHERE agent_id = $1 AND created_at > NOW() - make_interval(days => $2)`,
      [agentId, daysBack],
    );
    return getFirstRow(result);
  }

  // ── LLM Budgets ──────────────────────────────────────

  async getBudget(tenantId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT monthly_token_limit, monthly_cost_limit, tokens_used_month, cost_used_month
       FROM "${this.schema}".tenant_llm_budgets WHERE tenant_id = $1`,
      [tenantId],
    );
    return getFirstRow(result);
  }

  async incrementBudgetUsage(tenantId: string, tokens: number, costUsd: number): Promise<void> {
    await safeQuery(
      `UPDATE "${this.schema}".tenant_llm_budgets
       SET tokens_used_month = tokens_used_month + $1,
           cost_used_month = cost_used_month + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`,
      [tokens, costUsd, tenantId],
    );
  }
}
