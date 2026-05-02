import { logger } from '../ports/logger.port';
// ============================================================================
// KSA Regulatory Report Templates Service
// Provides KSA-specific regulatory report generation with AI-powered narrative
// sections. Supports NCA-ECC, SAMA-CSF, PDPL, NDMO, and cross-framework
// compliance assessments. Reports are stored in the tenant reports table for
// history and scheduling.
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { claudeJSON as _claudeJSON, claudeComplete } from '../ports/ai.port';
import { getFirstRow } from '@dos/db';
import { resolveRegulatoryProfileForTenant as _resolveRegulatoryProfileForTenant } from '../../compliance/services/regulatory/regulatory-resolution.service';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// === Types ===

export interface ReportSection {
  key: string;
  title: string;
  titleAr: string;
  /** Data sources needed to populate this section */
  requiredTables: string[];
}

export interface KsaReportTemplate {
  id: string;
  name: string;
  nameAr: string;
  frameworkCode: string | null;
  description: string;
  sections: ReportSection[];
  requiredData: string[];
  format: 'html' | 'json';
}

export interface GenerateReportOptions {
  /** Override report period start (defaults to 30 days ago) */
  periodFrom?: string;
  /** Override report period end (defaults to today) */
  periodTo?: string;
  /** Language for AI-generated narrative: 'en', 'ar', or 'bilingual' */
  language?: 'en' | 'ar' | 'bilingual';
  /** User ID generating the report */
  generatedBy?: string;
}

export interface GeneratedReport {
  reportId: string;
  templateId: string;
  html: string;
  metadata: {
    templateName: string;
    frameworkCode: string | null;
    periodFrom: string;
    periodTo: string;
    language: string;
    sectionCount: number;
    dataPointCount: number;
  };
  generatedAt: string;
}

export interface ReportHistoryEntry {
  reportId: string;
  title: string;
  type: string;
  status: string;
  format: string;
  language: string;
  generatedBy: string;
  generatedAt: string;
  parameters: Record<string, unknown>;
}

export interface ReportScheduleResult {
  scheduleId: string;
  reportType: string;
  cronExpression: string;
  enabled: boolean;
}

// === KSA Report Template Definitions ===

