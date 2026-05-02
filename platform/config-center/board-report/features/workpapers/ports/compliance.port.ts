import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { featureRegistry } from '@app/core/dependency-registry';

export interface WorkpaperCompliancePort {
  getFrameworks(regulator?: string, preset?: string): Observable<unknown[]>;
}

export const WORKPAPER_COMPLIANCE_PORT = new InjectionToken<WorkpaperCompliancePort>(
  'WorkpaperCompliancePort',
  {
    providedIn: 'root',
    factory: () => featureRegistry.get<WorkpaperCompliancePort>('ComplianceFeatureApiService'),
  },
);
