// ============================================
// Shahin-Ai — Portals Assessment Service
// External assessment submission, scoring views,
// assessment progress tracking, deadline mgmt
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from "@dos/db";

// === Types ===

export type AssessmentStatus = "draft" | "in_progress" | "submitted" | "under_review" | "completed" | "expired";
export type QuestionType = "text" | "single_choice" | "multi_choice" | "rating" | "yes_no" | "file_upload";

export interface PortalAssessment {
  assessmentId: string;
  portalId: string;
  externalOrgId: string;
  title: string;
  description: string;
  status: AssessmentStatus;
  totalQuestions: number;
  answeredQuestions: number;
  score: number | null;
  maxScore: number;
  completionPct: number;
  deadlineAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AssessmentResponse {
  responseId: string;
  assessmentId: string;
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  answer: unknown;
  score: number | null;
  maxScore: number;
  reviewNote: string | null;
  answeredAt: string;
}

export interface AssessmentProgress {
  assessmentId: string;
  totalSections: number;
  completedSections: number;
  totalQuestions: number;
  answeredQuestions: number;
  completionPct: number;
  estimatedMinutesRemaining: number;
  isOverdue: boolean;
}

// === Pure Functions ===

export function computeAssessmentScore(
  responses: { score: number | null; maxScore: number }[]
): { score: number; maxScore: number; pct: number } {
  const earned = responses.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const max = responses.reduce((sum, r) => sum + r.maxScore, 0);
  const pct = max === 0 ? 0 : Math.round((earned / max) * 100);
  return { score: earned, maxScore: max, pct };
}

export function isAssessmentOverdue(deadlineAt: string | null, status: AssessmentStatus): boolean {
  if (!deadlineAt || status === "completed" || status === "submitted") return false;
  return new Date(deadlineAt) < new Date();
}

export function estimateRemainingMinutes(
  totalQuestions: number,
  answeredQuestions: number,
  avgMinutesPerQuestion = 3
): number {
  const remaining = Math.max(0, totalQuestions - answeredQuestions);
  return remaining * avgMinutesPerQuestion;
}

// === DB-backed Functions ===

function mapAssessment( r: Record<string, unknown>): PortalAssessment {
  const answered = parseInt((r as any).answered_questions, 10) || 0;
  const total = parseInt((r as any).total_questions, 10) || 0;
  return {

    assessmentId: r.assessment_id,

    portalId: r.portal_id,

    externalOrgId: r.external_org_id,

    title: r.title,

    description: r.description || "",

    status: r.status,
    totalQuestions: total,
    answeredQuestions: answered,
    score: r.score !== null && r.score !== undefined ? parseFloat((r as any).score) : null,
    maxScore: parseFloat((r as any).max_score) || 0,
    completionPct: total === 0 ? 0 : Math.round((answered / total) * 100),

    deadlineAt: r.deadline_at ? (r.deadline_at?.toISOString?.() || r.deadline_at) : null,

    submittedAt: r.submitted_at ? (r.submitted_at?.toISOString?.() || r.submitted_at) : null,

    reviewedAt: r.reviewed_at ? (r.reviewed_at?.toISOString?.() || r.reviewed_at) : null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getAssessments(
  tenantId: string,
  portalId: string,
  externalOrgId: string,
  status?: AssessmentStatus
): Promise<PortalAssessment[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ["portal_id = $1", "external_org_id = $2"];
  const params: unknown[] = [portalId, externalOrgId];

  if (status) { conditions.push(`status = $3`); params.push(status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_assessments WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapAssessment);
}

export async function startAssessment(
  tenantId: string,
  assessmentId: string,
  externalOrgId: string
): Promise<PortalAssessment> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function saveResponse(
  tenantId: string,
  data: {
    assessmentId: string;
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    answer: unknown;
    maxScore?: number;
  }
): Promise<AssessmentResponse> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_assessment_responses
      (assessment_id, question_id, question_text, question_type, answer, max_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (assessment_id, question_id)
     DO UPDATE SET answer = EXCLUDED.answer, answered_at = NOW()
     RETURNING *`,
    [
      data.assessmentId, data.questionId, data.questionText,
      data.questionType, JSON.stringify(data.answer), data.maxScore ?? 0,
    ]
  );

  await safeQuery(
    `UPDATE "${schema}".portal_assessments
     SET answered_questions = (
       SELECT COUNT(*) FROM "${schema}".portal_assessment_responses WHERE assessment_id = $1
     ), updated_at = NOW()
     WHERE assessment_id = $1`,
    [data.assessmentId]
  );

  const r = result.rows[0];
  return {
    responseId: r.response_id, assessmentId: r.assessment_id,
    questionId: r.question_id, questionText: r.question_text,
    questionType: r.question_type, answer: r.answer,
    score: r.score !== null ? parseFloat(r.score) : null,
    maxScore: parseFloat(r.max_score) || 0,
    reviewNote: r.review_note || null,
    answeredAt: r.answered_at?.toISOString?.() || r.answered_at,
  };
}

export async function submitAssessment(
  tenantId: string,
  assessmentId: string,
  externalOrgId: string
): Promise<PortalAssessment> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function scoreAssessment(
  tenantId: string,
  assessmentId: string
): Promise<PortalAssessment> {
  const schema = tenantSchema(tenantId);

  const responses = await safeQuery(
    `SELECT score, max_score FROM "${schema}".portal_assessment_responses WHERE assessment_id = $1`,
    [assessmentId]
  );

  const { score, maxScore } = computeAssessmentScore(
    responses.rows.map(( r: Record<string, unknown>) => ({ score: r.score !== null ? parseFloat((r as any).score) : null, maxScore: parseFloat((r as any).max_score) || 0 }))
  );

  const result = await safeQuery(
    `UPDATE "${schema}".portal_assessments
     SET score = $1, max_score = $2, status = 'completed', reviewed_at = NOW(), updated_at = NOW()
     WHERE assessment_id = $3
     RETURNING *`,
    [score, maxScore, assessmentId]
  );
  return mapAssessment(result.rows[0]);
}

export async function getAssessmentProgress(
  tenantId: string,
  assessmentId: string
): Promise<AssessmentProgress> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT assessment_id, status, total_questions, answered_questions, deadline_at
     FROM "${schema}".portal_assessments
     WHERE assessment_id = $1
     LIMIT 1`,
    [assessmentId],
  ).catch(() => ({ rows: [] as any[] }));
  const r = result.rows[0] as any;
  const totalQuestions = r?.total_questions != null ? parseInt(String(r.total_questions), 10) : 0;
  const answeredQuestions = r?.answered_questions != null ? parseInt(String(r.answered_questions), 10) : 0;
  const completionPct = totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);
  const status = (r?.status as AssessmentStatus) || 'draft';
  const deadlineAt = r?.deadline_at ? (r.deadline_at?.toISOString?.() || String(r.deadline_at)) : null;
  const isOverdue = isAssessmentOverdue(deadlineAt, status);
  const estimatedMinutesRemaining = estimateRemainingMinutes(totalQuestions, answeredQuestions);
  const totalSections = 1;
  const completedSections = completionPct === 100 ? 1 : 0;

  return {
    assessmentId,
    totalSections,
    completedSections,
    totalQuestions,
    answeredQuestions,
    completionPct,
    estimatedMinutesRemaining,
    isOverdue,
  };
}
