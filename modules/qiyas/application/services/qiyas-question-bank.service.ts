// ============================================
// Shahin-Ai — Qiyas Question Bank
// Question management CRUD, domain categorization,
// difficulty levels, versioning, bulk import
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type QuestionDifficulty = "basic" | "intermediate" | "advanced";
export type QuestionType = "yes_no" | "scale_1_5" | "multiple_choice" | "descriptive";

export interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

export interface QuestionRecord {
  id: string;
  tenantId: string;
  code: string;
  text: string;
  textAr: string | null;
  domain: string;
  controlRef: string | null;
  framework: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  weight: number;
  options: QuestionOption[];
  version: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateQuestionData {
  code: string;
  text: string;
  textAr?: string;
  domain: string;
  controlRef?: string;
  framework: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  weight?: number;
  options?: QuestionOption[];
  tags?: string[];
  createdBy: string;
}

// === Pure Functions ===

export function buildDefaultOptions(questionType: QuestionType): QuestionOption[] {
  if (questionType === "yes_no") {
    return [{ value: "yes", label: "Yes", score: 1 }, { value: "no", label: "No", score: 0 }];
  }
  if (questionType === "scale_1_5") {
    return [1, 2, 3, 4, 5].map(v => ({ value: String(v), label: String(v), score: v / 5 }));
  }
  return [];
}

export function validateQuestion(data: Partial<CreateQuestionData>): string[] {
  const errors: string[] = [];
  if (!data.code?.trim()) errors.push("code is required");
  if (!data.text?.trim()) errors.push("text is required");
  if (!data.domain?.trim()) errors.push("domain is required");
  if (!data.framework?.trim()) errors.push("framework is required");
  if (!data.difficulty || !["basic", "intermediate", "advanced"].includes(data.difficulty)) {
    errors.push("difficulty must be basic, intermediate, or advanced");
  }
  if (!data.questionType || !["yes_no", "scale_1_5", "multiple_choice", "descriptive"].includes(data.questionType)) {
    errors.push("questionType must be yes_no, scale_1_5, multiple_choice, or descriptive");
  }
  return errors;
}

export function computeQuestionScore(
  answer: string,
  options: QuestionOption[],
  questionType: QuestionType
): number {
  if (questionType === "descriptive") return 0;
  const option = options.find(o => o.value === answer);
  return option?.score ?? 0;
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): QuestionRecord {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    code: meta.code || r.id,

    text: r.title,

    textAr: meta.textAr || null,

    domain: r.scope || meta.domain || "",

    controlRef: meta.controlRef || null,

    framework: r.framework || meta.framework || "",

    difficulty: meta.difficulty || "basic",

    questionType: meta.questionType || "yes_no",

    weight: meta.weight ?? 1,

    options: meta.options || [],

    version: meta.version || 1,
    isActive: r.status !== "cancelled",

    tags: r.tags || [],

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createQuestion(tenantId: string, data: CreateQuestionData): Promise<QuestionRecord> {
  const schema = tenantSchema(tenantId);
  const metadata = {
    text: data.text,
    textAr: data.textAr ?? null,
    difficulty: data.difficulty,
    weight: data.weight ?? 1,
    options: data.options ?? [],
    version: 1,
  };
  const result = await safeQuery(
    `INSERT INTO "${schema}".qiyas_qiyas
      (tenant_id, title, description, status, framework, scope, assessor, created_by, tags, metadata)
     VALUES ($1,$2,'','active',$3,$4,'question_bank',$5,$6,$7)
     RETURNING *`,
    [
      tenantId,
      data.text,
      data.framework,
      data.domain,
      data.createdBy,
      JSON.stringify(data.tags || []),
      JSON.stringify(metadata),
    ],
  );
  return mapRow(getFirstRow(result) as any);
}

export async function getQuestion(tenantId: string, id: string): Promise<QuestionRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL AND assessor = 'question_bank'
     LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Question not found');
  return mapRow(row as any);
}

export async function updateQuestion(
  tenantId: string,
  id: string,
  updates: Partial<Pick<CreateQuestionData, "text" | "textAr" | "difficulty" | "weight" | "options" | "tags">>
): Promise<QuestionRecord> {
  const schema = tenantSchema(tenantId);
  const current = await getQuestion(tenantId, id);

  const meta = { ...current, id: undefined, tenantId: undefined, createdAt: undefined, updatedAt: undefined, createdBy: undefined, isActive: undefined };
  if (updates.text) meta.text = updates.text;
  if (updates.textAr !== undefined) meta.textAr = updates.textAr;
  if (updates.difficulty) meta.difficulty = updates.difficulty;
  if (updates.weight !== undefined) meta.weight = updates.weight;
  if (updates.options) meta.options = updates.options;
  meta.version = (meta.version || 1) + 1;

  const result = await safeQuery(
    `UPDATE "${schema}".qiyas_qiyas SET title = COALESCE($1, title), metadata = $2, tags = COALESCE($3, tags), updated_at = NOW() WHERE id = $4 RETURNING *`,
    [updates.text || null, JSON.stringify(meta), updates.tags ? JSON.stringify(updates.tags) : null, id]
  );
  return mapRow(getFirstRow(result)!);
}

export async function listQuestions(
  tenantId: string,
  filters?: { domain?: string; framework?: string; difficulty?: QuestionDifficulty; isActive?: boolean }
): Promise<QuestionRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`, `assessor = 'question_bank'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.framework) { conditions.push(`framework = $${idx++}`); params.push(filters.framework); }
  if (filters?.domain) { conditions.push(`scope = $${idx++}`); params.push(filters.domain); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );

  return result.rows.map(mapRow).filter(q => {
    if (filters?.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters?.isActive !== undefined && q.isActive !== filters.isActive) return false;
    return true;
  });
}

export async function bulkImportQuestions(
  tenantId: string,
  questions: CreateQuestionData[]
): Promise<{ imported: number; failed: Array<{ index: number; error: string }> }> {
  let imported = 0;
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < questions.length; i++) {
    try {
      await createQuestion(tenantId, questions[i]);
      imported++;
    } catch (err: unknown) {
      failed.push({ index: i, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { imported, failed };
}

export async function deactivateQuestion(tenantId: string, id: string): Promise<QuestionRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".qiyas_qiyas
     SET status = 'cancelled', updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2 AND assessor = 'question_bank'
     RETURNING *`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Question not found');
  return mapRow(row as any);
}
