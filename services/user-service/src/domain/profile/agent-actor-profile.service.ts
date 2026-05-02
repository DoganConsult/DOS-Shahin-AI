import { safeQuery, tenantSchema } from '@dos/db';

export interface AgentProfile {
  agentId: string;
  tenantId: string;
  name: string;
  description: string | null;
  capabilities: string[];
  trustScore: number;
  status: 'active' | 'suspended' | 'retired';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileUpsertInput {
  agentId: string;
  name: string;
  description?: string;
  capabilities?: string[];
  status?: 'active' | 'suspended' | 'retired';
  metadata?: Record<string, unknown>;
}

function mapAgentRow(row: Record<string, unknown>): AgentProfile {
  return {
    agentId: String(row['agent_id'] ?? row['agentId']),
    tenantId: String(row['tenant_id'] ?? row['tenantId']),
    name: String(row['name'] ?? ''),
    description: row['description'] != null ? String(row['description']) : null,
    capabilities: Array.isArray(row['capabilities']) ? row['capabilities'] as string[] : [],
    trustScore: Number(row['trust_score'] ?? row['trustScore'] ?? 0),
    status: (row['status'] as AgentProfile['status']) ?? 'active',
    metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    createdAt: String(row['created_at'] ?? row['createdAt'] ?? ''),
    updatedAt: String(row['updated_at'] ?? row['updatedAt'] ?? ''),
  };
}

export function computeAgentTrustScore(profile: AgentProfile): number {
  let score = 50;
  score += Math.min(profile.capabilities.length * 5, 30);
  if (profile.status === 'active') score += 20;
  if (profile.status === 'suspended') score -= 30;
  if (profile.metadata['verified']) score += 10;
  return Math.max(0, Math.min(100, score));
}

export async function getAgentProfile(tenantId: string, agentId: string): Promise<AgentProfile | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".agent_profiles WHERE agent_id = $1 LIMIT 1`,
    [agentId],
  );
  return rows.length > 0 ? mapAgentRow(rows[0]) : null;
}

export async function listAgentProfiles(
  tenantId: string,
  filters: { status?: string } = {},
): Promise<AgentProfile[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".agent_profiles WHERE 1=1`;
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapAgentRow);
}

export async function upsertAgentProfile(
  tenantId: string,
  input: AgentProfileUpsertInput,
): Promise<AgentProfile> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".agent_profiles
       (agent_id, name, description, capabilities, status, metadata)
     VALUES ($1, $2, $3, $4::text[], $5, $6::jsonb)
     ON CONFLICT (agent_id) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           capabilities = EXCLUDED.capabilities,
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
     RETURNING *`,
    [
      input.agentId,
      input.name,
      input.description ?? null,
      input.capabilities ?? [],
      input.status ?? 'active',
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  if (!rows[0]) throw new Error(`[upsertAgentProfile] no row returned for agent ${input.agentId}`);
  return mapAgentRow(rows[0]);
}
