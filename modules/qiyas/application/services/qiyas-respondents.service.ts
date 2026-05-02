import { logger } from '../../ports/logger.port';
/**
 * Qiyas Respondents and Scoping service.
 * Manages assessment respondent assignments, progress tracking, and scope definitions.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasRespondentsService {
  // ═══ Respondent Management ═══

  /** List respondents assigned to an assessment */
  async listRespondents(schema: string, assessmentId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_assessment_respondents
         WHERE assessment_id = $1::uuid
         ORDER BY created_at`,
        [assessmentId]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] listRespondents failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Assign a respondent to an assessment */
  async assignRespondent(schema: string, assessmentId: string, data: { userId: string; scopeId?: string; role?: string }): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_assessment_respondents
           (assessment_id, user_id, scope_id, role)
         VALUES ($1::uuid, $2, $3::uuid, $4)
         RETURNING *`,
        [assessmentId, data.userId, data.scopeId || null, data.role || 'respondent']
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] assignRespondent failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Remove a respondent from an assessment */
  async removeRespondent(schema: string, respondentId: string): Promise<void> {
    try {
      await safeQuery(
        `DELETE FROM "${schema}".qiyas_assessment_respondents WHERE respondent_id = $1::uuid`,
        [respondentId]
      );
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] removeRespondent failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Get respondent progress: total, completed, pending */
  async getRespondentProgress(schema: string, assessmentId: string): Promise<unknown> {
    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status != 'completed')::int AS pending
         FROM "${schema}".qiyas_assessment_respondents
         WHERE assessment_id = $1::uuid`,
        [assessmentId]
      );
      const row = result.rows[0] || { total: 0, completed: 0, pending: 0 };
      return { total: row.total, completed: row.completed, pending: row.pending };
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] getRespondentProgress failed: ${toErrorMessage(err)}`);
      return { total: 0, completed: 0, pending: 0 };
    }
  }

  // ═══ Assessment Scoping ═══

  /** List scopes for an assessment */
  async listScopes(schema: string, assessmentId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_assessment_scopes
         WHERE assessment_id = $1::uuid
         ORDER BY created_at`,
        [assessmentId]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] listScopes failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Add a scope entry to an assessment */
  async addScope(schema: string, assessmentId: string, data: { scopeType: string; scopeId: string; scopeName: string }): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_assessment_scopes
           (assessment_id, scope_type, scope_id, scope_name)
         VALUES ($1::uuid, $2, $3, $4)
         RETURNING *`,
        [assessmentId, data.scopeType, data.scopeId, data.scopeName]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] addScope failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Remove a scope entry */
  async removeScope(schema: string, scopeId: string): Promise<void> {
    try {
      await safeQuery(
        `DELETE FROM "${schema}".qiyas_assessment_scopes WHERE scope_id = $1::uuid`,
        [scopeId]
      );
    } catch (err: unknown) {
      logger.error(`[QiyasRespondentsService] removeScope failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }
}
