import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ExecutiveWidgetsApiService {
  private http = inject(HttpClient);

  getSummary(tenantId?: string) {
    const suffix = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.http.get('/api/widgets/executive/summary' + suffix);
  }

  getTopBreachedKris(limit = 10, tenantId?: string) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (tenantId) params.set('tenantId', tenantId);
    return this.http.get('/api/widgets/executive/top-breached-kris?' + params.toString());
  }

  getPolicyReviewDebt(limit = 10, tenantId?: string) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (tenantId) params.set('tenantId', tenantId);
    return this.http.get('/api/widgets/executive/policy-review-debt?' + params.toString());
  }

  getEngineTrend(limit = 12, tenantId?: string) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (tenantId) params.set('tenantId', tenantId);
    return this.http.get('/api/widgets/executive/engine-trend?' + params.toString());
  }
}
