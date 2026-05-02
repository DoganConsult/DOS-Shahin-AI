import { WidgetManifest } from '../core/models/widget-manifest.model';
import { EXECUTIVE_WIDGETS } from './executive/executive.widgets';
import { GOVERNANCE_WIDGETS } from './governance/governance.widgets';
import { RISK_WIDGETS } from './risk/risk.widgets';
import { COMPLIANCE_WIDGETS } from './compliance/compliance.widgets';
import { AUDIT_WIDGETS } from './audit/audit.widgets';
import { EVIDENCE_WIDGETS } from './evidence/evidence.widgets';
import { INCIDENTS_WIDGETS } from './incidents/incidents.widgets';
import { VENDORS_WIDGETS } from './vendors/vendors.widgets';
import { BCP_WIDGETS } from './bcp/bcp.widgets';
import { ASSETS_WIDGETS } from './assets/assets.widgets';
import { AI_WIDGETS } from './ai/ai.widgets';
import { WORKFLOW_WIDGETS } from './workflow/workflow.widgets';
import { REPORTING_WIDGETS } from './reporting/reporting.widgets';
import { PLATFORM_WIDGETS } from './platform/platform.widgets';

export const ALL_WIDGET_MANIFESTS: WidgetManifest[] = [
  ...EXECUTIVE_WIDGETS,
  ...GOVERNANCE_WIDGETS,
  ...RISK_WIDGETS,
  ...COMPLIANCE_WIDGETS,
  ...AUDIT_WIDGETS,
  ...EVIDENCE_WIDGETS,
  ...INCIDENTS_WIDGETS,
  ...VENDORS_WIDGETS,
  ...BCP_WIDGETS,
  ...ASSETS_WIDGETS,
  ...AI_WIDGETS,
  ...WORKFLOW_WIDGETS,
  ...REPORTING_WIDGETS,
  ...PLATFORM_WIDGETS,
];

export {
  EXECUTIVE_WIDGETS,
  GOVERNANCE_WIDGETS,
  RISK_WIDGETS,
  COMPLIANCE_WIDGETS,
  AUDIT_WIDGETS,
  EVIDENCE_WIDGETS,
  INCIDENTS_WIDGETS,
  VENDORS_WIDGETS,
  BCP_WIDGETS,
  ASSETS_WIDGETS,
  AI_WIDGETS,
  WORKFLOW_WIDGETS,
  REPORTING_WIDGETS,
  PLATFORM_WIDGETS,
};

/**
 * Maps old kebab-case widget IDs to new dotted manifest IDs.
 * Used during migration to support existing saved layouts and preferences.
 */
