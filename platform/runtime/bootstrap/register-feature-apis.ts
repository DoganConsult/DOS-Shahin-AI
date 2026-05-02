import { inject } from '@angular/core';
import { featureRegistry } from '@app/core/dependency-registry';

import { RiskApiService } from '@risk-module/ui/features/risk/services/risk-api.service';
import { VendorApiService } from '@app/features/vendor/services/vendor-api.service';
import { WorkflowApiService } from '@app/features/workflow/services/workflow-api.service';
import { AiGovernanceApiService } from '@app/features/ai-governance/services/ai-governance-api.service';
import { ComplianceFeatureApiService } from '@app/features/compliance/services/compliance-api.service';
import { IncidentApiService } from '@app/features/incident/services/incident-api.service';
import { PrivacyApiService } from '@app/features/privacy/services/privacy-api.service';
import { TrainingApiService } from '@app/features/training/services/training-api.service';
import { IssuesApiService } from '@app/features/issues/services/issues-api.service';
import { RecordsApiService } from '@app/features/records/services/records-api.service';
import { InboxApiService } from '@app/features/inbox/services/inbox-api.service';
import { PortalsApiService } from '@app/features/portals/services/portals-api.service';

const FEATURE_API_MAP: Array<[string, new (...args: any[]) => any]> = [
  ['RiskApiService', RiskApiService],
  ['VendorApiService', VendorApiService],
  ['WorkflowApiService', WorkflowApiService],
  ['AiGovernanceApiService', AiGovernanceApiService],
  ['ComplianceFeatureApiService', ComplianceFeatureApiService],
  ['IncidentApiService', IncidentApiService],
  ['PrivacyApiService', PrivacyApiService],
  ['TrainingApiService', TrainingApiService],
  ['IssuesApiService', IssuesApiService],
  ['RecordsApiService', RecordsApiService],
  ['InboxApiService', InboxApiService],
  ['PortalsApiService', PortalsApiService],
];

export function initFeatureApis(): void {
  for (const [key, serviceClass] of FEATURE_API_MAP) {
    featureRegistry.register(key, inject(serviceClass));
  }
}
