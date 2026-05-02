// ============================================================================
// Shahin-Ai — Policy Analysis Service (F30-F31: Conflict & Redundancy Detection)
//
// Detects conflicts and redundancies across tenant policy documents:
//   - Text similarity analysis (Jaccard + keyword overlap)
//   - Contradictory requirements, scope overlap, authority & timeline conflicts
//   - Redundancy detection with consolidation recommendations
//   - Combined analysis reports
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────

export type ConflictType =
  | 'contradictory_requirements'
  | 'scope_overlap'
  | 'authority_conflict'
  | 'timeline_conflict';

export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PolicyConflict {
  conflictId: string;
  policyA: { policyId: string; title: string; clause?: string };
  policyB: { policyId: string; title: string; clause?: string };
  conflictType: ConflictType;
  description: string;
  severity: ConflictSeverity;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PolicyRedundancy {
  redundancyId: string;
  policies: { policyId: string; title: string }[];
  overlapPercent: number;
  description: string;
  consolidationRecommendation: string;
  detectedAt: string;
}

export interface PolicyAnalysisReport {
  tenantId: string;
  generatedAt: string;
  totalPolicies: number;
  conflicts: PolicyConflict[];
  redundancies: PolicyRedundancy[];
  summary: {
    totalConflicts: number;
    criticalConflicts: number;
    highConflicts: number;
    totalRedundancies: number;
    avgOverlapPercent: number;
  };
}

interface PolicyRow {
  policy_id: string;
  title: string;
  title_en?: string;
  content?: string;
  body?: string;
  scope?: string;
  authority?: string;
  owner_id?: string;
  effective_date?: string;
  expiry_date?: string;
  review_date?: string;
  status?: string;
  clauses?: string;
  category?: string;
}

// ── Contradictory keyword pairs for conflict detection ─────────────────────

const CONTRADICTORY_PAIRS: [string[], string[]][] = [
  [['must', 'required', 'mandatory', 'shall'], ['must not', 'prohibited', 'forbidden', 'shall not']],
  [['allow', 'permitted', 'may'], ['deny', 'prohibited', 'restricted', 'forbidden']],
  [['approve', 'authorize'], ['reject', 'deny', 'block']],
  [['encrypt', 'encryption required'], ['unencrypted', 'plaintext allowed']],
  [['retain', 'preserve', 'keep'], ['delete', 'destroy', 'purge', 'dispose']],
  [['centralized', 'centralize'], ['decentralized', 'distributed']],
  [['internal only', 'confidential'], ['public', 'open access', 'share externally']],
];

// ── Authority keywords ────────────────────────────────────────────────────

const AUTHORITY_KEYWORDS = [
  'approves', 'authorizes', 'responsible for', 'accountable for',
  'delegates', 'oversees', 'manages', 'controls', 'decides',
  'signs off', 'reviews and approves', 'final authority',
];

// ── Text Analysis Utilities ───────────────────────────────────────────────

/** Tokenize text into lowercase word set */
function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/** Compute Jaccard similarity between two token sets */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Compute keyword overlap ratio (what percent of setA tokens appear in setB) */
function keywordOverlap(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
  }
  return overlap / tokensA.size;
}

/** Combined text similarity score using Jaccard + keyword overlap */
function textSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const overlapAB = keywordOverlap(textA, textB);
  const overlapBA = keywordOverlap(textB, textA);
  // Weighted combination: Jaccard 40%, bidirectional overlap 60%
  return jaccard * 0.4 + ((overlapAB + overlapBA) / 2) * 0.6;
}

/** Extract full text from a policy row for comparison */
function extractPolicyText(row: PolicyRow): string {
  const parts = [
    row.title || row.title_en || '',
    row.content || row.body || '',
    row.scope || '',
    row.clauses || '',
  ];
  return parts.join(' ').trim();
}

