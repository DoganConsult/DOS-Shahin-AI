// DB-driven agent loader for AI-OS.
//
// Reads canonical agent rows from public.ai_agent_registry (seeded by
// 530_seed_agents_a01_a13.sql) and overlays them on the in-memory
// AGENT_DEFS map shipped by ai-engine-service. Cached per-process for
// 60 seconds to avoid hot-path DB hits.
//
// Cache key omits tenantId by design: ai_agent_registry is a public
// platform-wide catalogue (one row per canonical A01..A13 definition),
// not per-tenant overlay state. Per-tenant gating lives downstream in
// canAgentExecute() / isAgentModuleActive(), which both key on tenantId.

import { safeQuery } from '@dos/db';

export interface DbAgentDef {
  agentCode: string;
  name: string;
  domain: string;
  model?: string;
  temperature?: number;
  promptName?: string;
  datasetName?: string;
  capabilities?: string[];
  approvalStatus?: string;
  deploymentStatus?: string;
  isActive: boolean;
}

const TTL_MS = 60_000;
let cache: { at: number; rows: Map<string, DbAgentDef> } | null = null;

export async function loadAgentRegistry(force = false): Promise<Map<string, DbAgentDef>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = new Map<string, DbAgentDef>();
  try {
    const r: any = await safeQuery(
      `SELECT agent_config, capabilities, approval_status, deployment_status, is_active
         FROM public.ai_agent_registry
        WHERE is_active = TRUE
        ORDER BY updated_at DESC`,
      [],
    );
    for (const row of r?.rows ?? []) {
      const cfg = row.agent_config ?? {};
      const code = String(cfg.agentCode || '').toUpperCase();
      if (!code) continue;
      if (rows.has(code)) continue; // newest version wins
      rows.set(code, {
        agentCode: code,
        name: String(cfg.name ?? code),
        domain: String(cfg.domain ?? 'unknown'),
        model: cfg.model,
        temperature: cfg.temperature,
        promptName: cfg.promptName,
        datasetName: cfg.datasetName,
        capabilities: Array.isArray(row.capabilities) ? row.capabilities : undefined,
        approvalStatus: row.approval_status,
        deploymentStatus: row.deployment_status,
        isActive: row.is_active !== false,
      });
    }
  } catch {
    // DB unavailable — fall back to empty (caller layers in-memory defaults).
  }
  cache = { at: Date.now(), rows };
  return rows;
}

export async function loadAgentDefFromDb(agentCode: string): Promise<DbAgentDef | null> {
  const m = await loadAgentRegistry();
  return m.get(String(agentCode || '').toUpperCase()) ?? null;
}

export function invalidateAgentRegistryCache(): void {
  cache = null;
}
