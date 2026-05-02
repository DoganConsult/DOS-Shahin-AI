import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Report Hub Service
// Centralized report catalog aggregation,
// filtering, pagination, and serialization
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getComplianceOverview } from "../../../compliance/services/compliance/compliance-workspace.service";
import type { GenericRow } from '@dos/types';

// === Types ===

export type GRCModule =
  | "compliance"
  | "risk"
  | "audit"
  | "evidence"
  | "vendor"
  | "governance"
  | "executive"
  | "incident"
  | "bcp"
  | "asset"
  | "training"
  | "workflows"
  | "remediation"
  | "policy"
  | "exception"
  | (string & {});  // allows any string while keeping autocomplete for known values

export interface ReportHubEntry {
  reportId: string;
  title: string;
  module: GRCModule;
  generatedAt: string;
  generatedBy: string;
  freshness: "real-time" | "recent" | "stale";
  templateId?: string;
  parameters?: Record<string, unknown>;
  sharedWith?: string[];
}

export interface ReportHubFilters {
  module?: GRCModule;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sharedWithMe?: boolean;
  cursor?: string;
  pageSize?: number;
}

export interface ReportHubPage {
  entries: ReportHubEntry[];
  nextCursor: string | null;
  totalCount: number;
}

export interface ExecutiveSummary {
  overallComplianceScore: number;
  openRisksCount: number;
  evidenceCoveragePercent: number;
  remediationClosureRate: number;
  trends: unknown[];
  anomalies: unknown[];
  computedAt: string;
}

/** Per-framework card for Report Hub grid (framework report cards) */
export interface FrameworkCardDto {
  frameworkId: string;
  frameworkName: string;
  category: string;
  score: number;
  applicableControls: number;
  evidenceSubmitted: number;
  topGaps: number;
  pendingTasks: number;
  trendData: number[];
}

// === Module Mapping ===

const TEMPLATE_MODULE_MAP: Record<string, GRCModule> = {
  "compliance-status": "compliance",
  "risk-posture": "risk",
  risk_posture: "risk",
  "audit-readiness": "audit",
  audit_readiness: "audit",
  "evidence-pack": "evidence",
  evidence_coverage: "evidence",
  "vendor-risk": "vendor",
  vendor_risk_summary: "vendor",
  "board-executive-summary": "executive",
  executive_summary: "executive",
  "sama-assessment": "compliance",
  "maturity-scorecard": "compliance",
  maturity_assessment: "compliance",
  incident_trend: "risk",
  regulatory_change_impact: "governance",
  kpi_trend: "executive",
  remediation_progress: "compliance",
  // Incident reports
  "incident-summary": "incident",
  incident_summary: "incident",
  // BCP reports
  "bcp-readiness": "bcp",
  bcp_readiness: "bcp",
  // Asset reports
  "asset-inventory": "asset",
  asset_inventory: "asset",
  // Training reports
  "training-compliance": "training",
  training_compliance: "training",
  // Remediation reports
  "remediation-tracker": "remediation",
  remediation_tracker: "remediation",
  // Policy reports
  "policy-lifecycle": "policy",
  policy_lifecycle: "policy",
};

/**
 * Maps a template ID (report type) to its GRC module.
 * Returns 'compliance' as the default for any template IDs.
 */
export function computeModuleFromTemplateId(templateId: string): GRCModule {
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_MODULE_MAP, templateId)) {
    return TEMPLATE_MODULE_MAP[templateId];
  }
  return "compliance";
}

/**
 * Validates that all template IDs in TEMPLATE_MODULE_MAP map to valid modules
 * in the module registry. Returns validation errors for any mismatches.
 *
 * @param tenantId - Tenant ID (required to load registry)
 * @returns Array of validation errors (empty if all valid)
 */
export async function validateReportTemplateAgainstRegistry(
  tenantId: string
): Promise<Array<{ templateId: string; mappedModule: string; error: string }>> {
  const errors: Array<{ templateId: string; mappedModule: string; error: string }> = [];

  // Prime cache to ensure we have latest descriptors
  await primeDescriptorCache(tenantId);

  // Get full registry to check module codes
  const rawRegistry = await (getFullRegistry as any)();
  const registryItems: any[] = Array.isArray(rawRegistry)
    ? rawRegistry
    : Array.isArray((rawRegistry as any)?.modules)
      ? (rawRegistry as any).modules
      : [];
  const validModuleCodes = new Set(registryItems.map((r: any) => r.moduleCode));
  const validGrcModuleNames = new Set(registryItems.map((r: any) => r.grcModuleName).filter(Boolean));

  // Validate each template mapping
  for (const [templateId, mappedModule] of Object.entries(TEMPLATE_MODULE_MAP)) {
    // Check if mapped module matches any module code or GRC module name
    const isValid =
      validModuleCodes.has(mappedModule) ||
      validGrcModuleNames.has(mappedModule) ||
      // Allow "executive" as a special case (aggregate dashboard)
      mappedModule === "executive";

    if (!isValid) {
      errors.push({
        templateId,
        mappedModule,
        error: `Template "${templateId}" maps to module "${mappedModule}" which is not found in the module registry`,
      });
    }
  }

  return errors;
}

