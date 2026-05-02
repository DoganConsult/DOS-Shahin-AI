import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TrialExtensionApiService {
  private http = inject(HttpClient);

  requestExtension(reason: string) {
    return this.http.post('/api/subscription/trial-extension/request', { reason });
  }

  getStatus() {
    return this.http.get<{ requests: unknown[] }>('/api/subscription/trial-extension/status');
  }

  approve(requestId: string, notes?: string) {
    return this.http.post(`/api/admin/trial-extension/${requestId}/approve`, { notes });
  }

  reject(requestId: string, notes?: string) {
    return this.http.post(`/api/admin/trial-extension/${requestId}/reject`, { notes });
  }
}
