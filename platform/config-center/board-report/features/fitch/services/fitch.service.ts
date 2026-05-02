import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FitchService {
  constructor(private http: HttpClient) {}

  getRatings(): Observable<any> {
    return this.http.get('/api/fitch/ratings');
  }

  getHistory(fitchEntityId: string): Observable<any> {
    return this.http.get(`/api/fitch/ratings/${fitchEntityId}/history`);
  }

  getLinkByEntity(internalEntityUuid: string): Observable<any> {
    return this.http.get(`/api/fitch/links/entity/${internalEntityUuid}`);
  }

  triggerIngestion(): Observable<any> {
    // Requires admin privilege payload matching bulk Zod schema
    return this.http.post('/api/fitch/ingest/bulk', { ratings: [] });
  }
}
