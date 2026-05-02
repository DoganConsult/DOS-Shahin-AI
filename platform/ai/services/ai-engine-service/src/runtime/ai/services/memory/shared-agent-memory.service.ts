import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';

export interface SharedMemoryEntry {
  memory_id: string;
  tenant_id: string;
  memory_type: string;
  namespace: string;
  content: string;
  metadata: Record<string, unknown>;
  importance_score: number;
  created_at: string;
}

function buildSharedNamespace(tenantId: string, scope: string): string {
  return `mem:tenant:${tenantId}:shared:${scope}`;
}

export async function writeSharedMemory(
  tenantId: string,
  agentId: string,
  scope: string,
  content: string,
  metadata?: Record<string, unknown>,
  importance?: number,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const namespace = buildSharedNamespace(tenantId, scope);

  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_memories
         (tenant_id, user_id, agent_id, memory_type, namespace, content,
          metadata, importance_score, is_deleted)
       VALUES ($1, NULL, $2, 'task', $3, $4, $5, $6, FALSE)
       RETURNING memory_id`,
      [
        tenantId, agentId, namespace, content,
        JSON.stringify({ ...metadata, shared: true, writtenBy: agentId }),
        importance ?? 0.6,
      ],
    );
    return getFirstRow(result)?.memory_id || null;
  } catch {
    return null;
  }
}

export async function readSharedMemory(
  tenantId: string,
  scope: string,
  limit: number = 10,
): Promise<SharedMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  const namespace = buildSharedNamespace(tenantId, scope);

  try {
    const result = await safeQuery(
      `SELECT memory_id, tenant_id, memory_type, namespace, content, metadata,
              importance_score, created_at
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace = $2 AND is_deleted = FALSE
       ORDER BY importance_score DESC, created_at DESC
       LIMIT $3`,
      [tenantId, namespace, limit],
    );
    return result.rows.map((r: GenericRow) => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    })) as any;
  } catch {
    return [];
  }
}

export async function readAllSharedScopes(
  tenantId: string,
  agentId?: string,
  limit: number = 20,
): Promise<SharedMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  const nsPrefix = `mem:tenant:${tenantId}:shared:`;

  try {
    let q = `SELECT memory_id, tenant_id, memory_type, namespace, content, metadata,
                    importance_score, created_at
             FROM "${schema}".agent_memories
             WHERE tenant_id = $1 AND namespace LIKE $2 AND is_deleted = FALSE`;
    const params: unknown[] = [tenantId, nsPrefix + '%'];

    if (agentId) {
      q += ` AND (agent_id = $3 OR metadata->>'shared' = 'true')`;
      params.push(agentId);
    }

    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await safeQuery(q, params);
    return result.rows;
  } catch {
    return [];
  }
}

export async function writeAgentHandoffMemory(
  tenantId: string,
  fromAgent: string,
  toAgent: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  return writeSharedMemory(
    tenantId,
    fromAgent,
    `handoff:${fromAgent}:${toAgent}`,
    content,
    { ...metadata, fromAgent, toAgent, type: 'handoff' },
    0.8,
  );
}

export async function readHandoffMemory(
  tenantId: string,
  toAgent: string,
  limit: number = 5,
): Promise<SharedMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  const nsPattern = `mem:tenant:${tenantId}:shared:handoff:%:${toAgent}`;

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace LIKE $2 AND is_deleted = FALSE
       ORDER BY created_at DESC LIMIT $3`,
      [tenantId, nsPattern, limit],
    );
    return result.rows;
  } catch {
    return [];
  }
}
