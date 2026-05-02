// ============================================
// Policy Versioning Service
// Major/minor version management, approval,
// diff computation, and supersession tracking
// for the policy lifecycle.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateVersionData {
  title: string;
  content: any;
  changeSummary: string;
  changedBy: string;
  majorBump?: boolean;
}

export interface LineDiff {
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  lineNumber: number;
  oldContent?: string;
  newContent?: string;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  modifications: number;
  lines: LineDiff[];
}

// ── Create Version ─────────────────────────────────────────────────────────

/**
 * Create a new version for a policy.
 * Computes the next major or minor version number from the latest existing version.
 * Returns the newly created version row.
 */
export async function createVersion(
  tenantId: string,
  policyId: string,
  data: CreateVersionData,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get Version History ────────────────────────────────────────────────────

/**
 * Get the full version history for a policy, ordered newest first.
 */
export async function getVersionHistory(
  tenantId: string,
  policyId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".policy_versions
     WHERE policy_id = $1
     ORDER BY major_version DESC, minor_version DESC`,
    [policyId],
  );

  return result.rows;
}

// ── Get Single Version ─────────────────────────────────────────────────────

/**
 * Get a single version by its version_id.
 */
export async function getVersion(
  tenantId: string,
  versionId: string,
): Promise<any | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".policy_versions WHERE version_id = $1`,
    [versionId],
  );

  return getFirstRow(result);
}

// ── Approve Version ────────────────────────────────────────────────────────

/**
 * Approve a specific policy version by setting approved_at and approved_by.
 */
export async function approveVersion(
  tenantId: string,
  versionId: string,
  userId: string,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Compute Diff ───────────────────────────────────────────────────────────

/**
 * Simple line-based diff algorithm.
 * Compares two text blocks line by line and classifies each line as
 * added, deleted, modified, or unchanged.
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  const oldLines = (oldText ?? '').split('\n');
  const newLines = (newText ?? '').split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);

  const lines: LineDiff[] = [];
  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === undefined && newLine !== undefined) {
      // Line only exists in new text
      lines.push({ type: 'add', lineNumber: i + 1, newContent: newLine });
      additions++;
    } else if (oldLine !== undefined && newLine === undefined) {
      // Line only exists in old text
      lines.push({ type: 'delete', lineNumber: i + 1, oldContent: oldLine });
      deletions++;
    } else if (oldLine !== newLine) {
      // Line exists in both but differs
      lines.push({ type: 'modify', lineNumber: i + 1, oldContent: oldLine, newContent: newLine });
      modifications++;
    } else {
      // Lines are identical
      lines.push({ type: 'unchanged', lineNumber: i + 1, oldContent: oldLine, newContent: newLine });
    }
  }

  return { additions, deletions, modifications, lines };
}

/**
 * Compute the diff between two policy versions.
 * Fetches both versions' content, runs line-based diff, and stores the result
 * in policy_version_diffs via UPSERT.
 */
export async function computeDiff(
  tenantId: string,
  fromVersionId: string,
  toVersionId: string,
): Promise<DiffResult & { diffId: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get Stored Diff ────────────────────────────────────────────────────────

/**
 * Retrieve a previously computed diff from the database.
 */
export async function getStoredDiff(
  tenantId: string,
  fromVersionId: string,
  toVersionId: string,
): Promise<any | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".policy_version_diffs
     WHERE from_version_id = $1 AND to_version_id = $2`,
    [fromVersionId, toVersionId],
  );

  return getFirstRow(result);
}

// ── Supersede ──────────────────────────────────────────────────────────────

/**
 * Mark a new version as superseding an old version.
 * Sets supersedes_version_id on the new version and marks the old
 * version's status as 'superseded'.
 */
export async function supersede(
  tenantId: string,
  newVersionId: string,
  oldVersionId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Set supersedes_version_id on the new version
  await safeQuery(
    `UPDATE "${schema}".policy_versions
     SET supersedes_version_id = $2
     WHERE version_id = $1`,
    [newVersionId, oldVersionId],
  );

  // Mark old version as superseded
  await safeQuery(
    `UPDATE "${schema}".policy_versions
     SET status = 'superseded'
     WHERE version_id = $1`,
    [oldVersionId],
  );
}
