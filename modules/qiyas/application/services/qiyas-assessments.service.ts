/**
 * Qiyas Assessments and Responses service.
 * Manages assessment CRUD and individual response capture.
 */
import { query as _query, safeQuery } from '../../ports/database.port';

export class QiyasAssessmentsService {
  // ═══ Assessments ═══

  async listAssessments(schema: string, filters?: { status?: string; model_id?: string }) {
    let sql = `SELECT a.*, m.name_en AS model_name FROM "${schema}".qiyas_assessments a
               LEFT JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.status) { params.push(filters.status); sql += ` AND a.status = $${params.length}`; }
    if (filters?.model_id) { params.push(filters.model_id); sql += ` AND a.model_id = $${params.length}::uuid`; }
    sql += ` ORDER BY a.created_at DESC`;
    return (await safeQuery(sql, params)).rows;
  }

  async getAssessment(schema: string, assessmentId: string) {
    const result = await safeQuery(
      `SELECT a.*, m.name_en AS model_name, m.code AS model_code
       FROM "${schema}".qiyas_assessments a
       LEFT JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
       WHERE a.qiyas_assessment_id = $1::uuid`, [assessmentId]
    );
    return result.rows[0] ?? null;
  }

  async createAssessment(schema: string, data: unknown, createdBy: string) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".qiyas_assessments
         (model_id, template_id, title_en, title_ar, description_en, description_ar,
          assessment_type, status, target_date, created_by)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,

      [data.model_id, data.template_id || null, data.title_en, data.title_ar || null,

       data.description_en || null, data.description_ar || null,

       data.assessment_type || 'self_assessment', data.status || 'draft',

       data.target_date || null, createdBy]
    );
    return result.rows[0];
  }

  async updateAssessment(schema: string, assessmentId: string, data: unknown) {
    const result = await safeQuery(
      `UPDATE "${schema}".qiyas_assessments
       SET title_en = COALESCE($2, title_en), title_ar = COALESCE($3, title_ar),
           description_en = COALESCE($4, description_en), status = COALESCE($5, status),
           updated_at = now()
       WHERE qiyas_assessment_id = $1::uuid RETURNING *`,

      [assessmentId, data.title_en, data.title_ar, data.description_en, data.status]
    );
    return result.rows[0] ?? null;
  }

  // ═══ Responses ═══

  async saveResponse(schema: string, assessmentId: string, data: unknown) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".qiyas_responses
         (qiyas_assessment_id, question_id, respondent_id, answer_value, score, confidence, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, $6, $7)
       ON CONFLICT (qiyas_assessment_id, question_id, respondent_id)
       DO UPDATE SET answer_value = $4::jsonb, score = $5, confidence = $6, notes = $7, updated_at = now()
       RETURNING *`,

      [assessmentId, data.question_id, data.respondent_id || null,

       JSON.stringify(data.answer_value || {}), data.score ?? null, data.confidence ?? 0, data.notes || null]
    );
    return result.rows[0];
  }

  async listResponses(schema: string, assessmentId: string) {
    return (await safeQuery(
      `SELECT * FROM "${schema}".qiyas_responses WHERE qiyas_assessment_id = $1::uuid ORDER BY created_at`,
      [assessmentId]
    )).rows;
  }
}
