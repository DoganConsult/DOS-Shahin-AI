import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { PolicyTemplate } from './policy-template.types';
import { POLICY_TEMPLATES } from './policy-template-catalog';
import { trackPolicyAction, createPolicyWorkflowSteps } from './policy-template-workflow.service';

export async function getTenantContext(tenantId: string): Promise<Record<string, string>> {
  try {
    const tenant = await safeQuery(
      `SELECT org_name, tenant_name_ar, industry, org_size, regions FROM public.tenants WHERE tenant_id = $1`,
      [tenantId],
    );
    const t = getFirstRow(tenant) || {};
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return {
      '{{ORG_NAME}}': t.org_name || '[Organization Name]',
      '{{ORG_NAME_AR}}': t.tenant_name_ar || t.org_name || '[اسم المنظمة]',
      '{{INDUSTRY}}': t.industry || '[Industry]',
      '{{EFFECTIVE_DATE}}': today.toISOString().split('T')[0],
      '{{REVIEW_DATE}}': nextYear.toISOString().split('T')[0],
      '{{COUNTRY}}': 'Kingdom of Saudi Arabia',
      '{{CISO_NAME}}': '[CISO Name]',
      '{{DPO_NAME}}': '[DPO Name]',
      '{{CEO_NAME}}': '[CEO Name]',
      '{{REGULATOR}}': 'NCA',
    };
  } catch {
    return {
      '{{ORG_NAME}}': '[Organization Name]',
      '{{ORG_NAME_AR}}': '[اسم المنظمة]',
      '{{INDUSTRY}}': '[Industry]',
      '{{EFFECTIVE_DATE}}': new Date().toISOString().split('T')[0],
      '{{REVIEW_DATE}}': new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      '{{COUNTRY}}': 'Kingdom of Saudi Arabia',
      '{{CISO_NAME}}': '[CISO Name]',
      '{{DPO_NAME}}': '[DPO Name]',
      '{{CEO_NAME}}': '[CEO Name]',
      '{{REGULATOR}}': 'NCA',
    };
  }
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  return result;
}

export function getTemplates(): PolicyTemplate[] {
  return POLICY_TEMPLATES;
}

export function getTemplateByKey(key: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find(t => t.template_key === key);
}

export function getTemplatesByCategory(category: string): PolicyTemplate[] {
  return POLICY_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesBySector(sectorId: string): PolicyTemplate[] {
  return POLICY_TEMPLATES.filter(t => t.sectors.length === 0 || t.sectors.includes(sectorId));
}

export function getTemplatesByFramework(framework: string): PolicyTemplate[] {
  return POLICY_TEMPLATES.filter(t => t.frameworks.some(f => f.includes(framework)));
}

export async function generatePolicyFromTemplate(
  tenantId: string,
  templateKey: string,
  overrides?: Record<string, string>,
): Promise<{ title: string; content: string; description: string; category: string; frameworks: string[]; tags: string[]; review_frequency: string; guidance: string } | null> {
  const template = getTemplateByKey(templateKey);
  if (!template) return null;

  const ctx = await getTenantContext(tenantId);
  const vars = { ...ctx, ...(overrides || {}) };

  return {
    title: interpolateTemplate(template.title_en, vars),
    content: interpolateTemplate(template.content_en, vars),
    description: interpolateTemplate(template.description_en, vars),
    category: template.category,
    frameworks: template.frameworks,
    tags: template.tags,
    review_frequency: template.review_frequency,
    guidance: interpolateTemplate(template.guidance_en, vars),
  };
}

export async function bulkGeneratePolicies(
  tenantId: string,
  templateKeys: string[],
  userId: string,
  overrides?: Record<string, string>,
): Promise<{ created: number; policyIds: string[]; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const ctx = await getTenantContext(tenantId);
  const vars = { ...ctx, ...(overrides || {}) };
  const policyIds: string[] = [];
  const errors: string[] = [];

  for (const key of templateKeys) {
    const template = getTemplateByKey(key);
    if (!template) { errors.push(`Template ${key} not found`); continue; }

    try {
      const title = interpolateTemplate(template.title_en, vars);
      const content = interpolateTemplate(template.content_en, vars);
      const desc = interpolateTemplate(template.description_en, vars);
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

      const result = await safeQuery(
        `INSERT INTO "${schema}".policies
          (title, content, description, category, status, approval_status, frameworks, owner,
           review_frequency, effective_date, next_review_date, tags)
         VALUES ($1,$2,$3,$4,'draft','draft',$5,$6,$7,$8,$9,$10) RETURNING policy_id`,
        [title, content, desc, template.category, template.frameworks, userId,
         template.review_frequency, today, nextYear, template.tags],
      );

      const policyId = getFirstRow(result)?.policy_id;
      if (policyId) {
        policyIds.push(policyId);

        await safeQuery(
          `INSERT INTO "${schema}".policy_versions (policy_id, version, title, content, status, change_summary, changed_by, snapshot)
           VALUES ($1, 1, $2, $3, 'draft', $4, $5, $6)`,
          [policyId, title, content, `Generated from template ${key}`, userId, JSON.stringify({ template_key: key })],
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        await trackPolicyAction(tenantId, policyId, 'created', userId, null, null, 'draft',
          `Auto-generated from template ${key}`, { template_key: key }).catch(catchHandler(EC.EVENT_BUS, {}));

        await createPolicyWorkflowSteps(tenantId, policyId).catch(catchHandler(EC.EVENT_BUS, {}));

        if (template.guidance_en) {
          await safeQuery(
            `INSERT INTO "${schema}".policy_guidance
              (policy_id, template_key, guidance_type, title_en, title_ar, content_en, content_ar, frameworks, created_by)
             VALUES ($1,$2,'implementation',$3,$4,$5,$6,$7,$8)`,
            [policyId, key, `Implementation Guide: ${template.title_en}`,
             template.title_ar ? `دليل التنفيذ: ${template.title_ar}` : '',
             interpolateTemplate(template.guidance_en, vars),
             template.guidance_ar ? interpolateTemplate(template.guidance_ar, vars) : '',
             template.frameworks, 'system'],
          ).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      }
    } catch (err: unknown) {
      errors.push(`${key}: ${toErrorMessage(err)}`);
    }
  }

  return { created: policyIds.length, policyIds, errors };
}

export async function seedPolicyTemplates(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let count = 0;
  for (const t of POLICY_TEMPLATES) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".policy_templates
          (template_key, title_en, title_ar, category, description_en, description_ar,
           frameworks, sectors, content_en, content_ar, guidance_en, guidance_ar,
           variables, review_frequency, tags, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (template_key) DO NOTHING`,
        [t.template_key, t.title_en, t.title_ar, t.category, t.description_en, t.description_ar,
         t.frameworks, t.sectors, t.content_en, t.content_ar, t.guidance_en, t.guidance_ar,
         JSON.stringify(t.variables), t.review_frequency, t.tags, t.sort_order],
      );
      count++;
    } catch { /* non-fatal */ }
  }
  return count;
}
