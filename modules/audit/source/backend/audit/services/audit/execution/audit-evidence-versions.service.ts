// ============================================
// Shahin — Audit Evidence Versions Service
// Evidence version history tracking
// Table: evidence_versions (existing)
// ============================================

import { v4 as _uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all versions for an evidence item ──────────────────────────

export async function listVersions(tenantId: string, evidenceId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".evidence_versions
     WHERE evidence_id = $1
     ORDER BY version_number DESC`,
    [evidenceId]
  );
  return result.rows;
}

// ── Get a specific version by ID ────────────────────────────────────

export async function getVersionById(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".evidence_versions
     WHERE id = $1`,
    [id]
  );
  return getFirstRow(result) || null;
}

// ── Get the latest version for an evidence item ─────────────────────

export async function getLatestVersion(tenantId: string, evidenceId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".evidence_versions
     WHERE evidence_id = $1
     ORDER BY version_number DESC
     LIMIT 1`,
    [evidenceId]
  );
  return getFirstRow(result) || null;
}
