// Foundation-Only Bring-Up — workflow feature module is deferred.
// This file used to re-export WorkflowApiService from the workflow feature
// folder, which has been removed pending its own hard-move/build gate.
// To keep the NgRx workflow effects compilable WITHOUT exposing any
// deferred-module behavior, we provide an inert injectable that returns
// empty observables. No fake data is emitted; consumers see "no workflows".
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkflowApiService {
  getWorkflows(): Observable<unknown[]> {
    return of([]);
  }
  getExecutions(_params?: Record<string, unknown>): Observable<{ executions: unknown[] }> {
    return of({ executions: [] });
  }
}
