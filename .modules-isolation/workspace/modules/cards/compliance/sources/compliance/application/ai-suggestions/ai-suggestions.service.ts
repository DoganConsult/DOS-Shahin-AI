/**
 * AI-Suggestions service — tenant-scoped AI-generated suggestions
 * over `<tenant_schema>.compliance_ai_suggestions`.
 *
 * CRUD + reviewSuggestion (PATCH /review) which sets status + reviewed_by + reviewed_at.
 */
import type { DbClient } from '../../db/runner';

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
const SUGGESTION_STATUSES: ReadonlyArray<SuggestionStatus> =
  ['pending', 'accepted', 'rejected', 'expired'];

export interface AiSuggestionRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string | null;
  suggestionType: string;
  title: string;
  description: string | null;
  confidence: number | null;
  modelUsed: string | null;
  status: SuggestionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAiSuggestionsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  suggestionType?: string;
  status?: SuggestionStatus;
  limit?: number;
  offset?: number;
}

export interface CreateAiSuggestionInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId?: string | null;
  suggestionType: string;
  title: string;
  description?: string | null;
  confidence?: number | null;
  modelUsed?: string | null;
}

export interface ReviewSuggestionInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: SuggestionStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_type, entity_id, suggestion_type, title, description,
              confidence, model_used, status, reviewed_by, reviewed_at, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_type: string; entity_id: string | null;
  suggestion_type: string; title: string; description: string | null;
  confidence: string | number | null; model_used: string | null;
  status: string; reviewed_by: string | null; reviewed_at: string | null;
  created_at: string; updated_at: string;
}): AiSuggestionRow => ({
  id: x.id, tenantId: x.tenant_id, entityType: x.entity_type, entityId: x.entity_id,
  suggestionType: x.suggestion_type, title: x.title, description: x.description,
  confidence: x.confidence === null || x.confidence === undefined ? null : Number(x.confidence),
  modelUsed: x.model_used, status: x.status as SuggestionStatus,
  reviewedBy: x.reviewed_by, reviewedAt: x.reviewed_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listAiSuggestions(
  client: DbClient,
  input: ListAiSuggestionsInput,
): Promise<{ rows: AiSuggestionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.suggestionType) { params.push(input.suggestionType); where += ` AND suggestion_type = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_ai_suggestions
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_ai_suggestions WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getAiSuggestion(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<AiSuggestionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_ai_suggestions
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createAiSuggestion(
  client: DbClient,
  input: CreateAiSuggestionInput,
): Promise<AiSuggestionRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.suggestionType || !input.title) {
    throw Object.assign(
      new Error('entityType, suggestionType, title required'),
      { code: 'bad_input' },
    );
  }
  if (input.confidence !== null && input.confidence !== undefined) {
    if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
      throw Object.assign(
        new Error('confidence must be a number in [0,1]'),
        { code: 'bad_input' },
      );
    }
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_ai_suggestions
       (tenant_id, entity_type, entity_id, suggestion_type, title, description, confidence, model_used)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityType, input.entityId ?? null,
      input.suggestionType, input.title,
      input.description ?? null,
      input.confidence ?? null,
      input.modelUsed ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function reviewSuggestion(
  client: DbClient,
  input: ReviewSuggestionInput,
): Promise<AiSuggestionRow | null> {
  assertSchema(input.tenantSchema);
  if (!SUGGESTION_STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_ai_suggestions
        SET status = $3, reviewed_by = $4, reviewed_at = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status, input.actorId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
