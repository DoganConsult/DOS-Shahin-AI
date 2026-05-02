export { GovernanceApiService } from '@app/api/governance-api.service';

export { GovernanceAdminComponent } from './admin/governance-admin.component';
export { GovernanceDiagnosticsComponent } from './diagnostics/governance-diagnostics.component';
export { GovernanceState } from './state/governance.state';
export { GovernanceWidgetComponent } from './widgets/governance-widget.component';
export { GovernanceDashboardComponent } from './dashboards/governance-dashboard.component';

export type {
  GovernanceBodyContract,
  GovernanceCommitteeMemberContract,
  GovernanceResponsibilityContract,
  GovernanceRaciContract,
  GovernanceDecisionContract,
  GovernanceDiagnosticsContract,
} from './contracts/governance.contracts';

export {
  GOVERNANCE_BODY_STATES,
  GOVERNANCE_DECISION_STATES,
} from './workflows/governance-lifecycle';
export type {
  GovernanceBodyState,
  GovernanceDecisionState,
} from './workflows/governance-lifecycle';
