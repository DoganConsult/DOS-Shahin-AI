import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlatformEvidence {
  id: string;
  title: string;
  type: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformEvidenceApiService {
  private readonly http = inject(HttpClient);

  list(entityType?: string, entityId?: string): Observable<PlatformEvidence[]> {
    const params: Record<string, string> = {};
    if (entityType) params['entityType'] = entityType;
    if (entityId) params['entityId'] = entityId;
    return this.http.get<PlatformEvidence[]>('/api/evidence', { params });
  }

  upload(evidence: FormData): Observable<PlatformEvidence> {
    return this.http.post<PlatformEvidence>('/api/evidence', evidence);
  }
}
