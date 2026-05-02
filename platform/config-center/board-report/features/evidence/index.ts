export { EvidenceApiService } from '@app/features/evidence/services/evidence-api.service';

export { EvidenceAdminComponent } from './admin/evidence-admin.component';
export { EvidenceDiagnosticsComponent } from './diagnostics/evidence-diagnostics.component';
export { EvidenceState } from './state/evidence.state';
export { EvidenceWidgetComponent } from './widgets/evidence-widget.component';
export { EvidenceDashboardComponent } from './dashboards/evidence-dashboard.component';

export type {
  EvidenceItemContract,
  EvidenceCollectionContract,
  EvidenceLinkageContract,
  EvidenceDiagnosticsContract,
} from './contracts/evidence.contracts';

export {
  EVIDENCE_ITEM_STATES,
  EVIDENCE_COLLECTION_STATES,
} from './workflows/evidence-lifecycle';
export type {
  EvidenceItemState,
  EvidenceCollectionState,
} from './workflows/evidence-lifecycle';
