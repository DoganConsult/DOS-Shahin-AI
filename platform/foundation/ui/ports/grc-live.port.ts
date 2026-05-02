/**
 * Foundation GRC-live port.
 *
 * Pages that need real-time GRC record subscriptions inject this token instead
 * of reaching into `@app/core/grc/services/grc-live.service` or
 * `@app/grc/services/grc-live.service`.
 *
 * Host binding:
 *   { provide: FOUNDATION_GRC_LIVE, useExisting: GrcLiveService }
 */
import { InjectionToken } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';

export interface FoundationGrcEntity {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface FoundationGrcLive {
  /** Subscribe to real-time updates for a given entity type. */
  watch(entityType: string, tenantId: string): Observable<FoundationGrcEntity>;
  /** Emit a local optimistic update. */
  emit(entity: FoundationGrcEntity): void;
}

export const FOUNDATION_GRC_LIVE =
  new InjectionToken<FoundationGrcLive>('FoundationGrcLive');

/** No-op fallback — emits nothing, accepts emits silently. */
export class NoopFoundationGrcLive implements FoundationGrcLive {
  watch(_entityType: string, _tenantId: string): Observable<FoundationGrcEntity> {
    return EMPTY;
  }

  emit(_entity: FoundationGrcEntity): void {
    // no-op
  }
}
