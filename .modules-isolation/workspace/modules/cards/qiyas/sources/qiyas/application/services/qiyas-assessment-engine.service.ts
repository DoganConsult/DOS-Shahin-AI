// ============================================
// Shahin-Ai — Qiyas Assessment Engine
// Assessment execution: create/start/submit/review/complete,
// progress tracking, section scoring, assessment locking
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type AssessmentStatus = "draft" | "in_progress" | "submitted" | "under_review" | "completed" | "cancelled";

export interface AssessmentSection {
  sectionId: string;
  title: string;
  domain: string;
  questions: string[];
  score: number | null;
  completedAt: string | null;
}

export interface AssessmentRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: AssessmentStatus;
  framework: string;
  scope: string;
  assessorId: string;
  score: number | null;
  maturityLevel: number | null;
  sections: AssessmentSection[];
  lockedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  assessmentDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateAssessmentData {
  title: string;
  description?: string;
  framework: string;
  scope: string;
  assessorId: string;
  tags?: string[];
  createdBy: string;
}

// === Pure Functions ===

export function canTransitionAssessment(current: AssessmentStatus, next: AssessmentStatus): boolean {
  const allowed: Record<AssessmentStatus, AssessmentStatus[]> = {
    draft: ["in_progress", "cancelled"],
    in_progress: ["submitted", "cancelled"],
    submitted: ["under_review", "in_progress"],
    under_review: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
  };
  return allowed[current]?.includes(next) ?? false;
}

export function computeAssessmentProgress(sections: AssessmentSection[]): number {
  if (sections.length === 0) return 0;
  const completed = sections.filter(s => s.score !== null).length;
  return Math.round((completed / sections.length) * 100);
}

export function isAssessmentLocked(status: AssessmentStatus): boolean {
  return status === "completed" || status === "cancelled";
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): AssessmentRecord {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",
    status: r.status as AssessmentStatus,

    framework: r.framework || meta.framework || "",

    scope: r.scope || meta.scope || "",

    assessorId: r.assessor || meta.assessorId || r.created_by,

    score: r.score !== undefined ? r.score : meta.score ?? null,

    maturityLevel: r.maturity_level !== undefined ? r.maturity_level : meta.maturityLevel ?? null,

    sections: meta.sections || [],

    lockedAt: meta.lockedAt || null,

    startedAt: meta.startedAt || null,

    submittedAt: meta.submittedAt || null,

    completedAt: meta.completedAt || null,

    assessmentDate: r.assessment_date?.toISOString?.() || r.assessment_date || null,

    tags: r.tags || [],

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createQiyasAssessment(tenantId: string, data: CreateAssessmentData): Promise<AssessmentRecord> {
  const schema = tenantSchema(tenantId);
  const metadata = { framework: data.framework, scope: data.scope, assessorId: data.assessorId, sections: [], score: null, maturityLevel: null, lockedAt: null, startedAt: null, submittedAt: null, completedAt: null };

  const result = await safeQuery(
    `INSERT INTO "${schema}".qiyas_qiyas
      (tenant_id, title, description, status, framework, scope, assessor,
       created_by, tags, metadata)
     VALUES ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [tenantId, data.title, data.description || "", data.framework, data.scope, data.assessorId, data.createdBy, JSON.stringify(data.tags || []), JSON.stringify(metadata)]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getAssessment(tenantId: string, id: string): Promise<AssessmentRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Assessment not found');
  return mapRow(row as any);
}

export async function transitionAssessment(
  tenantId: string,
  id: string,
  nextStatus: AssessmentStatus
): Promise<AssessmentRecord> {
  const schema = tenantSchema(tenantId);
  const currentResult = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const currentRow = getFirstRow(currentResult) as any;
  if (!currentRow) throw new Error('Assessment not found');
  const current = mapRow(currentRow as any);
  if (!canTransitionAssessment(current.status, nextStatus)) {
    throw new Error(`Invalid assessment transition: ${current.status} → ${nextStatus}`);
  }

  const meta = (currentRow.metadata as any) || {};
  if (nextStatus === 'in_progress' && !meta.startedAt) meta.startedAt = new Date().toISOString();
  if (nextStatus === 'submitted') meta.submittedAt = new Date().toISOString();
  if (nextStatus === 'completed') meta.completedAt = new Date().toISOString();

  const updated = await safeQuery(
    `UPDATE "${schema}".qiyas_qiyas
     SET status = $3, metadata = $4, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, nextStatus, JSON.stringify(meta)],
  );
  return mapRow(getFirstRow(updated) as any);
}

export async function updateSectionScore(
  tenantId: string,
  assessmentId: string,
  sectionId: string,
  score: number
): Promise<AssessmentRecord> {
  const schema = tenantSchema(tenantId);
  const currentResult = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, assessmentId],
  );
  const currentRow = getFirstRow(currentResult) as any;
  if (!currentRow) throw new Error('Assessment not found');

  const meta = (currentRow.metadata as any) || {};
  const sections: AssessmentSection[] = Array.isArray(meta.sections) ? meta.sections : [];
  const nextSections = sections.map((s) => {
    if (s.sectionId !== sectionId) return s;
    return { ...s, score, completedAt: new Date().toISOString() };
  });
  meta.sections = nextSections;
  meta.score = typeof meta.score === 'number' ? meta.score : null;

  const updated = await safeQuery(
    `UPDATE "${schema}".qiyas_qiyas
     SET metadata = $3, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, assessmentId, JSON.stringify(meta)],
  );
  return mapRow(getFirstRow(updated) as any);
}

export async function listAssessments(
  tenantId: string,
  filters?: { status?: AssessmentStatus; framework?: string; assessorId?: string }
): Promise<AssessmentRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.framework) { conditions.push(`framework = $${idx++}`); params.push(filters.framework); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow).filter(a => !filters?.assessorId || a.assessorId === filters.assessorId);
}

export async function addAssessmentSection(
  tenantId: string,
  assessmentId: string,
  section: Omit<AssessmentSection, "score" | "completedAt">
): Promise<AssessmentRecord> {
  const schema = tenantSchema(tenantId);
  const currentResult = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, assessmentId],
  );
  const currentRow = getFirstRow(currentResult) as any;
  if (!currentRow) throw new Error('Assessment not found');

  const meta = (currentRow.metadata as any) || {};
  const sections: AssessmentSection[] = Array.isArray(meta.sections) ? meta.sections : [];
  sections.push({ ...section, score: null, completedAt: null });
  meta.sections = sections;

  const updated = await safeQuery(
    `UPDATE "${schema}".qiyas_qiyas
     SET metadata = $3, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, assessmentId, JSON.stringify(meta)],
  );
  return mapRow(getFirstRow(updated) as any);
}