const KSA_REPORT_TEMPLATES: KsaReportTemplate[] = [
  {
    id: 'ksa-nca-ecc-assessment',
    name: 'NCA-ECC Compliance Assessment Report',
    nameAr: 'تقرير تقييم الامتثال لضوابط الأمن السيبراني',
    frameworkCode: 'NCA-ECC',
    description: 'Comprehensive NCA Essential Cybersecurity Controls compliance assessment with domain-level breakdown and gap analysis.',
    sections: [
      { key: 'executive_summary', title: 'Executive Summary', titleAr: 'الملخص التنفيذي', requiredTables: ['controls', 'frameworks'] },
      { key: 'compliance_status', title: 'NCA-ECC Compliance Status', titleAr: 'حالة الامتثال', requiredTables: ['controls'] },
      { key: 'domain_breakdown', title: 'Domain-Level Breakdown', titleAr: 'التفصيل على مستوى المجالات', requiredTables: ['controls'] },
      { key: 'gap_analysis', title: 'Gap Analysis & Remediation Priority', titleAr: 'تحليل الفجوات وأولويات المعالجة', requiredTables: ['controls', 'evidence_tasks'] },
      { key: 'evidence_summary', title: 'Evidence Coverage', titleAr: 'تغطية الأدلة', requiredTables: ['evidence_tasks'] },
      { key: 'risk_assessment', title: 'Cyber Risk Exposure', titleAr: 'التعرض للمخاطر السيبرانية', requiredTables: ['risks'] },
      { key: 'remediation_plan', title: 'Remediation Roadmap', titleAr: 'خارطة طريق المعالجة', requiredTables: ['controls', 'risks'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks', 'risks'],
    format: 'html',
  },
  {
    id: 'ksa-sama-csf-report',
    name: 'SAMA-CSF Cyber Security Framework Report',
    nameAr: 'تقرير إطار الأمن السيبراني للبنك المركزي',
    frameworkCode: 'SAMA-CSF',
    description: 'SAMA Cyber Security Framework compliance report for financial institutions with control assessment and maturity scoring.',
    sections: [
      { key: 'executive_summary', title: 'Executive Summary', titleAr: 'الملخص التنفيذي', requiredTables: ['controls', 'frameworks'] },
      { key: 'compliance_status', title: 'SAMA-CSF Compliance Status', titleAr: 'حالة الامتثال', requiredTables: ['controls'] },
      { key: 'domain_breakdown', title: 'Domain Assessment', titleAr: 'تقييم المجالات', requiredTables: ['controls'] },
      { key: 'gap_analysis', title: 'Control Gap Analysis', titleAr: 'تحليل فجوات الضوابط', requiredTables: ['controls', 'evidence_tasks'] },
      { key: 'evidence_summary', title: 'Evidence & Documentation', titleAr: 'الأدلة والوثائق', requiredTables: ['evidence_tasks'] },
      { key: 'risk_assessment', title: 'Financial Sector Risk Assessment', titleAr: 'تقييم مخاطر القطاع المالي', requiredTables: ['risks'] },
      { key: 'remediation_plan', title: 'Remediation Actions', titleAr: 'إجراءات المعالجة', requiredTables: ['controls', 'risks'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks', 'risks'],
    format: 'html',
  },
  {
    id: 'ksa-pdpl-dpia',
    name: 'PDPL Data Protection Impact Assessment',
    nameAr: 'تقييم أثر حماية البيانات الشخصية',
    frameworkCode: 'PDPL',
    description: 'Saudi PDPL data protection impact assessment covering data processing activities, consent mechanisms, and cross-border transfer compliance.',
    sections: [
      { key: 'executive_summary', title: 'Executive Summary', titleAr: 'الملخص التنفيذي', requiredTables: ['controls', 'frameworks'] },
      { key: 'compliance_status', title: 'PDPL Compliance Status', titleAr: 'حالة الامتثال لنظام حماية البيانات', requiredTables: ['controls'] },
      { key: 'data_processing', title: 'Data Processing Activities', titleAr: 'أنشطة معالجة البيانات', requiredTables: ['controls'] },
      { key: 'gap_analysis', title: 'Privacy Gap Analysis', titleAr: 'تحليل فجوات الخصوصية', requiredTables: ['controls', 'evidence_tasks'] },
      { key: 'risk_assessment', title: 'Data Protection Risk Assessment', titleAr: 'تقييم مخاطر حماية البيانات', requiredTables: ['risks'] },
      { key: 'remediation_plan', title: 'Privacy Remediation Plan', titleAr: 'خطة معالجة الخصوصية', requiredTables: ['controls', 'risks'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks', 'risks'],
    format: 'html',
  },
  {
    id: 'ksa-ndmo-data-governance',
    name: 'NDMO Data Governance Report',
    nameAr: 'تقرير حوكمة البيانات - الهيئة السعودية للبيانات',
    frameworkCode: 'NDMO',
    description: 'National Data Management Office data governance compliance report with data classification and quality metrics.',
    sections: [
      { key: 'executive_summary', title: 'Executive Summary', titleAr: 'الملخص التنفيذي', requiredTables: ['controls', 'frameworks'] },
      { key: 'compliance_status', title: 'NDMO Compliance Status', titleAr: 'حالة الامتثال', requiredTables: ['controls'] },
      { key: 'gap_analysis', title: 'Data Governance Gap Analysis', titleAr: 'تحليل فجوات حوكمة البيانات', requiredTables: ['controls', 'evidence_tasks'] },
      { key: 'evidence_summary', title: 'Data Governance Evidence', titleAr: 'أدلة حوكمة البيانات', requiredTables: ['evidence_tasks'] },
      { key: 'remediation_plan', title: 'Data Governance Improvement Plan', titleAr: 'خطة تحسين حوكمة البيانات', requiredTables: ['controls'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks'],
    format: 'html',
  },
  {
    id: 'ksa-cross-framework-summary',
    name: 'Cross-Framework Compliance Summary',
    nameAr: 'ملخص الامتثال عبر الأطر التنظيمية',
    frameworkCode: null,
    description: 'Consolidated compliance summary across all active KSA regulatory frameworks with overlap analysis and unified scoring.',
    sections: [
      { key: 'executive_summary', title: 'Executive Summary', titleAr: 'الملخص التنفيذي', requiredTables: ['controls', 'frameworks'] },
      { key: 'framework_comparison', title: 'Framework Comparison', titleAr: 'مقارنة الأطر', requiredTables: ['controls', 'frameworks'] },
      { key: 'compliance_status', title: 'Per-Framework Compliance', titleAr: 'الامتثال لكل إطار', requiredTables: ['controls'] },
      { key: 'gap_analysis', title: 'Cross-Framework Gaps', titleAr: 'الفجوات المشتركة', requiredTables: ['controls', 'evidence_tasks'] },
      { key: 'evidence_summary', title: 'Evidence Coverage Matrix', titleAr: 'مصفوفة تغطية الأدلة', requiredTables: ['evidence_tasks'] },
      { key: 'risk_assessment', title: 'Consolidated Risk View', titleAr: 'رؤية المخاطر الموحدة', requiredTables: ['risks'] },
      { key: 'remediation_plan', title: 'Unified Remediation Priorities', titleAr: 'أولويات المعالجة الموحدة', requiredTables: ['controls', 'risks'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks', 'risks'],
    format: 'html',
  },
  {
    id: 'ksa-board-grc-executive',
    name: 'Board-Level GRC Executive Report',
    nameAr: 'التقرير التنفيذي للحوكمة والمخاطر والامتثال لمجلس الإدارة',
    frameworkCode: null,
    description: 'Executive-level GRC report suitable for board of directors with high-level KPIs, risk exposure, and strategic recommendations.',
    sections: [
      { key: 'executive_summary', title: 'Board Executive Summary', titleAr: 'الملخص التنفيذي لمجلس الإدارة', requiredTables: ['controls', 'risks', 'frameworks'] },
      { key: 'compliance_status', title: 'Compliance Posture Overview', titleAr: 'نظرة عامة على وضع الامتثال', requiredTables: ['controls'] },
      { key: 'risk_assessment', title: 'Strategic Risk Landscape', titleAr: 'مشهد المخاطر الاستراتيجية', requiredTables: ['risks'] },
      { key: 'remediation_plan', title: 'Board Action Items', titleAr: 'بنود عمل مجلس الإدارة', requiredTables: ['controls', 'risks'] },
      { key: 'appendices', title: 'Supporting Data', titleAr: 'البيانات الداعمة', requiredTables: ['controls', 'risks', 'evidence_tasks'] },
    ],
    requiredData: ['controls', 'frameworks', 'risks', 'evidence_tasks'],
    format: 'html',
  },
  {
    id: 'ksa-regulator-submission',
    name: 'Regulator Submission Package',
    nameAr: 'حزمة التقديم للجهة التنظيمية',
    frameworkCode: null,
    description: 'Formal regulatory submission package with control attestation, evidence references, and compliance declaration suitable for NCA, SAMA, or SDAIA submission.',
    sections: [
      { key: 'executive_summary', title: 'Submission Cover Letter', titleAr: 'خطاب تغطية التقديم', requiredTables: ['frameworks'] },
      { key: 'compliance_status', title: 'Control Attestation', titleAr: 'شهادة الضوابط', requiredTables: ['controls'] },
      { key: 'evidence_summary', title: 'Evidence Reference Index', titleAr: 'فهرس مراجع الأدلة', requiredTables: ['evidence_tasks'] },
      { key: 'gap_analysis', title: 'Outstanding Items & Timeline', titleAr: 'البنود المعلقة والجدول الزمني', requiredTables: ['controls'] },
      { key: 'appendices', title: 'Detailed Control Listing', titleAr: 'قائمة الضوابط التفصيلية', requiredTables: ['controls', 'evidence_tasks'] },
    ],
    requiredData: ['controls', 'frameworks', 'evidence_tasks'],
    format: 'html',
  },
];

const LOG_PREFIX = '[KsaReportTemplates]';

// === Public API ===

/**
 * List available KSA regulatory report templates.
 * Checks DB for custom templates first, then merges with built-in definitions.
 */
export async function getReportTemplates(
  tenantId: string
): Promise<{ templates: KsaReportTemplate[]; totalCount: number }> {
  const schema = tenantSchema(tenantId);

  // Try to load custom templates from tenant DB (if any exist)
  const dbTemplates = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT template_id, name, key, description, category, parameters_schema, is_active
     FROM "${schema}".report_templates
     WHERE is_active = true
     ORDER BY name`,
    []
  ), { tenantId: tenantId, operation: 'query report_templates' });

  // Merge DB templates with built-in KSA templates (built-in always present)
  const customTemplates: KsaReportTemplate[] = dbTemplates.rows.map((row: GenericRow) => ({
    id: row.key || row.template_id,
    name: row.name,
    nameAr: row.description || row.name,
    frameworkCode: row.category === 'general' ? null : row.category,
    description: row.description || '',
    sections: Array.isArray(row.parameters_schema?.sections) ? row.parameters_schema.sections : [],
    requiredData: Array.isArray(row.parameters_schema?.requiredData) ? row.parameters_schema.requiredData : [],
    format: 'html' as const,
  }));

  // De-duplicate: custom templates override built-in by id
  const customIds = new Set(customTemplates.map(t => t.id));
  const merged = [
    ...customTemplates,
    ...KSA_REPORT_TEMPLATES.filter(t => !customIds.has(t.id)),
  ];

  return { templates: merged, totalCount: merged.length };
}

/**
 * Generate a regulatory report for a specific template.
 * Fetches tenant data, builds section content, and uses Claude AI
 * for executive narratives and remediation recommendations.
 */
export async function generateRegulatoryReport(
  tenantId: string,
  templateId: string,
  options?: GenerateReportOptions
): Promise<GeneratedReport> {
  const schema = tenantSchema(tenantId);
  const template = KSA_REPORT_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw Object.assign(new Error(`Report template not found: ${templateId}`), { statusCode: 404 });
  }

  const now = new Date();
  const periodTo = options?.periodTo || now.toISOString().slice(0, 10);
  const periodFrom = options?.periodFrom
    || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const language = options?.language || 'bilingual';

  // 1. Gather all required data from tenant schema
  const data = await gatherReportData(schema, tenantId, template, periodFrom);

  // 2. Build each section using real data + AI-generated narrative
  const sectionContents: Array<{ key: string; title: string; html: string }> = [];
  let totalDataPoints = 0;

  for (const section of template.sections) {
    const sectionData = extractSectionData(section.key, data);
    totalDataPoints += sectionData.dataPointCount;

    const sectionHtml = await buildSectionHtml(
      section, sectionData, template, language, tenantId
    );
    sectionContents.push({
      key: section.key,
      title: language === 'ar' ? section.titleAr : section.title,
      html: sectionHtml,
    });
  }

  // 3. Assemble full HTML report
  const reportHtml = assembleReportHtml(template, sectionContents, {
    periodFrom, periodTo, language, generatedAt: now.toISOString(),
  });

  // 4. Persist to reports table
  const reportRes = await safeQuery(
    `INSERT INTO "${schema}".reports
       (title, type, parameters, content, format, language, status, generated_by, generated_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, 'html', $5, 'completed', $6, NOW())
     RETURNING report_id`,
    [
      template.name,
      templateId,
      JSON.stringify({ periodFrom, periodTo, language }),
      JSON.stringify({ html: reportHtml, sections: sectionContents.map(s => s.key) }),
      language === 'ar' ? 'ar' : 'en',
      options?.generatedBy || SYSTEM_JOB_ACTOR,
    ]
  ).catch((err) => {
    logger.error(`${LOG_PREFIX} Failed to persist report:`, err);
    return { rows: [{ report_id: `transient-${Date.now()}` }] };
  });

  const reportId = reportRes.rows[0]?.report_id || `transient-${Date.now()}`;

  return {
    reportId,
    templateId,
    html: reportHtml,
    metadata: {
      templateName: template.name,
      frameworkCode: template.frameworkCode,
      periodFrom,
      periodTo,
      language,
      sectionCount: sectionContents.length,
      dataPointCount: totalDataPoints,
    },
    generatedAt: now.toISOString(),
  };
}

/**
 * Retrieve previously generated regulatory reports for a tenant.
 * Optionally filtered by framework code.
 */
export async function getReportHistory(
  tenantId: string,
  frameworkCode?: string
): Promise<ReportHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  let sql = `
    SELECT report_id, title, type, status, format, language, generated_by, generated_at, parameters
    FROM "${schema}".reports
    WHERE deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (frameworkCode) {
    // Filter by type matching a KSA template with the given framework code
    const matchingIds = KSA_REPORT_TEMPLATES
      .filter(t => t.frameworkCode === frameworkCode)
      .map(t => t.id);
    if (matchingIds.length > 0) {
      params.push(matchingIds);
      sql += ` AND type = ANY($${params.length})`;
    }
  }

  sql += ` ORDER BY generated_at DESC LIMIT 100`;

  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'fallback query' });

  return result.rows.map((row: GenericRow) => ({
    reportId: row.report_id,
    title: row.title,
    type: row.type,
    status: row.status,
    format: row.format,
    language: row.language,
    generatedBy: row.generated_by,
    generatedAt: row.generated_at,
    parameters: row.parameters || {},
  }));
}

/**
 * Schedule recurring regulatory report generation.
 * Creates/updates a report_schedules entry for the given template.
 */
export async function scheduleRegulatoryReport(
  tenantId: string,
  templateId: string,
  schedule: {
    cronExpression: string;
    subscribers?: string[];
    createdBy: string;
  }
): Promise<ReportScheduleResult> {
  const schema = tenantSchema(tenantId);

  // Validate template exists
  const template = KSA_REPORT_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw Object.assign(new Error(`Report template not found: ${templateId}`), { statusCode: 404 });
  }

  // Validate cron expression format (basic check)
  const cronParts = schedule.cronExpression.trim().split(/\s+/);
  if (cronParts.length < 5 || cronParts.length > 6) {
    throw Object.assign(new Error('Invalid cron expression: must have 5 or 6 fields'), { statusCode: 400 });
  }

  // Upsert into report_schedules
  const result = await safeQuery(
    `INSERT INTO "${schema}".report_schedules
       (report_type, parameters, cron_expression, enabled, subscribers, created_by)
     VALUES ($1, $2::jsonb, $3, true, $4::jsonb, $5)
     ON CONFLICT (schedule_id) DO UPDATE SET
       cron_expression = EXCLUDED.cron_expression,
       subscribers = EXCLUDED.subscribers,
       enabled = true
     RETURNING schedule_id, report_type, cron_expression, enabled`,
    [
      templateId,
      JSON.stringify({ templateId, templateName: template.name }),
      schedule.cronExpression,
      JSON.stringify(schedule.subscribers || []),
      schedule.createdBy,
    ]
  );

  const row = result.rows[0];
  return {
    scheduleId: row.schedule_id,
    reportType: row.report_type,
    cronExpression: row.cron_expression,
    enabled: row.enabled,
  };
}

// === Internal Helpers ===

/** Data gathered from tenant tables for report generation */
interface ReportData {
  controls: unknown[];
  frameworks: unknown[];
  risks: unknown[];
  evidenceTasks: unknown[];
  evidenceSchedules: unknown[];
  profile: any;
  /** Per-framework compliance rates */
  frameworkScores: Array<{
    frameworkCode: string;
    frameworkName: string;
    totalControls: number;
    compliantCount: number;
    complianceRate: number;
    criticalGaps: number;
  }>;
}

/**
 * Gather all data required by a report template from the tenant schema.
 * Uses parallel queries for performance.
 */
async function gatherReportData(
  schema: string,
  tenantId: string,
  template: KsaReportTemplate,
  _periodFrom: string
): Promise<ReportData> {
  const needed = new Set(template.requiredData);

  // Run all data queries in parallel
  const [controlsRes, frameworksRes, risksRes, evidenceRes, scheduleRes, profileRes] = await Promise.all([
    needed.has('controls')
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT control_id, control_name, framework_code, domain, compliance_status,
                  criticality, status, implementation_status, owner, updated_at
           FROM "${schema}".controls
           WHERE status = 'active'
           ORDER BY framework_code, control_id`,
          []
        ), { tenantId: tenantId, operation: 'query controls' })
      : Promise.resolve({ rows: [] }),

    needed.has('frameworks')
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT framework_code, framework_name, status, version
           FROM "${schema}".frameworks
           WHERE status = 'active'
           ORDER BY framework_code`,
          []
        ), { tenantId: tenantId, operation: 'query controls' })
      : Promise.resolve({ rows: [] }),

    needed.has('risks')
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT risk_id, risk_name, risk_category, likelihood, impact, risk_score,
                  status, treatment_status, owner, updated_at
           FROM "${schema}".risks
           WHERE status IN ('open', 'mitigating', 'active')
           ORDER BY risk_score DESC NULLS LAST`,
          []
        ), { tenantId: tenantId, operation: 'query risks' })
      : Promise.resolve({ rows: [] }),

    needed.has('evidence_tasks')
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT task_id, control_id, title, status, priority, due_date, evidence_type, updated_at
           FROM "${schema}".evidence_tasks
           WHERE status != 'cancelled'
           ORDER BY due_date ASC NULLS LAST`,
          []
        ), { tenantId: tenantId, operation: 'query evidence_tasks' })
      : Promise.resolve({ rows: [] }),

    needed.has('evidence_tasks')
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT schedule_id, control_id, enabled, cron_expression, last_reminded_at
           FROM "${schema}".evidence_schedules
           WHERE enabled = true`,
          []
        ), { tenantId: tenantId, operation: 'query evidence_tasks' })
      : Promise.resolve({ rows: [] }),

    // Workspace profile for sector context
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".workspace_profile WHERE tenant_id = $1`,
      [tenantId]
    ), { tenantId: tenantId, operation: 'query evidence_schedules' }),
  ]);

  // Compute per-framework compliance scores
  const controlsByFramework = new Map<string, { total: number; compliant: number; critical: number; name: string }>();
  for (const c of controlsRes.rows) {
    const fwCode = typeof c.framework_code === 'string' && c.framework_code ? c.framework_code : 'UNKNOWN';
    if (!controlsByFramework.has(fwCode)) {
      controlsByFramework.set(fwCode, { total: 0, compliant: 0, critical: 0, name: fwCode });
    }
    const entry = controlsByFramework.get(fwCode)!;
    entry.total++;
    if (c.compliance_status === 'compliant') entry.compliant++;
    if (c.criticality === 'critical' && c.compliance_status !== 'compliant') entry.critical++;
  }

  // Enrich framework names
  for (const fw of frameworksRes.rows) {
    const fwCode = typeof fw.framework_code === 'string' && fw.framework_code ? fw.framework_code : undefined;
    if (!fwCode) continue;
    const entry = controlsByFramework.get(fwCode);
    if (!entry) continue;
    entry.name = typeof fw.framework_name === 'string' && fw.framework_name ? fw.framework_name : fwCode;
  }

  const frameworkScores = Array.from(controlsByFramework.entries()).map(([code, data]) => ({
    frameworkCode: code,
    frameworkName: data.name,
    totalControls: data.total,
    compliantCount: data.compliant,
    complianceRate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
    criticalGaps: data.critical,
  }));

  return {
    controls: controlsRes.rows,
    frameworks: frameworksRes.rows,
    risks: risksRes.rows,
    evidenceTasks: evidenceRes.rows,
    evidenceSchedules: scheduleRes.rows,
    profile: getFirstRow(profileRes),
    frameworkScores,
  };
}

/** Extract the relevant subset of data for a given section type */
function extractSectionData(
  sectionKey: string,
  data: ReportData
): { items: unknown[]; summary: Record<string, unknown>; dataPointCount: number } {
  switch (sectionKey) {
    case 'executive_summary': {
      const totalControls = data.controls.length;

      const compliant = data.controls.filter(c => c.compliance_status === 'compliant').length;
      const openRisks = data.risks.length;
      const evidenceTotal = data.evidenceTasks.length;

      const evidenceComplete = data.evidenceTasks.filter(e => e.status === 'completed' || e.status === 'approved').length;
      return {
        items: data.frameworkScores,
        summary: {
          totalControls, compliant,
          complianceRate: totalControls > 0 ? Math.round((compliant / totalControls) * 100) : 0,
          openRisks, evidenceTotal, evidenceComplete,
          evidenceCoverage: evidenceTotal > 0 ? Math.round((evidenceComplete / evidenceTotal) * 100) : 0,
          frameworkCount: data.frameworks.length,
        },
        dataPointCount: totalControls + openRisks + evidenceTotal,
      };
    }

    case 'compliance_status':
    case 'domain_breakdown':
    case 'framework_comparison': {
      return {
        items: data.frameworkScores,
        summary: {
          frameworks: data.frameworkScores.map(f => ({
            code: f.frameworkCode, name: f.frameworkName,
            rate: f.complianceRate, gaps: f.criticalGaps,
          })),
        },
        dataPointCount: data.frameworkScores.length,
      };
    }

    case 'gap_analysis': {

      const nonCompliant = data.controls.filter(c => c.compliance_status !== 'compliant');

      const criticalGaps = nonCompliant.filter(c => c.criticality === 'critical');

      const highGaps = nonCompliant.filter(c => c.criticality === 'high');
      return {
        items: nonCompliant.slice(0, 50),
        summary: {
          totalGaps: nonCompliant.length,
          criticalCount: criticalGaps.length,
          highCount: highGaps.length,

          mediumCount: nonCompliant.filter(c => c.criticality === 'medium').length,

          lowCount: nonCompliant.filter(c => c.criticality === 'low').length,
        },
        dataPointCount: nonCompliant.length,
      };
    }

    case 'evidence_summary': {
      const byStatus: Record<string, number> = {};
      for (const e of data.evidenceTasks) {

        byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      }
      const overdue = data.evidenceTasks.filter(

        e => e.due_date && new Date(e.due_date) < new Date() && e.status !== 'completed' && e.status !== 'approved'
      );
      return {
        items: data.evidenceTasks.slice(0, 50),
        summary: {
          total: data.evidenceTasks.length,
          byStatus,
          overdueCount: overdue.length,
          scheduledCount: data.evidenceSchedules.length,
        },
        dataPointCount: data.evidenceTasks.length,
      };
    }

    case 'risk_assessment': {

      const criticalRisks = data.risks.filter(r => (r.risk_score || 0) >= 15);

      const highRisks = data.risks.filter(r => (r.risk_score || 0) >= 10 && (r.risk_score || 0) < 15);
      return {
        items: data.risks.slice(0, 30),
        summary: {
          totalRisks: data.risks.length,
          criticalCount: criticalRisks.length,
          highCount: highRisks.length,
          avgScore: data.risks.length > 0

            ? Math.round(data.risks.reduce((s, r) => s + (r.risk_score || 0), 0) / data.risks.length)
            : 0,
          byCategory: groupBy(data.risks, 'risk_category'),
        },
        dataPointCount: data.risks.length,
      };
    }

    case 'remediation_plan':
    case 'data_processing':
    case 'appendices': {

      const nonCompliantControls = data.controls.filter(c => c.compliance_status !== 'compliant');
      return {
        items: nonCompliantControls,
        summary: {
          totalToRemediate: nonCompliantControls.length,
          riskCount: data.risks.length,
        },
        dataPointCount: nonCompliantControls.length + data.risks.length,
      };
    }

    default:
      return { items: [], summary: {}, dataPointCount: 0 };
  }
}

/**
 * Build HTML for a single report section.
 * Uses Claude AI for narrative generation in executive summaries and remediation plans.
 */
async function buildSectionHtml(
  section: ReportSection,
  sectionData: { items: unknown[]; summary: Record<string, unknown>; dataPointCount: number },
  template: KsaReportTemplate,
  language: string,
  tenantId: string
): Promise<string> {
  const { items, summary } = sectionData;
  const langNote = language === 'ar'
    ? 'Respond in Arabic only.'
    : language === 'bilingual'
      ? 'Provide bilingual response (English followed by Arabic translation).'
      : 'Respond in English only.';

  // For key narrative sections, use AI to generate professional text
  const aiSections = ['executive_summary', 'remediation_plan', 'risk_assessment', 'gap_analysis'];
  if (aiSections.includes(section.key) && sectionData.dataPointCount > 0) {
    try {
      const aiNarrative = await claudeComplete({
        tenantId,
        agentId: 'ksa-report-generator',
        decisionType: 'report_narrative',
        skipPiiRedaction: true,
        systemPrompt: `You are a senior GRC compliance analyst generating a formal regulatory report section for a KSA-based organization. ${langNote}
Write professional, formal prose suitable for regulatory submission. Include specific numbers from the data provided. Do not invent data.`,
        userMessage: `Generate the "${section.title}" section for a ${template.name}.

Data summary: ${JSON.stringify(summary)}

Top items (truncated): ${JSON.stringify(items.slice(0, 15))}

Requirements:
- Section type: ${section.key}
- Framework context: ${template.frameworkCode || 'All frameworks'}
- Be specific with numbers and percentages from the data
- For remediation plans, prioritize by criticality and provide a timeline
- For gap analysis, categorize gaps by severity and framework domain
- Keep the section between 150-400 words
- Output HTML formatted text (use <p>, <ul>, <li>, <strong> tags)`,
        maxTokens: 1500,
        temperature: 0.4,
      });

      return aiNarrative.content;
    } catch (err) {
      logger.error(`${LOG_PREFIX} AI narrative generation failed for ${section.key}:`, err);
      // Fall through to static generation below
    }
  }

  // Static HTML generation for non-AI sections or when AI fails
  return buildStaticSectionHtml(section.key, summary, items, template);
}

/** Generate static HTML for a report section without AI */
function buildStaticSectionHtml(
  sectionKey: string,
  summary: Record<string, unknown>,
  items: unknown[],
  _template: KsaReportTemplate
): string {
  switch (sectionKey) {
    case 'compliance_status':
    case 'domain_breakdown':
    case 'framework_comparison': {
      const frameworks = summary.frameworks || [];

      if (frameworks.length === 0) return '<p>No framework data available.</p>';
      let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;">';
      html += '<thead><tr style="background:#1a365d;color:#fff;">';
      html += '<th style="padding:8px;text-align:left;">Framework</th>';
      html += '<th style="padding:8px;text-align:center;">Compliance Rate</th>';
      html += '<th style="padding:8px;text-align:center;">Critical Gaps</th>';
      html += '</tr></thead><tbody>';

      for (const fw of frameworks) {
        const color = fw.rate >= 80 ? '#38a169' : fw.rate >= 50 ? '#d69e2e' : '#e53e3e';
        html += `<tr style="border-bottom:1px solid #e2e8f0;">`;
        html += `<td style="padding:8px;">${escapeHtml(fw.name)} (${escapeHtml(fw.code)})</td>`;
        html += `<td style="padding:8px;text-align:center;color:${color};font-weight:bold;">${fw.rate}%</td>`;
        html += `<td style="padding:8px;text-align:center;">${fw.gaps}</td>`;
        html += `</tr>`;
      }
      html += '</tbody></table>';
      return html;
    }

    case 'evidence_summary': {
      let html = `<p>Total evidence tasks: <strong>${summary.total || 0}</strong>`;
      html += ` | Overdue: <strong style="color:#e53e3e;">${summary.overdueCount || 0}</strong>`;
      html += ` | Active schedules: <strong>${summary.scheduledCount || 0}</strong></p>`;
      if (summary.byStatus) {
        html += '<ul>';
        for (const [status, count] of Object.entries(summary.byStatus)) {
          html += `<li>${escapeHtml(status)}: ${count}</li>`;
        }
        html += '</ul>';
      }
      return html;
    }

    case 'appendices': {
      if (items.length === 0) return '<p>No controls to list.</p>';
      let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;margin:12px 0;">';
      html += '<thead><tr style="background:#2d3748;color:#fff;">';
      html += '<th style="padding:6px;">Control ID</th><th style="padding:6px;">Name</th>';
      html += '<th style="padding:6px;">Framework</th><th style="padding:6px;">Status</th>';
      html += '<th style="padding:6px;">Criticality</th>';
      html += '</tr></thead><tbody>';
      for (const c of items.slice(0, 100)) {
        html += `<tr style="border-bottom:1px solid #e2e8f0;">`;

        html += `<td style="padding:4px;">${escapeHtml(c.control_id)}</td>`;

        html += `<td style="padding:4px;">${escapeHtml(c.control_name || '')}</td>`;

        html += `<td style="padding:4px;">${escapeHtml(c.framework_code || '')}</td>`;

        html += `<td style="padding:4px;">${escapeHtml(c.compliance_status || '')}</td>`;

        html += `<td style="padding:4px;">${escapeHtml(c.criticality || '')}</td>`;
        html += `</tr>`;
      }
      html += '</tbody></table>';
      if (items.length > 100) {
        html += `<p><em>... and ${items.length - 100} more controls</em></p>`;
      }
      return html;
    }

    default:
      return `<p>Section data: ${items.length} items, ${JSON.stringify(summary)}</p>`;
  }
}

/** Assemble the full HTML document from section contents */
function assembleReportHtml(
  template: KsaReportTemplate,
  sections: Array<{ key: string; title: string; html: string }>,
  meta: { periodFrom: string; periodTo: string; language: string; generatedAt: string }
): string {
  const dir = meta.language === 'ar' ? 'rtl' : 'ltr';
  const fontFamily = meta.language === 'ar'
    ? "'Noto Naskh Arabic', 'Segoe UI', sans-serif"
    : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

  let html = `<!DOCTYPE html>
<html lang="${meta.language === 'ar' ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ${fontFamily}; margin: 40px; color: #1a202c; line-height: 1.6; direction: ${dir}; }
    .report-header { background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); color: #fff; padding: 32px; border-radius: 8px; margin-bottom: 32px; }
    .report-header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .report-header .meta { font-size: 13px; opacity: 0.85; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section h2 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; font-size: 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #edf2f7; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e0; font-size: 11px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${escapeHtml(template.name)}</h1>
    <div class="meta">
      Period: ${escapeHtml(meta.periodFrom)} to ${escapeHtml(meta.periodTo)}
      | Generated: ${new Date(meta.generatedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
      | Framework: ${escapeHtml(template.frameworkCode || 'All Frameworks')}
    </div>
  </div>
`;

  for (const section of sections) {
    html += `  <div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    ${section.html}
  </div>
`;
  }

  html += `  <div class="footer">
    <p>This report was generated by AGRC-OS Regulatory Reporting Engine. Confidential.</p>
  </div>
</body>
</html>`;

  return html;
}

/** Simple HTML entity escaping to prevent XSS in generated reports */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Group an array of objects by a key, returning counts per group */
function groupBy(arr: unknown[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const val = item[key] || 'other';
    result[val] = (result[val] || 0) + 1;
  }
  return result;
}
