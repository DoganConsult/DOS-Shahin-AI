import { logger } from '../../ports/logger.port';
/**
 * Qiyas Calibration service.
 * Manages calibration sessions, entries, and score finalization.
 */
import { safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

export class QiyasCalibrationService {
  /** List calibration sessions, optionally filtered by assessment */
  async listCalibrationSessions(schema: string, assessmentId?: string): Promise<Record<string, unknown>[]> {
    try {
      let sql = `SELECT * FROM "${schema}".qiyas_calibration_sessions WHERE 1=1`;
      const params: unknown[] = [];
      if (assessmentId) {
        params.push(assessmentId);
        sql += ` AND assessment_id = $${params.length}::uuid`;
      }
      sql += ` ORDER BY created_at DESC`;
      const result = await safeQuery(sql, params);
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasCalibrationService] listCalibrationSessions failed: ${toErrorMessage(err)}`);
      return [];
    }
  }

  /** Create a new calibration session */
  async createCalibrationSession(schema: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_calibration_sessions
           (assessment_id, title, description, status, created_by)
         VALUES ($1::uuid, $2, $3, $4, $5)
         RETURNING *`,

        [data.assessment_id, data.title || 'Calibration Session',

         data.description || null, data.status || 'open', data.created_by || null]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasCalibrationService] createCalibrationSession failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Add a calibration entry to a session */
  async addCalibrationEntry(schema: string, sessionId: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_calibration_log
           (session_id, indicator_id, original_score, calibrated_score, calibrator_id, rationale)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
         RETURNING *`,

        [sessionId, data.indicator_id, data.original_score, data.calibrated_score,

         data.calibrator_id || null, data.rationale || null]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasCalibrationService] addCalibrationEntry failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Finalize a calibration session: mark as finalized and apply calibrated scores */
  async finalizeCalibration(schema: string, sessionId: string): Promise<unknown> {
    try {
      // Mark session as finalized
      const sessionResult = await safeQuery(
        `UPDATE "${schema}".qiyas_calibration_sessions
         SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
         WHERE session_id = $1::uuid
         RETURNING *`,
        [sessionId]
      );
      const session = sessionResult.rows[0];
      if (!session) throw new Error(`Calibration session ${sessionId} not found`);

      // Apply calibrated scores to qiyas_indicator_scores
      const entries = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_calibration_log WHERE session_id = $1::uuid`,
        [sessionId]
      );

      for (const entry of entries.rows) {
        await safeQuery(
          `UPDATE "${schema}".qiyas_indicator_scores
           SET score = $1, calibrated = true, calibration_session_id = $2, updated_at = NOW()
           WHERE indicator_id = $3::uuid
             AND qiyas_assessment_id = $4::uuid`,
          [entry.calibrated_score, sessionId, entry.indicator_id, session.assessment_id]
        ).catch((err: unknown) => {
          logger.warn(`[QiyasCalibrationService] Failed to apply calibrated score for indicator ${entry.indicator_id}: ${toErrorMessage(err)}`);
        });
      }

      return session;
    } catch (err: unknown) {
      logger.error(`[QiyasCalibrationService] finalizeCalibration failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }
}