/** Check if two texts contain contradictory requirements */
function findContradictions(textA: string, textB: string): string | null {
  const lowerA = (textA || '').toLowerCase();
  const lowerB = (textB || '').toLowerCase();

  for (const [groupA, groupB] of CONTRADICTORY_PAIRS) {
    const aHasPositive = groupA.some(kw => lowerA.includes(kw));
    const bHasNegative = groupB.some(kw => lowerB.includes(kw));
    const aHasNegative = groupA.some(kw => lowerB.includes(kw));
    const bHasPositive = groupB.some(kw => lowerA.includes(kw));

    if ((aHasPositive && bHasNegative) || (aHasNegative && bHasPositive)) {
      const matchedA = groupA.find(kw => lowerA.includes(kw) || lowerB.includes(kw)) || '';
      const matchedB = groupB.find(kw => lowerA.includes(kw) || lowerB.includes(kw)) || '';
      return `Contradictory terms detected: "${matchedA}" vs "${matchedB}"`;
    }
  }
  return null;
}

/** Check if two policies have overlapping scopes */
function detectScopeOverlap(rowA: PolicyRow, rowB: PolicyRow): string | null {
  const scopeA = (rowA.scope || rowA.category || '').toLowerCase();
  const scopeB = (rowB.scope || rowB.category || '').toLowerCase();
  if (!scopeA || !scopeB) return null;

  const similarity = textSimilarity(scopeA, scopeB);
  if (similarity > 0.5) {
    return `Policies share overlapping scope areas (${(similarity * 100).toFixed(0)}% similarity)`;
  }
  return null;
}

/** Check if two policies have conflicting authority assignments */
function detectAuthorityConflict(textA: string, textB: string): string | null {
  const lowerA = textA.toLowerCase();
  const lowerB = textB.toLowerCase();

  const authInA = AUTHORITY_KEYWORDS.filter(kw => lowerA.includes(kw));
  const authInB = AUTHORITY_KEYWORDS.filter(kw => lowerB.includes(kw));

  if (authInA.length > 0 && authInB.length > 0) {
    // Both policies assign authority -- potential conflict if they cover same domain
    const domainSimilarity = textSimilarity(textA, textB);
    if (domainSimilarity > 0.3) {
      return `Both policies assign authority roles in overlapping domains: [${authInA[0]}] vs [${authInB[0]}]`;
    }
  }
  return null;
}

/** Check if two policies have conflicting timelines */
function detectTimelineConflict(rowA: PolicyRow, rowB: PolicyRow): string | null {
  if (!rowA.effective_date || !rowB.effective_date) return null;

  const effA = new Date(rowA.effective_date);
  const effB = new Date(rowB.effective_date);
  const expA = rowA.expiry_date ? new Date(rowA.expiry_date) : null;
  const expB = rowB.expiry_date ? new Date(rowB.expiry_date) : null;

  // Check if active periods overlap and scopes are similar
  const scopeSimilarity = textSimilarity(
    extractPolicyText(rowA),
    extractPolicyText(rowB)
  );

  if (scopeSimilarity > 0.4) {
    // Check if one policy should supersede the other
    if (expA && effB > expA) return null; // B starts after A expires
    if (expB && effA > expB) return null; // A starts after B expires

    if (effA.getTime() !== effB.getTime()) {
      return `Overlapping effective periods for similar policies: ` +
        `Policy A effective ${rowA.effective_date}, Policy B effective ${rowB.effective_date}`;
    }
  }
  return null;
}

/** Determine conflict severity based on conflict type and text similarity */
function assessSeverity(conflictType: ConflictType, similarity: number): ConflictSeverity {
  if (conflictType === 'contradictory_requirements') {
    return similarity > 0.6 ? 'critical' : 'high';
  }
  if (conflictType === 'authority_conflict') {
    return similarity > 0.5 ? 'high' : 'medium';
  }
  if (conflictType === 'timeline_conflict') {
    return 'medium';
  }
  // scope_overlap
  return similarity > 0.7 ? 'medium' : 'low';
}

// ── Exported Functions ────────────────────────────────────────────────────

/**
 * Detect conflicts between policies within a tenant.
 * Compares all active policy pairs using text similarity and keyword analysis.
 */
