import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PackPolicyApiService {
  private http = inject(HttpClient);

  evaluate(sessionId: string) {
    return this.http.post('/api/packs/policies/evaluate', { sessionId });
  }

  listDecisions(sessionId: string) {
    return this.http.get<unknown[]>(`/api/packs/policies/decisions/${sessionId}`);
  }
}
