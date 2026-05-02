import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { trackPolicyAction } from './policy-template-workflow.service';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function getPolicyGuidance(
  tenantId: string,
  policyId?: string,
  templateKey?: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (policyId) { conditions.push(`policy_id = $${idx++}`); params.push(policyId); }
  if (templateKey) { conditions.push(`template_key = $${idx++}`); params.push(templateKey); }

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".policy_guidance WHERE ${conditions.join(' AND ')} ORDER BY sort_order ASC`,
      params,
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function addPolicyGuidance(
  tenantId: string,
  data: {
    policyId?: string;
    templateKey?: string;
    guidanceType: string;
    titleEn: string;
    titleAr?: string;
    contentEn: string;
    contentAr?: string;
    frameworks?: string[];
    createdBy: string;
  },
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".policy_guidance
        (policy_id, template_key, guidance_type, title_en, title_ar, content_en, content_ar, frameworks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.policyId || null, data.templateKey || null, data.guidanceType,
        data.titleEn, data.titleAr || '', data.contentEn, data.contentAr || '',
        data.frameworks || [], data.createdBy,
      ],
    );

    if (data.policyId) {
      await trackPolicyAction(tenantId, data.policyId, 'guidance_updated', data.createdBy,
        null, null, null, `Guidance added: ${data.titleEn}`, { guidance_type: data.guidanceType });
    }

    return getFirstRow(result);
  } catch {
    return null;
  }
}
