import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { ControlDesignMetadata } from '../../types/controls.types.js';

export interface UpsertDesignMetadataInput {
  design_rationale?: string;
  implementation_guidance?: string;
  test_approach?: string;
  expected_outcome?: string;
  pass_criteria?: string;
  fail_criteria?: string;
  automation_notes?: string;
  updated_by: string;
}

export class ControlDesignService {
  async getDesignMetadata(tenantId: string, controlId: string): Promise<ControlDesignMetadata | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT control_id, design_rationale, implementation_guidance, test_approach,
              expected_outcome, pass_criteria, fail_criteria, automation_notes,
              updated_at, updated_by
         FROM ${schema}.control_design_metadata
        WHERE control_id = $1`,
      [controlId]
    );
    return (result.rows[0] as ControlDesignMetadata) ?? null;
  }

  async upsertDesignMetadata(
    tenantId: string,
    controlId: string,
    input: UpsertDesignMetadataInput
  ): Promise<ControlDesignMetadata> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `INSERT INTO ${schema}.control_design_metadata
         (control_id, design_rationale, implementation_guidance, test_approach,
          expected_outcome, pass_criteria, fail_criteria, automation_notes, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (control_id) DO UPDATE SET
         design_rationale       = COALESCE(EXCLUDED.design_rationale, control_design_metadata.design_rationale),
         implementation_guidance = COALESCE(EXCLUDED.implementation_guidance, control_design_metadata.implementation_guidance),
         test_approach          = COALESCE(EXCLUDED.test_approach, control_design_metadata.test_approach),
         expected_outcome       = COALESCE(EXCLUDED.expected_outcome, control_design_metadata.expected_outcome),
         pass_criteria          = COALESCE(EXCLUDED.pass_criteria, control_design_metadata.pass_criteria),
         fail_criteria          = COALESCE(EXCLUDED.fail_criteria, control_design_metadata.fail_criteria),
         automation_notes       = COALESCE(EXCLUDED.automation_notes, control_design_metadata.automation_notes),
         updated_by             = EXCLUDED.updated_by,
         updated_at             = NOW()
       RETURNING *`,
      [
        controlId,
        input.design_rationale ?? null,
        input.implementation_guidance ?? null,
        input.test_approach ?? null,
        input.expected_outcome ?? null,
        input.pass_criteria ?? null,
        input.fail_criteria ?? null,
        input.automation_notes ?? null,
        input.updated_by,
      ]
    );
    return result.rows[0] as ControlDesignMetadata;
  }

  async listControlsWithoutDesignMetadata(tenantId: string): Promise<Array<{ control_id: string; title: string }>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT c.control_id, c.title
         FROM ${schema}.controls c
        WHERE c.deleted_at IS NULL
          AND c.status IN ('active', 'under_review')
          AND NOT EXISTS (
            SELECT 1 FROM ${schema}.control_design_metadata dm WHERE dm.control_id = c.control_id
          )
        ORDER BY c.title`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({ control_id: r.control_id, title: r.title }));
  }

  async listControlsWithIncompleteDesign(tenantId: string): Promise<Array<{ control_id: string; title: string; missing_fields: string[] }>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT c.control_id, c.title,
              dm.design_rationale, dm.implementation_guidance,
              dm.test_approach, dm.expected_outcome,
              dm.pass_criteria, dm.fail_criteria
         FROM ${schema}.controls c
         LEFT JOIN ${schema}.control_design_metadata dm ON dm.control_id = c.control_id
        WHERE c.deleted_at IS NULL
          AND c.status IN ('active', 'under_review')
        ORDER BY c.title`,
      []
    );

    const incomplete: Array<{ control_id: string; title: string; missing_fields: string[] }> = [];
    for (const r of result.rows) {
      const missing: string[] = [];
      if (!r.design_rationale) missing.push('design_rationale');
      if (!r.implementation_guidance) missing.push('implementation_guidance');
      if (!r.test_approach) missing.push('test_approach');
      if (!r.expected_outcome) missing.push('expected_outcome');
      if (!r.pass_criteria) missing.push('pass_criteria');
      if (!r.fail_criteria) missing.push('fail_criteria');
      if (missing.length > 0) {
        incomplete.push({ control_id: r.control_id, title: r.title, missing_fields: missing });
      }
    }
    return incomplete;
  }
}
