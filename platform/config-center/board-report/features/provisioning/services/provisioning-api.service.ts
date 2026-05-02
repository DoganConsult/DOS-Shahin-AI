import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProvisioningStatusResponse } from '../../../../../core/models/provisioning.models';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ProvisioningApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getStatus(tenantId: string, jobId: string): Observable<ProvisioningStatusResponse> {
    return this.http.get<ProvisioningStatusResponse>(
      `${environment.apiUrl}/provisioning/status/${tenantId}/${jobId}`
    );
  }

  getLatestStatus(tenantId: string): Observable<ProvisioningStatusResponse> {
    return this.http.get<ProvisioningStatusResponse>(
      `${environment.apiUrl}/provisioning/status/${tenantId}/latest`
    );
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/provisioning/diagnostics`);
  }
}
