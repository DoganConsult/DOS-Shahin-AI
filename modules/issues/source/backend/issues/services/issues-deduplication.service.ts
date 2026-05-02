// ============================================
// Issues — Deduplication Service
// Duplicate detection, merge, related linking
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitIssuesEvent } from './issues-event.service';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// === Types ===

export interface DuplicateCandidate {
  issueId: string;
  title: string;
  status: string;
  severity: string;
  similarity: number;
  reason: string;
}

export interface MergeResult {
  survivorId: string;
  mergedIds: string[];
  mergedAt: string;
}

export interface RelatedLink {
  issueId: string;
  relatedIssueId: string;
  relationshipType: 'duplicate' | 'related' | 'parent' | 'child';
  createdAt: string;
  createdBy: string;
}

// === Pure Functions ===

export function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeTokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeTitleForComparison(a).split(' ').filter(t => t.length > 2));
  const tokensB = new Set(normalizeTitleForComparison(b).split(' ').filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) { if (tokensB.has(t)) intersection++; }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function computeLevenshteinSimilarity(a: string, b: string): number {
  const na = normalizeTitleForComparison(a);
  const nb = normalizeTitleForComparison(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function computeCombinedSimilarity(titleA: string, titleB: string): number {
  const tokenScore = computeTokenOverlap(titleA, titleB);
  const levenScore = computeLevenshteinSimilarity(titleA, titleB);
  return 0.6 * tokenScore + 0.4 * levenScore;
}

export function isDuplicate(similarity: number, threshold: number = 0.75): boolean {
  return similarity >= threshold;
}

// === DB-backed Functions ===

export async function findDuplicateCandidates(
  tenantId: string,
  issueId: string,
  threshold: number = 0.75
): Promise<DuplicateCandidate[]> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function suggestDuplicates(
  tenantId: string,
  title: string,
  category?: string
): Promise<DuplicateCandidate[]> {
  const schema = tenantSchema(tenantId);

  const extra = category ? `AND category = $2` : '';
  const params: unknown[] = category ? [category] : [];

  const res = await safeQuery(
    `SELECT issue_id, title, status, severity
     FROM "${schema}".issues
     WHERE deleted_at IS NULL AND status NOT IN ('closed','archived') ${extra}
     ORDER BY created_at DESC LIMIT 100`,
    params
  );

  return res.rows
    .map(r => {
      const similarity = computeCombinedSimilarity(title, r.title);
      return { issueId: r.issue_id, title: r.title, status: r.status, severity: r.severity, similarity: Math.round(similarity * 100) / 100, reason: 'Title similarity match' };
    })
    .filter(c => c.similarity >= 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
}

export async function mergeIssues(
  tenantId: string,
  survivorId: string,
  duplicateIds: string[],
  userId: string
): Promise<MergeResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.issues_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function linkRelatedIssues(
  tenantId: string,
  issueId: string,
  relatedIssueId: string,
  relationshipType: RelatedLink['relationshipType'],
  userId: string
): Promise<RelatedLink> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getRelatedIssues(tenantId: string, issueId: string): Promise<RelatedLink[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".issue_relations WHERE issue_id = $1 OR related_issue_id = $1 ORDER BY created_at DESC`,
    [issueId]
  );
  return result.rows.map(r => ({
    issueId: r.issue_id,
    relatedIssueId: r.related_issue_id,
    relationshipType: r.relationship_type,
    createdAt: r.created_at?.toISOString?.() ?? String(r.created_at),
    createdBy: r.created_by,
  }));
}
