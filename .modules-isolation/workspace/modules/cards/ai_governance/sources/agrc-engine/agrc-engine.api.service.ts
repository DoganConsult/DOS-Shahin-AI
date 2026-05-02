import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AgrcEngineApiService {
  private http = inject(HttpClient);

  run(tenantId?: string) {
    return this.http.post('/api/agrc-engine/run', { tenantId });
  }

  listRuns(tenantId?: string) {
    const suffix = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.http.get<unknown[]>(`/api/agrc-engine/runs${suffix}`);
  }
}
