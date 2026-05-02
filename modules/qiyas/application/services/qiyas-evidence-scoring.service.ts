import { logger } from '../../ports/logger.port';
/**
 * Qiyas Evidence Scoring service.
 * Manages evidence scoring models, criteria-based scoring, and quality metrics.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasEvidenceScoringService {
  /** List available evidence scoring models */
  async getEvidenceScoringModels(schema: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_evidence_scoring_models ORDER BY created_at DESC`
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasEvidenceScoringService] getEvidenceScoringModels failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Score evidence against a scoring model with multiple criteria */
  async scoreEvidence(schema: string, data: {
    evidenceId: string;
    scoringModelId: string;
    criteria: Array<{ criterionId: string; score: number; notes?: string }>;
  }): Promise<unknown> {
    try {
      const scores: unknown[] = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const criterion of data.criteria) {
        const result = await safeQuery(
          `INSERT INTO "${schema}".qiyas_evidence_scores
             (evidence_id, scoring_model_id, criterion_id, score, notes)
           VALUES ($1, $2::uuid, $3::uuid, $4, $5)
           ON CONFLICT (evidence_id, scoring_model_id, criterion_id)
           DO UPDATE SET score = $4, notes = $5, updated_at = NOW()
           RETURNING *`,
          [data.evidenceId, data.scoringModelId, criterion.criterionId,
           criterion.score, criterion.notes || null]
        );
        scores.push(result.rows[0]);
        totalScore += criterion.score;
        totalWeight += 1;
      }

      // Compute aggregate quality score
      const aggregateScore = totalWeight > 0
        ? Math.round((totalScore / totalWeight) * 100) / 100
        : 0;

      return { evidenceId: data.evidenceId, scoringModelId: data.scoringModelId, scores, aggregateScore };
    } catch (err: unknown) {
      logger.error(`[QiyasEvidenceScoringService] scoreEvidence failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Get evidence quality metrics, optionally filtered by assessment */
  async getEvidenceQualityMetrics(schema: string, assessmentId?: string): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_evidence_quality_metrics WHERE 1=1`;
      const params: unknown[] = [];
      if (assessmentId) {
        params.push(assessmentId);
        sql += ` AND assessment_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY created_at DESC`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasEvidenceScoringService] getEvidenceQualityMetrics failed: ${toErrorMessage(err)}`);
      return [];
    }
  }
}