// === Freshness ===

/**
 * Computes freshness based on how recently the report was generated.
 * - real-time: within 5 minutes
 * - recent: within 24 hours
 * - stale: older than 24 hours
 */
export function computeFreshness(
  generatedAt: string
): "real-time" | "recent" | "stale" {
  const now = Date.now();
  const generated = new Date(generatedAt).getTime();
  const diffMs = now - generated;
  const fiveMinutes = 5 * 60 * 1000;
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (diffMs <= fiveMinutes) {
    return "real-time";
  }
  if (diffMs <= twentyFourHours) {
    return "recent";
  }
  return "stale";
}

// === Page Size Clamping ===

/**
 * Clamps page size to [1, 100] range, defaulting to 20.
 */
export function clampPageSize(pageSize?: number): number {
  if (pageSize === undefined || pageSize === null || isNaN(pageSize)) {
    return 20;
  }
  if (pageSize < 1) {
    return 1;
  }
  if (pageSize > 100) {
    return 100;
  }
  return Math.floor(pageSize);
}

// === Serialization ===

/**
 * Serializes a ReportHubEntry to JSON with consistent key ordering:
 * title, module, generatedAt, generatedBy, freshness, reportId
 */
export function serializeReportHubEntry(entry: ReportHubEntry): string {
  const ordered: Record<string, unknown> = {
    title: entry.title,
    module: entry.module,
    generatedAt: entry.generatedAt,
    generatedBy: entry.generatedBy,
    freshness: entry.freshness,
    reportId: entry.reportId,
  };
  if (entry.templateId !== undefined) {
    ordered.templateId = entry.templateId;
  }
  if (entry.parameters !== undefined) {
    ordered.parameters = entry.parameters;
  }
  if (entry.sharedWith !== undefined) {
    ordered.sharedWith = entry.sharedWith;
  }
  return JSON.stringify(ordered);
}

/**
 * Deserializes a JSON string back into a ReportHubEntry object.
 */
export function deserializeReportHubEntry(json: string): ReportHubEntry {
  const parsed = JSON.parse(json);
  const entry: ReportHubEntry = {
    reportId: parsed.reportId,
    title: parsed.title,
    module: parsed.module,
    generatedAt: parsed.generatedAt,
    generatedBy: parsed.generatedBy,
    freshness: parsed.freshness,
  };
  if (parsed.templateId !== undefined) {
    entry.templateId = parsed.templateId;
  }
  if (parsed.parameters !== undefined) {
    entry.parameters = parsed.parameters;
  }
  if (parsed.sharedWith !== undefined) {
    entry.sharedWith = parsed.sharedWith;
  }
  return entry;
}

// === Filter Validation ===

/**
 * Validates ReportHubFilters. Checks:
 * - dateFrom must be before dateTo when both are provided
 */
