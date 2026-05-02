import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProvisioningOrchestratorApiService {
  private http = inject(HttpClient);

  run(body: { sessionId: string; tenantId?: string }) {
    return this.http.post('/api/provisioning/orchestrate', body);
  }
}
