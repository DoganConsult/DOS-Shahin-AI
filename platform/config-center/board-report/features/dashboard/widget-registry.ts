import { Type } from '@angular/core';

import { ExecutiveSummaryWidgetComponent } from './widgets/executive-widgets/executive-summary-widget.component';
import { RiskHeatmapWidgetComponent } from './widgets/risk-vendor-widgets/risk-heatmap/risk-heatmap-widget.component';
import { OverdueActionsWidgetComponent } from './widgets/operations-widgets/overdue-actions-widget.component';
import { AuditExposureWidgetComponent } from './widgets/evidence-findings-widgets/audit-exposure-widget.component';
import { PrivacyIncidentsWidgetComponent } from './widgets/operations-widgets/privacy-incidents-widget.component';
import { MaturityScoreWidgetComponent } from './widgets/metrics-widgets/maturity-score-widget.component';
import { AssessmentProgressWidgetComponent } from './widgets/metrics-widgets/assessment-progress-widget.component';
import { RecommendationsWidgetComponent } from './widgets/executive-widgets/recommendations-widget.component';
import { EvidenceCoverageWidgetComponent } from './widgets/evidence-findings-widgets/evidence-coverage-widget.component';
import { KriStatusWidgetComponent } from './widgets/metrics-widgets/kri-status-widget.component';
import { ExecutiveSummaryWidgetComponent as EngineExecSummaryWidget } from '../../../shared/widgets/components/executive/executive-summary.widget';
import { TopBreachedKrisWidgetComponent } from '../../../shared/widgets/components/executive/top-breached-kris.widget';
import { PolicyReviewDebtWidgetComponent } from '../../../shared/widgets/components/evidence/policy-review-debt.widget';
import { EngineTrendWidgetComponent } from '../../../shared/widgets/components/lifecycle-ops/engine-trend.widget';
import { LeadershipSummaryWidgetComponent } from './widgets/executive-widgets/leadership-summary-widget.component';

export const DASHBOARD_WIDGET_COMPONENTS: Record<string, Type<any>> = {
  'executive-summary-widget': ExecutiveSummaryWidgetComponent,
  'risk-heatmap-widget': RiskHeatmapWidgetComponent,
  'overdue-actions-widget': OverdueActionsWidgetComponent,
  'audit-exposure-widget': AuditExposureWidgetComponent,
  'privacy-incidents-widget': PrivacyIncidentsWidgetComponent,
  'maturity-score-widget': MaturityScoreWidgetComponent,
  'assessment-progress-widget': AssessmentProgressWidgetComponent,
  'recommendations-widget': RecommendationsWidgetComponent,
  'evidence-coverage-widget': EvidenceCoverageWidgetComponent,
  'kri-status-widget': KriStatusWidgetComponent,
  'engine-executive-summary-widget': EngineExecSummaryWidget,
  'top-breached-kris-widget': TopBreachedKrisWidgetComponent,
  'policy-review-debt-widget': PolicyReviewDebtWidgetComponent,
  'engine-trend-widget': EngineTrendWidgetComponent,
  'leadership-summary-widget': LeadershipSummaryWidgetComponent,
  'quality-gate-status-widget': QualityGateStatusWidgetComponent,
  'quality-gate-trend-widget': QualityGateTrendWidgetComponent,
};
