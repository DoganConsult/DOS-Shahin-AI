import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TrainingRecord } from '../contracts/training.contracts';

@Injectable({ providedIn: 'root' })
export class TrainingApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/training';

  list(): Observable<{ data: TrainingRecord[], count: number }> {
    return this.http.get<{ data: TrainingRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<TrainingRecord> {
    return this.http.get<TrainingRecord>(this.endpoint + '/' + id);
  }
}
