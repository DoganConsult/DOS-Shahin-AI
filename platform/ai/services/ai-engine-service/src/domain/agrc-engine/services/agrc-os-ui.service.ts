import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// Shahin — AGRC-OS UI Config Service (Product)
// Drawer, dashboard layouts, workspace profile,
// action items for drawer. Tenant-scoped only.
// NOTE: This is an AGRC product service residing
// in the agrc-engine directory. Law 2 ownership: agrc.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { getLatestAnswers } from '../ports/platform.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkspaceProfile {
  tenantId: string;
  industry: string;
  orgSize: string;
  sectors: string[];
  defaultDashboard: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrawerZone {
  id: string;
  title_en?: string;
  title_ar?: string;
}

export interface DrawerTemplate {
  templateId: string;
  templateKey: string;
  nameEn: string;
  nameAr: string | null;
  zones: DrawerZone[];
  contextType: string;
  sortOrder: number;
}

export interface ActionItemForDrawer {
  itemId: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceId: string;
  assignedTo: string;
  deadline: string | null;
  status: string;
  priority: number;
  type: string;
}

export interface DrawerPayload {
  template: DrawerTemplate | null;
  actionItems: ActionItemForDrawer[];
  workspaceProfile: WorkspaceProfile | null;
}

export interface DashboardWidgetPlacement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  layoutId: string;
  dashboardCode: string;
  nameEn: string;
  nameAr: string | null;
  layout: { widgets: DashboardWidgetPlacement[] };
  audience: string;
  sortOrder: number;
}

// ── Repo: workspace profile ─────────────────────────────────────────────────

export async function getWorkspaceProfile(tenantId: string): Promise<WorkspaceProfile | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT tenant_id, industry, org_size, sectors, default_dashboard, created_at, updated_at
       FROM "${schema}".workspace_profile WHERE tenant_id = $1`,
      [tenantId]
    );
    if (result.rows.length === 0) return null;
    const r = getFirstRow(result);
    return {
      tenantId: r.tenant_id,
      industry: r.industry || 'other',
      orgSize: r.org_size || '1-50',
      sectors: Array.isArray(r.sectors) ? r.sectors : (r.sectors ? JSON.parse(r.sectors) : []),
      defaultDashboard: r.default_dashboard || 'big_picture',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } catch {
    return null;
  }
}

// ── Repo: drawer template ───────────────────────────────────────────────────

export async function getDrawerTemplate(
  tenantId: string,
  contextType: string
): Promise<DrawerTemplate | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT template_id, template_key, name_en, name_ar, zones, context_type, sort_order
       FROM "${schema}".drawer_templates WHERE context_type = $1 ORDER BY sort_order ASC LIMIT 1`,
      [contextType]
    );
    if (result.rows.length === 0) {
      const fallback = await safeQuery(
        `SELECT template_id, template_key, name_en, name_ar, zones, context_type, sort_order
         FROM "${schema}".drawer_templates WHERE template_key = 'entity_detail' LIMIT 1`
      );
      if (fallback.rows.length === 0) return null;
      return mapRowToDrawerTemplate(getFirstRow(fallback));
    }
    return mapRowToDrawerTemplate(getFirstRow(result));
  } catch {
    return null;
  }
}

function mapRowToDrawerTemplate(rawRow: Record<string, unknown>): DrawerTemplate {
  const r = rawRow as {
    template_id: string;
    template_key: string;
    name_en?: string;
    name_ar?: string | null;
    zones?: string | unknown[];
    context_type?: string;
    sort_order?: number;
  };
  const zones = (typeof r.zones === 'string' ? JSON.parse(r.zones) : r.zones) || [];
  return {

    templateId: r.template_id,

    templateKey: r.template_key,

    nameEn: r.name_en || '',

    nameAr: r.name_ar || null,
    zones: (zones as Array<Record<string, unknown>>).map((z) => ({
      id: (z.id as string) || '',
      title_en: z.title_en as string | undefined,
      title_ar: z.title_ar as string | undefined,
    })),

    contextType: (r.context_type as string) || 'entity',

    sortOrder: r.sort_order ?? 0,
  };
}

// ── Repo: action items for drawer ───────────────────────────────────────────

export async function listActionItemsForDrawer(
  tenantId: string,
  userId: string,
  limit: number = 20
): Promise<ActionItemForDrawer[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT item_id, title, description, source_type, source_id, assigned_to, deadline, status, priority, type
       FROM "${schema}".action_items
       WHERE assigned_to = $1 AND status NOT IN ('completed') ORDER BY priority ASC, deadline ASC NULLS LAST LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map((r: GenericRow) => ({
      itemId: r.item_id,
      title: r.title,
      description: r.description,
      sourceType: r.source_type,
      sourceId: r.source_id,
      assignedTo: r.assigned_to,
      deadline: r.deadline,
      status: r.status,
      priority: r.priority ?? 5,
      type: r.type || 'task',
    }));
  } catch {
    return [];
  }
}

