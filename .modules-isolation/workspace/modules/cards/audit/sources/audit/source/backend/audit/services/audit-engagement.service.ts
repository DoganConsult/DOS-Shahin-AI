import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';

export interface CreateEngagementData {
  name: string;
  auditType: string;
  startDate: string;
  endDate?: string;
  leadAuditor: string;
  scope?: string;
  objectives?: string;
}

/**
 * Create a new audit engagement record in the tenant schema.
 */
export async function createEngagement(
  tenantId: string,
  data: CreateEngagementData,
): Promise<{ engagementId: string }> {
  const schema = tenantSchema(tenantId);
  const engagementId = uuid();

  try {
    await safeQuery(
      `INSERT INTO ${schema}.audit_engagements
         (id, name, audit_type, start_date, end_date, lead_auditor, scope, objectives, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW(), NOW())`,
      [
        engagementId,
        data.name,
        data.auditType,
        data.startDate,
        data.endDate || null,
        data.leadAuditor,
        data.scope || null,
        data.objectives || null,
      ],
    );

    logger.info(
      `[audit] Created engagement id=${engagementId} name="${data.name}" tenant=${tenantId}`,
    );
    return { engagementId };
  } catch (err) {
    logger.error(`[audit] Failed to create engagement for tenant=${tenantId}`, err);
    throw err;
  }
}
