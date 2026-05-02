/**
 * EvidenceService — Real DB implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type EvidenceStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'expired';

export interface CollectEvidenceInput {
  tenantId: string; title: string; description?: string;
  evidenceType: string; collectedBy: string;
  entityType?: string; entityId?: string;
  fileUrl?: string; fileName?: string; fileSize?: number;
  mimeType?: string; hashSha256?: string;
  validFrom?: string; validTo?: string;
  metadata?: Record<string, unknown>;
}

const EVIDENCE_COLS = `id, tenant_id, title, description, evidence_type, status,
  entity_type, entity_id, file_url, file_name, file_size, mime_type,
  hash_sha256, collected_by, collected_at, valid_from, valid_to,
  reviewed_by, reviewed_at, review_notes, created_at, updated_at`;

export async function collectEvidence(input: CollectEvidenceInput): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.evidence_items
       (id, tenant_id, title, description, evidence_type, collected_by,
        entity_type, entity_id, file_url, file_name, file_size,
        mime_type, hash_sha256, valid_from, valid_to, metadata, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'draft')`,
    [id, input.tenantId, input.title, input.description ?? null,
     input.evidenceType, input.collectedBy,
     input.entityType ?? null, input.entityId ?? null,
     input.fileUrl ?? null, input.fileName ?? null, input.fileSize ?? null,
     input.mimeType ?? null, input.hashSha256 ?? null,
     input.validFrom ?? null, input.validTo ?? null,
     JSON.stringify(input.metadata ?? {})],
  );
  logger.info('[Evidence] Collected', { id, tenantId: input.tenantId, type: input.evidenceType });
  return id;
}

export async function submitEvidence(id: string, tenantId: string): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.evidence_items SET status = 'submitted', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'draft'`,
    [id, tenantId],
  );
}

export async function reviewEvidence(
  id: string, tenantId: string, reviewerId: string,
  decision: 'accepted' | 'rejected', notes?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.evidence_items
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5 AND status = 'under_review'`,
    [decision, reviewerId, notes ?? null, id, tenantId],
  );
  logger.info('[Evidence] Reviewed', { id, decision, reviewerId });
}

export async function linkEvidenceToEntity(
  evidenceId: string, tenantId: string,
  linkedEntityType: string, linkedEntityId: string,
  linkType = 'supports', linkedBy: string,
): Promise<void> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.evidence_links
       (id, tenant_id, evidence_id, linked_entity_type, linked_entity_id, link_type, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (evidence_id, linked_entity_type, linked_entity_id) DO NOTHING`,
    [id, tenantId, evidenceId, linkedEntityType, linkedEntityId, linkType, linkedBy],
  );
}

export async function getEvidenceForEntity(
  entityType: string, entityId: string, tenantId: string,
): Promise<unknown[]> {
  const res = await safeQuery(
    `SELECT e.id, e.title, e.evidence_type, e.status, e.file_url,
            e.file_name, e.collected_by, e.collected_at, e.valid_to,
            l.link_type
     FROM __TENANT_SCHEMA__.evidence_links l
     JOIN __TENANT_SCHEMA__.evidence_items e ON e.id = l.evidence_id
     WHERE l.linked_entity_type = $1 AND l.linked_entity_id = $2 AND l.tenant_id = $3
       AND e.status IN ('submitted','under_review','accepted')
     ORDER BY e.collected_at DESC`,
    [entityType, entityId, tenantId],
  );
  return res.rows;
}

export async function listEvidence(tenantId: string, opts: {
  status?: EvidenceStatus; evidenceType?: string; limit?: number; offset?: number;
}): Promise<{ data: unknown[]; total: number }> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (opts.status)       { conds.push(`status = $${idx++}`);        params.push(opts.status); }
  if (opts.evidenceType) { conds.push(`evidence_type = $${idx++}`); params.push(opts.evidenceType); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const [c, d] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.evidence_items ${where}`, params),
    safeQuery(
      `SELECT ${EVIDENCE_COLS} FROM __TENANT_SCHEMA__.evidence_items ${where}
       ORDER BY collected_at DESC LIMIT ${limit} OFFSET ${offset}`, params,
    ),
  ]);
  return { data: d.rows, total: (c.rows[0] as { total: number })?.total ?? 0 };
}

export async function requestEvidence(tenantId: string, input: {
  entityType: string; entityId: string; requestedBy: string;
  assignedTo?: string; title: string; instructions?: string; dueDate?: string;
}): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.evidence_requests
       (id, tenant_id, entity_type, entity_id, requested_by, assigned_to, title, instructions, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, tenantId, input.entityType, input.entityId, input.requestedBy,
     input.assignedTo ?? null, input.title, input.instructions ?? null, input.dueDate ?? null],
  );
  return id;
}

export const EvidenceService = {
  collectEvidence, submitEvidence, reviewEvidence, linkEvidenceToEntity,
  getEvidenceForEntity, listEvidence, requestEvidence,
};
