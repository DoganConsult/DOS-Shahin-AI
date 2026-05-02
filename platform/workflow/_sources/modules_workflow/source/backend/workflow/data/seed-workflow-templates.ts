import { safeQuery, tenantSchema } from '../ports/database.port';

export interface WorkflowTemplateSeed {
  code: string;
  name: string;
  description?: string;
  moduleCode?: string;
  definition?: Record<string, unknown>;
}

export interface SeedWorkflowTemplatesOptions {
  onlyCodes?: string[];
}

export const WORKFLOW_TEMPLATE_SEEDS: WorkflowTemplateSeed[] = [];

export const WORKFLOW_PROFILE_CODE_ALIASES: Record<string, string[]> = {};

export function expandWorkflowTemplateCodesFromProfile(profileCode: string): string[] {
  const direct = WORKFLOW_PROFILE_CODE_ALIASES[profileCode];
  return Array.isArray(direct) ? direct : [];
}

export async function seedWorkflowTemplates(
  tenantId: string,
  options: SeedWorkflowTemplatesOptions = {},
): Promise<number> {
  const schema = tenantSchema(tenantId);
  const seeds = options.onlyCodes?.length
    ? WORKFLOW_TEMPLATE_SEEDS.filter(s => options.onlyCodes!.includes(s.code))
    : WORKFLOW_TEMPLATE_SEEDS;

  if (seeds.length === 0) return 0;

  let inserted = 0;
  for (const seed of seeds) {
    const definition = seed.definition ?? {};
    const res = await safeQuery(
      `INSERT INTO "${schema}".workflow_templates (code, name, description, module_code, definition, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (code) DO NOTHING`,
      [seed.code, seed.name, seed.description ?? null, seed.moduleCode ?? 'workflow', JSON.stringify(definition)],
    ).catch(() => ({ rowCount: 0 }));
    inserted += res.rowCount ?? 0;
  }

  return inserted;
}
