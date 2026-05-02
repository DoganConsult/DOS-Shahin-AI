import { ANALYTICS_LIMITS, ANALYTICS_TIMEOUTS, ANALYTICS_BUSINESS_THRESHOLDS } from './analytics-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  // Dashboard types
  executive:    'var(--hub-governance)',
  operational:  'var(--success)',
  compliance:   'var(--warning)',
  risk:         'var(--error)',
  security:     'var(--severity-critical)',
  financial:    'var(--severity-low)',
  audit:        'var(--hub-risk)',
  custom:       'var(--text-muted)',
  // Dashboard statuses
  draft:        'var(--text-muted)',
  active:       'var(--success)',
  published:    'var(--hub-governance)',
  deprecated:   'var(--severity-high)',
  archived:     'var(--text-muted)',
} as const;

export interface AnalyticsSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  dashboardTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultRefreshMinutes: number; color: string }>;
  widgetTypes: Array<{ code: string; labelEn: string; labelAr: string; supportsRealtime: boolean }>;
  dataSources: Array<{ code: string; labelEn: string; labelAr: string; moduleCode?: string; requiresAuth: boolean }>;
  refreshIntervals: Array<{ minutes: number; labelEn: string; labelAr: string }>;
  dashboardStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean; color: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getAnalyticsSeedData(): AnalyticsSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'analytics',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: ANALYTICS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: ANALYTICS_LIMITS.MAX_ITEMS_PER_PAGE,
      maxTagsPerDashboard: ANALYTICS_LIMITS.MAX_TAGS,
      maxFiltersPerSearch: ANALYTICS_LIMITS.MAX_FILTERS,
      maxDataSourcesPerWidget: ANALYTICS_LIMITS.MAX_DATA_SOURCES,
      maxExportRows: ANALYTICS_LIMITS.MAX_EXPORT_ROWS,
      staleDashboardDays: ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS,
      refreshWarningHours: ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS,
      defaultRefreshIntervalMinutes: ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES,
      generationTimeoutSeconds: ANALYTICS_TIMEOUTS.GENERATION_TIMEOUT_SECONDS,
      kpiThresholdCheckEnabled: true,
      scheduledReportEnabled: true,
    },
    dashboardTypes: [
      { code: 'executive', labelEn: 'Executive Overview', labelAr: 'نظرة تنفيذية', defaultRefreshMinutes: 60, color: SEED_COLORS.executive },
      { code: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي', defaultRefreshMinutes: 15, color: SEED_COLORS.operational },
      { code: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال', defaultRefreshMinutes: 30, color: SEED_COLORS.compliance },
      { code: 'risk', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر', defaultRefreshMinutes: 30, color: SEED_COLORS.risk },
      { code: 'security', labelEn: 'Security Posture', labelAr: 'الوضع الأمني', defaultRefreshMinutes: 15, color: SEED_COLORS.security },
      { code: 'financial', labelEn: 'Financial Analytics', labelAr: 'تحليلات مالية', defaultRefreshMinutes: 60, color: SEED_COLORS.financial },
      { code: 'audit', labelEn: 'Audit Trail', labelAr: 'مسار التدقيق', defaultRefreshMinutes: 60, color: SEED_COLORS.audit },
      { code: 'custom', labelEn: 'Custom', labelAr: 'مخصص', defaultRefreshMinutes: 30, color: SEED_COLORS.custom },
    ],
    widgetTypes: [
      { code: 'chart_line', labelEn: 'Line Chart', labelAr: 'مخطط خطي', supportsRealtime: true },
      { code: 'chart_bar', labelEn: 'Bar Chart', labelAr: 'مخطط شريطي', supportsRealtime: false },
      { code: 'chart_pie', labelEn: 'Pie / Donut Chart', labelAr: 'مخطط دائري', supportsRealtime: false },
      { code: 'chart_area', labelEn: 'Area Chart', labelAr: 'مخطط مساحي', supportsRealtime: true },
      { code: 'table', labelEn: 'Data Table', labelAr: 'جدول البيانات', supportsRealtime: false },
      { code: 'metric', labelEn: 'KPI Metric Card', labelAr: 'بطاقة مؤشر الأداء', supportsRealtime: true },
      { code: 'gauge', labelEn: 'Gauge / Speedometer', labelAr: 'مقياس الأداء', supportsRealtime: true },
      { code: 'heatmap', labelEn: 'Heatmap', labelAr: 'خريطة الحرارة', supportsRealtime: false },
      { code: 'scatter', labelEn: 'Scatter Plot', labelAr: 'مخطط التشتت', supportsRealtime: false },
      { code: 'text', labelEn: 'Text / Markdown', labelAr: 'نص / ماركداون', supportsRealtime: false },
      { code: 'map', labelEn: 'Geo Map', labelAr: 'خريطة جغرافية', supportsRealtime: false },
    ],
    dataSources: [
      { code: 'internal_db', labelEn: 'Internal Database', labelAr: 'قاعدة البيانات الداخلية', requiresAuth: false },
      { code: 'risk_module', labelEn: 'Risk Module', labelAr: 'وحدة المخاطر', moduleCode: 'risk', requiresAuth: false },
      { code: 'incident_module', labelEn: 'Incident Module', labelAr: 'وحدة الحوادث', moduleCode: 'incident', requiresAuth: false },
      { code: 'compliance_module', labelEn: 'Compliance Module', labelAr: 'وحدة الامتثال', moduleCode: 'compliance', requiresAuth: false },
      { code: 'audit_module', labelEn: 'Audit Module', labelAr: 'وحدة التدقيق', moduleCode: 'audit', requiresAuth: false },
      { code: 'asset_module', labelEn: 'Asset Module', labelAr: 'وحدة الأصول', moduleCode: 'asset', requiresAuth: false },
      { code: 'rest_api', labelEn: 'External REST API', labelAr: 'واجهة برمجة خارجية', requiresAuth: true },
      { code: 'csv_upload', labelEn: 'CSV Upload', labelAr: 'رفع ملف CSV', requiresAuth: false },
      { code: 'database_query', labelEn: 'Custom Database Query', labelAr: 'استعلام قاعدة بيانات مخصص', requiresAuth: true },
    ],
    refreshIntervals: [
      { minutes: 5, labelEn: 'Every 5 minutes', labelAr: 'كل 5 دقائق' },
      { minutes: 15, labelEn: 'Every 15 minutes', labelAr: 'كل 15 دقيقة' },
      { minutes: 30, labelEn: 'Every 30 minutes', labelAr: 'كل 30 دقيقة' },
      { minutes: 60, labelEn: 'Every hour', labelAr: 'كل ساعة' },
      { minutes: 360, labelEn: 'Every 6 hours', labelAr: 'كل 6 ساعات' },
      { minutes: 1440, labelEn: 'Daily', labelAr: 'يومياً' },
    ],
    dashboardStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false, color: SEED_COLORS.draft },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false, color: SEED_COLORS.active },
      { code: 'published', labelEn: 'Published', labelAr: 'منشور', terminal: false, color: SEED_COLORS.published },
      { code: 'deprecated', labelEn: 'Deprecated', labelAr: 'متقادم', terminal: false, color: SEED_COLORS.deprecated },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true, color: SEED_COLORS.archived },
    ],
    defaultTemplates: [
      {
        code: 'analytics_executive_overview',
        nameEn: 'Executive Overview Template',
        nameAr: 'قالب النظرة التنفيذية',
        data: {
          version: 1,
          dashboardType: 'executive',
          layout: 'grid',
          widgets: [
            { position: 1, widgetType: 'metric', title: 'Total Dashboards', dataSource: 'internal_db' },
            { position: 2, widgetType: 'metric', title: 'Active KPIs', dataSource: 'internal_db' },
            { position: 3, widgetType: 'chart_line', title: 'Trend Analysis', dataSource: 'internal_db' },
            { position: 4, widgetType: 'chart_pie', title: 'Module Coverage', dataSource: 'internal_db' },
          ],
        },
      },
      {
        code: 'analytics_compliance_dashboard',
        nameEn: 'Compliance Analytics Template',
        nameAr: 'قالب تحليلات الامتثال',
        data: {
          version: 1,
          dashboardType: 'compliance',
          layout: 'standard',
          widgets: [
            { position: 1, widgetType: 'gauge', title: 'Compliance Rate', dataSource: 'compliance_module' },
            { position: 2, widgetType: 'chart_bar', title: 'Control Status', dataSource: 'compliance_module' },
            { position: 3, widgetType: 'table', title: 'Open Findings', dataSource: 'compliance_module' },
            { position: 4, widgetType: 'heatmap', title: 'Risk Heatmap', dataSource: 'risk_module' },
          ],
        },
      },
      {
        code: 'analytics_security_posture',
        nameEn: 'Security Posture Template',
        nameAr: 'قالب الوضع الأمني',
        data: {
          version: 1,
          dashboardType: 'security',
          layout: 'standard',
          widgets: [
            { position: 1, widgetType: 'metric', title: 'Open Incidents', dataSource: 'incident_module' },
            { position: 2, widgetType: 'chart_line', title: 'Incident Trend', dataSource: 'incident_module' },
            { position: 3, widgetType: 'chart_bar', title: 'Severity Breakdown', dataSource: 'incident_module' },
            { position: 4, widgetType: 'gauge', title: 'SLA Compliance', dataSource: 'incident_module' },
          ],
        },
      },
    ],
  };
}

export async function seedAnalyticsModule(tenantId: string, schema: string): Promise<void> {
  const data = getAnalyticsSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['analytics', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