export const LEGACY_ID_MAP: Record<string, string> = {
  // ── Executive ──
  'program-health': 'executive.program_health',
  'kpi-card-echart': 'executive.kpi_card',
  'kpi-tiles-animated': 'executive.kpi_tiles',
  'chart-carousel': 'executive.chart_carousel',
  'engine-executive-summary-widget': 'executive.engine_exec_summary',
  'engine-trend-widget': 'executive.engine_trend',
  // ── Governance ──
  'grc-time-loop': 'governance.grc_time_loop',
  'improvement-illusion': 'governance.improvement_illusion',
  'silent-controls': 'governance.silent_controls',
  'audit-dejavu': 'governance.audit_dejavu',
  'risk-denial': 'governance.risk_denial',
  'org-amnesia': 'governance.org_amnesia',
  'knowledge-in-people': 'governance.knowledge_in_people',
  'decision-trace': 'governance.decision_trace',
  'cultural-drift': 'governance.cultural_drift',
  'control-aging': 'governance.control_aging',
  'lifecycle-bottleneck': 'governance.lifecycle_bottleneck',
  'zombie-controls': 'governance.zombie_controls',
  'root-cause-vs-patch': 'governance.root_cause_vs_patch',
  'change-leverage': 'governance.change_leverage',
  'momentum-indicator': 'governance.momentum_indicator',
  // ── Risk ──
  'risk-heatmap': 'risk.heatmap',
  'risk-summary': 'risk.summary',
  'risk-distribution': 'risk.distribution',
  'risk-predictor': 'risk.predictor',
  'risk-gravity': 'risk.gravity',
  'untested-assumptions': 'risk.untested_assumptions',
  'false-comfort': 'risk.false_comfort',
  'risk-heatmap-echart': 'risk.heatmap_echart',
  'vendor-bubble-echart': 'risk.vendor_bubble',
  'top-risks-echart': 'risk.top_risks',
  'risk-constellation': 'risk.constellation',
  'vendor-risk-bubble-enhanced': 'risk.vendor_bubble_enhanced',
  'risk-bridge-waterfall': 'risk.bridge_waterfall',
  'risk-distribution-echart': 'risk.distribution_echart',
  'blast-radius': 'risk.blast_radius',
  'risk-surface-3d': 'risk.surface_3d',
  'monte-carlo-distribution': 'risk.monte_carlo',
  'tornado-sensitivity': 'risk.tornado_sensitivity',
  'd3-risk-heatmap': 'risk.d3_heatmap',
  // ── Compliance ──
  'compliance-score': 'compliance.score',
  'compliance-trend': 'compliance.trend',
  'framework-coverage': 'compliance.framework_coverage',
  'framework-radar': 'compliance.framework_radar',
  'control-progress': 'compliance.control_progress',
  'policy-scorecard': 'compliance.policy_scorecard',
  'control-drift': 'compliance.control_drift',
  'maturity-gap': 'compliance.maturity_gap',
  'compliance-gauge-echart': 'compliance.gauge_echart',
  'compliance-heatmap-cc': 'compliance.heatmap_cc',
  'compliance-coverage-treemap': 'compliance.coverage_treemap',
  'control-testing-donut': 'compliance.control_testing_donut',
  'findings-bar-echart': 'compliance.findings_bar',
  'framework-radar-echart': 'compliance.framework_radar_echart',
  'framework-compliance': 'compliance.framework_compliance',
  'maturity-radar-echart': 'compliance.maturity_radar_echart',
  'maturity-spider': 'compliance.maturity_spider',
  'compliance-mesh-3d': 'compliance.mesh_3d',
  'control-effectiveness-boxplot': 'compliance.effectiveness_boxplot',
  'parallel-coordinates': 'compliance.parallel_coordinates',
  'control-coverage-sankey': 'compliance.control_coverage_sankey',
  // ── Audit ──
  'audit-readiness': 'audit.readiness',
  'audit-pack-status': 'audit.pack_status',
  'audit-readiness-gauge': 'audit.readiness_gauge',
  'audit-findings-heatmap': 'audit.findings_heatmap',
  'findings-funnel': 'audit.findings_funnel',
  'top-breached-kris-widget': 'audit.top_breached_kris',
  'policy-review-debt-widget': 'audit.policy_review_debt',
  // ── Evidence ──
  'evidence-locker': 'evidence.locker',
  'evidence-queue': 'evidence.queue',
  'evidence-rot': 'evidence.rot',
  'evidence-donut-echart': 'evidence.donut_echart',
  'evidence-flow-sankey': 'evidence.flow_sankey',
  'evidence-globe-3d': 'evidence.globe_3d',
  // ── Incidents ──
  'incident-tracker': 'incidents.tracker',
  'incident-seismograph': 'incidents.seismograph',
  // ── Vendors ──
  'vendor-risk': 'vendors.risk_snapshot',
  // ── BCP ──
  'bcp-status': 'bcp.status',
  // ── AI ──
  'red-team-board': 'ai.red_team_board',
  'ai-summary': 'ai.summary',
  'ai-insights-echart': 'ai.insights_echart',
  'one-sentence-truth': 'ai.one_sentence_truth',
  'future-you': 'ai.future_you',
  'if-nothing-changes': 'ai.if_nothing_changes',
  'guard-stats': 'ai.guard_stats',
  'eval-slo': 'ai.eval_slo',
  'gateway-health': 'ai.gateway_health',
  'llm-usage': 'ai.llm_usage',
  'feedback-score': 'ai.feedback_score',
  // ── Workflow ──
  'workflow-sankey': 'workflow.sankey',
  'workflow-timeline-cc': 'workflow.timeline',
  'process-flow': 'workflow.process_flow',
  'gantt-timeline': 'workflow.gantt_timeline',
  'ninety-day-timeline': 'workflow.ninety_day_timeline',
  'anomaly-timeline': 'workflow.anomaly_timeline',
  'sla-by-role': 'workflow.sla_by_role',
  // ── Reporting ──
  'year-in-grc': 'reporting.year_in_grc',
  'pain-mirror': 'reporting.pain_mirror',
  'breaking-the-cycle': 'reporting.breaking_the_cycle',
  'board-reality': 'reporting.board_reality',
  'regulator-lens': 'reporting.regulator_lens',
  'reputation-impact': 'reporting.reputation_impact',
  'trend-line-echart': 'reporting.trend_line',
  'sparkline-echart': 'reporting.sparkline',
  'remediation-velocity': 'reporting.remediation_velocity',
  'rolling-forecast': 'reporting.rolling_forecast',
  'grc-pulse-river': 'reporting.grc_pulse_river',
  'animated-ranking-echart': 'reporting.animated_ranking',
  'bullet-chart-echart': 'reporting.bullet_chart',
  'chord-diagram': 'reporting.chord_diagram',
  'entity-graph': 'reporting.entity_graph',
  'network-graph-enhanced': 'reporting.network_graph',
  'd3-animated-bar': 'reporting.d3_animated_bar',
  'd3-animated-donut': 'reporting.d3_animated_donut',
  'd3-gauge': 'reporting.d3_gauge',
  'd3-progress-ring': 'reporting.d3_progress_ring',
  'd3-radar': 'reporting.d3_radar',
  'd3-sparkline': 'reporting.d3_sparkline',
  // ── Platform ──
  'agrc-wiring-status': 'platform.agrc_wiring_status',
  'engagement-pulse': 'platform.engagement_pulse',
  'activity-feed': 'platform.activity_feed',
  'comment-activity': 'platform.comment_activity',
  'assessment-honesty': 'compliance.assessment_honesty',
  'exceptions-aging': 'compliance.exceptions_aging',
};
