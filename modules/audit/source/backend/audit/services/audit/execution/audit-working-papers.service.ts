// ============================================
// Shahin — Audit Working Papers Service
// Fieldwork document management
// Table: audit_working_papers
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List papers for an audit ────────────────────────────────────────

export async function listPapers(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_working_papers
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Create working paper ────────────────────────────────────────────

export async function createPaper(tenantId: string, data: {
  audit_id: string; title: string; description?: string;
  paper_type?: string; reference_code?: string; prepared_by?: string;
  file_path?: string; content?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_working_papers
       (id, audit_id, title, description, paper_type, reference_code,
        prepared_by, file_path, content, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
     RETURNING *`,
    [id, data.audit_id, data.title, data.description || null,
     data.paper_type || null, data.reference_code || null,
     data.prepared_by || null, data.file_path || null, data.content || null]
  );
  return getFirstRow(result);
}

// ── Update working paper ────────────────────────────────────────────

export async function updatePaper(tenantId: string, id: string, data: Record<string, unknown>) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Submit paper for review ─────────────────────────────────────────

export async function submitForReview(tenantId: string, id: string, reviewerId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Approve paper ───────────────────────────────────────────────────

export async function approvePaper(tenantId: string, id: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
