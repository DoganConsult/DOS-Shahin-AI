/**
 * Dashboard Registry — defines dashboard compositions by archetype/role.
 *
 * The DB (dashboard_layouts + widget_registry + dashboard_role_bindings)
 * provides per-tenant customization. This static registry defines the
 * baseline compositions the blueprint resolver uses when no DB override exists.
 */

import { ArchetypeCode } from '../core/runtime/ui-state.models';

export interface DashboardWidgetSlot {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardRegistryEntry {
  dashboardCode: string;
  labelEn: string;
  labelAr: string;
  archetypeCode: ArchetypeCode | 'all';
  columns: number;
  widgets: DashboardWidgetSlot[];
  roles?: string[];
  moduleCode?: string;
}

export const DASHBOARD_REGISTRY: DashboardRegistryEntry[] = [
  // ── Executive (all archetypes) ─────────────────────────────────────────
  {
    dashboardCode: 'executive',
    labelEn: 'Executive Dashboard',
    labelAr: 'لوحة القيادة التنفيذية',
    archetypeCode: 'all',
    columns: 12,
    roles: ['owner', 'admin', 'ceo', 'ciso', 'cto', 'cfo'],
    widgets: [
      { key: 'executive.compliance_score',  x: 0, y: 0, w: 3, h: 2 },
      { key: 'executive.risk_posture',      x: 3, y: 0, w: 3, h: 2 },
      { key: 'executive.audit_readiness',   x: 6, y: 0, w: 3, h: 2 },
      { key: 'executive.evidence_freshness', x: 9, y: 0, w: 3, h: 2 },
      { key: 'risk.heatmap',                x: 0, y: 2, w: 6, h: 4 },
      { key: 'compliance.posture_chart',    x: 6, y: 2, w: 6, h: 4 },
    ],
  },

  // ── Compliance Ops ─────────────────────────────────────────────────────
  {
    dashboardCode: 'compliance_ops',
    labelEn: 'Compliance Operations',
    labelAr: 'عمليات الامتثال',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'compliance',
    widgets: [
      { key: 'compliance.score_gauge',      x: 0, y: 0, w: 4, h: 2 },
      { key: 'compliance.gap_by_framework', x: 4, y: 0, w: 4, h: 2 },
      { key: 'compliance.control_coverage', x: 8, y: 0, w: 4, h: 2 },
      { key: 'compliance.posture_chart',    x: 0, y: 2, w: 6, h: 4 },
      { key: 'compliance.obligation_status', x: 6, y: 2, w: 6, h: 4 },
    ],
  },

  // ── Risk Ops ───────────────────────────────────────────────────────────
  {
    dashboardCode: 'risk_ops',
    labelEn: 'Risk Operations',
    labelAr: 'عمليات المخاطر',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'risk',
    widgets: [
      { key: 'risk.heatmap',                x: 0, y: 0, w: 6, h: 4 },
      { key: 'risk.top_risks',              x: 6, y: 0, w: 6, h: 4 },
      { key: 'risk.treatment_progress',     x: 0, y: 4, w: 4, h: 3 },
      { key: 'risk.kri_alerts',             x: 4, y: 4, w: 4, h: 3 },
      { key: 'risk.appetite_gauge',         x: 8, y: 4, w: 4, h: 3 },
    ],
  },

  // ── Evidence Ops ───────────────────────────────────────────────────────
  {
    dashboardCode: 'evidence_ops',
    labelEn: 'Evidence Operations',
    labelAr: 'عمليات الأدلة',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'evidence',
    widgets: [
      { key: 'evidence.freshness_gauge',    x: 0, y: 0, w: 4, h: 2 },
      { key: 'evidence.overdue_queue',      x: 4, y: 0, w: 4, h: 2 },
      { key: 'evidence.coverage_map',       x: 8, y: 0, w: 4, h: 2 },
      { key: 'evidence.collection_timeline', x: 0, y: 2, w: 12, h: 3 },
    ],
  },

  // ── Audit Ops ──────────────────────────────────────────────────────────
  {
    dashboardCode: 'audit_ops',
    labelEn: 'Audit Operations',
    labelAr: 'عمليات التدقيق',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'audit',
    widgets: [
      { key: 'audit.findings_by_severity',  x: 0, y: 0, w: 6, h: 3 },
      { key: 'audit.capa_progress',         x: 6, y: 0, w: 6, h: 3 },
      { key: 'audit.engagement_timeline',   x: 0, y: 3, w: 12, h: 3 },
    ],
  },

  // ── Government-specific ────────────────────────────────────────────────
  {
    dashboardCode: 'governance_hub',
    labelEn: 'Governance Hub',
    labelAr: 'مركز الحوكمة',
    archetypeCode: 'government',
    columns: 12,
    moduleCode: 'governance',
    widgets: [
      { key: 'governance.committee_calendar', x: 0, y: 0, w: 6, h: 3 },
      { key: 'governance.decision_tracker',   x: 6, y: 0, w: 6, h: 3 },
      { key: 'governance.board_pack_status',  x: 0, y: 3, w: 6, h: 3 },
      { key: 'governance.mandate_compliance', x: 6, y: 3, w: 6, h: 3 },
    ],
  },

  // ── AI Suite ───────────────────────────────────────────────────────────
  {
    dashboardCode: 'ai_suite',
    labelEn: 'AI Operations',
    labelAr: 'عمليات الذكاء الاصطناعي',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'ai',
    widgets: [
      { key: 'ai.agent_status',             x: 0, y: 0, w: 4, h: 3 },
      { key: 'ai.recommendation_feed',      x: 4, y: 0, w: 4, h: 3 },
      { key: 'ai.automation_coverage',      x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── AI Governance ────────────────────────────────────────────────────────
  {
    dashboardCode: 'ai_governance',
    labelEn: 'AI Governance',
    labelAr: 'حوكمة الذكاء الاصطناعي',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'ai-governance',
    widgets: [
      { key: 'ai-governance.model_inventory', x: 0, y: 0, w: 4, h: 3 },
      { key: 'ai-governance.compliance_status', x: 4, y: 0, w: 4, h: 3 },
      { key: 'ai-governance.risk_alerts',    x: 8, y: 0, w: 4, h: 3 },
      { key: 'ai-governance.enforcement_status', x: 0, y: 3, w: 6, h: 3 },
      { key: 'ai-governance.audit_trail',    x: 6, y: 3, w: 6, h: 3 },
    ],
  },

  // ── Incident Hub ─────────────────────────────────────────────────────────
  {
    dashboardCode: 'incident_hub',
    labelEn: 'Incident Hub',
    labelAr: 'مركز الحوادث',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'incident',
    widgets: [
      { key: 'incident.active_count',       x: 0, y: 0, w: 3, h: 2 },
      { key: 'incident.severity_distribution', x: 3, y: 0, w: 3, h: 2 },
      { key: 'incident.response_time',      x: 6, y: 0, w: 3, h: 2 },
      { key: 'incident.trend_chart',        x: 9, y: 0, w: 3, h: 2 },
      { key: 'incident.recent_incidents',   x: 0, y: 2, w: 6, h: 4 },
      { key: 'incident.investigation_queue', x: 6, y: 2, w: 6, h: 4 },
    ],
  },

  // ── Vendor Hub ──────────────────────────────────────────────────────────
  {
    dashboardCode: 'vendor_hub',
    labelEn: 'Vendor Risk Hub',
    labelAr: 'مركز مخاطر الموردين',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'vendor',
    widgets: [
      { key: 'vendor.total_count',          x: 0, y: 0, w: 3, h: 2 },
      { key: 'vendor.risk_distribution',    x: 3, y: 0, w: 3, h: 2 },
      { key: 'vendor.assessment_due',       x: 6, y: 0, w: 3, h: 2 },
      { key: 'vendor.sla_compliance',       x: 9, y: 0, w: 3, h: 2 },
      { key: 'vendor.risk_heatmap',         x: 0, y: 2, w: 6, h: 4 },
      { key: 'vendor.recent_assessments',   x: 6, y: 2, w: 6, h: 4 },
    ],
  },

  // ── Policy Ops ────────────────────────────────────────────────────────
  {
    dashboardCode: 'policy_ops',
    labelEn: 'Policy Management',
    labelAr: 'إدارة السياسات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'policy',
    widgets: [
      { key: 'policy.lifecycle_status',       x: 0, y: 0, w: 4, h: 3 },
      { key: 'policy.review_schedule',        x: 4, y: 0, w: 4, h: 3 },
      { key: 'policy.attestation_progress',   x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Workflow Ops ──────────────────────────────────────────────────────
  {
    dashboardCode: 'workflow_ops',
    labelEn: 'Workflow Operations',
    labelAr: 'عمليات سير العمل',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'workflow',
    widgets: [
      { key: 'workflow.active_instances',     x: 0, y: 0, w: 4, h: 3 },
      { key: 'workflow.sla_compliance',       x: 4, y: 0, w: 4, h: 3 },
      { key: 'workflow.bottleneck_analysis',  x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Foundation Ops ────────────────────────────────────────────────────
  {
    dashboardCode: 'foundation_ops',
    labelEn: 'Foundation Overview',
    labelAr: 'نظرة عامة على الأساسيات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'foundation',
    widgets: [
      { key: 'foundation.org_coverage',       x: 0, y: 0, w: 4, h: 3 },
      { key: 'foundation.role_assignment',     x: 4, y: 0, w: 4, h: 3 },
      { key: 'foundation.team_health',         x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Qiyas Ops ─────────────────────────────────────────────────────────
  {
    dashboardCode: 'qiyas_ops',
    labelEn: 'Qiyas Assessments',
    labelAr: 'تقييمات قياس',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'qiyas',
    widgets: [
      { key: 'qiyas.assessment_progress',     x: 0, y: 0, w: 4, h: 3 },
      { key: 'qiyas.maturity_scores',         x: 4, y: 0, w: 4, h: 3 },
      { key: 'qiyas.benchmark_comparison',    x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── BCP Ops ───────────────────────────────────────────────────────────
  {
    dashboardCode: 'bcp_ops',
    labelEn: 'Business Continuity',
    labelAr: 'استمرارية الأعمال',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'bcp',
    widgets: [
      { key: 'bcp.plan_status',               x: 0, y: 0, w: 4, h: 3 },
      { key: 'bcp.exercise_schedule',          x: 4, y: 0, w: 4, h: 3 },
      { key: 'bcp.recovery_metrics',           x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Asset Ops ─────────────────────────────────────────────────────────
  {
    dashboardCode: 'asset_ops',
    labelEn: 'Asset Management',
    labelAr: 'إدارة الأصول',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'asset',
    widgets: [
      { key: 'asset.inventory_summary',        x: 0, y: 0, w: 4, h: 3 },
      { key: 'asset.classification_chart',     x: 4, y: 0, w: 4, h: 3 },
      { key: 'asset.lifecycle_status',          x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Exception Ops ─────────────────────────────────────────────────────
  {
    dashboardCode: 'exception_ops',
    labelEn: 'Exception Governance',
    labelAr: 'إدارة الاستثناءات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'exception',
    widgets: [
      { key: 'exception.active_count',         x: 0, y: 0, w: 4, h: 3 },
      { key: 'exception.expiry_timeline',      x: 4, y: 0, w: 4, h: 3 },
      { key: 'exception.risk_impact',           x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Remediation Ops ───────────────────────────────────────────────────
  {
    dashboardCode: 'remediation_ops',
    labelEn: 'Remediation Tracking',
    labelAr: 'تتبع المعالجة',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'remediation',
    widgets: [
      { key: 'remediation.progress_tracker',   x: 0, y: 0, w: 4, h: 3 },
      { key: 'remediation.sla_status',          x: 4, y: 0, w: 4, h: 3 },
      { key: 'remediation.by_category',         x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Action Ops ────────────────────────────────────────────────────────
  {
    dashboardCode: 'action_ops',
    labelEn: 'Action Items',
    labelAr: 'بنود الإجراء',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'action',
    widgets: [
      { key: 'action.open_items',              x: 0, y: 0, w: 4, h: 3 },
      { key: 'action.completion_trend',        x: 4, y: 0, w: 4, h: 3 },
      { key: 'action.overdue_count',            x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Training Ops ──────────────────────────────────────────────────────
  {
    dashboardCode: 'training_ops',
    labelEn: 'Training & Awareness',
    labelAr: 'التدريب والتوعية',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'training',
    widgets: [
      { key: 'training.completion_rate',       x: 0, y: 0, w: 4, h: 3 },
      { key: 'training.upcoming_assignments',  x: 4, y: 0, w: 4, h: 3 },
      { key: 'training.certification_status',  x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Integration Ops ───────────────────────────────────────────────────
  {
    dashboardCode: 'integration_ops',
    labelEn: 'Integration Health',
    labelAr: 'صحة التكامل',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'integrations',
    widgets: [
      { key: 'integration.connector_health',   x: 0, y: 0, w: 4, h: 3 },
      { key: 'integration.sync_status',        x: 4, y: 0, w: 4, h: 3 },
      { key: 'integration.error_rate',          x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Notification Ops ──────────────────────────────────────────────────
  {
    dashboardCode: 'notification_ops',
    labelEn: 'Notification Center',
    labelAr: 'مركز الإشعارات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'notification',
    widgets: [
      { key: 'notification.delivery_rate',     x: 0, y: 0, w: 4, h: 3 },
      { key: 'notification.channel_health',    x: 4, y: 0, w: 4, h: 3 },
      { key: 'notification.pending_queue',      x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Analytics Ops ─────────────────────────────────────────────────────
  {
    dashboardCode: 'analytics_ops',
    labelEn: 'Analytics Overview',
    labelAr: 'نظرة عامة على التحليلات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'analytics',
    widgets: [
      { key: 'analytics.kpi_summary',          x: 0, y: 0, w: 4, h: 3 },
      { key: 'analytics.trend_analysis',       x: 4, y: 0, w: 4, h: 3 },
      { key: 'analytics.data_freshness',        x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Team Ops ──────────────────────────────────────────────────────────
  {
    dashboardCode: 'team_ops',
    labelEn: 'Team Performance',
    labelAr: 'أداء الفريق',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'team',
    widgets: [
      { key: 'team.workload_distribution',     x: 0, y: 0, w: 4, h: 3 },
      { key: 'team.task_completion',           x: 4, y: 0, w: 4, h: 3 },
      { key: 'team.sla_adherence',              x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── Admin Ops ─────────────────────────────────────────────────────────
  {
    dashboardCode: 'admin_ops',
    labelEn: 'Administration',
    labelAr: 'الإدارة',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'admin',
    roles: ['owner', 'admin', 'tenant_admin'],
    widgets: [
      { key: 'admin.user_activity',            x: 0, y: 0, w: 4, h: 3 },
      { key: 'admin.module_health',            x: 4, y: 0, w: 4, h: 3 },
      { key: 'admin.license_usage',             x: 8, y: 0, w: 4, h: 3 },
    ],
  },

  // ── DORA / Journey / Privacy / Controls / Issues / Inbox / Portals / Records
  // Baseline layouts for module-ui.registry dashboardPresets (registry crosswalk parity).
  {
    dashboardCode: 'dora_ops',
    labelEn: 'DORA Operations',
    labelAr: 'عمليات DORA',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'dora',
    widgets: [
      { key: 'compliance.posture_chart', x: 0, y: 0, w: 6, h: 3 },
      { key: 'risk.heatmap', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'journey_ops',
    labelEn: 'Maturity Journey',
    labelAr: 'رحلة النضج',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'journey',
    widgets: [
      { key: 'analytics.kpi_summary', x: 0, y: 0, w: 6, h: 3 },
      { key: 'analytics.trend_analysis', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'privacy_ops',
    labelEn: 'Privacy Operations',
    labelAr: 'عمليات الخصوصية',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'privacy',
    widgets: [
      { key: 'evidence.locker', x: 0, y: 0, w: 6, h: 3 },
      { key: 'evidence.queue', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'controls_ops',
    labelEn: 'Controls Operations',
    labelAr: 'عمليات الضوابط',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'controls',
    widgets: [
      { key: 'compliance.control_coverage', x: 0, y: 0, w: 6, h: 3 },
      { key: 'compliance.gap_by_framework', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'issues_ops',
    labelEn: 'Issues Operations',
    labelAr: 'عمليات المشكلات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'issues',
    widgets: [
      { key: 'remediation.progress_tracker', x: 0, y: 0, w: 6, h: 3 },
      { key: 'action.open_items', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'inbox_ops',
    labelEn: 'Inbox Operations',
    labelAr: 'عمليات صندوق الوارد',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'inbox',
    widgets: [
      { key: 'notification.pending_queue', x: 0, y: 0, w: 6, h: 3 },
      { key: 'workflow.active_instances', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'portals_ops',
    labelEn: 'Portals Operations',
    labelAr: 'عمليات البوابات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'portals',
    widgets: [
      { key: 'integration.connector_health', x: 0, y: 0, w: 6, h: 3 },
      { key: 'integration.sync_status', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
  {
    dashboardCode: 'records_ops',
    labelEn: 'Records Operations',
    labelAr: 'عمليات السجلات',
    archetypeCode: 'all',
    columns: 12,
    moduleCode: 'records',
    widgets: [
      { key: 'evidence.freshness_gauge', x: 0, y: 0, w: 6, h: 3 },
      { key: 'evidence.collection_timeline', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
];

/** Lookup by dashboard code */
export const DASHBOARD_BY_CODE = new Map(
  DASHBOARD_REGISTRY.map(d => [d.dashboardCode, d])
);
