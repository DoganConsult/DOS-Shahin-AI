import { EventEmitter } from '@angular/core';
/**
 * DosAuditTimeline — §26.10 / §17 Audit Timeline.
 *
 * Renders write-audit events for an entity in reverse-chronological
 * order. Required on every object/write page (§21 #13). Reads from
 * canonical audit storage via the audit port; this component is pure
 * presentation.
 *
 * Each entry surfaces all §16 evidence fields:
 *   actor · actor role · action · target entity · timestamp ·
 *   before/after diff · correlation id · IP/device · evidence link ·
 *   reason · AI explanation (if AI assisted)
 *
 * Per §17 the component supports "as-of" replay — clicking a row emits
 * `replay` so the parent can render the entity state as of that moment.
 *
 * Per §3.5 #4 — auditor profile can read the full timeline; other
 * profiles see scope-filtered rows (filtering happens in the resolver,
 * not here).
 */
export interface AuditTimelineEntry {
    id: string;
    timestamp: string;
    actor: string;
    actorRole?: string;
    action: string;
    target?: string;
    targetKind?: string;
    reason?: string;
    correlationId?: string;
    ipAddress?: string;
    device?: string;
    evidenceLink?: string;
    diff?: {
        field: string;
        before?: unknown;
        after?: unknown;
    }[];
    aiExplanation?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}
export declare class DosAuditTimelineComponent {
    title?: string;
    entries: AuditTimelineEntry[];
    ariaLabel: string;
    eyebrowLabel: string;
    emptyLabel: string;
    reasonLabel: string;
    diffFieldLabel: string;
    diffBeforeLabel: string;
    diffAfterLabel: string;
    diffAriaLabel: string;
    correlationLabel: string;
    ipLabel: string;
    deviceLabel: string;
    evidenceLabel: string;
    aiExplanationLabel: string;
    replayLabel: string;
    /** Format an ISO timestamp into a short, locale-friendly string. */
    timeFormatter: (iso: string) => string;
    replay: EventEmitter<string>;
    private expanded;
    isExpanded(id: string): boolean;
    toggle(id: string): void;
    formatTime(iso: string): string;
    formatVal(v: unknown): string;
}
