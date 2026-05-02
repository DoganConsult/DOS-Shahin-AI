import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AttestationRecord } from '../contracts/attestation.contracts';

@Injectable({ providedIn: 'root' })
export class AttestationApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/attestation';

  list(): Observable<{ data: AttestationRecord[], count: number }> {
    return this.http.get<{ data: AttestationRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AttestationRecord> {
    return this.http.get<AttestationRecord>(this.endpoint + '/' + id);
  }
}
