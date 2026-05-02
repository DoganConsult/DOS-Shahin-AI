// ============================================
// Shahin — Audit CAPA Effectiveness Service
// Re-testing CAPA effectiveness after remediation
// Table: capa_effectiveness_tests
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List effectiveness tests for a CAPA plan ─────────────────────────

export async function listTests(tenantId: string, capaId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".capa_effectiveness_tests
     WHERE capa_id = $1
     ORDER BY created_at DESC`,
    [capaId]
  );
  return result.rows;
}

// ── Create a new effectiveness test ──────────────────────────────────

export async function createTest(tenantId: string, data: {
  capa_id: string;
  finding_id: string;
  tester_id: string;
  result: string;
  evidence_notes?: string;
  reopen_finding?: boolean;
}) {
  const s = tenantSchema(tenantId);
  const testId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".capa_effectiveness_tests
       (test_id, capa_id, finding_id, tester_id, result, evidence_notes, reopen_finding, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW()) RETURNING *`,
    [testId, data.capa_id, data.finding_id, data.tester_id, data.result,
     data.evidence_notes || null, data.reopen_finding ?? false]
  );

  // If test indicates ineffective and reopen is requested, reopen the finding
  if (data.reopen_finding && data.result === 'ineffective') {
    await safeQuery(
      `UPDATE "${s}".findings SET status = 'open', updated_at = NOW()
       WHERE finding_id = $1 AND deleted_at IS NULL`,
      [data.finding_id]
    );
  }

  return getFirstRow(result);
}

// ── Get effectiveness rate across all tests ──────────────────────────

export async function getEffectivenessRate(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_tests,
       COUNT(*) FILTER (WHERE result = 'effective')::int AS effective_count,
       COUNT(*) FILTER (WHERE result = 'ineffective')::int AS ineffective_count,
       COUNT(*) FILTER (WHERE result = 'partially_effective')::int AS partial_count,
       CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE result = 'effective')::numeric / COUNT(*)::numeric * 100, 1)
         ELSE 0
       END AS effectiveness_pct
     FROM "${s}".capa_effectiveness_tests`
  );
  return getFirstRow(result);
}
