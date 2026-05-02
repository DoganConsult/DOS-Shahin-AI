/**
 * DAuth event publisher that dual-routes every call:
 *
 *   1. The legacy domain event on the platform event backbone
 *      (preserves existing `dauth.*` subscribers).
 *   2. A normalized DSOC audit record on the DSOC port
 *      (so the DSOC module's consumer sees a single, consistent feed
 *      under `dsoc.audit.*` / `dsoc.alert.*` topics).
 *
 * Call-sites import `publish` from this module instead of directly from
 * `@dos/platform-core/events`. No behavior change for existing domain
 * subscribers; DSOC gains a first-class, typed audit stream.
 *
 * Events not present in `DAUTH_DSOC_MAP` are forwarded to the backbone
 * only — they are domain notifications, not security audits.
 */
import type { DSOCAuditEvent, DSOCEventCategory, DSOCSeverity } from '@dos/ports/dsoc';
type Route = {
    category: DSOCEventCategory;
    severity: DSOCSeverity;
    alert?: boolean;
    outcome?: DSOCAuditEvent['outcome'];
};
declare const DAUTH_DSOC_MAP: Record<string, Route>;
export declare function publish(eventType: string, tenantId: string, payload?: Record<string, unknown>): Promise<void>;
export type { Route as DAuthEventRoute };
export { DAUTH_DSOC_MAP };
