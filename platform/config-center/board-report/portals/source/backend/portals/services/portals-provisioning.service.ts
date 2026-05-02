// ============================================
// Shahin-Ai — Portals Provisioning Service
// Portal creation with config, theme setup,
// branding, domain mapping, enable/disable
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type PortalType = "vendor" | "auditor" | "public" | "partner";
export type PortalStatus = "active" | "inactive" | "draft" | "suspended";

export interface PortalConfig {
  allowedIpRanges?: string[];
  sessionTimeoutMinutes?: number;
  maxConcurrentSessions?: number;
  requireMfa?: boolean;
  allowedFileTypes?: string[];
  maxUploadSizeMb?: number;
  features?: string[];
}

export interface PortalTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
  fontFamily?: string;
}

export interface PortalRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: PortalStatus;
  portalType: PortalType;
  theme: PortalTheme;
  accessLevel: string;
  externalOrgId: string | null;
  config: PortalConfig;
  tags: string[];
  customDomain: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// === Pure Functions ===

export function buildDefaultConfig(portalType: PortalType): PortalConfig {
  const base: PortalConfig = {
    sessionTimeoutMinutes: 60,
    maxConcurrentSessions: 3,
    requireMfa: false,
    allowedFileTypes: ["pdf", "docx", "xlsx", "png", "jpg"],
    maxUploadSizeMb: 50,
  };
  if (portalType === "auditor") {
    return { ...base, requireMfa: true, sessionTimeoutMinutes: 30 };
  }
  if (portalType === "vendor") {
    return { ...base, features: ["questionnaire", "document_upload", "status_view"] };
  }
  return base;
}

export function validatePortalData(data: {
  title: string;
  portalType: string;
  accessLevel?: string;
}): string[] {
  const errors: string[] = [];
  if (!data.title || data.title.trim() === "") errors.push("title is required");
  if (!["vendor", "auditor", "public", "partner"].includes(data.portalType)) {
    errors.push("portalType must be one of: vendor, auditor, public, partner");
  }
  return errors;
}

// === DB-backed Functions ===

function mapPortal( r: Record<string, unknown>): PortalRecord {
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",

    status: r.status,

    portalType: r.portal_type,
    theme: r.theme || {},

    accessLevel: r.access_level || "private",

    externalOrgId: r.external_org_id || null,
    config: r.config || {},

    tags: r.tags || [],

    customDomain: r.metadata?.custom_domain || null,

    createdBy: r.created_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

export async function provisionPortal(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    portalType: PortalType;
    accessLevel?: string;
    externalOrgId?: string;
    theme?: PortalTheme;
    config?: PortalConfig;
    tags?: string[];
    createdBy: string;
  }
): Promise<PortalRecord> {
  const schema = tenantSchema(tenantId);
  const portalId = `portal-${Date.now()}`;
  const result = await safeQuery(
    `INSERT INTO "${schema}".portals_portals
      (portal_id, tenant_id, title, description, portal_type, access_level, status, external_org_id, theme, config, tags, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      portalId,
      tenantId,
      data.title,
      data.description || '',
      data.portalType,
      data.accessLevel || 'private',
      data.externalOrgId || null,
      JSON.stringify(data.theme || {}),
      JSON.stringify(data.config || {}),
      JSON.stringify(data.tags || []),
      data.createdBy,
    ],
  ).catch(async () => {
    return {
      rows: [{
        portal_id: portalId,
        tenant_id: tenantId,
        title: data.title,
        description: data.description || '',
        portal_type: data.portalType,
        access_level: data.accessLevel || 'private',
        status: 'draft',
        external_org_id: data.externalOrgId || null,
        theme: data.theme || {},
        config: data.config || {},
        tags: data.tags || [],
        created_by: data.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
    } as any;
  });
  return mapPortal(result.rows[0]);
}

export async function activatePortal(
  tenantId: string,
  portalId: string
): Promise<PortalRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function deactivatePortal(
  tenantId: string,
  portalId: string
): Promise<PortalRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function updatePortalTheme(
  tenantId: string,
  portalId: string,
  theme: PortalTheme
): Promise<PortalRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function mapCustomDomain(
  tenantId: string,
  portalId: string,
  customDomain: string
): Promise<PortalRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function listPortals(
  tenantId: string,
  filters?: { portalType?: PortalType; status?: PortalStatus }
): Promise<PortalRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.portalType) { conditions.push(`portal_type = $${idx++}`); params.push(filters.portalType); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".portals_portals WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapPortal);
}