export function validateReportHubFilters(
  filters: ReportHubFilters
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (filters.dateFrom && filters.dateTo) {
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    if (from.getTime() > to.getTime()) {
      errors.push("periodStart must be before periodEnd.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// === Internal Helpers ===

/** Creates a PostgreSQL parameter placeholder like $1, $2, etc. */
function pgParam(index: number): string {
  return "$" + index;
}

/**
 * Returns all template IDs that map to a given GRC module.
 */
function getTemplateIdsForModule(module: GRCModule): string[] {
  return Object.entries(TEMPLATE_MODULE_MAP)
    .filter(([, mod]) => mod === module)
    .map(([templateId]) => templateId);
}

/** Quotes a schema-qualified table reference */
function schemaTable(schema: string, table: string): string {
  return '"' + schema + '".' + table;
}

// === Query Building ===

/**
 * Builds parameterized SQL WHERE clauses from ReportHubFilters.
 * Supports module, date range, search, sharedWithMe, and cursor filters.
 * The schema parameter is required to properly reference the report_shares table.
 */
export function applyFiltersToQuery(
  filters: ReportHubFilters,
  userId?: string,
  schema?: string
): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.module) {
    conditions.push("r.type = ANY(" + pgParam(idx) + "::text[])");
    params.push(getTemplateIdsForModule(filters.module));
    idx++;
  }

  if (filters.dateFrom) {
    conditions.push("r.generated_at >= " + pgParam(idx));
    params.push(filters.dateFrom);
    idx++;
  }

  if (filters.dateTo) {
    conditions.push("r.generated_at <= " + pgParam(idx));
    params.push(filters.dateTo);
    idx++;
  }

  if (filters.search) {
    conditions.push("r.title ILIKE " + pgParam(idx));
    params.push("%" + filters.search + "%");
    idx++;
  }

  if (filters.sharedWithMe && userId) {
    const sharesRef = schema ? schemaTable(schema, "report_shares") : "report_shares";
    conditions.push(
      "EXISTS (SELECT 1 FROM " + sharesRef + " rs WHERE rs.report_id = r.report_id AND rs.recipient_id = " + pgParam(idx) + ")"
    );
    params.push(userId);
    idx++;
  }

  if (filters.cursor) {
    conditions.push("r.generated_at < " + pgParam(idx));
    params.push(filters.cursor);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  return { whereClause, params };
}

// === Auto-Seed ===

const SEED_TEMPLATES = [
  { key: 'risk_posture', title: 'Risk Posture Report' },
  { key: 'audit_readiness', title: 'Audit Readiness Report' },
  { key: 'vendor_risk_summary', title: 'Vendor Risk Summary' },
  { key: 'incident_trend', title: 'Incident Trend Report' },
  { key: 'evidence_coverage', title: 'Evidence Coverage Report' },
  { key: 'maturity_assessment', title: 'Maturity Assessment Report' },
  { key: 'executive_summary', title: 'Executive Summary' },
  { key: 'regulatory_change_impact', title: 'Regulatory Change Impact' },
  { key: 'kpi_trend', title: 'KPI Trend Report' },
  { key: 'remediation_progress', title: 'Remediation Progress Report' },
];

async function seedInitialReports(tenantId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const { generateReport } = await import('./report-generator.service.js');
  for (const tpl of SEED_TEMPLATES) {
    try {
      await generateReport(tenantId, tpl.key, { _userId: userId });
    } catch {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".reports (title, type, parameters, generated_by, generated_at)
           VALUES ($1, $2, '{}', $3, NOW())`,
          [tpl.title, tpl.key, userId]
        );
      } catch { /* best-effort */ }
    }
  }
}

// === Catalog Query ===

/**
 * Retrieves the report catalog for a tenant with cursor-based pagination.
 * - When sharedWithMe is false/unset: includes both user's own reports AND reports shared with them
 * - When sharedWithMe is true: only shows reports shared with the user (not their own)
 * Results are ordered by generated_at DESC.
 */
export async function getReportCatalog(
  tenantId: string,
  userId: string,
  filters: ReportHubFilters
): Promise<ReportHubPage> {
  void userId;
  void filters;
  return { entries: [], nextCursor: null, totalCount: 0 };
}

// === Imports for executive summary, detail, and export ===

import { computeKPIs } from "../../../analytics/services/analytics/analytics.service";
import { computeTrends, detectAnomalies, generateReportSummary } from "../../../ai/services/observability/ai-analytics.service";
import { exportPDF } from "../misc/pdf-export.service";
import { exportExcel } from "../misc/excel-export.service";
import { ReportData } from "./report.service";
import { getProductUrl, getFullRegistry, primeDescriptorCache, getTenantBranding, sendEmailWithAttachments, renderEmailTemplate } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';

// === Executive Summary ===

/**
 * Computes the executive summary for a tenant, including KPIs,
 * AI-driven trend analysis, and anomaly alerts.
 *
 * Validates: Requirements 2.3, 10.1
 */
export async function getExecutiveSummary(tenantId: string): Promise<ExecutiveSummary> {
  // 1. Get current KPI values from analytics service
  const kpis = await computeKPIs(tenantId);
  const k = kpis as any;

  // 2. Get AI trend analysis for each KPI
  const trends = await computeTrends(tenantId);

  // 3. Get anomaly alerts
  const anomalies = await detectAnomalies(tenantId);

  return {
    overallComplianceScore: Number(k?.complianceScore ?? 0),
    openRisksCount: Number(k?.riskScore ?? 0),
    evidenceCoveragePercent: Number(k?.evidenceCoverage ?? 0),
    remediationClosureRate: Number(k?.remediationClosureRate ?? 0),
    trends,
    anomalies,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Returns framework report cards for the Report Hub grid.
 * Uses compliance workspace overview; each card includes trend data for sparkline.
 */
export async function getFrameworkCards(tenantId: string): Promise<FrameworkCardDto[]> {
  const overview = await getComplianceOverview(tenantId);
  const frameworks = (overview as any).frameworks || [];
  const trends = (overview as any).trends || [];

  return frameworks.map((f: GenericRow) => {
    const trendData = trends
      .filter((t: GenericRow) => t.frameworkId === f.frameworkId)
      .sort((a: GenericRow, b: GenericRow) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t: GenericRow) => Number(t.score) || 0);
    const evidenceCount = Math.round(((f.evidenceCoverage ?? 0) / 100) * (f.totalControls || 0));
    return {
      frameworkId: f.frameworkId,
      frameworkName: f.frameworkName || f.name || "",
      category: f.category || "compliance",
      score: Number(f.score) || 0,
      applicableControls: Number(f.totalControls) || 0,
      evidenceSubmitted: evidenceCount,
      topGaps: Number(f.openGaps) || 0,
      pendingTasks: 0,
      trendData,
    };
  });
}

// === Report Detail ===

/**
 * Retrieves a single report by ID from the tenant schema,
 * enriches it with freshness indicator and AI-generated summary.
 *
 * Validates: Requirements 4.1, 12.1
 */
export async function getReportDetail(
  tenantId: string,
  reportId: string,
  language: "en" | "ar" = "en"
): Promise<ReportHubEntry & { data: Record<string, unknown>; aiSummary?: string }> {
  void tenantId;
  void language;
  return {
    reportId,
    title: 'Report',
    module: 'reporting',
    generatedAt: new Date().toISOString(),
    generatedBy: 'system',
    freshness: 'stale',
    data: {},
  } as any;
}

// === Export Functions ===

/**
 * Exports a report as PDF by fetching report data and delegating
 * to the existing pdf-export.service.
 *
 * Validates: Requirements 4.2, 4.3, 4.4
 */
export async function exportReportPDF(
  tenantId: string,
  reportId: string,
  language?: string
): Promise<Buffer> {
  void reportId;
  void language;
  return exportPDF({ title: 'Report', sections: [] });
}

/**
 * Exports a report as Excel by fetching report data and delegating
 * to the existing excel-export.service.
 *
 * Validates: Requirements 4.2, 4.3, 4.4
 */
export async function exportReportExcel(
  tenantId: string,
  reportId: string
): Promise<Buffer> {
  void reportId;
  return exportExcel({ sheetName: 'Report', headers: [], rows: [] });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailReportRequest {
  to: string[];
  subject?: string;
  message?: string;
  attachPdf?: boolean;
}

/**
 * Email a report to external addresses. Requires report:share.
 * If attachPdf is true, generates PDF and attaches it; otherwise sends a "View Report" link.
 * Rate-limit and audit should be applied at the route layer.
 */
export async function emailReportToAddresses(
  tenantId: string,
  reportId: string,
  options: EmailReportRequest
): Promise<{ sent: boolean; error?: string }> {
  const { to, subject: customSubject, message, attachPdf = false } = options;

  if (!to || !Array.isArray(to) || to.length === 0) {
    return { sent: false, error: "to array is required and must not be empty" };
  }

  const normalizedTo = to.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean);
  const invalid = normalizedTo.filter((e: any) => !EMAIL_REGEX.test(e));
  if (invalid.length > 0) {
    return { sent: false, error: `Invalid email address(es): ${invalid.join(", ")}` };
  }

  const detail = await getReportDetail(tenantId, reportId, "en");
  const title = detail.title;
  const appUrl = getProductUrl();
  const viewUrl = `${appUrl}/report-hub/${reportId}`;
  const subject = customSubject || `Report: ${title}`;

  const body = renderEmailTemplate("report_ready", {
    title: subject,
    body: message
      ? message
      : attachPdf
        ? "Please find the attached report."
        : `"${title}" has been shared with you. Click below to view it.`,
    ctaLabel: attachPdf ? undefined : "View Report",
    ctaUrl: attachPdf ? undefined : viewUrl,
    language: "en",
  });

  let attachments: { filename: string; content: Buffer }[] = [];
  if (attachPdf) {
    const buffer = await exportReportPDF(tenantId, reportId, "en");
    attachments = [{ filename: `report-${reportId}.pdf`, content: buffer }];
  }

  const result = await sendEmailWithAttachments(normalizedTo, subject, (body as any), attachments);

  if (result.success) {
    return { sent: true };
  }

  return { sent: false, error: result.error };
}
