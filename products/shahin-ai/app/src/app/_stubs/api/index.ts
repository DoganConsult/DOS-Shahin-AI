// Landing-only build stub for @app/api.
// Replaces the heavy platform/core/services/api/index.ts which has many broken
// transitive imports. The landing's section components only call:
//   - getPublicAgents()
//   - getPublicLandingContent()
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GrcOperationsService {
  getPublicAgents(): Observable<unknown[]> { return of([]); }
  getPublicLandingContent(): Observable<Record<string, unknown>> { return of({}); }
}
