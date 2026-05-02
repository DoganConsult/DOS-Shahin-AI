import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvidenceRecord } from '../contracts/evidence.contracts';

@Injectable({ providedIn: 'root' })
export class EvidenceApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/evidence';

  list(): Observable<{ data: EvidenceRecord[], count: number }> {
    return this.http.get<{ data: EvidenceRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<EvidenceRecord> {
    return this.http.get<EvidenceRecord>(this.endpoint + '/' + id);
  }
}
