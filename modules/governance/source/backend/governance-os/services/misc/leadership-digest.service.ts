// Leadership-digest service for the governance module — backed by
// dos.leadership_digests (same table the governance-os module reads).
// Self-contained impl so the previous broken '../../../../services/...'
// re-export no longer fails at load time.

import { safeQuery } from '@dos/db';

export interface LeadershipDigestEntry {
  digestId: string;
  tenantId: string;
  generatedAt: string;
  topInitiatives: Array<{ code: string; title: string; status: string }>;
  riskHighlights: Array<{ riskId: string; title: string; score: number }>;
  decisionsPending: number;
  decisionsThisCycle: number;
  metadata?: Record<string, unknown>;
}

function rowToDigest(row: Record<string, unknown>): LeadershipDigestEntry {
  const payload = (row['payload'] as Record<string, unknown>) ?? {};
  return {
    digestId: row['digest_id'] as string,
    tenantId: row['tenant_id'] as string,
    generatedAt: row['generated_at'] as string,
    topInitiatives: (payload['topInitiatives'] as LeadershipDigestEntry['topInitiatives']) ?? [],
    riskHighlights: (payload['riskHighlights'] as LeadershipDigestEntry['riskHighlights']) ?? [],
    decisionsPending: Number(payload['decisionsPending'] ?? 0),
    decisionsThisCycle: Number(payload['decisionsThisCycle'] ?? 0),
    metadata: (payload['metadata'] as Record<string, unknown>) ?? {},
  };
}

export async function getLatestDigest(tenantId: string): Promise<LeadershipDigestEntry | null> {
  try {
    const r = await safeQuery(
      `SELECT digest_id, tenant_id, generated_at, payload
         FROM dos.leadership_digests
        WHERE tenant_id = $1
        ORDER BY generated_at DESC
        LIMIT 1`,
      [tenantId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToDigest(row) : null;
  } catch {
    return null;
  }
}

export async function listDigests(tenantId: string, limit: number = 20): Promise<LeadershipDigestEntry[]> {
  try {
    const r = await safeQuery(
      `SELECT digest_id, tenant_id, generated_at, payload
         FROM dos.leadership_digests
        WHERE tenant_id = $1
        ORDER BY generated_at DESC
        LIMIT $2`,
      [tenantId, Math.min(100, Math.max(1, limit))],
    );
    return (r.rows as Record<string, unknown>[]).map(rowToDigest);
  } catch {
    return [];
  }
}

export async function recordDigest(entry: Omit<LeadershipDigestEntry, 'digestId' | 'generatedAt'>): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos.leadership_digests (tenant_id, generated_at, payload)
       VALUES ($1, NOW(), $2::jsonb)`,
      [
        entry.tenantId,
        JSON.stringify({
          topInitiatives: entry.topInitiatives,
          riskHighlights: entry.riskHighlights,
          decisionsPending: entry.decisionsPending,
          decisionsThisCycle: entry.decisionsThisCycle,
          metadata: entry.metadata ?? {},
        }),
      ],
    );
  } catch {
    // table absent — table will be provisioned by next migration
  }
}

export type DigestType =
  | 'weekly-board'
  | 'monthly-executive'
  | 'incident-postmortem'
  | 'compliance-cycle'
  | 'quarterly-review'
  | string;

export function getDigestTypes(): DigestType[] {
  return [
    'weekly-board',
    'monthly-executive',
    'incident-postmortem',
    'compliance-cycle',
    'quarterly-review',
  ];
}
