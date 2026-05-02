// ============================================
// F-CSA: Control Self-Assessment Service
// Closes Area 2 gap 2.6: CSA questionnaires
// per control, owner assignment, scoring, heatmap.
// ============================================

import { withTenantClient } from '../../ports/database.port';
import { v4 as uuid } from 'uuid';

export interface CSAQuestionnaireInput {
  controlId: string;
  controlTitle?: string;
  title: string;
  description?: string;
  questions: CSAQuestion[];
  scoringMethod?: 'weighted_average' | 'pass_fail' | 'percentage' | 'maturity';
  frequency?: string;
  ownerId?: string;
}

export interface CSAQuestion {
  questionId?: string;
  text: string;
  type: 'yes_no' | 'rating' | 'text' | 'multiple_choice';
  weight?: number;
  options?: string[];
  required?: boolean;
}

export interface CSAResponseInput {
  questionnaireId: string;
  controlId: string;
  period: string;
  respondentId: string;
  answers: Record<string, unknown>;
}

export async function createCSAQuestionnaire(
  tenantId: string,
  input: CSAQuestionnaireInput,
  workspaceId?: string,
): Promise<{ questionnaireId: string }> {
  const questionnaireId = uuid();

  const questions = input.questions.map(q => ({
    questionId: q.questionId ?? uuid(),
    text: q.text,
    type: q.type,
    weight: q.weight ?? 1,
    options: q.options ?? [],
    required: q.required ?? true,
  }));

  await withTenantClient(tenantId, async (client) => {
    await client.query(
      `INSERT INTO csa_questionnaires
         (questionnaire_id, workspace_id, control_id, control_title, title, description,
          questions, scoring_method, frequency, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        questionnaireId,
        workspaceId ?? null,
        input.controlId,
        input.controlTitle ?? null,
        input.title,
        input.description ?? null,
        JSON.stringify(questions),
        input.scoringMethod ?? 'weighted_average',
        input.frequency ?? 'annual',
        input.ownerId ?? null,
      ],
    );
  });

  return { questionnaireId };
}

export async function listCSAQuestionnaires(
  tenantId: string,
  controlId?: string,
  workspaceId?: string,
): Promise<Record<string, unknown>[]> {
  const conditions: string[] = ['q.is_active = TRUE'];
  const params: unknown[] = [];

  if (controlId) { params.push(controlId); conditions.push(`q.control_id = $${params.length}`); }
  if (workspaceId) { params.push(workspaceId); conditions.push(`q.workspace_id = $${params.length}`); }

  return withTenantClient(tenantId, async (client) => {
    const res = await client.query(
      `SELECT q.*,
              COUNT(r.response_id)::int AS response_count,
              ROUND(AVG(r.weighted_score), 1) AS avg_score
         FROM csa_questionnaires q
         LEFT JOIN csa_responses r ON r.questionnaire_id = q.questionnaire_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY q.questionnaire_id
        ORDER BY q.created_at DESC`,
      params,
    );
    return res.rows;
  });
}

export async function submitCSAResponse(
  tenantId: string,
  input: CSAResponseInput,
  workspaceId?: string,
): Promise<{ responseId: string; weightedScore: number; outcome: string }> {
  const responseId = uuid();

  return withTenantClient(tenantId, async (client) => {
    const qres = await client.query<{ questions: CSAQuestion[]; scoring_method: string }>(
      `SELECT questions, scoring_method FROM csa_questionnaires WHERE questionnaire_id = $1`,
      [input.questionnaireId],
    );
    const q = qres.rows[0];
    if (!q) throw new Error(`csa_questionnaire ${input.questionnaireId} not found`);

    const { rawScore, weightedScore, outcome } = scoreAnswers(q.questions, input.answers, q.scoring_method);

    await client.query(
      `INSERT INTO csa_responses
         (response_id, questionnaire_id, control_id, workspace_id, respondent_id,
          period, answers, raw_score, weighted_score, outcome, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, 'submitted', NOW())
       ON CONFLICT DO NOTHING`,
      [
        responseId,
        input.questionnaireId,
        input.controlId,
        workspaceId ?? null,
        input.respondentId,
        input.period,
        JSON.stringify(input.answers),
        rawScore,
        weightedScore,
        outcome,
      ],
    );

    return { responseId, weightedScore, outcome };
  });
}

export async function getCSAHeatmap(tenantId: string, workspaceId?: string): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  const wsClause = workspaceId
    ? (params.push(workspaceId), `AND r.workspace_id = $${params.length}`)
    : '';

  return withTenantClient(tenantId, async (client) => {
    const res = await client.query(
      `SELECT r.control_id,
              q.control_title,
              COUNT(r.response_id)::int AS response_count,
              ROUND(AVG(r.weighted_score), 1) AS avg_score,
              COUNT(r.response_id) FILTER (WHERE r.outcome = 'pass')::int AS passed,
              COUNT(r.response_id) FILTER (WHERE r.outcome = 'fail')::int AS failed,
              COUNT(r.response_id) FILTER (WHERE r.outcome = 'partial')::int AS partial
         FROM csa_responses r
         JOIN csa_questionnaires q ON q.questionnaire_id = r.questionnaire_id
        WHERE r.status = 'submitted' ${wsClause}
        GROUP BY r.control_id, q.control_title
        ORDER BY avg_score ASC`,
      params,
    );
    return res.rows;
  });
}

export async function listCSAResponses(
  tenantId: string,
  questionnaireId: string,
): Promise<Record<string, unknown>[]> {
  return withTenantClient(tenantId, async (client) => {
    const res = await client.query(
      `SELECT response_id, respondent_id, period, raw_score, weighted_score,
              outcome, status, submitted_at
         FROM csa_responses
        WHERE questionnaire_id = $1
        ORDER BY submitted_at DESC`,
      [questionnaireId],
    );
    return res.rows;
  });
}

function scoreAnswers(
  questions: CSAQuestion[],
  answers: Record<string, unknown>,
  scoringMethod: string,
): { rawScore: number; weightedScore: number; outcome: 'pass' | 'fail' | 'partial' } {
  if (!questions?.length) return { rawScore: 0, weightedScore: 0, outcome: 'fail' };

  let totalWeight = 0;
  let totalScore = 0;
  let passCount = 0;
  let answeredCount = 0;

  for (const q of questions) {
    const qid = q.questionId!;
    const ans = answers[qid];
    if (ans === undefined || ans === null) continue;
    answeredCount += 1;
    const weight = q.weight ?? 1;
    totalWeight += weight;

    let normalized = 0;
    if (q.type === 'yes_no') {
      normalized = ans === true || ans === 'yes' ? 100 : 0;
    } else if (q.type === 'rating') {
      const n = Number(ans);
      normalized = Number.isFinite(n) ? Math.max(0, Math.min(100, n * 20)) : 0;
    } else if (q.type === 'multiple_choice') {
      normalized = q.options?.length ? ((q.options.indexOf(String(ans)) + 1) / q.options.length) * 100 : 0;
    } else {
      normalized = String(ans).trim().length > 0 ? 100 : 0;
    }

    totalScore += normalized * weight;
    if (normalized >= 70) passCount += 1;
  }

  const rawScore = answeredCount > 0 ? Math.round(totalScore / answeredCount) : 0;
  const weightedScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const passRatio = answeredCount > 0 ? passCount / answeredCount : 0;

  let outcome: 'pass' | 'fail' | 'partial';
  if (scoringMethod === 'pass_fail') {
    outcome = passRatio === 1 ? 'pass' : passRatio === 0 ? 'fail' : 'partial';
  } else {
    outcome = weightedScore >= 70 ? 'pass' : weightedScore >= 40 ? 'partial' : 'fail';
  }

  return { rawScore, weightedScore, outcome };
}
