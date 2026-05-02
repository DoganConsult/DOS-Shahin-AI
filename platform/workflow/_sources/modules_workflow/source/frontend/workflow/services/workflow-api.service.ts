import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowRecord } from '../contracts/workflow.contracts';

@Injectable({ providedIn: 'root' })
export class WorkflowApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/workflow';

  list(): Observable<{ data: WorkflowRecord[], count: number }> {
    return this.http.get<{ data: WorkflowRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<WorkflowRecord> {
    return this.http.get<WorkflowRecord>(this.endpoint + '/' + id);
  }
}
