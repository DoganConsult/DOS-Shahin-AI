/**
 * DSOC frontend injection ports.
 *
 * Product shells consume DSOC through these Angular DI tokens. The
 * product is responsible for providing concrete implementations that
 * adapt to the underlying transport (HTTP to /api/dsoc/port/v1 in
 * production, in-memory stub in tests).
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  DSOCAuditEvent,
  DSOCPostureSnapshot,
} from '@dos/ports/dsoc';

export interface DSOCEventFeedPort {
  /** Stream of recent audit events for a tenant (typically paginated HTTP). */
  recent(tenantId: string, limit: number): Observable<readonly DSOCAuditEvent[]>;
}

export interface DSOCAlertInboxPort {
  /** Open alerts for a tenant. */
  listOpen(tenantId: string): Observable<ReadonlyArray<{
    id: number;
    tenantId: string;
    severity: string;
    category: string;
    action: string;
    createdAt: string;
  }>>;
  acknowledge(id: number, by: string): Observable<boolean>;
  resolve(id: number, by: string): Observable<boolean>;
}

export interface DSOCPosturePort {
  latest(tenantId: string): Observable<DSOCPostureSnapshot | null>;
}

export const DSOC_EVENT_FEED_PORT = new InjectionToken<DSOCEventFeedPort>('DSOCEventFeedPort');
export const DSOC_ALERT_INBOX_PORT = new InjectionToken<DSOCAlertInboxPort>('DSOCAlertInboxPort');
export const DSOC_POSTURE_PORT = new InjectionToken<DSOCPosturePort>('DSOCPosturePort');
