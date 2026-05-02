import { logger } from '../../ports/logger.port';
/**
 * Qiyas Question Bank service.
 * Manages questions, question groups, and question CRUD operations.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasQuestionsService {
  /** List questions with optional filters by domain or group */
  async listQuestions(schema: string, filters?: { domainId?: string; groupId?: string }): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_questions WHERE 1=1`;
      const params: unknown[] = [];
      if (filters?.domainId) {
        params.push(filters.domainId);
        sql += ` AND domain_id = $${params.length}::uuid`;
      }
      if (filters?.groupId) {
        params.push(filters.groupId);
        sql += ` AND group_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY sort_order, created_at`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasQuestionsService] listQuestions failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Create a new question */
  async createQuestion(schema: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_questions
           (domain_id, group_id, question_text_en, question_text_ar, question_type, weight, sort_order, metadata)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,

        [data.domain_id, data.group_id || null, data.question_text_en,

         data.question_text_ar || null, data.question_type || 'likert',

         data.weight ?? 1.0, data.sort_order ?? 0,

         JSON.stringify(data.metadata || {})]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasQuestionsService] createQuestion failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Update an existing question */
  async updateQuestion(schema: string, questionId: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `UPDATE "${schema}".qiyas_questions
         SET question_text_en = COALESCE($2, question_text_en),
             question_text_ar = COALESCE($3, question_text_ar),
             question_type = COALESCE($4, question_type),
             weight = COALESCE($5, weight),
             sort_order = COALESCE($6, sort_order),
             metadata = COALESCE($7::jsonb, metadata),
             updated_at = NOW()
         WHERE question_id = $1::uuid
         RETURNING *`,

        [questionId, data.question_text_en || null, data.question_text_ar || null,

         data.question_type || null, data.weight ?? null, data.sort_order ?? null,

         data.metadata ? JSON.stringify(data.metadata) : null]
      );
      return result.rows[0] ?? null;
    } catch (err: unknown) {
      logger.error(`[QiyasQuestionsService] updateQuestion failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Delete a question */
  async deleteQuestion(schema: string, questionId: string): Promise<void> {
    try {
      await safeQuery(
        `DELETE FROM "${schema}".qiyas_questions WHERE question_id = $1::uuid`,
        [questionId]
      );
    } catch (err: unknown) {
      logger.error(`[QiyasQuestionsService] deleteQuestion failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** List question groups, optionally filtered by model */
  async listQuestionGroups(schema: string, modelId?: string): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_question_groups WHERE 1=1`;
      const params: unknown[] = [];
      if (modelId) {
        params.push(modelId);
        sql += ` AND model_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY sort_order, created_at`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasQuestionsService] listQuestionGroups failed: ${toErrorMessage(err)}`);
      return [];
    }
  }
}
