// ============================================
// Shahin-Ai — Portals Content Service
// Content management (pages, widgets),
// page builder config, widget config, versioning
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type ContentStatus = "draft" | "published" | "archived";
export type WidgetType = "text" | "document_list" | "questionnaire" | "progress_tracker" | "notice" | "contact";

export interface PortalPage {
  pageId: string;
  portalId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  status: ContentStatus;
  sortOrder: number;
  layout: Record<string, unknown>;
  version: number;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalWidget {
  widgetId: string;
  portalId: string;
  pageId: string | null;
  widgetType: WidgetType;
  titleEn: string;
  titleAr: string;
  config: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
}

// === Pure Functions ===

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function buildDefaultWidgetConfig(widgetType: WidgetType): Record<string, unknown> {
  switch (widgetType) {
    case "document_list":
      return { showUploadButton: true, maxFiles: 20, allowedTypes: ["pdf", "docx"] };
    case "questionnaire":
      return { showProgress: true, allowSave: true, deadline: null };
    case "progress_tracker":
      return { showPercentage: true, showSteps: true };
    case "notice":
      return { dismissible: true, level: "info" };
    default:
      return {};
  }
}

// === DB-backed Functions ===

function mapPage( r: Record<string, unknown>): PortalPage {
  return {

    pageId: r.page_id,

    portalId: r.portal_id,

    slug: r.slug,

    titleEn: r.title_en,

    titleAr: r.title_ar,

    contentEn: r.content_en || "",

    contentAr: r.content_ar || "",

    status: r.status,

    sortOrder: r.sort_order || 0,

    layout: r.layout || {},

    version: r.version || 1,

    publishedAt: r.published_at ? (r.published_at?.toISOString?.() || r.published_at) : null,

    createdBy: r.created_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

function mapWidget( r: Record<string, unknown>): PortalWidget {
  return {

    widgetId: r.widget_id,

    portalId: r.portal_id,

    pageId: r.page_id || null,

    widgetType: r.widget_type,

    titleEn: r.title_en,

    titleAr: r.title_ar || "",

    config: r.config || {},

    sortOrder: r.sort_order || 0,

    isVisible: r.is_visible ?? true,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function createPage(
  tenantId: string,
  data: {
    portalId: string;
    titleEn: string;
    titleAr?: string;
    contentEn?: string;
    contentAr?: string;
    layout?: Record<string, unknown>;
    sortOrder?: number;
    createdBy: string;
  }
): Promise<PortalPage> {
  const schema = tenantSchema(tenantId);
  const slug = generateSlug(data.titleEn);

  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_pages
      (portal_id, slug, title_en, title_ar, content_en, content_ar,
       status, sort_order, layout, version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, 1, $9)
     RETURNING *`,
    [
      data.portalId, slug, data.titleEn, data.titleAr || "",
      data.contentEn || "", data.contentAr || "",
      data.sortOrder ?? 0, JSON.stringify(data.layout || {}), data.createdBy,
    ]
  );
  return mapPage(getFirstRow(result)!);
}

export async function publishPage(
  tenantId: string,
  pageId: string
): Promise<PortalPage> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function updatePageContent(
  tenantId: string,
  pageId: string,
  data: { contentEn?: string; contentAr?: string; layout?: Record<string, unknown> }
): Promise<PortalPage> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function addWidget(
  tenantId: string,
  data: {
    portalId: string;
    pageId?: string;
    widgetType: WidgetType;
    titleEn: string;
    titleAr?: string;
    config?: Record<string, unknown>;
    sortOrder?: number;
  }
): Promise<PortalWidget> {
  const schema = tenantSchema(tenantId);
  const mergedConfig = { ...buildDefaultWidgetConfig(data.widgetType), ...data.config };

  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_widgets
      (portal_id, page_id, widget_type, title_en, title_ar, config, sort_order, is_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      data.portalId, data.pageId || null, data.widgetType,
      data.titleEn, data.titleAr || "",
      JSON.stringify(mergedConfig), data.sortOrder ?? 0,
    ]
  );
  return mapWidget(getFirstRow(result)!);
}

export async function getPortalPages(tenantId: string, portalId: string): Promise<PortalPage[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_pages WHERE portal_id = $1 ORDER BY sort_order ASC`,
    [portalId]
  );
  return result.rows.map(mapPage);
}

export async function getPortalWidgets(tenantId: string, portalId: string): Promise<PortalWidget[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_widgets WHERE portal_id = $1 AND is_visible = true ORDER BY sort_order ASC`,
    [portalId]
  );
  return result.rows.map(mapWidget);
}