export async function detectConflicts(tenantId: string): Promise<PolicyConflict[]> {
  const schema = tenantSchema(tenantId);

  // Fetch all active policies
  const policiesRes = await safeQuery(
    `SELECT policy_id, title, title_en, content, body, scope, authority,
            owner_id, effective_date, expiry_date, review_date, status,
            clauses, category
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived', 'deleted')
     ORDER BY created_at DESC`,
    []
  );

  const policies: PolicyRow[] = policiesRes.rows || [];
  if (policies.length < 2) return [];

  // Also fetch regulatory requirements for cross-reference
  let regulatoryReqs: PolicyRow[] = [];
  try {
    const regRes = await safeQuery(
      `SELECT requirement_id AS policy_id,
              title, title_en, description AS content,
              scope, NULL AS authority, NULL AS owner_id,
              effective_date, NULL AS expiry_date, NULL AS review_date,
              'active' AS status, NULL AS clauses, category
       FROM "${schema}".regulatory_requirements
       WHERE status = 'active'`,
      []
    );
    regulatoryReqs = regRes.rows || [];
  } catch {
    // Table may not exist -- non-fatal
  }

  const allDocs = [...policies, ...regulatoryReqs];
  const conflicts: PolicyConflict[] = [];

  // Compare each pair of documents
  for (let i = 0; i < allDocs.length; i++) {
    for (let j = i + 1; j < allDocs.length; j++) {
      const rowA = allDocs[i];
      const rowB = allDocs[j];
      const textA = extractPolicyText(rowA);
      const textB = extractPolicyText(rowB);
      const similarity = textSimilarity(textA, textB);

      // Skip pairs with very low similarity -- unlikely to conflict
      if (similarity < 0.15) continue;

      // Check for contradictory requirements
      const contradiction = findContradictions(textA, textB);
      if (contradiction) {
        conflicts.push({
          conflictId: uuid(),
          policyA: { policyId: rowA.policy_id, title: rowA.title || rowA.title_en || '' },
          policyB: { policyId: rowB.policy_id, title: rowB.title || rowB.title_en || '' },
          conflictType: 'contradictory_requirements',
          description: contradiction,
          severity: assessSeverity('contradictory_requirements', similarity),
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for scope overlap
      const scopeConflict = detectScopeOverlap(rowA, rowB);
      if (scopeConflict) {
        conflicts.push({
          conflictId: uuid(),
          policyA: { policyId: rowA.policy_id, title: rowA.title || rowA.title_en || '' },
          policyB: { policyId: rowB.policy_id, title: rowB.title || rowB.title_en || '' },
          conflictType: 'scope_overlap',
          description: scopeConflict,
          severity: assessSeverity('scope_overlap', similarity),
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for authority conflicts
      const authConflict = detectAuthorityConflict(textA, textB);
      if (authConflict) {
        conflicts.push({
          conflictId: uuid(),
          policyA: { policyId: rowA.policy_id, title: rowA.title || rowA.title_en || '' },
          policyB: { policyId: rowB.policy_id, title: rowB.title || rowB.title_en || '' },
          conflictType: 'authority_conflict',
          description: authConflict,
          severity: assessSeverity('authority_conflict', similarity),
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for timeline conflicts
      const timeConflict = detectTimelineConflict(rowA, rowB);
      if (timeConflict) {
        conflicts.push({
          conflictId: uuid(),
          policyA: { policyId: rowA.policy_id, title: rowA.title || rowA.title_en || '' },
          policyB: { policyId: rowB.policy_id, title: rowB.title || rowB.title_en || '' },
          conflictType: 'timeline_conflict',
          description: timeConflict,
          severity: assessSeverity('timeline_conflict', similarity),
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }
  }

  // Persist detected conflicts
  for (const conflict of conflicts) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".policy_conflicts
         (conflict_id, policy_a_id, policy_b_id, conflict_type, description,
          severity, detected_at, resolved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (conflict_id) DO NOTHING`,
        [
          conflict.conflictId, conflict.policyA.policyId, conflict.policyB.policyId,
          conflict.conflictType, conflict.description,
          conflict.severity, conflict.detectedAt, false,
        ]
      );
    } catch {
      // Table may not exist yet -- non-fatal
    }
  }

  if (conflicts.length > 0) {

    eventBus.publish('policy.violated' as any, {
      tenantId,
      type: 'conflict_detection',
      conflictCount: conflicts.length,
      criticalCount: conflicts.filter(c => c.severity === 'critical').length,
    });
  }

  return conflicts;
}

/**
 * Detect redundant policies within a tenant.
 * Identifies policies with >70% textual overlap that may be consolidated.
 */
export async function detectRedundancies(tenantId: string): Promise<PolicyRedundancy[]> {
  const schema = tenantSchema(tenantId);

  const policiesRes = await safeQuery(
    `SELECT policy_id, title, title_en, content, body, scope, clauses, category
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived', 'deleted')
     ORDER BY created_at DESC`,
    []
  );

  const policies: PolicyRow[] = policiesRes.rows || [];
  if (policies.length < 2) return [];

  const REDUNDANCY_THRESHOLD = 0.70;
  const redundancies: PolicyRedundancy[] = [];

  // Track which policies have already been grouped to avoid duplicates
  const grouped = new Set<string>();

  for (let i = 0; i < policies.length; i++) {
    if (grouped.has(policies[i].policy_id)) continue;

    const textI = extractPolicyText(policies[i]);
    const group: PolicyRow[] = [policies[i]];

    for (let j = i + 1; j < policies.length; j++) {
      if (grouped.has(policies[j].policy_id)) continue;

      const textJ = extractPolicyText(policies[j]);
      const similarity = textSimilarity(textI, textJ);

      if (similarity >= REDUNDANCY_THRESHOLD) {
        group.push(policies[j]);
        grouped.add(policies[j].policy_id);
      }
    }

    if (group.length > 1) {
      grouped.add(policies[i].policy_id);

      // Calculate average pairwise overlap for the group
      let totalOverlap = 0;
      let pairCount = 0;
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          totalOverlap += textSimilarity(
            extractPolicyText(group[a]),
            extractPolicyText(group[b])
          );
          pairCount++;
        }
      }
      const avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0;

      const titles = group.map(p => p.title || p.title_en || p.policy_id);
      redundancies.push({
        redundancyId: uuid(),
        policies: group.map(p => ({
          policyId: p.policy_id,
          title: p.title || p.title_en || '',
        })),
        overlapPercent: Math.round(avgOverlap * 100),
        description: `${group.length} policies share ${Math.round(avgOverlap * 100)}% textual overlap: ${titles.join(', ')}`,
        consolidationRecommendation: group.length === 2
          ? `Consider merging "${titles[0]}" and "${titles[1]}" into a single comprehensive policy.`
          : `Consider consolidating ${group.length} overlapping policies into a unified document covering shared requirements.`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Persist redundancy records
  for (const redundancy of redundancies) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".policy_redundancies
         (redundancy_id, policy_ids, overlap_percent, description,
          consolidation_recommendation, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (redundancy_id) DO NOTHING`,
        [
          redundancy.redundancyId,
          JSON.stringify(redundancy.policies.map(p => p.policyId)),
          redundancy.overlapPercent,
          redundancy.description,
          redundancy.consolidationRecommendation,
          redundancy.detectedAt,
        ]
      );
    } catch {
      // Table may not exist yet -- non-fatal
    }
  }

  return redundancies;
}

/**
 * Generate a combined policy analysis report with conflicts and redundancies.
 */
export async function getAnalysisReport(tenantId: string): Promise<PolicyAnalysisReport> {
  const schema = tenantSchema(tenantId);

  // Count total active policies
  let totalPolicies = 0;
  try {
    const countRes = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".policies
       WHERE status NOT IN ('retired', 'archived', 'deleted')`,
      []
    );
    totalPolicies = parseInt(countRes.rows[0]?.cnt) || 0;
  } catch {
    totalPolicies = 0;
  }

  // Run both analyses
  const [conflicts, redundancies] = await Promise.all([
    detectConflicts(tenantId),
    detectRedundancies(tenantId),
  ]);

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
  const highConflicts = conflicts.filter(c => c.severity === 'high').length;
  const avgOverlap = redundancies.length > 0
    ? redundancies.reduce((sum, r) => sum + r.overlapPercent, 0) / redundancies.length
    : 0;

  const report: PolicyAnalysisReport = {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalPolicies,
    conflicts,
    redundancies,
    summary: {
      totalConflicts: conflicts.length,
      criticalConflicts,
      highConflicts,
      totalRedundancies: redundancies.length,
      avgOverlapPercent: Math.round(avgOverlap),
    },
  };

  eventBus.publish('policy.review_due' as any, {
    tenantId,
    type: 'analysis_report_generated',
    summary: report.summary,
  });

  return report;
}
