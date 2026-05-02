import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { EnvironmentProviders, isDevMode } from '@angular/core';

// ── Existing slices ───────────────────────────────────────
import { riskFeature } from './risk/risk.reducer';
import { RiskEffects } from './risk/risk.effects';
import { complianceFeature } from '@compliance-module/ui/state/compliance.reducer';
import { ComplianceEffects } from '@compliance-module/ui/state/compliance.effects';
import { auditFeature } from './audit/audit.reducer';
import { AuditEffects } from './audit/audit.effects';
import { governanceFeature } from './governance/governance.reducer';
import { GovernanceEffects } from './governance/governance.effects';
import { vendorFeature } from './vendor/vendor.reducer';
import { VendorEffects } from './vendor/vendor.effects';
import { incidentFeature } from './incident/incident.reducer';
import { IncidentEffects } from './incident/incident.effects';
import { workflowFeature } from './workflow/workflow.reducer';
import { WorkflowEffects } from './workflow/workflow.effects';
import { aiGovernanceFeature } from './ai-governance/ai-governance.reducer';
import { AiGovernanceEffects } from './ai-governance/ai-governance.effects';
import { notificationFeature } from './notification/notification.reducer';
import { NotificationEffects } from './notification/notification.effects';
import { externalServicesFeature } from './external-services.reducer';
import { ExternalServicesEffects } from './external-services.effects';

// ── Governance slices ─────────────────────────────────────
import { evidenceFeature } from './evidence/evidence.reducer';
import { EvidenceEffects } from './evidence/evidence.effects';
import { policyFeature } from './policy/policy.reducer';
import { PolicyEffects } from './policy/policy.effects';
import { privacyFeature } from './privacy/privacy.reducer';
import { PrivacyEffects } from './privacy/privacy.effects';
import { qiyasFeature } from './qiyas/qiyas.reducer';
import { QiyasEffects } from './qiyas/qiyas.effects';
import { aiFeature } from './ai/ai.reducer';
import { AiEffects } from './ai/ai.effects';

// ── Operations slices ─────────────────────────────────────
import { actionFeature } from './action/action.reducer';
import { ActionEffects } from './action/action.effects';
import { analyticsFeature } from './analytics/analytics.reducer';
import { AnalyticsEffects } from './analytics/analytics.effects';
import { assetFeature } from './asset/asset.reducer';
import { AssetEffects } from './asset/asset.effects';
import { bcpFeature } from './bcp/bcp.reducer';
import { BcpEffects } from './bcp/bcp.effects';
import { exceptionFeature } from './exception/exception.reducer';
import { ExceptionEffects } from './exception/exception.effects';
import { issuesFeature } from './issues/issues.reducer';
import { IssuesEffects } from './issues/issues.effects';
import { recordsFeature } from './records/records.reducer';
import { RecordsEffects } from './records/records.effects';
import { remediationFeature } from './remediation/remediation.reducer';
import { RemediationEffects } from './remediation/remediation.effects';
import { reportingFeature } from './reporting/reporting.reducer';
import { ReportingEffects } from './reporting/reporting.effects';
import { teamFeature } from './team/team.reducer';
import { TeamEffects } from './team/team.effects';
import { trainingFeature } from './training/training.reducer';
import { TrainingEffects } from './training/training.effects';

// ── Platform slices ───────────────────────────────────────
import { adminFeature } from './admin/admin.reducer';
import { AdminEffects } from './admin/admin.effects';
import { foundationFeature } from './foundation/foundation.reducer';
import { FoundationEffects } from './foundation/foundation.effects';
import { inboxFeature } from './inbox/inbox.reducer';
import { InboxEffects } from './inbox/inbox.effects';
import { integrationsFeature } from './integrations/integrations.reducer';
import { IntegrationsEffects } from './integrations/integrations.effects';
import { portalsFeature } from './portals/portals.reducer';
import { PortalsEffects } from './portals/portals.effects';
import { searchFeature } from './search/search.reducer';
import { SearchEffects } from './search/search.effects';

export function provideNgrxStore(): EnvironmentProviders[] {
  const providers: EnvironmentProviders[] = [
    provideStore({
      // Existing
      [riskFeature.name]: riskFeature.reducer,
      [complianceFeature.name]: complianceFeature.reducer,
      [auditFeature.name]: auditFeature.reducer,
      [governanceFeature.name]: governanceFeature.reducer,
      [vendorFeature.name]: vendorFeature.reducer,
      [incidentFeature.name]: incidentFeature.reducer,
      [workflowFeature.name]: workflowFeature.reducer,
      [aiGovernanceFeature.name]: aiGovernanceFeature.reducer,
      [notificationFeature.name]: notificationFeature.reducer,
      [externalServicesFeature.name]: externalServicesFeature.reducer,
      // Governance
      [evidenceFeature.name]: evidenceFeature.reducer,
      [policyFeature.name]: policyFeature.reducer,
      [privacyFeature.name]: privacyFeature.reducer,
      [qiyasFeature.name]: qiyasFeature.reducer,
      [aiFeature.name]: aiFeature.reducer,
      // Operations
      [actionFeature.name]: actionFeature.reducer,
      [analyticsFeature.name]: analyticsFeature.reducer,
      [assetFeature.name]: assetFeature.reducer,
      [bcpFeature.name]: bcpFeature.reducer,
      [exceptionFeature.name]: exceptionFeature.reducer,
      [issuesFeature.name]: issuesFeature.reducer,
      [recordsFeature.name]: recordsFeature.reducer,
      [remediationFeature.name]: remediationFeature.reducer,
      [reportingFeature.name]: reportingFeature.reducer,
      [teamFeature.name]: teamFeature.reducer,
      [trainingFeature.name]: trainingFeature.reducer,
      // Platform
      [adminFeature.name]: adminFeature.reducer,
      [foundationFeature.name]: foundationFeature.reducer,
      [inboxFeature.name]: inboxFeature.reducer,
      [integrationsFeature.name]: integrationsFeature.reducer,
      [portalsFeature.name]: portalsFeature.reducer,
      [searchFeature.name]: searchFeature.reducer,
    }),
    provideEffects([
      // Existing
      RiskEffects,
      ComplianceEffects,
      AuditEffects,
      GovernanceEffects,
      VendorEffects,
      IncidentEffects,
      WorkflowEffects,
      AiGovernanceEffects,
      NotificationEffects,
      ExternalServicesEffects,
      // Governance
      EvidenceEffects,
      PolicyEffects,
      PrivacyEffects,
      QiyasEffects,
      AiEffects,
      // Operations
      ActionEffects,
      AnalyticsEffects,
      AssetEffects,
      BcpEffects,
      ExceptionEffects,
      IssuesEffects,
      RecordsEffects,
      RemediationEffects,
      ReportingEffects,
      TeamEffects,
      TrainingEffects,
      // Platform
      AdminEffects,
      FoundationEffects,
      InboxEffects,
      IntegrationsEffects,
      PortalsEffects,
      SearchEffects,
    ]),
  ];

  if (isDevMode()) {
    providers.push(provideStoreDevtools({
      maxAge: 50,
      logOnly: !isDevMode(),
      autoPause: true,
      name: 'Dogan-AI OS GRC',
    }));
  }

  return providers;
}
