import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { featureRegistry } from '@app/core/dependency-registry';

export interface AttestationCompliancePort {
  getControls(frameworkId?: string): Observable<{ items: unknown[]; total: number }>;
}

export const ATTESTATION_COMPLIANCE_PORT = new InjectionToken<AttestationCompliancePort>(
  'AttestationCompliancePort',
  {
    providedIn: 'root',
    factory: () => featureRegistry.get<AttestationCompliancePort>('ComplianceFeatureApiService'),
  },
);
