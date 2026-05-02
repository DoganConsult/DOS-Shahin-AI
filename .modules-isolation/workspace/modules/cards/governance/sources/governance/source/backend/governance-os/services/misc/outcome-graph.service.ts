// ============================================
// Governance-OS — Outcome Graph Service
// Links governance initiatives to business outcomes,
// computes impact chains and module-level outcome scores.
// Owner: DOS — governance-os module (Law 2)
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────

/** Category of an outcome link — matches the canonical misc/ variant */
export type LinkCategory =
  | 'task_to_milestone'
  | 'action_to_outcome'
  | 'control_to_readiness'
  | 'evidence_to_milestone'
  | 'finding_to_exposure'
  | 'risk_to_posture'
  | 'initiative_to_artifact'
  | 'activity_to_kpi'
  | 'qiyas_to_maturity';

export interface OutcomeLink {
  id: string;
  category: LinkCategory;
  sourceId: string;
  targetId: string;
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface OutcomeNode {
  id: string;
  nodeType: 'initiative' | 'outcome' | 'milestone' | 'kpi' | 'control' | 'risk';
  label: string;
  moduleCode: string;
  score: number;
}

export interface OutcomeEdge {
  source: string;
  target: string;
  category: LinkCategory;
  weight: number;
}

export interface OutcomeGraph {
  nodes: OutcomeNode[];
  edges: OutcomeEdge[];
  totalScore: number;
  moduleScores: Record<string, number>;
}

// ── Outcome Links ──────────────────────────────────────────────────

/**
 * Retrieve outcome links for a given initiative, optionally filtered by category.
 * Queries governance_os_outcome_links in the tenant schema.
 */
export async function getOutcomeLinks(
  tenantId: string,
  initiativeId?: string,
  category?: LinkCategory,
): Promise<OutcomeLink[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (initiativeId) {
    conditions.push(`(source_id = $${paramIdx} OR target_id = $${paramIdx})`);
    params.push(initiativeId);
    paramIdx++;
  }
  if (category) {
    conditions.push(`category = $${paramIdx}`);
    params.push(category);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await safeQuery(
      `SELECT id, category, source_id, target_id, weight, metadata
       FROM "${schema}".governance_os_outcome_links
       ${whereClause}
       ORDER BY category, source_id`,
      params,
    );

    return rows.map((r: GenericRow) => ({
      id: r.id,
      category: r.category as LinkCategory,
      sourceId: r.source_id,
      targetId: r.target_id,
      weight: r.weight ?? 1,
      metadata: r.metadata ?? undefined,
    }));
  } catch (err: unknown) {
    logger.error(`[OutcomeGraph] Failed to fetch outcome links for tenant ${tenantId}: ${String(err)}`);
    return [];
  }
}

// ── Impact Chain ───────────────────────────────────────────────────

/**
 * Trace the full chain of initiatives/artifacts affecting an outcome.
 * Uses BFS over outcome links starting from the given outcomeId.
 */
export async function getImpactChain(
  tenantId: string,
  outcomeId: string,
): Promise<OutcomeLink[]> {
  const allLinks = await getOutcomeLinks(tenantId);
  const chain: OutcomeLink[] = [];
  const visited = new Set<string>();
  const queue: string[] = [outcomeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const link of allLinks) {
      // Follow both forward (source->target) and reverse (target->source)
      if (link.sourceId === current && !visited.has(link.targetId)) {
        chain.push(link);
        queue.push(link.targetId);
      }
      if (link.targetId === current && !visited.has(link.sourceId)) {
        chain.push(link);
        queue.push(link.sourceId);
      }
    }
  }

  return chain;
}

// ── Module Outcome Score ───────────────────────────────────────────

/**
 * Aggregate outcome score for a specific module.
 * Looks at all links where source or target belongs to the module
 * and computes a weighted average expressed as a 0–100 percentage.
 */