// ── Repo: dashboard layout ──────────────────────────────────────────────────

export async function getDashboardLayout(
  tenantId: string,
  dashboardCode: string
): Promise<DashboardLayout | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT layout_id, dashboard_code, name_en, name_ar, layout, audience, sort_order
       FROM "${schema}".dashboard_layouts WHERE dashboard_code = $1 LIMIT 1`,
      [dashboardCode]
    );
    if (result.rows.length === 0) return null;
    const r = getFirstRow(result);
    const layout = typeof r.layout === 'string' ? JSON.parse(r.layout) : r.layout;
    return {
      layoutId: r.layout_id,
      dashboardCode: r.dashboard_code,
      nameEn: r.name_en || '',
      nameAr: r.name_ar || null,
      layout: layout && typeof layout.widgets === 'object' ? layout : { widgets: [] },
      audience: r.audience || 'all',
      sortOrder: r.sort_order ?? 0,
    };
  } catch {
    return null;
  }
}

// ── Drawer payload (template + action items + workspace profile) ───────────

export async function getDrawerPayload(
  tenantId: string,
  userId: string,
  contextType: string = 'entity'
): Promise<DrawerPayload> {
  const [template, actionItems, workspaceProfile] = await Promise.all([
    getDrawerTemplate(tenantId, contextType),
    listActionItemsForDrawer(tenantId, userId),
    getWorkspaceProfile(tenantId),
  ]);
  return {
    template,
    actionItems,
    workspaceProfile,
  };
}

// ── Seed workspace_profile from onboarding answers ──────────────────────────

export async function seedWorkspaceProfileFromOnboarding(
  tenantId: string,
  answersOverride?: Record<string, unknown>
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const latest = answersOverride ?? (await getLatestAnswers(tenantId))?.answers ?? {};
  const industry = latest?.industry ?? 'other';
  const orgSize = latest?.org_size ?? '1-50';
  const sectors = latest?.sector_ids ?? latest?.sectors ?? [];
  const defaultDashboard = latest?.default_dashboard ?? 'big_picture';

  // Ensure workspace_profile has AGRC-OS config columns
  await safeQuery(`
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS risk_appetite VARCHAR(20) DEFAULT 'moderate';
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) DEFAULT 'high';
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS orchestrator_enabled VARCHAR(20) DEFAULT 'auto';
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS reporting_cadence VARCHAR(20) DEFAULT 'weekly';
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'advisory';
    ALTER TABLE "${schema}".workspace_profile ADD COLUMN IF NOT EXISTS evidence_freshness_days INT DEFAULT 60;
  `).catch(catchHandler(EC.AGENT_ACTION, {}));

  const riskAppetite = latest?.risk_appetite ?? 'moderate';
  const escalationLevel = latest?.escalation_level ?? 'high';
  const orchestratorEnabled = latest?.orchestrator_enabled ?? 'auto';
  const reportingCadence = latest?.reporting_cadence ?? 'weekly';
  const enforcementMode = latest?.enforcement_mode ?? 'advisory';
  const evidenceFreshnessDays = parseInt(String(latest?.evidence_freshness ?? '')) || 60;

  await safeQuery(
    `INSERT INTO "${schema}".workspace_profile
       (tenant_id, industry, org_size, sectors, default_dashboard,
        risk_appetite, escalation_level, orchestrator_enabled,
        reporting_cadence, enforcement_mode, evidence_freshness_days,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       industry = EXCLUDED.industry,
       org_size = EXCLUDED.org_size,
       sectors = EXCLUDED.sectors,
       default_dashboard = EXCLUDED.default_dashboard,
       risk_appetite = EXCLUDED.risk_appetite,
       escalation_level = EXCLUDED.escalation_level,
       orchestrator_enabled = EXCLUDED.orchestrator_enabled,
       reporting_cadence = EXCLUDED.reporting_cadence,
       enforcement_mode = EXCLUDED.enforcement_mode,
       evidence_freshness_days = EXCLUDED.evidence_freshness_days,
       updated_at = NOW()`,
    [tenantId, industry, orgSize, JSON.stringify(Array.isArray(sectors) ? sectors : []),
     defaultDashboard, riskAppetite, escalationLevel, orchestratorEnabled,
     reportingCadence, enforcementMode, evidenceFreshnessDays]
  );
}
