import { logger } from '../../ports/logger.port';
/**
 * Qiyas Maturity Analytics service.
 * Manages maturity snapshots, progression history, heatmaps, and target profiles.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { QiyasScoringService } from './qiyas-scoring.service';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasMaturityService {

  private scoringSvc = new QiyasScoringService();

  /** Take a point-in-time maturity snapshot for an assessment */
  async takeMaturitySnapshot(schema: string, assessmentId: string): Promise<unknown> {
    try {
      // Compute current scores
      const scoreData = await this.scoringSvc.computeScores(schema, assessmentId);

      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_maturity_snapshots
           (assessment_id, overall_score, maturity_level, domain_scores, snapshot_date)
         VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())
         RETURNING *`,
        [assessmentId, scoreData.overallScore, scoreData.maturityLevel,
         JSON.stringify(scoreData.domainScores)]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] takeMaturitySnapshot failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Get maturity snapshots ordered by most recent */
  async getMaturitySnapshots(schema: string, limit?: number): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_maturity_snapshots
         ORDER BY snapshot_date DESC
         LIMIT $1`,
        [limit || 50]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] getMaturitySnapshots failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Get progression history, optionally filtered by domain */
  async getProgressionHistory(schema: string, domainId?: string): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_progression_history WHERE 1=1`;
      const params: unknown[] = [];
      if (domainId) {
        params.push(domainId);
        sql += ` AND domain_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY recorded_at DESC`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] getProgressionHistory failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Get a heatmap of domains x dimensions with indicator scores */
  async getMaturityHeatmap(schema: string, assessmentId: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT d.domain_id, d.name_en AS domain_name, d.sort_order,
                s.indicator_id, s.score, s.maturity_level
         FROM "${schema}".qiyas_domains d
         LEFT JOIN "${schema}".qiyas_indicator_scores s
           ON s.domain_id = d.domain_id AND s.qiyas_assessment_id = $1::uuid
         ORDER BY d.sort_order, s.indicator_id`,
        [assessmentId]
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] getMaturityHeatmap failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Get all target profiles */
  async getTargetProfiles(schema: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_target_profiles ORDER BY created_at DESC`
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] getTargetProfiles failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Create or update a target profile */
  async upsertTargetProfile(schema: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_target_profiles
           (profile_id, name_en, name_ar, description, domain_targets, overall_target, created_by)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb, $6, $7)
         ON CONFLICT (profile_id)
         DO UPDATE SET name_en = $2, name_ar = $3, description = $4,
                       domain_targets = $5::jsonb, overall_target = $6, updated_at = NOW()
         RETURNING *`,

        [data.profile_id || null, data.name_en, data.name_ar || null,

         data.description || null, JSON.stringify(data.domain_targets || {}),

         data.overall_target ?? null, data.created_by || null]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasMaturityService] upsertTargetProfile failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }
}