export async function getModuleOutcomeScore(
  tenantId: string,
  moduleCode: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    // Query outcomes that reference this module code
    const { rows } = await safeQuery(
      `SELECT ol.weight, o.score
       FROM "${schema}".governance_os_outcome_links ol
       LEFT JOIN "${schema}".governance_os_outcomes o
         ON o.outcome_id = ol.target_id
       WHERE ol.source_id LIKE $1 || '%'
          OR ol.target_id LIKE $1 || '%'
          OR o.module_code = $1`,
      [moduleCode],
    );

    if (rows.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const r of rows) {
      const weight = Number(r.weight) || 1;
      const score = Number(r.score) || 0;
      totalWeight += weight;
      weightedSum += weight * score;
    }

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  } catch (err: unknown) {
    logger.error(`[OutcomeGraph] Failed to compute module outcome score: ${String(err)}`);
    // Fallback: use the simpler link-count heuristic
    const links = await getOutcomeLinks(tenantId);
    const moduleLinks = links.filter(
      (l) => l.sourceId.startsWith(moduleCode) || l.targetId.startsWith(moduleCode),
    );
    if (moduleLinks.length === 0) return 0;
    return Math.round(
      (moduleLinks.reduce((sum, l) => sum + l.weight, 0) / moduleLinks.length) * 100,
    );
  }
}

// ── Full Outcome Graph ─────────────────────────────────────────────

/**
 * Compute the full outcome graph for a tenant — nodes (outcomes, initiatives)
 * and edges (links) with aggregated module scores.
 */
export async function computeOutcomeGraph(tenantId: string): Promise<OutcomeGraph> {
  const schema = tenantSchema(tenantId);

  // Fetch all outcome nodes
  let outcomeNodes: OutcomeNode[] = [];
  try {
    const { rows: outcomes } = await safeQuery(
      `SELECT outcome_id, outcome_type, label, module_code, score
       FROM "${schema}".governance_os_outcomes
       WHERE deleted_at IS NULL
       ORDER BY module_code, outcome_type`,
    );
    outcomeNodes = outcomes.map((r: GenericRow) => ({
      id: r.outcome_id,
      nodeType: r.outcome_type || 'outcome',
      label: r.label || r.outcome_id,
      moduleCode: r.module_code || 'unknown',
      score: Number(r.score) || 0,
    }));
  } catch (err: unknown) {
    logger.warn(`[OutcomeGraph] Could not load outcome nodes: ${String(err)}`);
  }

  // Fetch all initiative nodes
  let initiativeNodes: OutcomeNode[] = [];
  try {
    const { rows: initiatives } = await safeQuery(
      `SELECT initiative_id, name, module_code, progress_pct
       FROM "${schema}".governance_os_initiatives
       WHERE deleted_at IS NULL
       ORDER BY module_code`,
    );
    initiativeNodes = initiatives.map((r: GenericRow) => ({
      id: r.initiative_id,
      nodeType: 'initiative' as const,
      label: r.name || r.initiative_id,
      moduleCode: r.module_code || 'unknown',
      score: Number(r.progress_pct) || 0,
    }));
  } catch (err: unknown) {
    logger.warn(`[OutcomeGraph] Could not load initiative nodes: ${String(err)}`);
  }

  const nodes = [...outcomeNodes, ...initiativeNodes];

  // Fetch all edges
  const allLinks = await getOutcomeLinks(tenantId);
  const edges: OutcomeEdge[] = allLinks.map((l) => ({
    source: l.sourceId,
    target: l.targetId,
    category: l.category,
    weight: l.weight,
  }));

  // Aggregate module scores
  const moduleSet = new Set(nodes.map((n) => n.moduleCode));
  const moduleScores: Record<string, number> = {};
  for (const code of moduleSet) {
    if (code === 'unknown') continue;
    moduleScores[code] = await getModuleOutcomeScore(tenantId, code);
  }

  const totalScore =
    Object.values(moduleScores).length > 0
      ? Math.round(
          Object.values(moduleScores).reduce((a, b) => a + b, 0) /
            Object.values(moduleScores).length,
        )
      : 0;

  return { nodes, edges, totalScore, moduleScores };
}
