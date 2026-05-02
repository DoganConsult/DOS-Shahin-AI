import { logger } from '../../ports/logger.port';
/**
 * Qiyas Recommendations and Improvement Paths service.
 * Manages AI-driven recommendations and ordered improvement paths for assessments.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasRecommendationsService {
  /** List recommendations, optionally filtered by assessment */
  async listRecommendations(schema: string, assessmentId?: string): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_recommendations WHERE 1=1`;
      const params: unknown[] = [];
      if (assessmentId) {
        params.push(assessmentId);
        sql += ` AND assessment_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY priority DESC, created_at DESC LIMIT 100`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasRecommendationsService] listRecommendations failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Create a new recommendation */
  async createRecommendation(schema: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_recommendations
           (assessment_id, domain_id, indicator_id, recommendation_text, priority, status, target_score, current_score)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
         RETURNING *`,

        [data.assessment_id, data.domain_id || null, data.indicator_id || null,

         data.recommendation_text, data.priority || 'medium', data.status || 'open',

         data.target_score ?? null, data.current_score ?? null]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasRecommendationsService] createRecommendation failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Update a recommendation's status */
  async updateRecommendationStatus(schema: string, recommendationId: string, status: string, userId?: string): Promise<unknown> {
    try {
      const result = await safeQuery(
        `UPDATE "${schema}".qiyas_recommendations
         SET status = $2, updated_by = $3, updated_at = NOW()
         WHERE recommendation_id = $1::uuid
         RETURNING *`,
        [recommendationId, status, userId || null]
      );
      return result.rows[0] ?? null;
    } catch (err: unknown) {
      logger.error(`[QiyasRecommendationsService] updateRecommendationStatus failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Get ordered improvement paths for an assessment */
  async getImprovementPaths(schema: string, assessmentId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_improvement_paths
         WHERE assessment_id = $1::uuid
         ORDER BY sequence_order`,
        [assessmentId]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasRecommendationsService] getImprovementPaths failed: ${toErrorMessage(err)}`);
      return [];
    }
  }
}
