import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { ControlEffectivenessRecord } from '../../types/controls.types.js';

export interface RecordEffectivenessInput {
  design_score: number;
  operating_score: number;
  scored_by: string;
  scoring_period?: string;
  notes?: string;
}

export interface EffectivenessSummary {
  control_id: string;
  title: string;
  latest_design_score: number | null;
  latest_operating_score: number | null;
  latest_overall_score: number | null;
  latest_rating: string | null;
  scored_at: string | null;
}

export interface EffectivenessTrend {
  period: string;
  design_score: number;
  operating_score: number;
  overall_score: number;
  rating: string;
}

export class ControlEffectivenessService {
  private computeOverallScore(designScore: number, operatingScore: number): number {
    return Math.round((designScore * 0.4 + operatingScore * 0.6) * 100) / 100;
  }

  private computeRating(overallScore: number): 'effective' | 'partially_effective' | 'ineffective' {
    if (overallScore >= 75) return 'effective';
    if (overallScore >= 50) return 'partially_effective';
    return 'ineffective';
  }

  async recordEffectiveness(
    tenantId: string,
    controlId: string,
    input: RecordEffectivenessInput
  ): Promise<ControlEffectivenessRecord> {
    const schema = tenantSchema(tenantId);
    const overallScore = this.computeOverallScore(input.design_score, input.operating_score);
    const rating = this.computeRating(overallScore);

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_effectiveness_scores
         (control_id, design_score, operating_score, overall_score, rating,
          scored_by, scoring_period, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        controlId,
        input.design_score,
        input.operating_score,
        overallScore,
        rating,
        input.scored_by,
        input.scoring_period ?? null,
        input.notes ?? null,
      ]
    );

    await safeQuery(
      `UPDATE ${schema}.controls
          SET effectiveness_rating = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`,
      [rating, controlId]
    );

    return result.rows[0] as ControlEffectivenessRecord;
  }

  async getLatestEffectiveness(tenantId: string, controlId: string): Promise<ControlEffectivenessRecord | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT id, control_id, design_score, operating_score, overall_score,
              rating, scored_by, scoring_period, notes, created_at
         FROM ${schema}.control_effectiveness_scores
        WHERE control_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [controlId]
    );
    return (result.rows[0] as ControlEffectivenessRecord) ?? null;
  }

  async getEffectivenessHistory(tenantId: string, controlId: string, limit = 12): Promise<ControlEffectivenessRecord[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT id, control_id, design_score, operating_score, overall_score,
              rating, scored_by, scoring_period, notes, created_at
         FROM ${schema}.control_effectiveness_scores
        WHERE control_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [controlId, limit]
    );
    return result.rows as ControlEffectivenessRecord[];
  }

  async getEffectivenessTrend(tenantId: string, controlId: string, weeks = 12): Promise<EffectivenessTrend[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT
         DATE_TRUNC('week', created_at)::text AS period,
         ROUND(AVG(design_score)::numeric, 2)::float   AS design_score,
         ROUND(AVG(operating_score)::numeric, 2)::float AS operating_score,
         ROUND(AVG(overall_score)::numeric, 2)::float  AS overall_score,
         MODE() WITHIN GROUP (ORDER BY rating)         AS rating
       FROM ${schema}.control_effectiveness_scores
      WHERE control_id = $1
        AND created_at > NOW() - ($2 || ' weeks')::interval
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period ASC`,
      [controlId, weeks]
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      period: r.period,
      design_score: r.design_score,
      operating_score: r.operating_score,
      overall_score: r.overall_score,
      rating: r.rating,
    }));
  }

  async getEffectivenessSummaryForTenant(tenantId: string): Promise<EffectivenessSummary[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT c.control_id, c.title,
              es.design_score   AS latest_design_score,
              es.operating_score AS latest_operating_score,
              es.overall_score  AS latest_overall_score,
              es.rating         AS latest_rating,
              es.created_at     AS scored_at
         FROM ${schema}.controls c
         LEFT JOIN LATERAL (
           SELECT design_score, operating_score, overall_score, rating, created_at
             FROM ${schema}.control_effectiveness_scores
            WHERE control_id = c.control_id
            ORDER BY created_at DESC
            LIMIT 1
         ) es ON true
        WHERE c.deleted_at IS NULL
        ORDER BY c.title`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      control_id: r.control_id,
      title: r.title,
      latest_design_score: r.latest_design_score ?? null,
      latest_operating_score: r.latest_operating_score ?? null,
      latest_overall_score: r.latest_overall_score ?? null,
      latest_rating: r.latest_rating ?? null,
      scored_at: r.scored_at ?? null,
    }));
  }

  async getOverdueTests(tenantId: string, thresholdDays = 90): Promise<Array<{ control_id: string; title: string; last_tested_at: string | null; days_overdue: number }>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT control_id, title, last_tested_at,
              EXTRACT(DAY FROM NOW() - COALESCE(last_tested_at, created_at))::int AS days_overdue
         FROM ${schema}.controls
        WHERE deleted_at IS NULL
          AND status = 'active'
          AND (
            last_tested_at IS NULL AND created_at < NOW() - ($1 || ' days')::interval
            OR last_tested_at < NOW() - ($1 || ' days')::interval
          )
        ORDER BY days_overdue DESC`,
      [thresholdDays]
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      control_id: r.control_id,
      title: r.title,
      last_tested_at: r.last_tested_at ?? null,
      days_overdue: r.days_overdue,
    }));
  }
}
