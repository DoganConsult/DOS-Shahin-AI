import { safeQuery, tenantSchema } from '../../ports/database.port';
import type {
  Control,
  ControlCreateInput,
  ControlUpdateInput,
  ControlListFilter,
  ControlListResult,
} from '../../types/controls.types.js';

export class ControlLibraryService {
  async listControls(tenantId: string, filter: ControlListFilter = {}): Promise<ControlListResult> {
    const schema = tenantSchema(tenantId);

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter.control_type) {
      conditions.push(`control_type = $${idx++}`);
      params.push(filter.control_type);
    }
    if (filter.automation_level) {
      conditions.push(`automation_level = $${idx++}`);
      params.push(filter.automation_level);
    }
    if (filter.framework_id) {
      conditions.push(`framework_id = $${idx++}`);
      params.push(filter.framework_id);
    }
    if (filter.family_id) {
      conditions.push(`family_id = $${idx++}`);
      params.push(filter.family_id);
    }
    if (filter.owner) {
      conditions.push(`owner = $${idx++}`);
      params.push(filter.owner);
    }
    if (filter.key_control !== undefined) {
      conditions.push(`key_control = $${idx++}`);
      params.push(filter.key_control);
    }
    if (filter.is_sox !== undefined) {
      conditions.push(`is_sox = $${idx++}`);
      params.push(filter.is_sox);
    }
    if (filter.test_status) {
      conditions.push(`test_status = $${idx++}`);
      params.push(filter.test_status);
    }
    if (filter.failing_only) {
      conditions.push(`test_status = 'ineffective'`);
    }
    if (filter.search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }
    if (filter.unmapped_only) {
      conditions.push(`
        NOT EXISTS (SELECT 1 FROM ${schema}.control_risk_links rl WHERE rl.control_id = controls.control_id)
        AND NOT EXISTS (SELECT 1 FROM ${schema}.control_obligation_mappings om WHERE om.control_id = controls.control_id)
        AND NOT EXISTS (SELECT 1 FROM ${schema}.control_policy_links pl WHERE pl.control_id = controls.control_id)
      `);
    }

    const where = conditions.join(' AND ');
    const allowedSortFields: Record<string, string> = {
      title: 'title',
      created_at: 'created_at',
      updated_at: 'updated_at',
      status: 'status',
      control_type: 'control_type',
    };
    const sortBy = allowedSortFields[filter.sort_by ?? ''] ?? 'created_at';
    const sortDir = filter.sort_dir === 'ASC' ? 'ASC' : 'DESC';
    const pageSize = Math.min(filter.page_size ?? 50, 200);
    const offset = ((filter.page ?? 1) - 1) * pageSize;

    const [rowsResult, countResult] = await Promise.all([
      safeQuery(
        `SELECT control_id, tenant_id, title, description, objective, statement,
                status, control_type, automation_level, is_sox, key_control, frequency,
                owner, owner_team_id, operator_user_id, reviewer_user_id,
                test_status, last_tested_at, effectiveness_rating,
                framework_id, family_id, created_at, updated_at, created_by, updated_by, deleted_at
           FROM ${schema}.controls
          WHERE ${where}
          ORDER BY ${sortBy} ${sortDir}
          LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS total FROM ${schema}.controls WHERE ${where}`,
        params
      ),
    ]);

    return {
      rows: rowsResult.rows as Control[],
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async getControl(tenantId: string, controlId: string): Promise<Control | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT control_id, tenant_id, title, description, objective, statement,
              status, control_type, automation_level, is_sox, key_control, frequency,
              owner, owner_team_id, operator_user_id, reviewer_user_id,
              test_status, last_tested_at, effectiveness_rating,
              framework_id, family_id, created_at, updated_at, created_by, updated_by, deleted_at
         FROM ${schema}.controls
        WHERE control_id = $1 AND deleted_at IS NULL`,
      [controlId]
    );
    return (result.rows[0] as Control) ?? null;
  }

  async createControl(tenantId: string, input: ControlCreateInput): Promise<Control> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `INSERT INTO ${schema}.controls
         (title, description, objective, statement, control_type, automation_level,
          is_sox, key_control, frequency, owner, owner_team_id, operator_user_id,
          reviewer_user_id, framework_id, family_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft',$16)
       RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.objective ?? null,
        input.statement ?? null,
        input.control_type ?? null,
        input.automation_level ?? null,
        input.is_sox ?? false,
        input.key_control ?? false,
        input.frequency ?? null,
        input.owner ?? null,
        input.owner_team_id ?? null,
        input.operator_user_id ?? null,
        input.reviewer_user_id ?? null,
        input.framework_id ?? null,
        input.family_id ?? null,
        input.created_by,
      ]
    );
    return result.rows[0] as Control;
  }

  async updateControl(tenantId: string, controlId: string, input: ControlUpdateInput): Promise<Control | null> {
    const schema = tenantSchema(tenantId);

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: Array<[keyof ControlUpdateInput, string]> = [
      ['title', 'title'],
      ['description', 'description'],
      ['objective', 'objective'],
      ['statement', 'statement'],
      ['control_type', 'control_type'],
      ['automation_level', 'automation_level'],
      ['is_sox', 'is_sox'],
      ['key_control', 'key_control'],
      ['frequency', 'frequency'],
      ['owner', 'owner'],
      ['owner_team_id', 'owner_team_id'],
      ['operator_user_id', 'operator_user_id'],
      ['reviewer_user_id', 'reviewer_user_id'],
      ['framework_id', 'framework_id'],
      ['family_id', 'family_id'],
      ['updated_by', 'updated_by'],
    ];

    for (const [inputKey, dbCol] of fields) {
      if (input[inputKey] !== undefined) {
        setClauses.push(`${dbCol} = $${idx++}`);
        params.push(input[inputKey] as unknown);
      }
    }

    if (setClauses.length === 0) {
      return this.getControl(tenantId, controlId);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(controlId);

    const result = await safeQuery(
      `UPDATE ${schema}.controls
          SET ${setClauses.join(', ')}
        WHERE control_id = $${idx} AND deleted_at IS NULL
        RETURNING *`,
      params
    );
    return (result.rows[0] as Control) ?? null;
  }

  async softDeleteControl(tenantId: string, controlId: string, deletedBy: string): Promise<void> {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `UPDATE ${schema}.controls
          SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`,
      [deletedBy, controlId]
    );
  }

  async transitionStatus(
    tenantId: string,
    controlId: string,
    toStatus: string,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    const current = await this.getControl(tenantId, controlId);
    if (!current) return;

    await safeQuery(
      `UPDATE ${schema}.controls
          SET status = $1, updated_at = NOW(), updated_by = $2
        WHERE control_id = $3 AND deleted_at IS NULL`,
      [toStatus, changedBy, controlId]
    );

    await safeQuery(
      `INSERT INTO ${schema}.control_status_history
         (control_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [controlId, current.status, toStatus, changedBy, reason ?? null]
    );
  }
}
