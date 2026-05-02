import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { ControlOwnerRecord } from '../../types/controls.types.js';

export interface AssignOwnerInput {
  user_id: string;
  ownership_type: 'primary' | 'secondary' | 'operator' | 'reviewer' | 'delegate';
  is_primary?: boolean;
  assigned_by: string;
}

export interface OwnershipGap {
  control_id: string;
  title: string;
  missing_roles: string[];
}

export class ControlOwnershipService {
  async getOwners(tenantId: string, controlId: string): Promise<ControlOwnerRecord[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT id, control_id, user_id, ownership_type, is_primary, assigned_at, assigned_by
         FROM ${schema}.control_owners
        WHERE control_id = $1
        ORDER BY is_primary DESC, ownership_type`,
      [controlId]
    );
    return result.rows as ControlOwnerRecord[];
  }

  async assignOwner(tenantId: string, controlId: string, input: AssignOwnerInput): Promise<ControlOwnerRecord> {
    const schema = tenantSchema(tenantId);

    if (input.is_primary) {
      await safeQuery(
        `UPDATE ${schema}.control_owners SET is_primary = false WHERE control_id = $1`,
        [controlId]
      );
    }

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_owners (control_id, user_id, ownership_type, is_primary, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (control_id, user_id, ownership_type) DO UPDATE
         SET is_primary = EXCLUDED.is_primary,
             assigned_by = EXCLUDED.assigned_by,
             assigned_at = NOW()
       RETURNING *`,
      [
        controlId,
        input.user_id,
        input.ownership_type,
        input.is_primary ?? false,
        input.assigned_by,
      ]
    );
    return result.rows[0] as ControlOwnerRecord;
  }

  async removeOwner(tenantId: string, controlId: string, ownerId: string): Promise<void> {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `DELETE FROM ${schema}.control_owners WHERE id = $1 AND control_id = $2`,
      [ownerId, controlId]
    );
  }

  async getPrimaryOwner(tenantId: string, controlId: string): Promise<ControlOwnerRecord | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT id, control_id, user_id, ownership_type, is_primary, assigned_at, assigned_by
         FROM ${schema}.control_owners
        WHERE control_id = $1 AND is_primary = true
        LIMIT 1`,
      [controlId]
    );
    return (result.rows[0] as ControlOwnerRecord) ?? null;
  }

  async getOwnershipGaps(tenantId: string): Promise<OwnershipGap[]> {
    const schema = tenantSchema(tenantId);

    const controlsResult = await safeQuery(
      `SELECT c.control_id, c.title,
              ARRAY_AGG(o.ownership_type) FILTER (WHERE o.ownership_type IS NOT NULL) AS assigned_types
         FROM ${schema}.controls c
         LEFT JOIN ${schema}.control_owners o ON o.control_id = c.control_id
        WHERE c.deleted_at IS NULL AND c.status IN ('active', 'under_review')
        GROUP BY c.control_id, c.title
        ORDER BY c.title`,
      []
    );

    const gaps: OwnershipGap[] = [];
    const requiredRoles = ['primary', 'operator'];

    for (const row of controlsResult.rows) {
      const assigned: string[] = row.assigned_types ?? [];
      const missing = requiredRoles.filter(r => !assigned.includes(r));
      if (missing.length > 0) {
        gaps.push({ control_id: row.control_id, title: row.title, missing_roles: missing });
      }
    }
    return gaps;
  }

  async getControlsByOwner(tenantId: string, userId: string): Promise<Array<{ control_id: string; title: string; ownership_type: string }>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT c.control_id, c.title, o.ownership_type
         FROM ${schema}.controls c
         JOIN ${schema}.control_owners o ON o.control_id = c.control_id
        WHERE c.deleted_at IS NULL AND o.user_id = $1
        ORDER BY c.title`,
      [userId]
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      control_id: r.control_id,
      title: r.title,
      ownership_type: r.ownership_type,
    }));
  }
}
